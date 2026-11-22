// Regenerates the PWA icons in public/. Requires the optional `canvas` package,
// which is intentionally not a dependency (it is a slow native build on Vercel).
// Run with: npm run icons
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#1a237e';
  roundRect(ctx, 0, 0, size, size, size * 0.12);
  ctx.fill();

  // Letter "K"
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.55}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('K', size / 2, size / 2 + size * 0.05);

  // Cage decorations (top)
  const cageSize = size * 0.18;
  const cageY = size * 0.12;
  const gap = size * 0.03;

  ctx.strokeStyle = '#64b5f6';
  ctx.lineWidth = size * 0.015;
  ctx.setLineDash([size * 0.02, size * 0.01]);

  // Three small cage boxes at top
  const startX = (size - (cageSize * 3 + gap * 2)) / 2;

  for (let i = 0; i < 3; i++) {
    const x = startX + i * (cageSize + gap);
    roundRect(ctx, x, cageY, cageSize, cageSize, size * 0.02);
    ctx.stroke();
  }

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(__dirname, '..', 'public', filename);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated ${filename}`);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Ensure public directory exists
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate all required icons
generateIcon(192, 'pwa-192x192.png');
generateIcon(512, 'pwa-512x512.png');
generateIcon(180, 'apple-touch-icon.png');
generateIcon(32, 'favicon.ico');

console.log('All icons generated!');
