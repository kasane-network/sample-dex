#!/usr/bin/env bash
set -euo pipefail

# where/what/why:
# - where: Uniswap V2 fork workspace root
# - what: validate runtime and install dependencies for v2-interface
# - why: provide a safe and explicit setup gate before starting the frontend

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
INTERFACE_DIR="${ROOT_DIR}/v2-interface"
REQUIRED_NODE="v22.13.1"

load_nvm_and_use_required_node() {
  if [ -s "${HOME}/.nvm/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "${HOME}/.nvm/nvm.sh"
    nvm use "${REQUIRED_NODE}" >/dev/null 2>&1 || nvm install "${REQUIRED_NODE}" >/dev/null
    nvm use "${REQUIRED_NODE}" >/dev/null
  fi
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' が見つかりません。" >&2
    exit 1
  fi
}

require_cmd node
load_nvm_and_use_required_node

if command -v bun >/dev/null 2>&1; then
  BUN_CMD=(bun)
elif [ -x "${HOME}/.bun/bin/bun" ]; then
  BUN_CMD=("${HOME}/.bun/bin/bun")
else
  echo "Error: 'bun' が見つかりません。" >&2
  exit 1
fi

CURRENT_NODE="$(node -v)"
if [ "${CURRENT_NODE}" != "${REQUIRED_NODE}" ]; then
  echo "Error: node ${REQUIRED_NODE} が必要です。現在: ${CURRENT_NODE}" >&2
  exit 1
fi

if [ ! -d "${INTERFACE_DIR}" ]; then
  echo "Error: ${INTERFACE_DIR} が見つかりません。" >&2
  exit 1
fi

cd "${INTERFACE_DIR}"
"${BUN_CMD[@]}" install

echo "v2-interface setup completed."
