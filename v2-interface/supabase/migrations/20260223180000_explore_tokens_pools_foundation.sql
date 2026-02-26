-- where: Supabase Postgres migration
-- what: Extend token market snapshots for Explore stats and add pool market snapshots for Explore Pools tab
-- why: Replace Uniswap Explore API reads with Supabase-backed token/pool datasets

alter table public.token_market_snapshot
  add column if not exists price_usd numeric not null default 0,
  add column if not exists price_change_1h_pct numeric not null default 0,
  add column if not exists price_change_1d_pct numeric not null default 0,
  add column if not exists fdv_usd numeric not null default 0,
  add column if not exists volume_1h_usd numeric not null default 0,
  add column if not exists volume_1w_usd numeric not null default 0,
  add column if not exists volume_1m_usd numeric not null default 0,
  add column if not exists volume_1y_usd numeric not null default 0,
  add column if not exists sparkline_1d jsonb not null default '[]'::jsonb;

create table if not exists public.pool_market_snapshot (
  chain_id bigint not null,
  address text not null,
  protocol_version text not null default 'v2',
  fee_tier_bps integer,
  token0_address text not null,
  token1_address text not null,
  token0_symbol text not null,
  token1_symbol text not null,
  token0_name text not null,
  token1_name text not null,
  token0_decimals integer not null check (token0_decimals >= 0 and token0_decimals <= 255),
  token1_decimals integer not null check (token1_decimals >= 0 and token1_decimals <= 255),
  token0_logo_uri text,
  token1_logo_uri text,
  tvl_usd numeric not null default 0,
  volume_24h_usd numeric not null default 0,
  volume_30d_usd numeric not null default 0,
  boosted_apr numeric,
  updated_at timestamptz not null,
  constraint pool_market_snapshot_pkey primary key (chain_id, address)
);

create index if not exists pool_market_snapshot_chain_tvl_idx
  on public.pool_market_snapshot (chain_id, tvl_usd desc);

create index if not exists pool_market_snapshot_chain_volume_idx
  on public.pool_market_snapshot (chain_id, volume_24h_usd desc);

create index if not exists pool_market_snapshot_chain_protocol_idx
  on public.pool_market_snapshot (chain_id, protocol_version);

alter table public.pool_market_snapshot enable row level security;

drop policy if exists pool_market_snapshot_read on public.pool_market_snapshot;
create policy pool_market_snapshot_read
  on public.pool_market_snapshot
  for select
  to anon, authenticated
  using (true);

drop view if exists public.v_token_market_snapshot_public;
create view public.v_token_market_snapshot_public as
select
  m.chain_id,
  m.address,
  m.liquidity_usd,
  m.volume_24h_usd,
  m.price_usd,
  m.price_change_1h_pct,
  m.price_change_1d_pct,
  m.fdv_usd,
  m.volume_1h_usd,
  m.volume_1w_usd,
  m.volume_1m_usd,
  m.volume_1y_usd,
  m.sparkline_1d,
  m.updated_at
from public.token_market_snapshot m
join public.token_registry r
  on r.chain_id = m.chain_id
 and r.address = m.address
where r.is_spam = false;

drop view if exists public.v_token_search_public;
create view public.v_token_search_public as
select
  s.chain_id,
  s.address,
  s.search_text,
  s.rank_score,
  s.updated_at,
  r.symbol,
  r.name,
  r.decimals,
  r.logo_uri,
  r.verified,
  r.priority,
  r.source_primary,
  coalesce(m.liquidity_usd, 0) as liquidity_usd,
  coalesce(m.volume_24h_usd, 0) as volume_24h_usd,
  coalesce(m.price_usd, 0) as price_usd,
  coalesce(m.price_change_1h_pct, 0) as price_change_1h_pct,
  coalesce(m.price_change_1d_pct, 0) as price_change_1d_pct,
  coalesce(m.fdv_usd, 0) as fdv_usd,
  coalesce(m.volume_1h_usd, 0) as volume_1h_usd,
  coalesce(m.volume_1w_usd, 0) as volume_1w_usd,
  coalesce(m.volume_1m_usd, 0) as volume_1m_usd,
  coalesce(m.volume_1y_usd, 0) as volume_1y_usd,
  coalesce(m.sparkline_1d, '[]'::jsonb) as sparkline_1d
from public.token_search_index s
join public.token_registry r
  on r.chain_id = s.chain_id
 and r.address = s.address
left join public.token_market_snapshot m
  on m.chain_id = s.chain_id
 and m.address = s.address
where r.is_spam = false;

create or replace view public.v_pool_market_snapshot_public as
select
  p.chain_id,
  p.address,
  p.protocol_version,
  p.fee_tier_bps,
  p.token0_address,
  p.token1_address,
  p.token0_symbol,
  p.token1_symbol,
  p.token0_name,
  p.token1_name,
  p.token0_decimals,
  p.token1_decimals,
  p.token0_logo_uri,
  p.token1_logo_uri,
  p.tvl_usd,
  p.volume_24h_usd,
  p.volume_30d_usd,
  p.boosted_apr,
  p.updated_at
from public.pool_market_snapshot p;

revoke all on public.pool_market_snapshot from anon, authenticated;
revoke all on public.v_pool_market_snapshot_public from public;

grant select on public.v_pool_market_snapshot_public to anon, authenticated;

comment on table public.pool_market_snapshot is 'Latest pool-level TVL/volume snapshot for Explore pools table.';
