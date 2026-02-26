# Token Search Foundation (Supabase)

## What this adds

- Supabase migration for:
  - `token_registry`
  - `token_market_snapshot`
  - `token_search_index`
  - `pool_market_snapshot`
- Hardening migration for read surface:
  - `v_token_registry_public`
  - `v_token_market_snapshot_public`
  - `v_token_search_public`
  - `v_pool_market_snapshot_public`
  - revoke base-table access from `anon/authenticated`
- Token indexer pipeline in `packages/api/src/tokenIndexer`
  - token list fetch/normalize
  - RPC liquidity + 24h volume collection (Uniswap V2 pair model)
  - Kasane V2 factory discovery (no Explore API dependency)
  - RPC-derived pool snapshot upsert (`pool_market_snapshot`)
  - rank score generation
  - PostgREST upsert to Supabase
- Runner script: `packages/api/scripts/runTokenSearchIndexer.ts`

Note:
- `token-indexer:run` updates:
  - `token_registry`, `token_market_snapshot`, `token_search_index`
  - `pool_market_snapshot` (RPCから算出)
  - `v2_user_lp_positions`（`INDEXER_V2_USER_WALLET_ADDRESSES` 指定時）

## Migration

実行ディレクトリは `v2-interface` に固定:

```bash
cd /Users/0xhude/Desktop/Kasane/dex/v2-interface
supabase db push
```

Migration files:

- `v2-interface/supabase/migrations/20260222090000_token_search_foundation.sql`
- `v2-interface/supabase/migrations/20260222094000_harden_token_search_reads.sql`
- `v2-interface/supabase/migrations/20260223180000_explore_tokens_pools_foundation.sql`
- `v2-interface/supabase/migrations/20260226101000_create_v2_user_lp_positions.sql`

## Runtime env vars

- `INDEXER_CHAIN_ID`
- `INDEXER_RPC_URL`
- `INDEXER_V2_FACTORY_ADDRESS` (optional, defaultあり)
- `INDEXER_V2_MAX_PAIRS` (optional)
- `INDEXER_STABLE_TOKEN_ADDRESSES` (optional, comma-separated)
- `INDEXER_TOKEN_LIST_URLS` (optional, comma-separated)
- `INDEXER_V2_USER_WALLET_ADDRESSES` (optional, comma-separated)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Run once

```bash
cd v2-interface/packages/api
bun run token-indexer:run
```

## 5-minute schedule example

Use your scheduler (GitHub Actions/Cron/worker) to run every 5 minutes:

```bash
*/5 * * * * cd /path/to/dex/v2-interface/packages/api && bun run token-indexer:run
```

This repository now includes a GitHub Actions workflow:

- `/Users/0xhude/Desktop/Kasane/dex/v2-interface/.github/workflows/token_search_indexer.yml`

Required GitHub repository secrets for the workflow:

- `INDEXER_CHAIN_ID`
- `INDEXER_RPC_URL`
- `INDEXER_V2_FACTORY_ADDRESS` (optional)
- `INDEXER_V2_MAX_PAIRS` (optional)
- `INDEXER_STABLE_TOKEN_ADDRESSES` (optional)
- `INDEXER_TOKEN_LIST_URLS` (optional)
- `INDEXER_V2_USER_WALLET_ADDRESSES` (optional)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Supabase read query examples (hardened)

Token list:

```sql
select *
from v_token_registry_public
where chain_id = 1
order by verified desc, priority desc, symbol asc
limit 100;
```

Token search:

```sql
select chain_id, address, symbol, name, price_usd, price_change_1d_pct, fdv_usd, volume_24h_usd, rank_score
from v_token_search_public
where chain_id = 1 and search_text ilike '%usdc%'
order by rank_score desc
limit 50;
```

Top pools:

```sql
select chain_id, address, protocol_version, token0_symbol, token1_symbol, tvl_usd, volume_24h_usd, volume_30d_usd
from v_pool_market_snapshot_public
where chain_id = 1
order by tvl_usd desc
limit 50;
```

## Security model

- Frontend uses `anon` key only.
- Base tables are not readable by `anon/authenticated`.
- Public read is only via read-only views above.
- `is_spam=false` is enforced in SQL view definitions.
- Writes require service-role key and are only performed by indexer.

## Failure behavior

- If at least one configured pool fails in a cycle:
  - `token_registry` is still upserted
  - market/search updates are skipped to avoid partial snapshot updates
  - runner exits with code `2`

This keeps previously published liquidity/search ranking intact.
