/**
 * npm run icons — генерира иконите в public/ от една рисунка: тъмносиня отметка върху светлосин фон.
 * Резултатът се пази в git, затова скриптът се пуска само при промяна на иконата.
 */
import { writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const BACKGROUND = '#8ccbff'
const MARK = '#0e2640'

/** Отметката е рисувана в мрежа 512×512; scale я смалява около центъра (за maskable иконата). */
function iconSvg({ rounded, scale }: { rounded: boolean; scale: number }): string {
  const point = (x: number, y: number) => `${256 + (x - 256) * scale} ${256 + (y - 256) * scale}`
  const path = `M${point(150, 268)} ${point(224, 342)} ${point(366, 178)}`
  const corner = rounded ? ' rx="112"' : ''
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
    `<rect width="512" height="512"${corner} fill="${BACKGROUND}"/>`,
    `<path d="${path}" fill="none" stroke="${MARK}" stroke-width="${56 * scale}" stroke-linecap="round" stroke-linejoin="round"/>`,
    '</svg>',
    '',
  ].join('\n')
}

async function png(svg: string, size: number, file: string): Promise<void> {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file)
}

const rounded = iconSvg({ rounded: true, scale: 1 })
const square = iconSvg({ rounded: false, scale: 1 })
// Maskable: Android изрязва иконата в кръг — отметката стои в безопасната зона.
const maskable = iconSvg({ rounded: false, scale: 0.8 })

await writeFile('public/favicon.svg', rounded)
await png(rounded, 32, 'public/favicon-32x32.png')
await png(rounded, 192, 'public/pwa-192x192.png')
await png(rounded, 512, 'public/pwa-512x512.png')
await png(maskable, 512, 'public/maskable-icon-512x512.png')
// iOS сам заоблява ъглите, затова тази икона е квадратна и без прозрачност.
await png(square, 180, 'public/apple-touch-icon-180x180.png')

console.log('Иконите са генерирани в public/.')
