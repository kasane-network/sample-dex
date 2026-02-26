type ColorsResult = {
  dominant: string
  average: string
  platform: 'web'
}

export const RNImageColors = {
  async getColors(): Promise<ColorsResult> {
    return {
      dominant: '#808080',
      average: '#808080',
      platform: 'web',
    }
  },
}

export default { RNImageColors }
