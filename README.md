# Uniswap V2 Fork Monorepo

このワークスペースは Uniswap V2 を安全にフォーク開発するための monorepo 構成です。

## 構成

- `v2-core`: `Uniswap/v2-core` のクローン
- `v2-periphery`: `Uniswap/v2-periphery` のクローン
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
