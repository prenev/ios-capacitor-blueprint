// usage: node scripts/render-svg.mjs in.svg out.png width   (rasterises an SVG; system fonts such as Inter are available to <text>)
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'node:fs'
const [src, out, width] = process.argv.slice(2)
const png = new Resvg(readFileSync(src, 'utf8'), { fitTo: { mode: 'width', value: Number(width) }, font: { loadSystemFonts: true, defaultFontFamily: 'Inter' } }).render().asPng()
writeFileSync(out, png)
