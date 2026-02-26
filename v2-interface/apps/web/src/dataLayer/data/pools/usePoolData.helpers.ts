import { parseAbi } from 'viem'

export interface SupabasePoolSnapshotRow {
  readonly fee_tier_bps: number | null
  readonly token0_symbol: string
  readonly token1_symbol: string
  readonly token0_name: string
  readonly token1_name: string
  readonly token0_decimals: number
  readonly token1_decimals: number
  readonly token0_logo_uri: string | null
  readonly token1_logo_uri: string | null
  readonly tvl_usd: number
  readonly volume_24h_usd: number
}

export const V2_PAIR_ABI = parseAbi([
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function totalSupply() view returns (uint256)',
])

const DEFAULT_SUPABASE_URL = 'https://kvkejvvkhslmudjcvsbq.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2a2VqdnZraHNsbXVkamN2c2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzkwOTUsImV4cCI6MjA4NzMxNTA5NX0.DTu4KuEdJ5USpp9fm5QX2sJojkpsSdc0g6vXPnOrMYg'

function normalizeEnvValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function isValidHttpUrl(value: string | undefined): boolean {
  if (!value) {
    return false
  }
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

function isSupabasePoolSnapshotRow(value: unknown): value is SupabasePoolSnapshotRow {
  if (!value || typeof value !== 'object') {
    return false
  }

  const token0Symbol = Reflect.get(value, 'token0_symbol')
  const token1Symbol = Reflect.get(value, 'token1_symbol')
  const token0Name = Reflect.get(value, 'token0_name')
  const token1Name = Reflect.get(value, 'token1_name')
  const token0Decimals = Reflect.get(value, 'token0_decimals')
  const token1Decimals = Reflect.get(value, 'token1_decimals')
  const tvlUsd = toFiniteNumber(Reflect.get(value, 'tvl_usd'))
  const volume24hUsd = toFiniteNumber(Reflect.get(value, 'volume_24h_usd'))

  return (
    typeof token0Symbol === 'string' &&
    typeof token1Symbol === 'string' &&
    typeof token0Name === 'string' &&
    typeof token1Name === 'string' &&
    typeof token0Decimals === 'number' &&
    typeof token1Decimals === 'number' &&
    tvlUsd !== undefined &&
    volume24hUsd !== undefined
  )
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function normalizeSupabasePoolSnapshotRow(row: SupabasePoolSnapshotRow): SupabasePoolSnapshotRow {
  return {
    ...row,
    tvl_usd: toFiniteNumber(row.tvl_usd) ?? 0,
    volume_24h_usd: toFiniteNumber(row.volume_24h_usd) ?? 0,
  }
}

export function resolveSupabaseConfig(): { supabaseUrl: string; supabaseAnonKey: string } {
  const envSupabaseUrl = normalizeEnvValue(process.env.REACT_APP_SUPABASE_URL)
  const envSupabaseAnonKey = normalizeEnvValue(process.env.REACT_APP_SUPABASE_ANON_KEY)
  const supabaseUrl = isValidHttpUrl(envSupabaseUrl) ? envSupabaseUrl ?? DEFAULT_SUPABASE_URL : DEFAULT_SUPABASE_URL
  const supabaseAnonKey = envSupabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY
  return { supabaseUrl, supabaseAnonKey }
}

export function bigintToNumber(value: bigint, decimals: number): number {
  const parsed = Number(value) / 10 ** decimals
  return Number.isFinite(parsed) ? parsed : 0
}

export function getSupabasePoolSnapshot(params: {
  supabaseUrl: string
  supabaseAnonKey: string
  chainId: number
  poolAddress: string
}): Promise<SupabasePoolSnapshotRow | undefined> {
  const url =
    `${params.supabaseUrl}/rest/v1/v_pool_market_snapshot_public?` +
    `chain_id=eq.${params.chainId}&address=eq.${params.poolAddress.toLowerCase()}` +
    '&limit=1' +
    '&select=fee_tier_bps,token0_symbol,token1_symbol,token0_name,token1_name,token0_decimals,token1_decimals,token0_logo_uri,token1_logo_uri,tvl_usd,volume_24h_usd'

  return fetch(url, {
    headers: {
      apikey: params.supabaseAnonKey,
      authorization: `Bearer ${params.supabaseAnonKey}`,
      'content-profile': 'public',
      'accept-profile': 'public',
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Supabase pool snapshot read failed: ${response.status}`)
      }
      const payload: unknown = await response.json()
      if (!Array.isArray(payload) || payload.length === 0) {
        return undefined
      }
      return isSupabasePoolSnapshotRow(payload[0]) ? normalizeSupabasePoolSnapshotRow(payload[0]) : undefined
    })
    .catch(() => undefined)
}
