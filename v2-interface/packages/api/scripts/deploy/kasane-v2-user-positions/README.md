# Kasane Indexer (EC2)

`token-indexer:run` now handles Kasane-only indexing with no Explore API dependency.

- Updates: `token_registry`, `token_market_snapshot`, `token_search_index`, `pool_market_snapshot`
- Optional update: `v2_user_lp_positions` (when `INDEXER_V2_USER_WALLET_ADDRESSES` is set)
- Native token price enrichment: Binance `24hr` ticker (`INDEXER_NATIVE_PRICE_SYMBOL`, default `ICPUSDT`)
- Volume guard: per-pool 24h volume clamp (`INDEXER_MAX_POOL_VOLUME_24H_USD`, default `10000000`)

## 1. Code sync
```bash
cd /opt/kasane-dex
# If first time
# git clone <repo_url>
# Later updates
git pull
cd v2-interface
bun install
```

## 2. Env setup
```bash
sudo cp packages/api/scripts/deploy/kasane-v2-user-positions/.env.example /etc/kasane-indexer.env
sudo nano /etc/kasane-indexer.env
```

## 3. Systemd setup
```bash
sudo cp packages/api/scripts/deploy/kasane-v2-user-positions/kasane-v2-user-positions-indexer.service /etc/systemd/system/
sudo cp packages/api/scripts/deploy/kasane-v2-user-positions/kasane-v2-user-positions-indexer.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now kasane-v2-user-positions-indexer.timer
```

## 4. Check status
```bash
systemctl status kasane-v2-user-positions-indexer.timer
journalctl -u kasane-v2-user-positions-indexer.service -n 100 --no-pager
```

## 5. Manual run
```bash
cd /opt/kasane-dex/v2-interface/packages/api
set -a && source /etc/kasane-indexer.env && set +a
bun run token-indexer:run
```
