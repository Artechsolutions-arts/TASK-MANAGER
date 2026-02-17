/**
 * Generate size-specific favicons from LOGOFA.png with cover crop
 * so the icon fills the frame (appears larger in browser tabs).
 */
import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'src', 'assets', 'LOGOFA.png');
const outDir = join(root, 'public');

const sizes = [16, 32, 48, 180];

if (!existsSync(src)) {
  console.error('Source image not found:', src);
  process.exit(1);
}

const buffer = readFileSync(src);

await Promise.all(
  sizes.map(async (size) => {
    const outPath = join(outDir, `favicon-${size}.png`);
    await sharp(buffer)
      .resize(size, size, { fit: 'cover', position: 'center' })
      .png()
      .toFile(outPath);
    console.log('Generated', outPath);
  })
);

// Keep FAVICON.png as 32x32 for default/shortcut
await sharp(buffer)
  .resize(32, 32, { fit: 'cover', position: 'center' })
  .png()
  .toFile(join(outDir, 'FAVICON.png'));
console.log('Updated public/FAVICON.png (32x32)');

console.log('Done.');
