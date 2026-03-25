const fs = require('fs')
const path = require('path')

const distDir = path.resolve(__dirname, '..', 'dist')
const indexHtml = path.join(distDir, 'index.html')
const fallbackHtml = path.join(distDir, '404.html')

if (!fs.existsSync(indexHtml)) {
  console.error('postbuild: dist/index.html not found — run build first')
  process.exit(1)
}

try {
  fs.copyFileSync(indexHtml, fallbackHtml)
  console.log('postbuild: created dist/404.html')
} catch (err) {
  console.error('postbuild: failed to create 404.html', err)
  process.exit(1)
}
