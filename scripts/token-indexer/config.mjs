// where: scripts/token-indexer config loader
// what: Parse and validate environment variables for one indexer cycle
// why: Fail fast on invalid runtime config to avoid partial/ambiguous writes

import { getAddress } from 'viem'
import {
  assertBoolean,
  assertNumber,
  assertObject,
  assertString,
} from './types.mjs'

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function parseInteger(name, value) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid integer for ${name}: ${value}`)
  }
  return parsed
}

function parseTokenListUrls(raw) {
  const urls = raw
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url.length > 0)

  if (urls.length === 0) {
    throw new Error('INDEXER_TOKEN_LIST_URLS must include at least one URL')
  }

  return urls
}

function parsePoolSpecs(rawJson) {
  const parsed = JSON.parse(rawJson)
  if (!Array.isArray(parsed)) {
    throw new Error('INDEXER_V2_POOLS_JSON must be a JSON array')
  }

  return parsed.map((item) => {
    assertObject(item, 'Each pool entry must be an object')

    assertString(item.poolAddress, 'Invalid poolAddress in INDEXER_V2_POOLS_JSON')
    assertString(item.token0Address, 'Invalid token0Address in INDEXER_V2_POOLS_JSON')
    assertString(item.token1Address, 'Invalid token1Address in INDEXER_V2_POOLS_JSON')
    assertNumber(item.token0Decimals, 'Invalid token0Decimals in INDEXER_V2_POOLS_JSON')
    assertNumber(item.token1Decimals, 'Invalid token1Decimals in INDEXER_V2_POOLS_JSON')
    assertBoolean(item.token0IsStableUsd, 'Invalid token0IsStableUsd in INDEXER_V2_POOLS_JSON')
    assertBoolean(item.token1IsStableUsd, 'Invalid token1IsStableUsd in INDEXER_V2_POOLS_JSON')

    return {
      poolAddress: getAddress(item.poolAddress),
      token0Address: getAddress(item.token0Address),
      token1Address: getAddress(item.token1Address),
      token0Decimals: item.token0Decimals,
      token1Decimals: item.token1Decimals,
      token0IsStableUsd: item.token0IsStableUsd,
      token1IsStableUsd: item.token1IsStableUsd,
    }
  })
}

export function readIndexerEnv() {
  const chainId = parseInteger('INDEXER_CHAIN_ID', requiredEnv('INDEXER_CHAIN_ID'))

  return {
    chainId,
    tokenListUrls: parseTokenListUrls(requiredEnv('INDEXER_TOKEN_LIST_URLS')),
    rpcCollectorConfig: {
      chainId,
      rpcUrl: requiredEnv('INDEXER_RPC_URL'),
      pools: parsePoolSpecs(requiredEnv('INDEXER_V2_POOLS_JSON')),
    },
    supabaseUrl: requiredEnv('SUPABASE_URL'),
    supabaseServiceRoleKey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  }
}
