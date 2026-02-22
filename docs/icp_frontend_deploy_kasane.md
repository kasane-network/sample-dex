# ICP Frontend Deployment Guide (Kasane)

Updated: 2026-02-22  
Target Canister ID: `rlhjx-iyaaa-aaaaf-qcnyq-cai`  
Target canister name: `frontend` (defined in `/Users/0xhude/Desktop/Kasane/dex/icp.yaml`)

## 0. Prerequisites

- Use `icp-cli` (do not use `dfx`).
- `icp.yaml` is already placed at the repository root.
- `icp.yaml` uses the `@dfinity/asset-canister` recipe and serves `v2-interface/apps/web/build`.
- Recommended identity: `production`.

## 1. Pre-checks

1. `cd /Users/0xhude/Desktop/Kasane/dex`
2. `icp --version`
3. `icp identity list`
4. `icp identity principal --identity production`
5. `icp canister status rlhjx-iyaaa-aaaaf-qcnyq-cai -e ic --identity production`

## 2. Build the frontend

1. `cd /Users/0xhude/Desktop/Kasane/dex/v2-interface`
2. `nvm use 22.13.1`
3. `bun install`
4. `bun web build:production`

Build output: `/Users/0xhude/Desktop/Kasane/dex/v2-interface/apps/web/build`

## 3. Deploy via icp.yaml

1. `cd /Users/0xhude/Desktop/Kasane/dex`
2. `icp build -e ic frontend`
3. `icp deploy -e ic --identity production frontend`
4. `icp sync -e ic --identity production frontend`

Note: If the mapping between `frontend` and the real canister ID is not configured (`.icp/ic/canister_ids.json`), create that mapping before deployment.

## 4. Verify deployment

1. `icp canister status rlhjx-iyaaa-aaaaf-qcnyq-cai -e ic --identity production --json`
2. `curl -I https://rlhjx-iyaaa-aaaaf-qcnyq-cai.icp0.io/`
3. `curl -I https://rlhjx-iyaaa-aaaaf-qcnyq-cai.raw.icp0.io/`

## 5. Common failure cases

- Wrong identity: deployment/sync fails if the identity is not a controller.
- Missing environment flag: without `-e ic`, commands may run against local.
- Missing rebuild: stale `apps/web/build` gets deployed.
- Missing canister ID mapping for `frontend`: `icp deploy frontend` fails to resolve target ID.

## 6. Production checklist

- Confirmed you are using the `production` identity
- Confirmed `frontend` points to `rlhjx-iyaaa-aaaaf-qcnyq-cai`
- Confirmed build artifact timestamp is current
- Confirmed canister status and HTTP responses after deploy/sync
