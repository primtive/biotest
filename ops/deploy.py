#!/usr/bin/python3
"""Trusted, server-installed deploy command for the restricted Actions SSH key."""
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import tempfile

IMAGE_REPOSITORY = 'primtive/biotest'
SOURCE_REPOSITORY = 'https://github.com/primtive/biotest'
PRODUCTION_URL = 'https://orenbio.ru'


def parse_command(command):
    if command == 'status':
        return None
    match = re.fullmatch(r'deploy ([0-9a-f]{40}) (sha256:[0-9a-f]{64})', command)
    if not match:
        raise ValueError('Allowed commands: status, deploy <commit SHA> <image digest>')
    return match.groups()


def image_environment(source, image):
    lines = source.splitlines()
    if sum(line.startswith('APP_IMAGE=') for line in lines) != 1:
        raise ValueError('Expected exactly one APP_IMAGE setting')
    return '\n'.join('APP_IMAGE=' + image if line.startswith('APP_IMAGE=') else line for line in lines) + '\n'


def private_write(path, content):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as file:
        file.write(content)
    os.chmod(path, 0o600)


class Deployer:
    def __init__(self, root=Path('/root'), smoke=Path('/usr/local/lib/biotest/production-smoke.cjs'), runner=subprocess.run, lock_path=None):
        self.root = root
        self.smoke = smoke
        self.runner = runner
        self.lock_path = lock_path or root / ".biotest-deploy.lock"
        self.state = {}
        self.folder = None

    def command(self, args, *, input=None, timeout=180):
        result = self.runner(args, cwd=self.root, input=input, capture_output=True, text=True, timeout=timeout, check=False)
        if self.folder:
            # Logging must not prevent a rollback if the disk fills during a pull.
            try:
                with (self.folder / 'commands.log').open('a') as log:
                    log.write(json.dumps({'command': args[:4], 'returncode': result.returncode}) + '\n')
                    log.write(result.stdout + result.stderr + '\n')
            except OSError:
                pass
        if result.returncode:
            raise RuntimeError('Command failed: ' + ' '.join(args[:3]))
        return result.stdout

    def inspect(self, reference, kind='container'):
        return json.loads(self.command(['docker', kind, 'inspect', reference]))[0]

    def save(self, **values):
        self.state.update(values)
        private_write(self.folder / 'state.json', json.dumps(self.state, indent=2) + '\n')

    def set_image(self, source, image):
        fd, temporary = tempfile.mkstemp(prefix='.env.deploy-', dir=self.root)
        try:
            with os.fdopen(fd, 'w') as file:
                file.write(image_environment(source, image))
            os.replace(temporary, self.root / '.env')
        finally:
            Path(temporary).unlink(missing_ok=True)

    def start(self):
        self.command(['docker', 'compose', 'up', '-d', '--no-deps', '--pull', 'never', '--wait', '--wait-timeout', '120', 'app'], timeout=150)

    def verify(self, image_id):
        app = self.inspect('biotest-prod-app-1')
        if app['Image'] != image_id or app['State'].get('Health', {}).get('Status') != 'healthy':
            raise RuntimeError('Application image or health verification failed')
        return app['Id']

    def deploy(self, commit, digest):
        # Validate here as well so direct administrative use has the same contract.
        parse_command(f'deploy {commit} {digest}')
        if not self.smoke.is_file():
            raise RuntimeError('Production smoke script is not installed')
        if shutil.disk_usage(self.root).free < 1024 ** 3:
            raise RuntimeError('Less than 1 GiB free; deployment was not started')
        with self.lock_path.open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return self._deploy(commit, digest)

    def _deploy(self, commit, digest):
        old = self.inspect('biotest-prod-app-1')
        if old['State'].get('Health', {}).get('Status') != 'healthy':
            raise RuntimeError('Current application is not healthy; deployment was not started')
        original_env = (self.root / '.env').read_text()
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        self.folder = self.root / 'biotest-backups' / ('deploy-' + stamp + '-' + commit[:12])
        self.folder.mkdir(parents=True, mode=0o700)
        private_write(self.folder / '.env', original_env)
        private_write(self.folder / 'compose.yml', (self.root / 'compose.yml').read_text())
        private_write(self.folder / 'commands.log', '')
        image = IMAGE_REPOSITORY + '@' + digest
        rollback = IMAGE_REPOSITORY + ':rollback-ci-' + stamp
        self.save(status='preparing', commit=commit, image=image, previousImage=old['Image'], rollbackImage=rollback)
        switched = False
        try:
            self.command(['docker', 'image', 'tag', old['Image'], rollback])
            print('Creating and checking the database backup', flush=True)
            output = self.command([str(self.root / 'biotest-backup.sh')], timeout=300)
            match = re.search(r'Backup created and archive parsed successfully: (.+)', output)
            if not match:
                raise RuntimeError('Backup script did not confirm a verified archive')
            archive = Path(match.group(1).strip()).resolve()
            if not archive.is_relative_to((self.root / 'biotest-backups' / 'database').resolve()) or not archive.is_file():
                raise RuntimeError('Backup archive is missing or outside the backup directory')
            with archive.open('rb') as file:
                checksum = hashlib.file_digest(file, 'sha256').hexdigest()
            if checksum != Path(str(archive) + '.sha256').read_text().split()[0]:
                raise RuntimeError('Backup checksum mismatch')
            self.save(backupArchive=str(archive), backupSha256=checksum)
            print('Pulling the published image by digest', flush=True)
            self.command(['docker', 'pull', image], timeout=600)
            target = self.inspect(image, 'image')
            labels = target['Config'].get('Labels') or {}
            if labels.get('org.opencontainers.image.revision') != commit or labels.get('org.opencontainers.image.source') != SOURCE_REPOSITORY:
                raise RuntimeError('Published image labels do not match this repository and commit')
            self.save(newImage=target['Id'], status='starting')
            self.set_image(original_env, image)
            switched = True
            self.start()
            container = self.verify(target['Id'])
            print('Checking production pages and access controls', flush=True)
            smoke = json.loads(self.command(['docker', 'compose', 'exec', '-T', 'app', 'node'], input=self.smoke.read_text(), timeout=180))
            if smoke.get('ok') is not True:
                raise RuntimeError('Production smoke checks failed')
            private_write(self.folder / 'smoke.json', json.dumps(smoke, indent=2) + '\n')
            self.command(['curl', '--fail', '--silent', '--show-error', '--retry', '3', '--retry-connrefused', '--max-time', '20', '--output', '/dev/null', PRODUCTION_URL + '/api/auth/csrf'], timeout=100)
            self.save(status='deployed', container=container, checksPassed=smoke['checksPassed'], verifiedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
            return {'status': 'deployed', 'commit': commit, 'image': image, 'backupArchive': str(archive), 'checksPassed': smoke['checksPassed'], 'stateFile': str(self.folder / 'state.json')}
        except Exception as error:
            try:
                self.save(status='failed', error=type(error).__name__)
            except OSError:
                pass
            if switched:
                print('Deployment failed; restoring the previous application image', flush=True)
                try:
                    self.set_image(original_env, rollback)
                    self.start()
                    self.verify(old['Image'])
                    self.save(status='rolled-back')
                except Exception as rollback_error:
                    self.save(status='rollback-failed', rollbackError=type(rollback_error).__name__)
                    raise RuntimeError('Deployment and rollback failed; inspect ' + str(self.folder)) from None
            raise


def main():
    os.environ['PATH'] = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
    command = parse_command(os.environ.get('SSH_ORIGINAL_COMMAND', ''))
    if command is None:
        for path in ['/root/compose.yml', '/root/.env', '/root/biotest-backup.sh', '/usr/local/lib/biotest/production-smoke.cjs']:
            if not Path(path).is_file():
                raise RuntimeError('Deployment prerequisite is missing')
        print('biotest-deploy-ready')
        return
    def interrupted(_signal, _frame):
        raise RuntimeError('Deployment interrupted')
    for event in [signal.SIGHUP, signal.SIGTERM, signal.SIGINT]:
        signal.signal(event, interrupted)
    print(json.dumps(Deployer(lock_path=Path('/run/lock/biotest-deploy.lock')).deploy(*command), indent=2))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
