import type { SwapParams } from './swapSaga'

const RUNTIME_PARAMS_TTL_MS = 5 * 60 * 1000
const MAX_RUNTIME_PARAMS = 200

function createRuntimeId(): string {
  return `runtime-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

type TimedSwapParams = {
  params: SwapParams
  createdAt: number
}

const swapParamsById = new Map<string, TimedSwapParams>()

function cleanupExpiredAndOverflow(now: number): void {
  for (const [key, value] of swapParamsById) {
    if (now - value.createdAt > RUNTIME_PARAMS_TTL_MS) {
      swapParamsById.delete(key)
    }
  }

  while (swapParamsById.size > MAX_RUNTIME_PARAMS) {
    const oldestKey = swapParamsById.keys().next().value
    if (!oldestKey) {
      break
    }
    swapParamsById.delete(oldestKey)
  }
}

export type SwapSagaRuntimePayload = {
  runtimeId: string
}

export function registerSwapSagaParams(params: SwapParams): SwapSagaRuntimePayload {
  const now = Date.now()
  cleanupExpiredAndOverflow(now)
  const runtimeId = createRuntimeId()
  swapParamsById.set(runtimeId, { params, createdAt: now })
  return { runtimeId }
}

export function consumeSwapSagaParams(runtimeId: string): SwapParams | undefined {
  const now = Date.now()
  cleanupExpiredAndOverflow(now)

  const params = swapParamsById.get(runtimeId)
  swapParamsById.delete(runtimeId)
  return params?.params
}
