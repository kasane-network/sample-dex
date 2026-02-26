#!/usr/bin/env bash
set -euo pipefail

# where/what/why:
# - where: v2-interface monorepo script
# - what: run local Nx with the Node version pinned in .nvmrc
# - why: avoid plugin worker failures caused by mismatched global Node versions

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXPECTED_NODE="$(tr -d '\r\n' < "${ROOT_DIR}/.nvmrc")"

run_nx() {
  exec "${ROOT_DIR}/node_modules/.bin/nx" "$@"
}

if [ "$(node -v 2>/dev/null || true)" = "${EXPECTED_NODE}" ]; then
  run_nx "$@"
fi

FNM_BIN="${HOME}/.local/share/fnm/node-versions/${EXPECTED_NODE}/installation/bin"
if [ -x "${FNM_BIN}/node" ]; then
  export PATH="${FNM_BIN}:${PATH}"
  run_nx "$@"
fi

if [ -s "${HOME}/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "${HOME}/.nvm/nvm.sh"
  nvm use "${EXPECTED_NODE}" >/dev/null
  run_nx "$@"
fi

echo "Error: Node ${EXPECTED_NODE} が必要です。先に 'fnm install ${EXPECTED_NODE}' または 'nvm install ${EXPECTED_NODE}' を実行してください。" >&2
exit 1
