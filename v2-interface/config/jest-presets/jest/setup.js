// Sets up global.chrome in jest environment
//
const storage = require('mem-storage-area')
const mockAsyncStorage = require('@react-native-async-storage/async-storage/jest/async-storage-mock')

const optionalRequire = (path, fallback) => {
  try {
    return require(path)
  } catch {
    return fallback
  }
}

const mockRNCNetInfo = optionalRequire('@react-native-community/netinfo/jest/netinfo-mock.js', {})
const mockRNDeviceInfo = optionalRequire('react-native-device-info/jest/react-native-device-info-mock', {})

// required polyfill for rtk-query baseQueryFn
require('cross-fetch/polyfill')

global.chrome = {
  storage: {
    ...storage, // mem-storage-area is a reimplementation of chrome.storage in memory
    session: {
      set: jest.fn(),
      get: jest.fn(),
    },
  },
  runtime: {
    getURL: (path) => `chrome/path/to/${path}`,
  },
}

// Setup Async Storage mocking: https://react-native-async-storage.github.io/async-storage/docs/advanced/jest/
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage)

// Mock redux-persist due to type issue in CI
// https://github.com/rt2zz/redux-persist/issues/1243#issuecomment-692609748
jest.mock('redux-persist', () => {
  const real = jest.requireActual('redux-persist')
  return {
    ...real,
    persistReducer: jest.fn().mockImplementation((config, reducers) => reducers),
  }
})

// Mock Amplitde log reporting
jest.mock('@amplitude/analytics-react-native', () => ({
  flush: () => jest.fn(),
  identify: () => jest.fn(),
  init: () => jest.fn(),
  setDeviceId: () => jest.fn(),
  track: () => jest.fn(),
}), { virtual: true })

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter')
jest.mock('react-native-device-info', () => mockRNDeviceInfo, { virtual: true })

// Mock WalletConnect v2 packages
jest.mock('@reown/walletkit', () => ({
  WalletKit: {
    init: () => ({
      on: jest.fn(),
      getActiveSessions: () => [],
      getPendingSessionProposals: () => [],
      getPendingSessionRequests: () => [],
    }),
  },
}))

jest.mock('@walletconnect/core', () => ({
  Core: jest.fn().mockImplementation(() => ({
    crypto: { getClientId: jest.fn() },
  })),
}))

jest.mock('@walletconnect/utils', () => ({
  getSdkError: jest.fn(),
  parseUri: jest.fn(),
  buildApprovedNamespaces: jest.fn(),
}))

jest.mock('react-native-appsflyer', () => {
  return {
    initSdk: jest.fn(),
  }
}, { virtual: true })

// NetInfo mock does not export typescript types
const NetInfoStateType = {
  unknown: 'unknown',
  none: 'none',
  cellular: 'cellular',
  wifi: 'wifi',
  bluetooth: 'bluetooth',
  ethernet: 'ethernet',
  wimax: 'wimax',
  vpn: 'vpn',
  other: 'other',
}

jest.mock('@react-native-community/netinfo', () => ({ ...mockRNCNetInfo, NetInfoStateType }), { virtual: true })

jest.mock('@universe/gating', () => {
  const actual = jest.requireActual('@universe/gating')
  return {
    ...actual,
    // Mock functions
    useDynamicConfigValue: jest.fn((args) => args.defaultValue),
    useFeatureFlag: jest.fn(() => false),
    useGate: jest.fn(() => ({ isLoading: false, value: false })),
    useConfig: jest.fn(() => ({})),
    getStatsigClient: jest.fn(() => ({
      checkGate: jest.fn(() => false),
      getConfig: jest.fn(() => ({
        get: (_name, fallback) => fallback,
        getValue: (_name, fallback) => fallback,
      })),
      getLayer: jest.fn(() => ({
        get: jest.fn(() => false),
      })),
    })),
    Statsig: {
      checkGate: jest.fn(() => false),
      getConfig: jest.fn(() => ({
        get: (_name, fallback) => fallback,
        getValue: (_name, fallback) => fallback,
      })),
    },
  }
})

global.__DEV__ = true
