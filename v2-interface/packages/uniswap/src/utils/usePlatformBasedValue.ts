export type UsePlatformBasedValue<T> = {
  defaultValue: T
  mobile?: {
    defaultValue?: T
  }
  web?: {
    defaultValue?: T
  }
  extension?: {
    defaultValue?: T
    windowNotFocused?: T
  }
}

export function usePlatformBasedValue<T>({ defaultValue, web, extension }: UsePlatformBasedValue<T>): T {
  void extension
  return web?.defaultValue ?? defaultValue
}
