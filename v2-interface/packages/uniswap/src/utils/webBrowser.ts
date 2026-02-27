export const WebBrowserPresentationStyle = {
  FULL_SCREEN: 'fullScreen',
} as const

export async function openBrowserAsync(uri: string): Promise<{ type: 'opened' | 'dismissed' }> {
  if (typeof window !== 'undefined') {
    window.open(uri, '_blank', 'noopener,noreferrer')
  }
  return { type: 'opened' }
}
