-- where: Supabase Postgres migration
-- what: Add a public aggregate view for chain-level pool TVL totals
-- why: Explore header TVL needs an accurate total from Supabase, not top-N pool slices

create or replace view public.v_pool_market_totals_public as
select
  p.chain_id,
  coalesce(sum(p.tvl_usd), 0) as total_tvl_usd,
  max(p.updated_at) as updated_at
from public.pool_market_snapshot p
group by p.chain_id;

revoke all on public.v_pool_market_totals_public from public;
grant select on public.v_pool_market_totals_public to anon, authenticated;

comment on view public.v_pool_market_totals_public is 'Chain-level aggregate TVL from pool_market_snapshot.';
