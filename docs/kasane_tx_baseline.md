# Kasane Tx 基本セット

Kasane でトランザクション送信時に使う共通パラメータの基準です。  
以後、tx を送る作業はこのドキュメントを基準にしてください。

## 1) 共通設定（基本）

- `RPC_URL=https://rpc-testnet.kasane.network`
- `EXPECTED_CHAIN_ID=4801360`
- `CONFIRM_DEPLOY=YES`（スクリプト実行時）

## 2) Fee / Gas の推奨値

まずは以下を基準にします。

- `BASE_FEE_GWEI=250`
- `PRIORITY_FEE_GWEI=250`
- `GAS_LIMIT=5000000`（`addLiquidity` などコントラクト呼び出し）

補足:
- `transfer` のような単純 tx は `21000` で十分。
- `viem` を直接使う場合は `maxFeePerGas=250 gwei` / `maxPriorityFeePerGas=250 gwei` から開始。
- `submit.invalid_fee` が出る場合のみ `1000/1000 gwei` に引き上げる。

## 3) 実行前チェック

- 送信アカウントの `ICP` 残高があること（手数料用）
- WICP を使う処理なら `WICP` 残高があること（必要なら先に `deposit()`）
- `docs/deployments/latest-testnet.json` の `factory/router02/weth` が最新であること
- `docs/deployments/latest-testnet.tokens.json` の token address が最新であること

## 4) 実行テンプレート

`docs/deployments/deployer.kasane.env` を使う前提。

```bash
cd /Users/0xhude/Desktop/Kasane/dex
set -a && source docs/deployments/deployer.kasane.env && set +a
```

### WICP-testUSDC

```bash
CONFIRM_DEPLOY=YES \
PAIR_KIND=WICP_TESTUSDC \
AMOUNT_A="10" \
AMOUNT_B="2000" \
GAS_PRICE_GWEI="250" \
GAS_LIMIT="5000000" \
npm run seed:liquidity
```

### WICP-tes

```bash
CONFIRM_DEPLOY=YES \
PAIR_KIND=WICP_TES \
AMOUNT_A="10" \
AMOUNT_B="1000" \
GAS_PRICE_GWEI="250" \
GAS_LIMIT="5000000" \
npm run seed:liquidity
```

## 5) 失敗時の優先確認

1. `submit.invalid_fee` が出ていないか
2. 送信アカウントの `WICP` / 対象トークン残高
3. `factory.getPair(tokenA, tokenB)` の結果（`0x0` のままか）
4. 実行した tx の `status` / `gasUsed` / `gasPrice`
