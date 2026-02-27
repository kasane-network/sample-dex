import { deprecatedStyled } from 'lib/styled-components'
import { Gap } from 'theme'

const NON_DOM_COLUMN_PROPS = new Set(['gap', 'flex'])
const NON_DOM_AUTO_COLUMN_PROPS = new Set(['gap', 'justify', 'grow'])

/** @deprecated Please use `Flex` from `ui/src` going forward */
const Column = deprecatedStyled.div.withConfig({
  shouldForwardProp: (prop) => !NON_DOM_COLUMN_PROPS.has(String(prop)),
})<{
  gap?: Gap | string
  flex?: string
}>`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: ${({ gap, theme }) => (gap && theme.grids[gap as Gap]) || gap};
  ${({ flex }) => flex && `flex: ${flex};`}
`

/** @deprecated Please use `Flex` from `ui/src` going forward */
export const ColumnCenter = deprecatedStyled(Column)`
  width: 100%;
  align-items: center;
`

export const AutoColumn = deprecatedStyled.div.withConfig({
  shouldForwardProp: (prop) => !NON_DOM_AUTO_COLUMN_PROPS.has(String(prop)),
})<{
  gap?: Gap | string
  justify?: 'stretch' | 'center' | 'start' | 'end' | 'flex-start' | 'flex-end' | 'space-between'
  grow?: true
}>`
  display: grid;
  grid-auto-rows: auto;
  grid-row-gap: ${({ gap, theme }) => (gap && theme.grids[gap as Gap]) || gap};
  justify-items: ${({ justify }) => justify && justify};
  flex-grow: ${({ grow }) => grow && 1};
`

export default Column
