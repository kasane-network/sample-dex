import { useCallback, useState } from 'react'
import { LayoutChangeEvent } from 'react-native'
import { View } from 'tamagui'
import { type FlexProps } from 'ui/src/components/layout'
import { isTestEnv } from 'utilities/src/environment/env'

export interface HeightAnimatorProps {
  open?: boolean
  useInitialHeight?: boolean
  animation?: FlexProps['animation']
  styleProps?: FlexProps
  animationDisabled?: boolean // we want to disable animation when inside of a bottom sheet
}

export const HeightAnimator = View.styleable<HeightAnimatorProps>(
  ({ open = true, animationDisabled = false, children, useInitialHeight, animation = 'fast', styleProps }) => {
    const [visibleHeight, setVisibleHeight] = useState(useInitialHeight ? children.height : 0)

    const onLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
      if (nativeEvent.layout.height) {
        setVisibleHeight(nativeEvent.layout.height)
      }
    }, [])

    return (
      <View
        animation={animationDisabled || isTestEnv() ? null : animation}
        height={open ? visibleHeight : 0}
        overflow="hidden"
        width="100%"
        {...styleProps}
      >
        <View position="absolute" width="100%" onLayout={onLayout}>
          {children}
        </View>
      </View>
    )
  },
)
