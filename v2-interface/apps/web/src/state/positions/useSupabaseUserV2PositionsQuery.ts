// where: web positions state
// what: query v2 user LP rows from Supabase public view
// why: render wallet-specific V2 LP list without interface gateway APIs

import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { createSupabaseExploreReadClient } from '@universe/api/src/tokenIndexer/supabaseExploreReadClient'
import { UniverseChainId } from 'uniswap/src/features/chains/types'

const DEFAULT_SUPABASE_URL = 'https://kvkejvvkhslmudjcvsbq.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2a2VqdnZraHNsbXVkamN2c2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzkwOTUsImV4cCI6MjA4NzMxNTA5NX0.DTu4KuEdJ5USpp9fm5QX2sJojkpsSdc0g6vXPnOrMYg'

export interface UserV2PositionItem {
  readonly chainId: number
  readonly walletAddress: string
  readonly pairAddress: string
  readonly token0Address: string
  readonly token1Address: string
  readonly token0Symbol: string
  readonly token1Symbol: string
  readonly token0Decimals: number
  readonly token1Decimals: number
  readonly userAmount0Raw: string
  readonly userAmount1Raw: string
  readonly lpBalanceRaw: string
  readonly poolShareRatio: number
  readonly updatedAt: string
}

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

function toUserV2PositionItem(row: {
  readonly chainId: number
  readonly walletAddress: string
  readonly pairAddress: string
  readonly token0Address: string
  readonly token1Address: string
  readonly token0Symbol: string
  readonly token1Symbol: string
  readonly token0Decimals: number
  readonly token1Decimals: number
  readonly userAmount0Raw: string
  readonly userAmount1Raw: string
  readonly lpBalanceRaw: string
  readonly poolShareRatio: number
  readonly updatedAt: string
}): UserV2PositionItem {
  return {
    chainId: row.chainId,
    walletAddress: row.walletAddress,
    pairAddress: row.pairAddress,
    token0Address: row.token0Address,
    token1Address: row.token1Address,
    token0Symbol: row.token0Symbol,
    token1Symbol: row.token1Symbol,
    token0Decimals: row.token0Decimals,
    token1Decimals: row.token1Decimals,
    userAmount0Raw: row.userAmount0Raw,
    userAmount1Raw: row.userAmount1Raw,
    lpBalanceRaw: row.lpBalanceRaw,
    poolShareRatio: row.poolShareRatio,
    updatedAt: row.updatedAt,
  }
}

export function useSupabaseUserV2PositionsQuery(params: {
  readonly walletAddress?: string
  readonly chainId?: UniverseChainId
}): UseQueryResult<UserV2PositionItem[], Error> {
  const envSupabaseUrl = normalizeEnvValue(process.env.REACT_APP_SUPABASE_URL)
  const envSupabaseAnonKey = normalizeEnvValue(process.env.REACT_APP_SUPABASE_ANON_KEY)
  const supabaseUrl = isValidHttpUrl(envSupabaseUrl) ? envSupabaseUrl ?? DEFAULT_SUPABASE_URL : DEFAULT_SUPABASE_URL
  const supabaseAnonKey = envSupabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY

  return useQuery<UserV2PositionItem[], Error>({
    queryKey: ['supabase-user-v2-positions', params.walletAddress?.toLowerCase(), params.chainId],
    enabled: Boolean(params.walletAddress && params.chainId),
    queryFn: async () => {
      if (!params.walletAddress || !params.chainId) {
        return []
      }
      const client = createSupabaseExploreReadClient({
        supabaseUrl,
        anonKey: supabaseAnonKey,
      })
      const rows = await client.listUserV2Positions({
        chainId: params.chainId,
        walletAddress: params.walletAddress,
      })
      return rows.map(toUserV2PositionItem)
    },
  })
}
