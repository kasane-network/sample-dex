import { createTamagui } from 'ui/src'
import { configWithoutAnimations, TamaguiGroupNames } from 'ui/src/theme/config'
import { cssAnimations } from './theme/cssAnimations'

const {
  // web has specific settings (see below)
  settings: _settings,
  ...defaultConfig
} = configWithoutAnimations

export const config = createTamagui({
  ...defaultConfig,
  animations: cssAnimations,
  settings: {
    // leaving out allowedStyleValues - we want looser string values for most
    // styles (so you can use "1rem", "calc(...)" and other CSS goodies):
    autocompleteSpecificTokens: 'except-special',
  },
})

type Conf = typeof config

declare module '@tamagui/core' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface TamaguiCustomConfig extends Conf {}

  interface TypeOverride {
    groupNames(): TamaguiGroupNames
  }
}

export default config
