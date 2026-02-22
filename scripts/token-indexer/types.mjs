// where: scripts/token-indexer shared definitions
// what: Minimal shape validators and constants for token indexer modules
// why: Keep runtime checks explicit in plain Node.js without TypeScript

export const SECONDS_IN_24H = 24n * 60n * 60n

export function assertObject(value, message) {
  if (typeof value !== 'object' || value === null) {
    throw new Error(message)
  }
}

export function assertString(value, message) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(message)
  }
}

export function assertNumber(value, message) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(message)
  }
}

export function assertBoolean(value, message) {
  if (typeof value !== 'boolean') {
    throw new Error(message)
  }
}
