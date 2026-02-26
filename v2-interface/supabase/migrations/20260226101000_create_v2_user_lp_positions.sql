-- where: Supabase public schema migration
-- what: create storage + public read view for Kasane V2 user LP positions
-- why: keep wallet-specific V2 LP list queryable without full RPC scan on each page load

create table if not exists public.v2_user_lp_positions (
  chain_id bigint not null,
  wallet_address text not null,
  pair_address text not null,
  lp_balance_raw numeric not null,
  lp_total_supply_raw numeric not null,
  reserve0_raw numeric not null,
  reserve1_raw numeric not null,
  token0_address text not null,
  token1_address text not null,
  token0_symbol text not null,
  token1_symbol text not null,
  token0_decimals integer not null,
  token1_decimals integer not null,
  user_amount0_raw numeric not null,
  user_amount1_raw numeric not null,
  updated_at timestamptz not null default now(),
  primary key (chain_id, wallet_address, pair_address)
);

create index if not exists v2_user_lp_positions_wallet_idx
  on public.v2_user_lp_positions (wallet_address, chain_id);

create or replace view public.v_v2_user_lp_positions_public as
select
  chain_id,
  wallet_address,
  pair_address,
  lp_balance_raw,
  lp_total_supply_raw,
  reserve0_raw,
  reserve1_raw,
  token0_address,
  token1_address,
  token0_symbol,
  token1_symbol,
  token0_decimals,
  token1_decimals,
  user_amount0_raw,
  user_amount1_raw,
  case
    when lp_total_supply_raw > 0 then lp_balance_raw / lp_total_supply_raw
    else 0
  end as pool_share_ratio,
  updated_at
from public.v2_user_lp_positions
where lp_balance_raw > 0;

alter table public.v2_user_lp_positions enable row level security;

drop policy if exists "Allow read v2_user_lp_positions" on public.v2_user_lp_positions;
create policy "Allow read v2_user_lp_positions"
  on public.v2_user_lp_positions
  for select
  to anon, authenticated
  using (true);
