# backend

このディレクトリは、実運用で参照しているバックエンド向けコントラクトartifactのみをGit管理するための場所です。

## contracts
- `WETH9.json`
- `UniswapV2Factory.json`
- `UniswapV2Router02.json`
- `KasaneTestERC20.json`

`scripts/deploy-dex-v2.js` と `scripts/deploy-test-tokens.js` は上記ファイルを直接参照します。

## solidity
- `WETH9.sol`
- `UniswapV2Factory.sol`
- `UniswapV2Router02.sol`
- `KasaneTestERC20.sol`

`contracts/*.json` に対応するデプロイ対象 Solidity のソースを保管しています。
