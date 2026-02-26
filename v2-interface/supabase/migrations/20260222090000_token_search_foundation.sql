-- where: Supabase Postgres migration
-- what: Create token search foundation tables for registry, market snapshots, and search index
-- why: Serve token list/search candidates without GraphQL using indexer + RPC data

create extension if not exists pg_trgm;

create table if not exists public.token_registry (
  chain_id bigint not null,
  address text not null,
  symbol text not null,
  name text not null,
  decimals integer not null check (decimals >= 0 and decimals <= 255),
  logo_uri text,
  verified boolean not null default false,
  is_spam boolean not null default false,
  priority integer not null default 0,
  source_primary text not null,
  updated_at timestamptz not null,
  constraint token_registry_pkey primary key (chain_id, address)
);

create index if not exists token_registry_chain_symbol_idx
  on public.token_registry (chain_id, symbol);

create index if not exists token_registry_chain_verified_priority_idx
  on public.token_registry (chain_id, verified desc, priority desc);

create table if not exists public.token_market_snapshot (
  chain_id bigint not null,
  address text not null,
  liquidity_usd numeric not null default 0,
  volume_24h_usd numeric not null default 0,
  updated_at timestamptz not null,
  constraint token_market_snapshot_pkey primary key (chain_id, address),
  constraint token_market_snapshot_registry_fk
    foreign key (chain_id, address)
    references public.token_registry (chain_id, address)
    on delete cascade
);

create index if not exists token_market_snapshot_chain_liquidity_idx
  on public.token_market_snapshot (chain_id, liquidity_usd desc);

create index if not exists token_market_snapshot_chain_volume_idx
  on public.token_market_snapshot (chain_id, volume_24h_usd desc);

create table if not exists public.token_search_index (
  chain_id bigint not null,
  address text not null,
  search_text text not null,
  rank_score numeric not null,
  updated_at timestamptz not null,
  constraint token_search_index_pkey primary key (chain_id, address),
  constraint token_search_index_registry_fk
    foreign key (chain_id, address)
    references public.token_registry (chain_id, address)
    on delete cascade
);

create index if not exists token_search_index_chain_rank_idx
  on public.token_search_index (chain_id, rank_score desc);

create index if not exists token_search_index_search_text_trgm_idx
  on public.token_search_index using gin (search_text gin_trgm_ops);

alter table public.token_registry enable row level security;
alter table public.token_market_snapshot enable row level security;
alter table public.token_search_index enable row level security;

drop policy if exists token_registry_read on public.token_registry;
create policy token_registry_read
  on public.token_registry
  for select
  to anon, authenticated
  using (not is_spam);

drop policy if exists token_market_snapshot_read on public.token_market_snapshot;
create policy token_market_snapshot_read
  on public.token_market_snapshot
  for select
  to anon, authenticated
  using (true);

drop policy if exists token_search_index_read on public.token_search_index;
create policy token_search_index_read
  on public.token_search_index
  for select
  to anon, authenticated
  using (true);

comment on table public.token_registry is 'Token registry canonical source for selector/search.';
comment on table public.token_market_snapshot is 'Latest liquidity and 24h volume snapshot by token.';
comment on table public.token_search_index is 'Denormalized text index and rank score for fast token search.';
