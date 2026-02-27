import type { SVGProps } from 'constants/icons/types'

const MXN_ICON = (props: SVGProps) => {
  return (
    <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="0" y="0" width="16.67" height="50" fill="#006847" />
      <rect x="16.67" y="0" width="16.66" height="50" fill="#FFFFFF" />
      <rect x="33.33" y="0" width="16.67" height="50" fill="#CE1126" />
    </svg>
  )
}

export default MXN_ICON
