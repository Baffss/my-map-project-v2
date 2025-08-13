const fs = require('fs');
const { exec } = require('child_process');

// Функция для записи в лог с безопасной обработкой
function writeLog(filename, content) {
    try {
        fs.writeFileSync(filename, content, 'utf8');
    } catch (err) {
        console.error(`Ошибка записи в ${filename}:`, err);
    }
}

// Параметры из URL или дефолтные
const lat = process.argv[2] || 55.7558;
const lon = process.argv[3] || 37.6173;
const radius = process.argv[4] || 3000;

// Формируем Overpass URL
const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(way["highway"](around:${radius},${lat},${lon}););out geom;out body qt 30;`;
writeLog('last_overpass_url.txt', overpassUrl);

// Запускаем команду генерации
const cmd = `node generate_map.js ${lat} ${lon} ${radius}`;
exec(cmd, (error, stdout, stderr) => {
    if (stdout) {
        writeLog('last_stdout.txt', stdout);
    }
    if (stderr) {
        writeLog('last_stderr.txt', stderr);
    }
    if (error) {
        writeLog('last_error.txt', error.stack || error.toString());
    }
});
