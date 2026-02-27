export type HapticFeedbackStyle =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'rigid'
  | 'soft'
  | 'success'
  | 'warning'
  | 'error'

export type HapticFeedback = {
  impact: (style?: HapticFeedbackStyle) => Promise<void>
  light: () => Promise<void>
  success: () => Promise<void>
}

export interface HapticFeedbackControl {
  hapticFeedback: HapticFeedback
  hapticsEnabled: boolean
  setHapticsEnabled: (willBeEnabled: boolean) => void
}

export const NO_HAPTIC_FEEDBACK: HapticFeedback = {
  impact: async () => Promise.resolve(),
  light: async () => Promise.resolve(),
  success: async () => Promise.resolve(),
}
