export function getCountry(): string {
  if (typeof navigator === 'undefined') {
    return 'US'
  }
  const region = navigator.language.split('-')[1]
  return region || 'US'
}

export function getNumberFormatSettings(): {
  decimalSeparator: string
  groupingSeparator: string
} {
  const locale = typeof navigator === 'undefined' ? 'en-US' : navigator.language || 'en-US'
  const parts = new Intl.NumberFormat(locale).formatToParts(1000.1)
  const decimalSeparator = parts.find((p) => p.type === 'decimal')?.value ?? '.'
  const groupingSeparator = parts.find((p) => p.type === 'group')?.value ?? ','
  return { decimalSeparator, groupingSeparator }
}
