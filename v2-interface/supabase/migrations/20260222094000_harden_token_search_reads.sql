-- where: Supabase Postgres migration
-- what: Harden token read surface by exposing read-only views and revoking base table selects
-- why: Supabase direct-read safety; enforce not-spam filtering and limit exposed columns

create or replace view public.v_token_registry_public as
select
  chain_id,
  address,
  symbol,
  name,
  decimals,
  logo_uri,
  verified,
  priority,
  source_primary,
  updated_at
from public.token_registry
where is_spam = false;

create or replace view public.v_token_market_snapshot_public as
select
  m.chain_id,
  m.address,
  m.liquidity_usd,
  m.volume_24h_usd,
  m.updated_at
from public.token_market_snapshot m
join public.token_registry r
  on r.chain_id = m.chain_id
 and r.address = m.address
where r.is_spam = false;

create or replace view public.v_token_search_public as
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
  coalesce(m.volume_24h_usd, 0) as volume_24h_usd
from public.token_search_index s
join public.token_registry r
  on r.chain_id = s.chain_id
 and r.address = s.address
left join public.token_market_snapshot m
  on m.chain_id = s.chain_id
 and m.address = s.address
where r.is_spam = false;

revoke all on public.token_registry from anon, authenticated;
revoke all on public.token_market_snapshot from anon, authenticated;
revoke all on public.token_search_index from anon, authenticated;

revoke all on public.v_token_registry_public from public;
revoke all on public.v_token_market_snapshot_public from public;
revoke all on public.v_token_search_public from public;

grant select on public.v_token_registry_public to anon, authenticated;
grant select on public.v_token_market_snapshot_public to anon, authenticated;
grant select on public.v_token_search_public to anon, authenticated;
