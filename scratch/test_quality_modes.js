const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ffmpegPath = path.resolve('D:/AutoVIdeo/server/bin/ffmpeg.exe');
const ytDlpPath = path.resolve('D:/AutoVIdeo/server/bin/yt-dlp.exe');

console.log('Testing 720p and 1080p scale filters...');

const tempDir = path.resolve('D:/AutoVIdeo/server/temp/test_quality');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

// Create a synthetic 1080p source video using ffmpeg
const syntheticSource = path.join(tempDir, 'synthetic_1080p.mp4');
console.log('1. Generating test 1080p video...');
const genRes = spawnSync(ffmpegPath, [
  '-y',
  '-f', 'lavfi',
  '-i', 'testsrc=duration=5:size=1920x1080:rate=30',
  '-f', 'lavfi',
  '-i', 'sine=frequency=1000:duration=5',
  '-c:v', 'libx264',
  '-c:a', 'aac',
  syntheticSource
]);

if (genRes.status !== 0) {
  console.error('Failed to generate test video:', genRes.stderr?.toString());
  process.exit(1);
}
console.log('✓ Generated 1080p test video at:', syntheticSource);

// Function to cut and check resolution
function cutAndCheckResolution(source, quality, outName) {
  const is1080p = quality === '1080p';
  const targetW = is1080p ? 1920 : 1280;
  const targetH = is1080p ? 1080 : 720;
  const scaleFilter = `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2,setsar=1`;
  const outPath = path.join(tempDir, outName);

  const cutRes = spawnSync(ffmpegPath, [
    '-y',
    '-ss', '1',
    '-i', source,
    '-t', '2',
    '-vf', scaleFilter,
    '-c:v', 'libx264',
    '-c:a', 'aac',
    outPath
  ]);

  if (cutRes.status !== 0) {
    console.error(`Failed to cut ${quality}:`, cutRes.stderr?.toString());
    return false;
  }

  // Probe output resolution with ffmpeg
  const probeRes = spawnSync(ffmpegPath, ['-i', outPath]);
  const outputInfo = probeRes.stderr?.toString() || '';
  const match = outputInfo.match(/Stream #0:0.*?Video:.*?(\d{3,4})x(\d{3,4})/);

  if (match) {
    const width = parseInt(match[1], 10);
    const height = parseInt(match[2], 10);
    console.log(`✓ ${quality} Output Resolution: ${width}x${height} (Expected: ${targetW}x${targetH})`);
    return width === targetW && height === targetH;
  } else {
    console.warn(`Could not parse resolution for ${outName}. Output info:`, outputInfo);
    return false;
  }
}

const check720p = cutAndCheckResolution(syntheticSource, '720p', 'output_720p.mp4');
const check1080p = cutAndCheckResolution(syntheticSource, '1080p', 'output_1080p.mp4');

console.log(`\n========================================`);
console.log(`720p Resolution Check: ${check720p ? 'PASSED (1280x720)' : 'FAILED'}`);
console.log(`1080p Resolution Check: ${check1080p ? 'PASSED (1920x1080)' : 'FAILED'}`);
console.log(`========================================\n`);

// Clean up
try {
  fs.rmSync(tempDir, { recursive: true, force: true });
} catch {}

if (check720p && check1080p) {
  process.exit(0);
} else {
  process.exit(1);
}
