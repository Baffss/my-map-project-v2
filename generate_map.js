const sharp = require('sharp');
const fs = require('fs');
const archiver = require('archiver');

function generateMap(orderData, name, markerType, customText) {
    const [lat, lon, radius] = orderData.split(',').map(Number);
    // Уменьшенное разрешение для экономии памяти
    const width = 400; // Снизили с 800
    const height = 300; // Снизили с 600

    const svg = `
        <svg width="${width}" height="${height}">
            <rect width="100%" height="100%" fill="white"/>
            <circle cx="${width/2}" cy="${height/2}" r="10" fill="red"/>
            <text x="${width/2}" y="${height/2}" text-anchor="middle" fill="black">${customText}</text>
        </svg>
    `;

    const imageBuffer = Buffer.from(svg);
    const outputPath = `${name}_${Date.now()}_A1.jpg`;
    sharp(imageBuffer)
        .jpeg({ quality: 60 }) // Ещё большее сжатие
        .toFile(outputPath, (err) => {
            if (err) throw err;
            console.log(`Map saved as ${outputPath}`);

            const archive = archiver('zip', { zlib: { level: 9 } });
            const zipPath = `${name}_${Date.now()}.zip`;
            const output = fs.createWriteStream(zipPath);

            output.on('close', () => console.log(`ZIP saved as ${zipPath}`));
            archive.pipe(output);
            archive.append(fs.createReadStream(outputPath), { name: 'map.jpg' });
            archive.finalize();
        });
}

// Вызов с параметрами
const args = process.argv.slice(2);
if (args.length === 4) {
    generateMap(args[0], args[1], args[2], args[3]);
} else {
    console.log('Usage: node generate_map.js "lat,lon,radius" name markerType customText');
}