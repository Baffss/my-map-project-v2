const { exec } = require('child_process');
const readline = require('readline');

// Создаём интерфейс для ввода
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Запрашиваем координаты и радиус
rl.question('Enter latitude (e.g., 48.307902): ', (lat) => {
    rl.question('Enter longitude (e.g., 37.983508): ', (lon) => {
        rl.question('Enter radius in meters (e.g., 3000): ', (radius) => {
            // Преобразуем ввод в числа
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lon);
            const radiusValue = parseInt(radius);

            if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusValue)) {
                console.log('Invalid input. Please enter valid numbers.');
                rl.close();
                return;
            }

            // Формируем команду для запуска generate_map.js с параметрами
            const command = `node generate_map.js "${latitude}" "${longitude}" "${radiusValue}" "My_Home"`;
            console.log(`Running: ${command}`);

            // Запускаем основной скрипт
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.error(`Stderr: ${stderr}`);
                    return;
                }
                console.log(`Output: ${stdout}`);
            });

            rl.close();
        });
    });
});