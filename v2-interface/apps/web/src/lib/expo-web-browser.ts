export const WebBrowserPresentationStyle = {
  FULL_SCREEN: 'fullScreen',
} as const

export async function openBrowserAsync(uri: string): Promise<{ type: 'opened' | 'dismissed' }> {
  if (typeof window !== 'undefined') {
    window.open(uri, '_blank', 'noopener,noreferrer')
  }
  return { type: 'opened' }
}

export async function dismissBrowser(): Promise<void> {
  return
}

export async function openAuthSessionAsync(uri: string): Promise<{ type: 'success'; url: string }> {
  if (typeof window !== 'undefined') {
    window.open(uri, '_blank', 'noopener,noreferrer')
  }
  return { type: 'success', url: uri }
}

export async function maybeCompleteAuthSession(): Promise<void> {
  return
}

export async function warmUpAsync(): Promise<void> {
  return
}

export async function coolDownAsync(): Promise<void> {
  return
}

export default {
  WebBrowserPresentationStyle,
  openBrowserAsync,
  dismissBrowser,
  openAuthSessionAsync,
  maybeCompleteAuthSession,
  warmUpAsync,
  coolDownAsync,
}
