import { Key } from 'react'
import { ButtonProps, Flex, FlexProps } from 'ui/src'
import { AmountInputPresetsProps } from 'uniswap/src/components/CurrencyInputPanel/AmountInputPresets/types'
import { isHoverable } from 'utilities/src/platform'

export const PRESET_BUTTON_PROPS: ButtonProps = { variant: 'default', py: '$spacing4' }

export function AmountInputPresets<T extends Key>({
  presets,
  renderPreset,
  ...rest
}: AmountInputPresetsProps<T> & FlexProps): JSX.Element {
  return (
    <Flex
      row
      gap="$gap4"
      {...(isHoverable
        ? {
            opacity: 0.85,
            transform: [{ translateY: -2 }],
            '$platform-web': {
              transition: 'opacity 120ms ease, transform 120ms ease',
            },
            '$group-hover': { transform: [{ translateY: 0 }] },
          }
        : {})}
      animation={isHoverable ? null : '100ms'}
      {...rest}
    >
      {presets.map((preset) => (
        <Flex
          key={preset}
          grow
          {...(isHoverable
            ? {
                opacity: 0.9,
                transform: [{ translateY: -2 }, { scale: 0.98 }],
                '$platform-web': {
                  transition: 'opacity 120ms ease, transform 120ms ease',
                },
                '$group-hover': {
                  opacity: 1,
                  transform: [{ translateY: 0 }],
                  scale: 1,
                },
                animation: null,
              }
            : {})}
        >
          {renderPreset(preset)}
        </Flex>
      ))}
    </Flex>
  )
}
