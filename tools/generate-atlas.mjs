/**
 * Sprite Atlas Generator — packs PNGs into a PixiJS 8 compatible spritesheet.
 *
 * Usage: node tools/generate-atlas.mjs <input-dir> <output-dir> <name>
 * Example: node tools/generate-atlas.mjs "assets/sprites/icons/animals/PNG/Square without details" public/assets/kenney/animals animals
 */
import sharp from 'sharp';
import { readdir, writeFile, mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';

const [,, inputDir, outputDir, name] = process.argv;

if (!inputDir || !outputDir || !name) {
  console.error('Usage: node tools/generate-atlas.mjs <input-dir> <output-dir> <name>');
  process.exit(1);
}

// Config
const ATLAS_SIZE = 2048;
const PADDING = 2;

async function main() {
  // 1. Find all PNGs
  const files = (await readdir(inputDir))
    .filter(f => extname(f).toLowerCase() === '.png')
    .sort();

  console.log(`Found ${files.length} PNGs in ${inputDir}`);

  // 2. Read dimensions of first image to determine cell size
  const firstMeta = await sharp(join(inputDir, files[0])).metadata();
  const cellW = firstMeta.width || 128;
  const cellH = firstMeta.height || 128;
  console.log(`Cell size: ${cellW}x${cellH}`);

  const cols = Math.floor(ATLAS_SIZE / (cellW + PADDING));
  const rows = Math.floor(ATLAS_SIZE / (cellH + PADDING));
  const maxFrames = cols * rows;

  console.log(`Atlas: ${ATLAS_SIZE}x${ATLAS_SIZE}, grid: ${cols}x${rows}, max: ${maxFrames} frames`);

  if (files.length > maxFrames) {
    console.warn(`Warning: ${files.length} PNGs but only ${maxFrames} fit. Truncating.`);
  }

  const frameCount = Math.min(files.length, maxFrames);

  // 3. Build the composite image
  const composites = [];
  const frames = {};

  for (let i = 0; i < frameCount; i++) {
    const file = files[i];
    const frameName = basename(file, extname(file));
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * (cellW + PADDING);
    const y = row * (cellH + PADDING);

    composites.push({
      input: join(inputDir, file),
      left: x,
      top: y,
    });

    frames[frameName] = {
      frame: { x, y, w: cellW, h: cellH },
      sourceSize: { w: cellW, h: cellH },
      spriteSourceSize: { x: 0, y: 0, w: cellW, h: cellH },
    };
  }

  // 4. Generate the atlas PNG
  await mkdir(outputDir, { recursive: true });

  const atlasHeight = Math.ceil(frameCount / cols) * (cellH + PADDING);

  await sharp({
    create: {
      width: ATLAS_SIZE,
      height: Math.min(ATLAS_SIZE, atlasHeight),
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(join(outputDir, `${name}.png`));

  // 5. Generate the PixiJS spritesheet JSON
  const sheet = {
    frames,
    meta: {
      image: `${name}.png`,
      format: 'RGBA8888',
      size: { w: ATLAS_SIZE, h: Math.min(ATLAS_SIZE, atlasHeight) },
      scale: '1',
    },
  };

  await writeFile(
    join(outputDir, `${name}.json`),
    JSON.stringify(sheet, null, 2),
  );

  console.log(`✓ Generated ${join(outputDir, name)}.png (${ATLAS_SIZE}x${Math.min(ATLAS_SIZE, atlasHeight)})`);
  console.log(`✓ Generated ${join(outputDir, name)}.json (${Object.keys(frames).length} frames)`);
}

main().catch(err => { console.error(err); process.exit(1); });
