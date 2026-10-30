#!/bin/bash
# Run over the administrator's existing SSH access, with the dedicated public key.
set -euo pipefail
if [[ "$EUID" -ne 0 || "$#" -ne 1 ]]; then
  echo 'Usage (as root): install.sh /path/to/actions-deploy-key.pub' >&2
  exit 1
fi
script_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
test -x /root/biotest-backup.sh
test -f /root/compose.yml
test -f /root/.env
ssh-keygen -l -f "$1" >/dev/null
install -d -m 755 /usr/local/lib/biotest
install -m 755 "$script_dir/deploy.py" /usr/local/sbin/biotest-actions-deploy
install -m 644 "$script_dir/production-smoke.cjs" /usr/local/lib/biotest/production-smoke.cjs
python3 -m py_compile /usr/local/sbin/biotest-actions-deploy
python3 - "$1" <<'PY'
from pathlib import Path
import base64
import os
import shutil
import sys
import tempfile
import time

parts = Path(sys.argv[1]).read_text().split()
if len(parts) < 2 or parts[0] != 'ssh-ed25519':
    raise ValueError('Expected one dedicated Ed25519 public key')
base64.b64decode(parts[1], validate=True)
entry = 'restrict,command="/usr/local/sbin/biotest-actions-deploy" ' + ' '.join(parts[:2]) + ' biotest-github-actions'
folder = Path('/root/.ssh')
folder.mkdir(mode=0o700, exist_ok=True)
path = folder / 'authorized_keys'
content = path.read_text() if path.exists() else ''
if entry not in content.splitlines():
    if parts[1] in content:
        raise ValueError('This key already exists with different SSH restrictions')
    if path.exists():
        backup = folder / ('authorized_keys.before-biotest-' + str(time.time_ns()))
        shutil.copy2(path, backup)
        os.chmod(backup, 0o600)
    fd, temporary = tempfile.mkstemp(prefix='.authorized_keys-', dir=folder)
    with os.fdopen(fd, 'w') as file:
        file.write(content.rstrip('\n') + '\n' + entry + '\n')
    os.replace(temporary, path)
    os.chmod(path, 0o600)
print('Installed the trusted deploy scripts and restricted Actions public key')
PY
