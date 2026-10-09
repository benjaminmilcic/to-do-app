// Renders all PNG icons from the SVG sources in resources/.
//
//   resources/icon.svg           rounded icon (favicon, PWA "any")
//   resources/icon-maskable.svg  full-bleed icon (PWA "maskable", Apple, Android)
//
// Usage: npm run icons
// Android launcher icons are generated afterwards by `npm run icons:android`
// (@capacitor/assets) from the files written to resources/.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const ICON_DIR = 'src/assets/icon';
const rounded = await readFile('resources/icon.svg');
const fullBleed = await readFile('resources/icon-maskable.svg');

async function png(svg, size, file, background) {
  let image = sharp(svg, { density: Math.ceil((72 * size) / 512) * 2 }).resize(
    size,
    size,
  );
  if (background) {
    image = image.flatten({ background });
  }
  await image.png({ compressionLevel: 9 }).toFile(file);
  console.log(`${file} (${size}px)`);
}

await mkdir(ICON_DIR, { recursive: true });

// Web / PWA
await png(rounded, 32, `${ICON_DIR}/favicon-32.png`);
await png(rounded, 192, `${ICON_DIR}/icon-192.png`);
await png(rounded, 512, `${ICON_DIR}/icon-512.png`);
await png(fullBleed, 512, `${ICON_DIR}/maskable-512.png`);
await png(fullBleed, 180, `${ICON_DIR}/apple-touch-icon.png`);

// Sources for @capacitor/assets (Android launcher icons + splash screen).
await png(fullBleed, 1024, 'resources/icon-only.png');
// Adaptive icon: the foreground only holds the glyph (scaled into Android's
// safe zone), the background the gradient without the glyph.
const svgText = fullBleed.toString();
const glyph = svgText.slice(
  svgText.indexOf('<circle'),
  svgText.lastIndexOf('</svg>'),
);
const defs = svgText.slice(
  svgText.indexOf('<defs>'),
  svgText.indexOf('</defs>') + '</defs>'.length,
);
const open = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">';
await png(
  Buffer.from(
    `${open}<g transform="translate(256 259) scale(.8) translate(-256 -262)">${glyph}</g></svg>`,
  ),
  1024,
  'resources/icon-foreground.png',
);
await png(
  Buffer.from(
    `${open}${defs}<rect width="512" height="512" fill="url(#bg)"/><rect width="512" height="512" fill="url(#shine)"/></svg>`,
  ),
  1024,
  'resources/icon-background.png',
);

// Splash: icon centred on the app background colour.
for (const [name, background] of [
  ['splash', '#f3f2fb'],
  ['splash-dark', '#0f0e17'],
]) {
  const icon = await sharp(rounded, { density: 300 }).resize(640, 640).png().toBuffer();
  await sharp({
    create: { width: 2732, height: 2732, channels: 4, background },
  })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toFile(`resources/${name}.png`);
  console.log(`resources/${name}.png (2732px)`);
}
