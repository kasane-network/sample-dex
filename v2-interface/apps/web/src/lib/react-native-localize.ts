function getLocale(): string {
  if (typeof navigator === 'undefined') {
    return 'en-US'
  }
  return navigator.language || 'en-US'
}

export function getCountry(): string {
  const locale = getLocale()
  const region = locale.split('-')[1]
  return region || 'US'
}

export function getNumberFormatSettings(): {
  decimalSeparator: string
  groupingSeparator: string
} {
  const parts = new Intl.NumberFormat(getLocale()).formatToParts(1000.1)
  const decimalSeparator = parts.find((p) => p.type === 'decimal')?.value ?? '.'
  const groupingSeparator = parts.find((p) => p.type === 'group')?.value ?? ','
  return { decimalSeparator, groupingSeparator }
}

export default {
  getCountry,
  getNumberFormatSettings,
}
