const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIcoModule = require('png-to-ico');
const pngToIco = pngToIcoModule.default || pngToIcoModule;

async function generateIcons() {
  const assetsDir = path.join(__dirname, '..', 'assets');
  const svgPath = path.join(assetsDir, 'icon.svg');
  const png512Path = path.join(assetsDir, 'icon.png');
  const png256Path = path.join(assetsDir, 'icon-256.png');
  const png128Path = path.join(assetsDir, 'icon-128.png');
  const png64Path = path.join(assetsDir, 'icon-64.png');
  const png32Path = path.join(assetsDir, 'icon-32.png');
  const png16Path = path.join(assetsDir, 'icon-16.png');
  const icoPath = path.join(assetsDir, 'icon.ico');

  console.log('Generating PNG icons from SVG...');
  await sharp(svgPath).resize(512, 512).png().toFile(png512Path);
  await sharp(svgPath).resize(256, 256).png().toFile(png256Path);
  await sharp(svgPath).resize(128, 128).png().toFile(png128Path);
  await sharp(svgPath).resize(64, 64).png().toFile(png64Path);
  await sharp(svgPath).resize(32, 32).png().toFile(png32Path);
  await sharp(svgPath).resize(16, 16).png().toFile(png16Path);

  console.log('Generating Windows ICO icon...');
  const icoBuffer = await pngToIco([png256Path, png128Path, png64Path, png32Path, png16Path]);
  fs.writeFileSync(icoPath, icoBuffer);

  console.log('Icons generated successfully:');
  console.log(' -', png512Path);
  console.log(' -', icoPath);
}

generateIcons().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
