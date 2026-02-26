import { DEFAULT_LANGUAGE_CODE, DEFAULT_LANGUAGE_TAG, DeviceLocale } from 'utilities/src/device/constants'

export function getDeviceLocales(): DeviceLocale[] {
  const language = navigator.languages[0] || navigator.language || DEFAULT_LANGUAGE_TAG

  return [{ languageCode: language || DEFAULT_LANGUAGE_CODE, languageTag: language || DEFAULT_LANGUAGE_TAG }]
}
