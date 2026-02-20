# Uniswap V2 Fork Monorepo

このワークスペースは Uniswap V2 を安全にフォーク開発するための monorepo 構成です。

## 構成

- `v2-core`: `Uniswap/v2-core` のクローン
- `v2-periphery`: `Uniswap/v2-periphery` のクローン
- `v2-interface`: `Uniswap/interface` のクローン（フロント）
- `scripts/setup.sh`: 依存インストール
- `scripts/test-all.sh`: compile/test 一括実行
- `package.json`: Yarn workspaces ルート設定

## 前提

- Node.js 16.x（このワークスペースは `.nvmrc` で `16.20.2` を指定）
- Yarn 1.x (`yarn -v` で確認)

## セットアップ

```bash
nvm use
yarn setup
```

## 動作確認

```bash
yarn test:all
```

## 最短デプロイ（安全ガード付き）

まず artifact を作成します（Yarn 非依存）。

```bash
npm run compile:all
```

次に、`Factory` / `WETH9` / `Router02` をデプロイします。  
誤デプロイ防止のため、`CONFIRM_DEPLOY=YES` と `EXPECTED_CHAIN_ID` が必須です。

```bash
CONFIRM_DEPLOY=YES \
RPC_URL="https://rpc-testnet.kasane.network" \
PRIVATE_KEY="<DEPLOYER_PRIVATE_KEY>" \
FEE_TO_SETTER="<FEE_TO_SETTER_ADDRESS>" \
EXPECTED_CHAIN_ID=4801360 \
npm run deploy:testnet
```

デプロイ結果は `docs/deployments/latest-testnet.json` に保存されます。

### テストトークンのデプロイ（testETH / testUSDC）

`KasaneTestERC20` を使って `testETH(18桁)` と `testUSDC(6桁)` を同時にデプロイします。

```bash
CONFIRM_DEPLOY=YES \
RPC_URL="https://rpc-testnet.kasane.network" \
PRIVATE_KEY="<DEPLOYER_PRIVATE_KEY>" \
EXPECTED_CHAIN_ID=4801360 \
npm run deploy:test-tokens
```

必要に応じて以下を上書きできます。

- `TOKEN_RECIPIENT`（初期発行先。未指定時はデプロイヤー）
- `TEST_ETH_SUPPLY`（整数文字列。既定: `1000000`）
- `TEST_USDC_SUPPLY`（整数文字列。既定: `1000000000`）

出力先は `docs/deployments/latest-testnet.tokens.json` です。

## フロント起動（Uniswap interface fork）

`v2-interface` は `bun` と `node v22.13.1` が前提です。
このforkは通常 `Web` 起動（`bun web start`）を対象とし、`apps/mobile` の実行は前提にしません。

```bash
npm run setup:interface
npm run frontend:start
```

`bun` が未導入の場合は、先に Bun をインストールしてください。

Kasane専用のカスタムページは `v2-interface` 起動後に以下でアクセスできます。

- `/swap/kasane`

## 対象チェーン情報（testnet）

| 項目 | 値 |
| --- | --- |
| 環境名 | testnet（現行運用名） |
| ネットワーク | kasane |
| Canister ID | `4c52m-aiaaa-aaaam-agwwa-cai` |
| Chain ID | `4801360` |
| RPC URL | [https://rpc-testnet.kasane.network](https://rpc-testnet.kasane.network) |
| Explorer URL | [https://explorer-testnet.kasane.network](https://explorer-testnet.kasane.network) |

## monorepo 化について

`v2-core` / `v2-periphery` は単一のルート Git で管理します。

## フォーク運用の基本

各リポジトリで `upstream` は公式を維持し、`origin` に自分の fork を設定してください。

```bash
# core
cd v2-core
git remote rename origin upstream
git remote add origin <YOUR_FORK_REPO_URL>

# periphery
cd ../v2-periphery
git remote rename origin upstream
git remote add origin <YOUR_FORK_REPO_URL>
```
