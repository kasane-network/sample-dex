/* eslint-disable @typescript-eslint/no-unnecessary-condition */

// Suppress noisy Tamagui / React Native Web warnings about DOM-incompatible props
const SUPPRESSED_WARNINGS = [
  'React does not recognize the `forwardedRef` prop',
  'React does not recognize the',
  '[Statsig] Failed to flush events.',
  'StatsigProviderWrapper',
  "configured WalletConnect 'metadata.url'",
  'Lit is in dev mode. Not recommended for production',
]
const origError = console.error
const origWarn = console.warn

function normalizeConsoleArg(arg: unknown): string {
  if (typeof arg === 'string') {
    return arg
  }
  if (arg instanceof Error) {
    return [arg.message, arg.stack].filter(Boolean).join(' ')
  }
  const message = typeof arg === 'object' && arg !== null ? Reflect.get(arg, 'message') : undefined
  if (typeof message === 'string') {
    return message
  }
  return String(arg)
}

const filterWarnings =
  (orig: typeof console.error) =>
    (...args: Parameters<typeof console.error>) => {
      const msg = args.map(normalizeConsoleArg).join(' ')
      if (SUPPRESSED_WARNINGS.some((w) => msg.includes(w))) {
        return
      }
      orig.apply(console, args)
    }
console.error = filterWarnings(origError)
console.warn = filterWarnings(origWarn)

// note the reason for the setupi18n function is to avoid webpack tree shaking the file out
import { setupi18n } from 'uniswap/src/i18n/i18n-setup-interface'
import '@reach/dialog/styles.css'
import 'global.css'
import 'polyfills'
import 'tracing'

// We intentionally import this to ensure that the WalletConnect provider is bundled as an entrypoint chunk,
// because it will always be requested anyway and we don't want to have a waterfall request pattern.
import * as WalletConnect from '@walletconnect/ethereum-provider'
import { setupWagmiAutoConnect } from 'components/Web3Provider/wagmiAutoConnect'
import { setupVitePreloadErrorHandler } from 'utils/setupVitePreloadErrorHandler'

if (WalletConnect) {
  // biome-ignore lint/suspicious/noConsole: Side effects module needs console for initialization logging
  console.debug('WalletConnect is defined')
}

// adding these so webpack won't tree shake this away, sideEffects was giving trouble
setupi18n()
setupWagmiAutoConnect()
setupVitePreloadErrorHandler()
