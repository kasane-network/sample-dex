#!/usr/bin/env bash
set -euo pipefail

# where/what/why:
# - where: Uniswap V2 fork workspace root
# - what: install dependencies for v2-core and v2-periphery
# - why: provide one stable entrypoint for initial environment setup

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
YARN_CMD=(npx -y yarn@1.22.22)

load_nvm_and_use_project_node() {
  if [ -s "${HOME}/.nvm/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "${HOME}/.nvm/nvm.sh"
    if [ -f "${ROOT_DIR}/.nvmrc" ]; then
      nvm use >/dev/null
    fi
  fi
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' が見つかりません。" >&2
    exit 1
  fi
}

install_repo() {
  local repo_dir="$1"
  echo "==> installing: ${repo_dir}"
  (
    cd "${ROOT_DIR}/${repo_dir}"
    "${YARN_CMD[@]}" install --frozen-lockfile --force
  )
}

configure_python_for_node_gyp() {
  if command -v python3.10 >/dev/null 2>&1; then
    export npm_config_python
    npm_config_python="$(command -v python3.10)"
  fi
}

require_cmd node
load_nvm_and_use_project_node
configure_python_for_node_gyp

install_repo "v2-core"
install_repo "v2-periphery"

echo "Setup completed."
