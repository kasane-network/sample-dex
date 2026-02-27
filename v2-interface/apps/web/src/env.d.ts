// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../index.d.ts" />
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../packages/ui/src/env.d.ts" />

import { config, TamaguiGroupNames } from 'tamagui.config'

type Conf = typeof config

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface TamaguiCustomConfig extends Conf {}

  interface TypeOverride {
    groupNames(): TamaguiGroupNames
  }
}

declare module 'react-native-fast-image' {
  import type { ImageStyle, StyleProp } from 'react-native'

  export type ResizeMode = 'contain' | 'cover' | 'stretch' | 'center'

  export type FastImageProps = {
    shouldRasterizeIOS?: boolean
    style?: StyleProp<ImageStyle>
    source?: { uri?: string }
    resizeMode?: ResizeMode
  }
}
