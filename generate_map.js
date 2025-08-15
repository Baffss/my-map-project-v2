const sharp = require('sharp');
const fs = require('fs');
const archiver = require('archiver');
const undici = require('undici');

async function generateMap(orderData, name, markerType, customText) {
    const [lat, lon, radius] = orderData.split(',').map(Number);
    const width = 400;
    const height = 300;

    // Запрос к Overpass API
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(way["highway"](around:${radius},${lat},${lon}););out body;`;
    const { body } = await undici.request(overpassUrl);
    const data = await body.json();
    const ways = data.elements;

    // SVG с дорогами
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="100%" height="100%" fill="white"/>`;
    svg += `<circle cx="${width/2}" cy="${height/2}" r="10" fill="red"/>`; // Маркер

    ways.forEach(way => {
        if (way.nodes && way.nodes.length > 1) {
            svg += `<polyline fill="none" stroke="black" stroke-width="1" points="`;
            way.nodes.forEach((nodeId, index) => {
                const node = data.elements.find(el => el.type === 'node' && el.id === nodeId);
                if (node && index < 10) {
                    const x = (node.lon - lon + radius / 100000) * (width / (radius / 500));
                    const y = (lat - node.lat + radius / 100000) * (height / (radius / 500));
                    svg += `${x},${y} `;
                }
            });
            svg += `"/>`;
        }
    });
    svg += `</svg>`;

    const imageBuffer = Buffer.from(svg);
    const outputPath = `${name}_${Date.now()}_A1.jpg`;
    sharp(imageBuffer)
        .jpeg({ quality: 60 })
        .toFile(outputPath, (err) => {
            if (err) {
                console.error(`Error generating image: ${err.message}`);
                return;
            }
            console.log(`Map saved as ${outputPath}`);

            const archive = archiver('zip', { zlib: { level: 9 } });
            const zipPath = `${name}_${Date.now()}.zip`;
            const output = fs.createWriteStream(zipPath);

            output.on('close', () => {
                console.log(`ZIP saved as ${zipPath}`);
                process.exit(0);
            });
            archive.pipe(output);
            archive.append(fs.createReadStream(outputPath), { name: 'map.jpg' });
            archive.finalize();
        });
}

const args = process.argv.slice(2);
if (args.length === 4) {
    generateMap(args[0], args[1], args[2], args[3]).catch(err => {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    });
} else {
    console.log('Usage: node generate_map.js "lat,lon,radius" name markerType customText');
    process.exit(1);
}