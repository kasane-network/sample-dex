import { getCloudflareApiBaseUrl, TrafficFlows } from '@universe/api'
import { config } from 'uniswap/src/config'
import { isDevEnv, isPlaywrightEnv } from 'utilities/src/environment/env'

export const UNISWAP_WEB_HOSTNAME = 'app.uniswap.org'
const EMBEDDED_WALLET_HOSTNAME = isPlaywrightEnv() || isDevEnv() ? 'staging.ew.unihq.org' : UNISWAP_WEB_HOSTNAME

export const UNISWAP_WEB_URL = `https://${UNISWAP_WEB_HOSTNAME}`
export const UNISWAP_APP_URL = 'https://uniswap.org/app'
export const UNISWAP_MOBILE_REDIRECT_URL = 'https://uniswap.org/mobile-redirect'
const DISABLED_EXTERNAL_LINK_PATH = '/__disabled_external_link__'
const DISABLED_API_BASE_PATH = '/__disabled_api__'
const createDisabledHelpArticleUrl = (_articleId: string, _path?: string): string => DISABLED_EXTERNAL_LINK_PATH

// The trading api uses custom builds for testing which may not use the v1 prefix
export const tradingApiVersionPrefix = config.tradingApiWebTestEnv === 'true' ? '' : '/v1'

export const CHROME_EXTENSION_UNINSTALL_URL_PATH = '/extension/uninstall'

export const uniswapUrls = {
  // Help and web articles/items
  helpUrl: DISABLED_EXTERNAL_LINK_PATH,
  helpRequestUrl: DISABLED_EXTERNAL_LINK_PATH,
  helpArticleUrls: {
    bridgedAssets: createDisabledHelpArticleUrl('39264728322317'),
    acrossRoutingInfo: createDisabledHelpArticleUrl('30677918339341'),
    approvalsExplainer: createDisabledHelpArticleUrl('8120520483085-What-is-an-approval-transaction'),
    batchedSwaps: createDisabledHelpArticleUrl('36393697148045'),
    batchedSwapsFailure: `${createDisabledHelpArticleUrl('36393697148045')}#error-messages-and-troubleshooting`,
    batchedSwapsReview: createDisabledHelpArticleUrl('36394497329933'),
    cexTransferKorea: createDisabledHelpArticleUrl('29425131525901-How-to-transfer-crypto-to-a-Uniswap-Wallet-in-Korea'),
    contractAddressExplainer: createDisabledHelpArticleUrl('26757826138637-What-is-a-token-contract-address'),
    dappProtectionInfo: createDisabledHelpArticleUrl('37781087046029'),
    extensionBiometricsEnrollment: createDisabledHelpArticleUrl('38225957094541'),
    extensionHelp: createDisabledHelpArticleUrl('24458735271181'),
    extensionDappTroubleshooting: createDisabledHelpArticleUrl(
      '25811698471565-Connecting-Uniswap-Extension-Beta-to-other-dapps',
    ),
    feeOnTransferHelp: createDisabledHelpArticleUrl('18673568523789-What-is-a-token-fee-'),
    howToSwapTokens: createDisabledHelpArticleUrl('8370549680909-How-to-swap-tokens-'),
    hiddenTokenInfo: createDisabledHelpArticleUrl('30432674756749-How-to-hide-and-unhide-tokens-in-the-Uniswap-Wallet'),
    hiddenNFTInfo: createDisabledHelpArticleUrl('14185028445837-How-to-hide-and-unhide-NFTs-in-the-Uniswap-Wallet'),
    impermanentLoss: createDisabledHelpArticleUrl('20904453751693-What-is-Impermanent-Loss'),
    jupiterApiError: createDisabledHelpArticleUrl('39829559404685'),
    limitsFailure: createDisabledHelpArticleUrl('24300813697933-Why-did-my-limit-order-fail-or-not-execute'),
    limitsInfo: createDisabledHelpArticleUrl('24470337797005'),
    limitsNetworkSupport: createDisabledHelpArticleUrl('24470251716237-What-networks-do-limits-support'),
    lpIncentiveInfo: createDisabledHelpArticleUrl('35506888223501'),
    fiatOnRampHelp: createDisabledHelpArticleUrl('11306574799117'),
    fiatOffRampHelp: createDisabledHelpArticleUrl('34006552258957'),
    transferCryptoHelp: createDisabledHelpArticleUrl(
      '27103878635661-How-to-transfer-crypto-from-a-Robinhood-or-Coinbase-account-to-the-Uniswap-Wallet',
    ),
    mismatchedImports: createDisabledHelpArticleUrl('36393527081997'),
    mobileWalletHelp: createDisabledHelpArticleUrl('20317941356429'),
    moonpayRegionalAvailability: createDisabledHelpArticleUrl('11306664890381-Why-isn-t-MoonPay-available-in-my-region-'),
    multichainDelegation: createDisabledHelpArticleUrl('36391987158797'),
    networkFeeInfo: createDisabledHelpArticleUrl('8370337377805-What-is-a-network-fee-'),
    poolOutOfSync: createDisabledHelpArticleUrl('25845512413069'),
    positionsLearnMore: createDisabledHelpArticleUrl('8829880740109'),
    priceImpact: createDisabledHelpArticleUrl('8671539602317-What-is-Price-Impact'),
    providingLiquidityInfo: createDisabledHelpArticleUrl('20982919867021', 'sections'),
    recoveryPhraseHowToImport: createDisabledHelpArticleUrl(
      '11380692567949-How-to-import-a-recovery-phrase-into-the-Uniswap-Wallet',
    ),
    recoveryPhraseHowToFind: createDisabledHelpArticleUrl(
      '11306360177677-How-to-find-my-recovery-phrase-in-the-Uniswap-Wallet',
    ),
    recoveryPhraseForgotten: createDisabledHelpArticleUrl('11306367118349'),
    revokeExplainer: createDisabledHelpArticleUrl('15724901841037-How-to-revoke-a-token-approval'),
    supportedNetworks: createDisabledHelpArticleUrl('14569415293325'),
    swapFeeInfo: createDisabledHelpArticleUrl('20131678274957'),
    passkeysInfo: createDisabledHelpArticleUrl('35522111260173'),
    smartWalletDelegation: createDisabledHelpArticleUrl('36391987158797'),
    swapProtection: createDisabledHelpArticleUrl('18814993155853'),
    swapSlippage: createDisabledHelpArticleUrl('8643879653261-What-is-Price-Slippage-'),
    tokenWarning: createDisabledHelpArticleUrl('8723118437133-What-are-token-warnings-'),
    transactionFailure: createDisabledHelpArticleUrl('8643975058829-Why-did-my-transaction-fail-'),
    uniswapXInfo: createDisabledHelpArticleUrl('17544708791821'),
    uniswapXFailure: createDisabledHelpArticleUrl('17515489874189-Why-can-my-swap-not-be-filled-'),
    unsupportedTokenPolicy: createDisabledHelpArticleUrl('18783694078989-Unsupported-Token-Policy'),
    addingV4Hooks: createDisabledHelpArticleUrl('32402040565133'),
    routingSettings: createDisabledHelpArticleUrl('27362707722637'),
    v4HooksInfo: createDisabledHelpArticleUrl('30998263256717'),
    walletSecurityMeasures: createDisabledHelpArticleUrl('28278904584077-Uniswap-Wallet-Security-Measures'),
    whatIsPrivateKey: createDisabledHelpArticleUrl('11306371824653-What-is-a-private-key'),
    wethExplainer: createDisabledHelpArticleUrl('16015852009997-Why-do-ETH-swaps-involve-converting-to-WETH'),
  },
  downloadWalletUrl: 'https://wallet.uniswap.org/',
  tradingApiDocsUrl: 'https://hub.uniswap.org/',
  unichainUrl: 'https://www.unichain.org/',
  uniswapXUrl: 'https://x.uniswap.org/',
  helpCenterUrl: DISABLED_EXTERNAL_LINK_PATH,
  blogUrl: DISABLED_EXTERNAL_LINK_PATH,
  docsUrl: DISABLED_EXTERNAL_LINK_PATH,
  voteUrl: 'https://vote.uniswapfoundation.org',
  governanceUrl: DISABLED_EXTERNAL_LINK_PATH,
  developersUrl: 'https://uniswap.org/developers',
  aboutUrl: 'https://about.uniswap.org/',
  careersUrl: 'https://careers.uniswap.org/',
  social: {
    x: DISABLED_EXTERNAL_LINK_PATH,
    farcaster: 'https://farcaster.xyz/Uniswap',
    linkedin: 'https://www.linkedin.com/company/uniswaporg',
    tiktok: 'https://www.tiktok.com/@uniswap',
  },
  termsOfServiceUrl: DISABLED_EXTERNAL_LINK_PATH,
  privacyPolicyUrl: DISABLED_EXTERNAL_LINK_PATH,
  chromeExtension: 'http://uniswap.org/ext',
  chromeExtensionUninstallUrl: `${UNISWAP_WEB_URL}${CHROME_EXTENSION_UNINSTALL_URL_PATH}`,

  // Download links
  appStoreDownloadUrl: 'https://apps.apple.com/us/app/uniswap-crypto-nft-wallet/id6443944476',
  playStoreDownloadUrl: 'https://play.google.com/store/apps/details?id=com.uniswap.mobile&pcampaignid=web_share',

  // Core API Urls
  apiOrigin: 'https://api.uniswap.org',
  apiBaseUrl: DISABLED_API_BASE_PATH,
  apiBaseUrlV2: `${DISABLED_API_BASE_PATH}/v2`,
  graphQLUrl: `${DISABLED_API_BASE_PATH}/v1/graphql`,

  // Proxies
  amplitudeProxyUrl: `${DISABLED_API_BASE_PATH}/v1/amplitude-proxy`,
  statsigProxyUrl: `${DISABLED_API_BASE_PATH}/v1/statsig-proxy`,

  // Feature service URL's
  unitagsApiUrl: `${DISABLED_API_BASE_PATH}/v2/unitags`,
  scantasticApiUrl:
    config.scantasticApiUrlOverride || `${getCloudflareApiBaseUrl(TrafficFlows.Scantastic)}/v2/scantastic`,
  forApiUrl: `${DISABLED_API_BASE_PATH}/v2/FOR.v1.FORService`,
  tradingApiUrl: DISABLED_API_BASE_PATH,
  liquidityServiceUrl: `${DISABLED_API_BASE_PATH}/uniswap.liquidity.v1.LiquidityService`,

  // Merkl Docs for LP Incentives
  merklDocsUrl: DISABLED_EXTERNAL_LINK_PATH,

  // Embedded Wallet URL's
  // Totally fine that these are public
  evervaultDevUrl: 'https://embedded-wallet-dev.app-907329d19a06.enclave.evervault.com',
  evervaultStagingUrl: 'https://embedded-wallet-staging.app-907329d19a06.enclave.evervault.com',
  evervaultProductionUrl: 'https://embedded-wallet.app-907329d19a06.enclave.evervault.com',
  embeddedWalletUrl: `https://${EMBEDDED_WALLET_HOSTNAME}`,
  passkeysManagementUrl: `https://${EMBEDDED_WALLET_HOSTNAME}/manage/passkey`,

  // API Paths
  trmPath: '/v1/screen',
  gasServicePath: '/v1/gas-fee',
  tradingApiPaths: {
    approval: `${tradingApiVersionPrefix}/check_approval`,
    claimLpFees: `${tradingApiVersionPrefix}/lp/claim`,
    claimRewards: `${tradingApiVersionPrefix}/lp/claim_rewards`,
    createLp: `${tradingApiVersionPrefix}/lp/create`,
    decreaseLp: `${tradingApiVersionPrefix}/lp/decrease`,
    increaseLp: `${tradingApiVersionPrefix}/lp/increase`,
    lpApproval: `${tradingApiVersionPrefix}/lp/approve`,
    migrate: `${tradingApiVersionPrefix}/lp/migrate`,
    poolInfo: `${tradingApiVersionPrefix}/lp/pool_info`,
    order: `${tradingApiVersionPrefix}/order`,
    orders: `${tradingApiVersionPrefix}/orders`,
    plan: `${tradingApiVersionPrefix}/plan`,
    priceDiscrepancy: `${tradingApiVersionPrefix}/lp/price_discrepancy`,
    quote: `${tradingApiVersionPrefix}/quote`,
    swap: `${tradingApiVersionPrefix}/swap`,
    swap5792: `${tradingApiVersionPrefix}/swap_5792`,
    swap7702: `${tradingApiVersionPrefix}/swap_7702`,
    swappableTokens: `${tradingApiVersionPrefix}/swappable_tokens`,
    swaps: `${tradingApiVersionPrefix}/swaps`,
    wallet: {
      checkDelegation: `${tradingApiVersionPrefix}/wallet/check_delegation`,
      encode7702: `${tradingApiVersionPrefix}/wallet/encode_7702`,
    },
  },

  wormholeUrl: DISABLED_EXTERNAL_LINK_PATH,

  // Limit orders paths
  limitOrderStatusesPath: '/limit-orders',

  // App and Redirect URL's
  appBaseUrl: UNISWAP_APP_URL,
  redirectUrlBase: UNISWAP_MOBILE_REDIRECT_URL,
  requestOriginUrl: UNISWAP_WEB_URL,

  // Web Interface Urls
  webInterfaceSwapUrl: `${UNISWAP_WEB_URL}/#/swap`,
  webInterfaceTokensUrl: `${UNISWAP_WEB_URL}/explore/tokens`,
  webInterfacePoolsUrl: `${UNISWAP_WEB_URL}/explore/pools`,
  webInterfaceAddressUrl: `${UNISWAP_WEB_URL}/address`,
  webInterfaceNftItemUrl: `${UNISWAP_WEB_URL}/nfts/asset`,
  webInterfaceNftCollectionUrl: `${UNISWAP_WEB_URL}/nfts/collection`,
  webInterfaceBuyUrl: `${UNISWAP_WEB_URL}/buy`,

  // Feedback Links
  walletFeedbackForm:
    'https://docs.google.com/forms/d/e/1FAIpQLSepzL5aMuSfRhSgw0zDw_gVmc2aeVevfrb1UbOwn6WGJ--46w/viewform',

  dataApiServiceUrl: `${DISABLED_API_BASE_PATH}/v2/data.v1.DataApiService`,
}
