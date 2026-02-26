import { DEFAULT_LANGUAGE_CODE, DEFAULT_LANGUAGE_TAG } from 'utilities/src/device/constants'
import { getDeviceLocales } from 'utilities/src/device/locales.web'

describe(getDeviceLocales, () => {
  const MOCK_LANGUAGE = 'es-ES'
  const originalLanguages = navigator.languages
  const originalLanguage = navigator.language

  beforeEach(() => {
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      get: () => [MOCK_LANGUAGE],
    })
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      get: () => MOCK_LANGUAGE,
    })
  })

  afterEach(() => {
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      get: () => originalLanguages,
    })
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      get: () => originalLanguage,
    })
  })

  it('should return the device locale', () => {
    expect(getDeviceLocales).not.toThrow()
    expect(getDeviceLocales()).toEqual([{ languageCode: MOCK_LANGUAGE, languageTag: MOCK_LANGUAGE }])
  })

  it('should return the default locale if an error occurs', () => {
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      get: () => [],
    })
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      get: () => '',
    })

    expect(getDeviceLocales).not.toThrow()
    expect(getDeviceLocales()).toEqual([{ languageCode: DEFAULT_LANGUAGE_CODE, languageTag: DEFAULT_LANGUAGE_TAG }])
  })
})
