// Web-only ESM shim for packages that default-import `invariant`.
// Rolldown dev can resolve `invariant` to CJS browser.js without default export.
export default function invariant(
  condition: unknown,
  format?: string,
  a?: unknown,
  b?: unknown,
  c?: unknown,
  d?: unknown,
  e?: unknown,
  f?: unknown,
): void {
  if (process.env.NODE_ENV !== 'production' && format === undefined) {
    throw new Error('invariant requires an error message argument')
  }

  if (condition) {
    return
  }

  if (format === undefined) {
    throw new Error(
      'Minified exception occurred; use the non-minified dev environment for the full error message and additional helpful warnings.',
    )
  }

  const args = [a, b, c, d, e, f]
  let argIndex = 0
  const error = new Error(format.replace(/%s/g, () => String(args[argIndex++])))
  error.name = 'Invariant Violation'
  const invariantError: Error & { framesToPop?: number } = error
  invariantError.framesToPop = 1
  throw error
}
