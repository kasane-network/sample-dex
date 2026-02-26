-- where: Supabase Postgres migration
-- what: Extend chain-level pool totals view with 24h volume aggregate
-- why: Explore header 1D volume should be sourced from Supabase when external Explore API is disabled

drop view if exists public.v_pool_market_totals_public;

create or replace view public.v_pool_market_totals_public as
select
  p.chain_id,
  coalesce(sum(p.tvl_usd), 0) as total_tvl_usd,
  coalesce(sum(p.volume_24h_usd), 0) as total_volume_24h_usd,
  max(p.updated_at) as updated_at
from public.pool_market_snapshot p
group by p.chain_id;

revoke all on public.v_pool_market_totals_public from public;
grant select on public.v_pool_market_totals_public to anon, authenticated;

comment on view public.v_pool_market_totals_public is 'Chain-level aggregate TVL and 24h volume from pool_market_snapshot.';
