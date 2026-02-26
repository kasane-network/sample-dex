import { useMemo } from 'react'
import { PositionDetails } from 'types/position'

/**
 * GraphQL removal: keep original positions list without GraphQL-based token metadata filtering.
 */
export function useFilterPossiblyMaliciousPositions(positions: PositionDetails[]): PositionDetails[] {
  return useMemo(() => positions, [positions])
}
