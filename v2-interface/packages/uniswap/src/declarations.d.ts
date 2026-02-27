declare module '*.svg' {
  import React from 'react'
  import type { SvgProps } from 'react-native-svg'
  const content: React.FC<SvgProps>
  export default content
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
