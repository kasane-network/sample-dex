import { RpcMarketCollectorConfig, V2PoolSpec } from '@universe/api/src/tokenIndexer/types'
import { getAddress } from 'viem'

interface TokenIndexerEnv {
  readonly chainId: number
  readonly tokenListUrls: readonly string[]
  readonly supabaseUrl: string
  readonly supabaseServiceRoleKey: string
  readonly rpcCollectorConfig: RpcMarketCollectorConfig
}

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function parseInteger(name: string, value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid integer for ${name}: ${value}`)
  }
  return parsed
}

function parsePoolSpecs(rawJson: string): readonly V2PoolSpec[] {
  const parsed: unknown = JSON.parse(rawJson)

  if (!Array.isArray(parsed)) {
    throw new Error('INDEXER_V2_POOLS_JSON must be a JSON array')
  }

  return parsed.map((item) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error('Each pool entry must be an object')
    }

    const candidate = item

    if (!('poolAddress' in candidate) || typeof candidate.poolAddress !== 'string') {
      throw new Error('Invalid pool entry in INDEXER_V2_POOLS_JSON')
    }
    if (!('token0Address' in candidate) || typeof candidate.token0Address !== 'string') {
      throw new Error('Invalid pool entry in INDEXER_V2_POOLS_JSON')
    }
    if (!('token1Address' in candidate) || typeof candidate.token1Address !== 'string') {
      throw new Error('Invalid pool entry in INDEXER_V2_POOLS_JSON')
    }
    if (!('token0Decimals' in candidate) || typeof candidate.token0Decimals !== 'number') {
      throw new Error('Invalid pool entry in INDEXER_V2_POOLS_JSON')
    }
    if (!('token1Decimals' in candidate) || typeof candidate.token1Decimals !== 'number') {
      throw new Error('Invalid pool entry in INDEXER_V2_POOLS_JSON')
    }
    if (!('token0IsStableUsd' in candidate) || typeof candidate.token0IsStableUsd !== 'boolean') {
      throw new Error('Invalid pool entry in INDEXER_V2_POOLS_JSON')
    }
    if (!('token1IsStableUsd' in candidate) || typeof candidate.token1IsStableUsd !== 'boolean') {
      throw new Error('Invalid pool entry in INDEXER_V2_POOLS_JSON')
    }

    return {
      poolAddress: getAddress(candidate.poolAddress),
      token0Address: getAddress(candidate.token0Address),
      token1Address: getAddress(candidate.token1Address),
      token0Decimals: candidate.token0Decimals,
      token1Decimals: candidate.token1Decimals,
      token0IsStableUsd: candidate.token0IsStableUsd,
      token1IsStableUsd: candidate.token1IsStableUsd,
    }
  })
}

export function readTokenIndexerEnv(): TokenIndexerEnv {
  const chainId = parseInteger('INDEXER_CHAIN_ID', requiredEnv('INDEXER_CHAIN_ID'))
  const tokenListUrls = requiredEnv('INDEXER_TOKEN_LIST_URLS')
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url.length > 0)

  if (tokenListUrls.length === 0) {
    throw new Error('INDEXER_TOKEN_LIST_URLS must include at least one URL')
  }

  const rpcCollectorConfig: RpcMarketCollectorConfig = {
    chainId,
    rpcUrl: requiredEnv('INDEXER_RPC_URL'),
    pools: parsePoolSpecs(requiredEnv('INDEXER_V2_POOLS_JSON')),
  }

  return {
    chainId,
    tokenListUrls,
    supabaseUrl: requiredEnv('SUPABASE_URL'),
    supabaseServiceRoleKey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    rpcCollectorConfig,
  }
}
