import { PlanParams } from 'uniswap/src/features/transactions/swap/plan/types'

const PLAN_RUNTIME_PARAMS_TTL_MS = 5 * 60 * 1000
const MAX_PLAN_RUNTIME_PARAMS = 200

function createRuntimeId(): string {
  return `plan-runtime-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

type TimedPlanParams = {
  params: PlanParams
  createdAt: number
}

const planParamsById = new Map<string, TimedPlanParams>()

function cleanupExpiredAndOverflow(now: number): void {
  for (const [key, value] of planParamsById) {
    if (now - value.createdAt > PLAN_RUNTIME_PARAMS_TTL_MS) {
      planParamsById.delete(key)
    }
  }

  while (planParamsById.size > MAX_PLAN_RUNTIME_PARAMS) {
    const oldestKey = planParamsById.keys().next().value
    if (!oldestKey) {
      break
    }
    planParamsById.delete(oldestKey)
  }
}

export type PlanSagaRuntimePayload = {
  runtimeId: string
}

export function registerPlanSagaParams(params: PlanParams): PlanSagaRuntimePayload {
  const now = Date.now()
  cleanupExpiredAndOverflow(now)
  const runtimeId = createRuntimeId()
  planParamsById.set(runtimeId, { params, createdAt: now })
  return { runtimeId }
}

export function consumePlanSagaParams(runtimeId: string): PlanParams | undefined {
  const now = Date.now()
  cleanupExpiredAndOverflow(now)

  const params = planParamsById.get(runtimeId)
  planParamsById.delete(runtimeId)
  return params?.params
}
