// Renders assets/stopwatch.svg into the PNG sources @capacitor/assets expects:
// icon-only (legacy square icon), icon-foreground + icon-background (adaptive),
// splash + splash-dark. Run via `npm run assets`.
const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')

const dir = path.join(__dirname, '..', 'assets')
const source = fs.readFileSync(path.join(dir, 'stopwatch.svg'), 'utf8')
// The dark theme's --ground in src/index.css.
const BG = '#15171a'
const glyph = source.match(/<g id="glyph"[\s\S]*<\/g>/)[0]

/** The glyph's bounds are roughly 212..884 tall; centre it and scale it. */
function svg(size, scale, background) {
  const offset = (1024 - 1024 * scale) / 2
  const shiftUp = -24 * scale // optical centre: the crown makes it look low
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
    ${background ? `<rect width="1024" height="1024" fill="${BG}"/>` : ''}
    <g transform="translate(${offset} ${offset + shiftUp}) scale(${scale})">${glyph}</g>
  </svg>`)
}

const jobs = [
  // Legacy icon: launchers mask it, so leave a margin.
  ['icon-only.png', svg(1024, 0.8, true)],
  // Adaptive foreground: @capacitor/assets insets it 16.7% a side, which
  // already lands it in the launcher's safe zone, so same scale as legacy.
  ['icon-foreground.png', svg(1024, 0.8, false)],
  ['icon-background.png', svg(1024, 0, true)],
]

;(async () => {
  for (const [name, buffer] of jobs) {
    await sharp(buffer).png().toFile(path.join(dir, name))
  }
  // Splash: small glyph centred on the background, light and dark identical.
  const splashIcon = await sharp(svg(1024, 0.8, false)).resize(640, 640).png().toBuffer()
  for (const name of ['splash.png', 'splash-dark.png']) {
    await sharp({ create: { width: 2732, height: 2732, channels: 4, background: BG } })
      .composite([{ input: splashIcon, gravity: 'centre' }])
      .png()
      .toFile(path.join(dir, name))
  }
  // Browser tab icon, same glyph on a rounded tile.
  const favicon = svg(1024, 0.8, true)
    .toString()
    .replace(/width="1024" height="1024" viewBox/, 'viewBox')
    .replace(/<rect width="1024" height="1024"/, '<rect width="1024" height="1024" rx="200"')
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'), favicon)
  console.log('rendered', jobs.length + 2, 'images into assets/ and public/favicon.svg')
})()
