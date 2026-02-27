// Runtime-safe backend API shim.
// Returns stable string values for enum-like members so property reads do not crash.

function createEnum() {
  return new Proxy<Record<string, string>>(
    {},
    {
      get: (_target, prop) => (typeof prop === 'string' ? prop : ''),
    },
  )
}

export const Chain = createEnum()
export const Currency = createEnum()
export const HistoryDuration = createEnum()
export const PoolTransactionType = createEnum()
export const PriceSource = createEnum()
export const ProtectionAttackType = createEnum()
export const ProtectionResult = createEnum()
export const ProtocolVersion = createEnum()
export const SafetyLevel = createEnum()
export const SwapOrderStatus = createEnum()
export const SwapOrderType = createEnum()
export const TokenStandard = createEnum()
export const TransactionDirection = createEnum()
export const TransactionStatus = createEnum()
export const TransactionType = createEnum()
export const ActivityType = createEnum()

// Minimal document placeholders used by query callers.
export const PortfolioBalancesDocument = {}
export const TokenDocument = {}
export const TokenWebDocument = {}
export const V2PairDocument = {}
export const V3PoolDocument = {}
export const V4PoolDocument = {}
export const TokenBalancePartsFragmentDoc = {}
