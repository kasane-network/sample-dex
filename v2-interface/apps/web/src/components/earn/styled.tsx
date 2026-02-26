import noise from 'assets/images/noise.png'
import { AutoColumn } from 'components/deprecated/Column'
import { deprecatedStyled } from 'lib/styled-components'

export const CardBGImage = deprecatedStyled.span<{ desaturate?: boolean }>`
  background: radial-gradient(circle at 30% 20%, rgba(255, 0, 122, 0.35), rgba(2, 29, 67, 0.35));
  width: 1000px;
  height: 600px;
  position: absolute;
  border-radius: 12px;
  opacity: 0.4;
  top: -100px;
  left: -100px;
  transform: rotate(-15deg);
  user-select: none;
  ${({ desaturate }) => desaturate && `filter: saturate(0)`}
`

export const CardBGImageSmaller = deprecatedStyled.span<{ desaturate?: boolean }>`
  background: radial-gradient(circle at 40% 30%, rgba(255, 255, 255, 0.2), rgba(2, 29, 67, 0.3));
  width: 1200px;
  height: 1200px;
  position: absolute;
  border-radius: 12px;
  top: -300px;
  left: -300px;
  opacity: 0.4;
  user-select: none;

  ${({ desaturate }) => desaturate && `filter: saturate(0)`}
`

export const CardNoise = deprecatedStyled.span`
  background: url(${noise});
  background-size: cover;
  mix-blend-mode: overlay;
  border-radius: 12px;
  width: 100%;
  height: 100%;
  opacity: 0.15;
  position: absolute;
  top: 0;
  left: 0;
  user-select: none;
`

export const CardSection = deprecatedStyled(AutoColumn)<{ disabled?: boolean }>`
  padding: 1rem;
  z-index: 1;
  opacity: ${({ disabled }) => disabled && '0.4'};
`

export const Break = deprecatedStyled.div`
  width: 100%;
  background-color: rgba(255, 255, 255, 0.2);
  height: 1px;
`
