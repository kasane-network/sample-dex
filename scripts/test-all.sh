#!/usr/bin/env bash
set -euo pipefail

# where/what/why:
# - where: Uniswap V2 fork workspace root
# - what: run compile and test for core/periphery in sequence
# - why: quick smoke validation after setup and before edits

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

load_nvm_and_use_project_node() {
  if [ -s "${HOME}/.nvm/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "${HOME}/.nvm/nvm.sh"
    if [ -f "${ROOT_DIR}/.nvmrc" ]; then
      nvm use >/dev/null
    fi
  fi
}

run_repo_checks() {
  local repo_dir="$1"
  echo "==> testing: ${repo_dir}"
  (
    cd "${ROOT_DIR}/${repo_dir}"
    npm run compile
    npm test
  )
}

load_nvm_and_use_project_node
run_repo_checks "v2-core"
run_repo_checks "v2-periphery"

echo "All checks passed."
