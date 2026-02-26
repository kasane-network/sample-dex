// where: apps/web/src/pages/Swap/Buy/PredefinedAmount.tsx
// what: Small reusable percentage preset button used by liquidity removal form.
// why: Keep quick-select amount UI consistent and avoid duplicating button styling.

import { memo } from 'react'
import { Flex, Text, TouchableArea } from 'ui/src'

type PredefinedAmountProps = {
  onPress: () => void
  label: string
}

export const PredefinedAmount = memo(function PredefinedAmount({ onPress, label }: PredefinedAmountProps) {
  return (
    <TouchableArea onPress={onPress}>
      <Flex
        px="$padding12"
        py="$padding8"
        borderRadius="$roundedFull"
        borderWidth="$spacing1"
        borderColor="$surface3"
        backgroundColor="$surface2"
        hoverStyle={{ backgroundColor: '$surface2Hovered' }}
      >
        <Text variant="buttonLabel4" color="$neutral1">
          {label}
        </Text>
      </Flex>
    </TouchableArea>
  )
})
