import type { ComponentProps, PropsWithChildren } from 'react'

export const SCREEN_WIDTH = typeof window === 'undefined' ? 1024 : window.innerWidth

export function BottomSheetScrollView(props: ComponentProps<'div'>): JSX.Element {
  return <div {...props} />
}

export function BottomSheetSectionList(props: ComponentProps<'div'>): JSX.Element {
  return <div {...props} />
}

export function BottomSheetView(props: ComponentProps<'div'>): JSX.Element {
  return <div {...props} />
}

export function BottomSheetTextInput(props: ComponentProps<'input'>): JSX.Element {
  return <input {...props} />
}

export function BottomSheetModal(props: PropsWithChildren<object>): JSX.Element {
  return <>{props.children}</>
}

export default {
  SCREEN_WIDTH,
  BottomSheetScrollView,
  BottomSheetSectionList,
  BottomSheetView,
  BottomSheetTextInput,
  BottomSheetModal,
}
