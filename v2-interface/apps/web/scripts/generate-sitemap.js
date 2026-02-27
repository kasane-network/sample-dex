/* eslint-env node */

const fs = require('fs')

const APP_SITEMAP_PATH = './public/app-sitemap.xml'

if (!fs.existsSync(APP_SITEMAP_PATH)) {
  throw new Error('app-sitemap.xml not found')
}

if (!fs.statSync(APP_SITEMAP_PATH).size) {
  throw new Error('app-sitemap.xml is empty')
}

console.log('Sitemap generation skipped (app-sitemap.xml only).')
