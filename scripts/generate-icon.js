const fs = require('fs');
const path = require('path');

// Simple SVG icon generator for Django Power Tools
function generateIcon() {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
    <!-- Django green background -->
    <rect width="128" height="128" fill="#092E20" rx="16"/>
    
    <!-- Django "D" shape -->
    <path d="M 30 35 L 30 93 L 50 93 C 70 93 80 83 80 64 C 80 45 70 35 50 35 Z" 
          fill="#44B78B" stroke="none"/>
    
    <!-- Inner cut -->
    <path d="M 45 50 L 45 78 L 50 78 C 60 78 65 73 65 64 C 65 55 60 50 50 50 Z" 
          fill="#092E20" stroke="none"/>
    
    <!-- Power symbol (lightning bolt) -->
    <path d="M 75 20 L 55 55 L 65 55 L 55 108 L 98 45 L 85 45 Z" 
          fill="#FFD43B" stroke="#FFC107" stroke-width="2"/>
    
    <!-- Tools symbol (wrench) -->
    <g transform="translate(85, 85) rotate(-45, 0, 0)">
        <rect x="-3" y="-15" width="6" height="20" fill="#FFFFFF" rx="1"/>
        <circle cx="0" cy="-15" r="5" fill="none" stroke="#FFFFFF" stroke-width="3"/>
        <circle cx="0" cy="10" r="5" fill="none" stroke="#FFFFFF" stroke-width="3"/>
    </g>
</svg>`;

    // Convert SVG to PNG would require additional libraries
    // For now, we'll create a placeholder PNG file
    // In production, you'd use a proper SVG to PNG converter

    const iconPath = path.join(__dirname, '..', 'images', 'icon.png');
    
    // Create a simple placeholder PNG (1x1 pixel)
    // This is just for testing - replace with actual icon
    const pngData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x80, 0x00, 0x00, 0x00, 0x80,
        0x08, 0x06, 0x00, 0x00, 0x00, 0xC3, 0x3E, 0x61,
        0xCB, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
        0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    fs.writeFileSync(iconPath, pngData);
    console.log(`Icon generated at: ${iconPath}`);

    // Also save the SVG for reference
    const svgPath = path.join(__dirname, '..', 'images', 'icon.svg');
    fs.writeFileSync(svgPath, svg);
    console.log(`SVG saved at: ${svgPath}`);
}

generateIcon();