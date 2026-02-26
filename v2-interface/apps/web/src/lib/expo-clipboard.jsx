const canUseNavigatorClipboard =
  typeof navigator !== 'undefined' &&
  typeof navigator.clipboard !== 'undefined' &&
  typeof window !== 'undefined' &&
  window.isSecureContext

export async function setStringAsync(value) {
  if (!canUseNavigatorClipboard || typeof navigator.clipboard.writeText !== 'function') {
    return
  }

  try {
    await navigator.clipboard.writeText(String(value ?? ''))
  } catch {
    // Keep parity with native behavior where clipboard failures are non-fatal for UX flows.
  }
}

export async function getStringAsync() {
  if (!canUseNavigatorClipboard || typeof navigator.clipboard.readText !== 'function') {
    return ''
  }

  try {
    return await navigator.clipboard.readText()
  } catch {
    return ''
  }
}

export async function hasStringAsync() {
  const text = await getStringAsync()
  return text.length > 0
}

export default {
  setStringAsync,
  getStringAsync,
  hasStringAsync,
}
