const { fetch } = require('undici');
const fs = require('fs');
const sharp = require('sharp');

// Функция для получения названия города по координатам
async function getCityName(lat, lon) {
    console.log(`Fetching city name for ${lat}, ${lon}...`);
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=en`);
    const data = await response.json();
    return data.address.city || data.address.town || data.address.village || 'Unknown Location';
}

// Функция для получения данных дорог через Overpass API
async function getRoadsData(lat, lon, radius) {
    console.log(`Fetching road data for ${lat}, ${lon} with radius ${radius}...`);
    const query = `
        [out:json];
        (
          way["highway"](around:${radius},${lat},${lon});
        );
        out geom; out body qt 30;
    `;
    console.log(`Overpass query: ${query}`);
    const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const data = await response.json();
    console.log(`Received ${data.elements ? data.elements.length : 0} elements with radius ${radius}`);
    if (data.elements && data.elements.length > 0) {
        return data;
    }
    throw new Error(`No road data found for coordinates ${lat}, ${lon} with radius ${radius}`);
}

// Функция для генерации SVG
function generateSVG(lat, lon, roads, cityName, radius, withArrow = false) {
    console.log(`Generating SVG for ${cityName} with radius ${radius}...`);
    const width = 7016;  // Ширина А1
    const height = 9941; // Высота А1
    const centerX = width / 2;
    const centerY = height / 2;

    // Увеличенный scale: ширина карты = 7016 пикселей
    const scale = width / (radius * 0.0000225); // Коэффициент для увеличения в 4 раза

    let svgContent = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
            <rect width="100%" height="100%" fill="#FFFFFF"/> <!-- Белый фон -->
            <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="black" stroke-width="10"/> <!-- Рамка для проверки -->
    `;

    // Маркер в центре: круг или стрелка с текстом "My home"
    if (withArrow) {
        // Белая обводка стрелки (чуть больше по размеру)
        svgContent += `
            <path d="M${centerX-25} ${centerY+35} L${centerX} ${centerY-25} L${centerX+25} ${centerY+35} L${centerX-15} ${centerY+35} L${centerX-15} ${centerY+55} L${centerX+15} ${centerY+55} L${centerX+15} ${centerY+35} Z" 
                  fill="none" stroke="white" stroke-width="5"/>
        `;
        // Чёрная стрелка
        svgContent += `
            <path d="M${centerX-20} ${centerY+30} L${centerX} ${centerY} L${centerX+20} ${centerY+30} L${centerX-10} ${centerY+30} L${centerX-10} ${centerY+50} L${centerX+10} ${centerY+50} L${centerX+10} ${centerY+30} Z" 
                  fill="black"/>
            <text x="${centerX}" y="${centerY+110}" font-size="40" fill="#000000" text-anchor="middle" font-weight="bold">My home</text>
        `;
    } else {
        // Чёрный круг с белой обводкой (по умолчанию)
        svgContent += `
            <circle cx="${centerX}" cy="${centerY}" r="15" fill="black"/>
            <circle cx="${centerX}" cy="${centerY}" r="20" fill="none" stroke="white" stroke-width="5"/>
        `;
    }

    roads.elements.forEach(road => {
        if (road.type === 'way' && road.geometry) {
            svgContent += '<path d="';
            road.geometry.forEach((point, index) => {
                const x = ((point.lon - lon) * scale + centerX);
                const y = ((lat - point.lat) * scale + centerY);
                if (index === 0) {
                    svgContent += `M${x},${y} `;
                } else {
                    svgContent += `L${x},${y} `;
                }
            });
            svgContent += `" stroke="#333333" stroke-width="2" fill="none"/>\n`;
        }
    });

    const textY = centerY + (height * 0.35); // Смещение текста на 35% высоты
    svgContent += `<text x="${centerX}" y="${textY}" font-size="160" fill="#000000" text-anchor="middle">${cityName}</text>\n`;

    svgContent += '</svg>';

    return svgContent;
}

// Функция для конвертации SVG в JPEG для разных форматов и вариантов
async function convertToJPEG(svgContent, fileName, withArrow = false) {
    console.log(`Converting to different formats for ${fileName}...`);

    // Определение размеров для А1, А2, А3 (в пикселях при 300 DPI)
    const sizes = {
        'A1': { width: 7016, height: 9941 }, // 594x841 мм
        'A2': { width: 4961, height: 7016 }, // 420x594 мм
        'A3': { width: 3508, height: 4961 }  // 297x420 мм
    };

    const suffix = withArrow ? '_Arrow' : '';
    for (const [format, size] of Object.entries(sizes)) {
        try {
            await sharp(Buffer.from(svgContent))
                .resize(size.width, size.height)
                .flatten({ background: { r: 255, g: 255, b: 255 } }) // Улучшение рендеринга
                .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
                .toFile(`${fileName}${suffix}_${format}.jpg`);
            console.log(`Conversion completed for ${format}${suffix}: ${fileName}${suffix}_${format}.jpg`);
        } catch (error) {
            console.error(`Conversion error for ${format}${suffix}: ${error.message}`);
            throw error;
        }
    }
}

// Основная функция обработки заказа
async function generatePersonalMap(orderData, name) {
    const args = orderData.split(','); // Предполагаем формат "latitude, longitude, radius"
    if (args.length < 3) {
        console.log('Invalid order data. Expected format: "latitude, longitude, radius"');
        return;
    }

    const lat = parseFloat(args[0].trim());
    const lon = parseFloat(args[1].trim());
    const radius = parseInt(args[2].trim());
    console.log(`Processing with radius: ${radius}`);
    const fileName = name + '_' + Date.now();

    if (isNaN(lat) || isNaN(lon) || isNaN(radius)) {
        console.log('Invalid latitude, longitude, or radius.');
        return;
    }

    try {
        console.log(`Starting map generation for ${lat}, ${lon} with radius ${radius}m`);
        const cityName = await getCityName(lat, lon);
        const roads = await getRoadsData(lat, lon, radius);
        
        // Генерация и конвертация для варианта с кругом
        const svgContentCircle = generateSVG(lat, lon, roads, cityName, radius, false);
        fs.writeFileSync(`${fileName}_map.svg`, svgContentCircle);
        await convertToJPEG(svgContentCircle, fileName, false);

        // Генерация и конвертация для варианта со стрелкой
        const svgContentArrow = generateSVG(lat, lon, roads, cityName, radius, true);
        await convertToJPEG(svgContentArrow, fileName, true);

        console.log(`Map saved as ${fileName}_A1.jpg, ${fileName}_A2.jpg, ${fileName}_A3.jpg, ${fileName}_Arrow_A1.jpg, ${fileName}_Arrow_A2.jpg, ${fileName}_Arrow_A3.jpg`);
        return `${fileName}_A1.jpg`;
    } catch (error) {
        console.error(`Error generating map: ${error.message}`);
    }
}

// Точка входа для обработки аргументов из командной строки
if (process.argv.length >= 4) {
    const orderData = process.argv[2];
    const name = process.argv[3];
    generatePersonalMap(orderData, name);
}