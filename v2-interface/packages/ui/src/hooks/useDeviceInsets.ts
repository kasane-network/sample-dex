import type { EdgeInsets } from 'ui/src/hooks/types'
import { PlatformSplitStubError } from 'utilities/src/errors'

export function useDeviceInsets(): EdgeInsets {
  throw new PlatformSplitStubError('useDeviceInsets')
}
