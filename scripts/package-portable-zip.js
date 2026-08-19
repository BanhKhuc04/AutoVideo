const fs = require('fs');
const path = require('path');
const archiverModule = require('archiver');

async function createPortableZip() {
  const rootDir = path.resolve(__dirname, '..');
  const releaseDir = path.join(rootDir, 'release');
  const unpackedDir = path.join(releaseDir, 'win-unpacked');
  const zipPath = path.join(releaseDir, 'YouTubeClipStudio-portable.zip');

  if (!fs.existsSync(unpackedDir)) {
    console.error('Error: win-unpacked directory not found at:', unpackedDir);
    process.exit(1);
  }

  // Ensure config folder is inside unpacked directory
  const unpackedConfigDir = path.join(unpackedDir, 'config');
  const sourceConfigDir = path.join(rootDir, 'config');
  if (fs.existsSync(sourceConfigDir)) {
    fs.cpSync(sourceConfigDir, unpackedConfigDir, { recursive: true });
    console.log('Copied config/ to win-unpacked/config/');
  }

  console.log(`Packaging ${unpackedDir} into ${zipPath}...`);

  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  const output = fs.createWriteStream(zipPath);
  const archive = new archiverModule.ZipArchive({
    zlib: { level: 9 }, // Maximum compression
  });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`=======================================================`);
      console.log(`🎉 Portable ZIP Package Created Successfully!`);
      console.log(`📦 File: ${zipPath}`);
      console.log(`📊 Size: ${sizeMB} MB`);
      console.log(`=======================================================`);
      resolve();
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Archiver warning:', err);
      } else {
        reject(err);
      }
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Append all files from win-unpacked with a root folder "YouTubeClipStudio"
    archive.directory(unpackedDir, 'YouTubeClipStudio');

    archive.finalize();
  });
}

createPortableZip().catch((err) => {
  console.error('Failed to create portable zip:', err);
  process.exit(1);
});
