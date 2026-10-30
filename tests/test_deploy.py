"""Exercise deploy/rollback with disposable files and a fake Docker boundary."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('biotest_deploy', Path(__file__).parents[1] / 'ops' / 'deploy.py')
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)
COMMIT = 'a' * 40
DIGEST = 'sha256:' + 'b' * 64
NEW = 'sha256:' + 'c' * 64
OLD = 'sha256:' + 'd' * 64


class FakeServer:
    def __init__(self, root, fail=None):
        self.root = root
        self.fail = fail
        self.calls = []
        self.starts = 0
        self.backup = root / 'biotest-backups' / 'database' / 'test.archive.gz'

    def __call__(self, args, **kwargs):
        self.calls.append(args)
        code, stdout = 0, ''
        if args == [str(self.root / 'biotest-backup.sh')]:
            self.backup.parent.mkdir(parents=True, exist_ok=True)
            self.backup.write_bytes(b'backup data')
            checksum = hashlib.sha256(self.backup.read_bytes()).hexdigest()
            if self.fail == 'checksum':
                checksum = '0' * 64
            Path(str(self.backup) + '.sha256').write_text(checksum + '  test.archive.gz\n')
            stdout = 'Backup created and archive parsed successfully: ' + str(self.backup) + '\n'
            if self.fail == 'backup':
                code = 1
        elif args[:3] == ['docker', 'container', 'inspect']:
            stdout = json.dumps([{'Id': 'container', 'Image': NEW if self.starts == 1 else OLD, 'State': {'Health': {'Status': 'unhealthy' if self.fail == 'health' and self.starts == 1 else 'healthy'}}}])
        elif args[:3] == ['docker', 'image', 'inspect']:
            stdout = json.dumps([{'Id': NEW, 'Config': {'Labels': {
                'org.opencontainers.image.source': deploy.SOURCE_REPOSITORY,
                'org.opencontainers.image.revision': 'e' * 40 if self.fail == 'revision' else COMMIT,
            }}}])
        elif args[:3] == ['docker', 'compose', 'up']:
            self.starts += 1
            if self.fail == 'start' and self.starts == 1:
                code = 1
        elif args[:3] == ['docker', 'compose', 'exec']:
            if self.fail == 'smoke':
                code = 1
            stdout = json.dumps({'ok': True, 'checksPassed': 16})
        elif args[0] == 'curl' and self.fail == 'https':
            code = 1
        return subprocess.CompletedProcess(args, code, stdout, 'failure' if code else '')


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.original_env = 'APP_IMAGE=primtive/biotest:old\nSITE_ADDRESS=https://orenbio.ru\nNEXTAUTH_SECRET=private-value\n'
        (self.root / '.env').write_text(self.original_env)
        (self.root / 'compose.yml').write_text('services: {}\n')
        self.smoke = self.root / 'smoke.cjs'
        self.smoke.write_text('read-only smoke checks')

    def run_deployment(self, fail=None):
        server = FakeServer(self.root, fail)
        worker = deploy.Deployer(self.root, self.smoke, server)
        return worker, server

    def test_forced_command_rejects_arbitrary_commands_and_shell_syntax(self):
        self.assertIsNone(deploy.parse_command('status'))
        self.assertEqual(deploy.parse_command(f'deploy {COMMIT} {DIGEST}'), (COMMIT, DIGEST))
        for command in ['', 'bash', 'status; id', f'deploy {COMMIT} {DIGEST};id', f'deploy {COMMIT} {DIGEST}\n', f'deploy {COMMIT} latest', f'deploy {COMMIT.upper()} {DIGEST}']:
            with self.subTest(command=command), self.assertRaises(ValueError):
                deploy.parse_command(command)

    def test_success_pins_checked_digest_after_backup_and_saves_rollback(self):
        worker, server = self.run_deployment()
        result = worker.deploy(COMMIT, DIGEST)
        self.assertEqual(result['status'], 'deployed')
        self.assertEqual(server.starts, 1)
        self.assertIn('APP_IMAGE=primtive/biotest@' + DIGEST, (self.root / '.env').read_text())
        self.assertIn('NEXTAUTH_SECRET=private-value', (self.root / '.env').read_text())
        backup_index = server.calls.index([str(self.root / 'biotest-backup.sh')])
        start_index = next(i for i, args in enumerate(server.calls) if args[:3] == ['docker', 'compose', 'up'])
        self.assertLess(backup_index, start_index)
        self.assertEqual((worker.folder / '.env').read_text(), self.original_env)
        self.assertTrue(json.loads((worker.folder / 'state.json').read_text())['rollbackImage'].startswith('primtive/biotest:rollback-ci-'))
        self.assertEqual((worker.folder / 'commands.log').stat().st_mode & 0o777, 0o600)
        self.assertEqual((self.root / '.env').stat().st_mode & 0o777, 0o600)

    def test_backup_or_image_identity_failure_never_restarts_app(self):
        for failure in ['backup', 'checksum', 'revision']:
            with self.subTest(failure=failure):
                worker, server = self.run_deployment(failure)
                with self.assertRaises(RuntimeError):
                    worker.deploy(COMMIT, DIGEST)
                self.assertEqual(server.starts, 0)
                self.assertEqual((self.root / '.env').read_text(), self.original_env)

    def test_start_health_smoke_or_https_failure_restores_previous_image(self):
        for failure in ['start', 'health', 'smoke', 'https']:
            with self.subTest(failure=failure):
                (self.root / '.env').write_text(self.original_env)
                worker, server = self.run_deployment(failure)
                with self.assertRaises(RuntimeError):
                    worker.deploy(COMMIT, DIGEST)
                self.assertEqual(server.starts, 2)
                restored = (self.root / '.env').read_text()
                self.assertIn('APP_IMAGE=primtive/biotest:rollback-ci-', restored)
                self.assertIn('NEXTAUTH_SECRET=private-value', restored)
                self.assertEqual(json.loads((worker.folder / 'state.json').read_text())['status'], 'rolled-back')

    def test_duplicate_image_settings_fail_before_environment_change(self):
        (self.root / '.env').write_text(self.original_env + 'APP_IMAGE=duplicate\n')
        worker, server = self.run_deployment()
        with self.assertRaises(ValueError):
            worker.deploy(COMMIT, DIGEST)
        self.assertEqual(server.starts, 0)
        self.assertEqual((self.root / '.env').read_text(), self.original_env + 'APP_IMAGE=duplicate\n')

    def test_parallel_deployment_does_not_touch_docker(self):
        import fcntl
        worker, server = self.run_deployment()
        with worker.lock_path.open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with self.assertRaises(BlockingIOError):
                worker.deploy(COMMIT, DIGEST)
        self.assertEqual(server.calls, [])


if __name__ == '__main__':
    unittest.main()
