const { fetch } = require('undici');
const fs = require('fs');

// Функция для получения названия города по координатам
async function getCityName(lat, lon) {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=en`);
    const data = await response.json();
    return data.address.city || data.address.town || data.address.village || 'Unknown Location';
}

// Функция для получения данных дорог через Overpass API
async function getRoadsData(lat, lon, radius) {
    const query = `
        [out:json];
        (
          way["highway"](around:${radius},${lat},${lon});
          way["highway"~"motorway|trunk|primary"](around:${radius},${lat},${lon});
        );
        out geom; out body qt 100;
    `;
    const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query
    });
    const data = await response.json();
    if (data.elements && data.elements.length > 0) {
        return data;
    }
    throw new Error(`No road data found for coordinates ${lat}, ${lon}`);
}

// Функция для генерации оптимизированного SVG
function generateSVG(lat, lon, roads, cityName) {
    const width = 2000;
    const height = 2000;
    const scale = 3000;

    let svgContent = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
            <rect width="100%" height="100%" fill="#F5F5F5"/>
            <circle cx="${width/2}" cy="${height/2}" r="1" fill="red"/> <!-- Точка дома -->
    `;

    roads.elements.forEach(road => {
        if (road.type === 'way' && road.geometry) {
            svgContent += '<path d="';
            road.geometry.forEach((point, index) => {
                const x = ((point.lon - lon) * scale + width / 2);
                const y = ((lat - point.lat) * scale + height / 2);
                if (index === 0) {
                    svgContent += `M${x},${y} `;
                } else {
                    svgContent += `L${x},${y} `;
                }
            });
            svgContent += `" stroke="#333333" stroke-width="0.3" fill="none"/>\n`;
        }
    });

    // Текст ближе к центру снизу
    const textY = height / 2 + (scale * 0.001) * 50; // Уменьшено смещение с 100 до 50 пикселей
    svgContent += `<text x="${width/2}" y="${textY}" font-size="20" fill="#000000" text-anchor="middle">${cityName}</text>\n`; // Центр по x, text-anchor для выравнивания

    svgContent += '</svg>';

    return svgContent;
}

// Функция для рендеринга и экспорта карты с аргументами
async function generatePersonalMap() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.log('Usage: node generate_map.js <latitude> <longitude> <radius> [name]');
        return;
    }

    const lat = parseFloat(args[0]);
    const lon = parseFloat(args[1]);
    const radius = parseInt(args[2]);
    const name = args[3] || 'Custom_Location';

    if (isNaN(lat) || isNaN(lon) || isNaN(radius)) {
        console.log('Invalid latitude, longitude, or radius. Please use numbers.');
        return;
    }

    try {
        console.log(`Generating map for coordinates: ${lat}, ${lon} with radius ${radius}m`);
        const cityName = await getCityName(lat, lon);
        const roads = await getRoadsData(lat, lon, radius);
        const svgContent = generateSVG(lat, lon, roads, cityName);
        fs.writeFileSync(`${name}_map.svg`, svgContent);
        console.log(`Map for ${name} saved as ${name}_map.svg`);
    } catch (error) {
        console.error(`Error generating map: ${error.message}`);
    }
}

// Запуск с аргументами
generatePersonalMap();