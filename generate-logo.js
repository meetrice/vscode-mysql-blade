const fs = require('fs');
const path = require('path');

// Create a black and white VSCode extension icon
// Following VSCode icon guidelines: simple, clean, monochrome

const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Background - white with subtle border -->
  <rect width="512" height="512" rx="100" fill="#ffffff"/>
  <rect width="512" height="512" rx="100" fill="none" stroke="#000000" stroke-width="8"/>
  
  <!-- Database stack (3 layers) - black outline -->
  <!-- Bottom layer -->
  <ellipse cx="256" cy="340" rx="100" ry="30" fill="none" stroke="#000000" stroke-width="8"/>
  <path d="M156 280 v60 c0 16.5 45 30 100 30 s100 -13.5 100 -30 v-60" fill="none" stroke="#000000" stroke-width="8"/>
  
  <!-- Middle layer -->
  <ellipse cx="256" cy="280" rx="100" ry="30" fill="none" stroke="#000000" stroke-width="8"/>
  <path d="M156 220 v60 c0 16.5 45 30 100 30 s100 -13.5 100 -30 v-60" fill="none" stroke="#000000" stroke-width="8"/>
  
  <!-- Top layer -->
  <ellipse cx="256" cy="220" rx="100" ry="30" fill="none" stroke="#000000" stroke-width="8"/>
  <path d="M156 220 v0 c0 16.5 45 30 100 30 s100 -13.5 100 -30 v0" fill="none" stroke="#000000" stroke-width="8"/>
  
  <!-- Blade/sword icon - black outline -->
  <g transform="translate(320, 160) rotate(45)">
    <path d="M0 0 L60 0 L70 10 L10 70 L0 60 Z" fill="none" stroke="#000000" stroke-width="6"/>
    <path d="M10 70 L0 80 L10 90 L20 80 Z" fill="#000000"/>
  </g>
</svg>`;

// Write the main SVG file
fs.writeFileSync(path.join(__dirname, 'logo.svg'), svgContent);
console.log('logo.svg created successfully');

// Create icon.svg for VSCode (128x128)
const iconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="128" height="128" rx="28" fill="#ffffff"/>
  <rect width="128" height="128" rx="28" fill="none" stroke="#000000" stroke-width="3"/>
  
  <!-- Database stack -->
  <ellipse cx="64" cy="85" rx="25" ry="8" fill="none" stroke="#000000" stroke-width="3"/>
  <path d="M39 70 v15 c0 4.5 11 8 25 8 s25 -3.5 25 -8 v-15" fill="none" stroke="#000000" stroke-width="3"/>
  
  <ellipse cx="64" cy="70" rx="25" ry="8" fill="none" stroke="#000000" stroke-width="3"/>
  <path d="M39 55 v15 c0 4.5 11 8 25 8 s25 -3.5 25 -8 v-15" fill="none" stroke="#000000" stroke-width="3"/>
  
  <ellipse cx="64" cy="55" rx="25" ry="8" fill="none" stroke="#000000" stroke-width="3"/>
  <path d="M39 55 v0 c0 4.5 11 8 25 8 s25 -3.5 25 -8 v0" fill="none" stroke="#000000" stroke-width="3"/>
  
  <!-- Blade -->
  <g transform="translate(80, 40) rotate(45)">
    <path d="M0 0 L15 0 L18 3 L3 18 L0 15 Z" fill="none" stroke="#000000" stroke-width="2.5"/>
    <path d="M3 18 L0 21 L3 24 L6 21 Z" fill="#000000"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(__dirname, 'icon.svg'), iconSvg);
console.log('icon.svg created successfully');
