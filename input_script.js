const { exec } = require('child_process');
const readline = require('readline');

// Создаём интерфейс для ввода
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Запрашиваем координаты и радиус
rl.question('Enter latitude (e.g., 51.5074): ', (lat) => {
    rl.question('Enter longitude (e.g., -0.1278): ', (lon) => {
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

            // Формируем строку данных для generate_map.js без пробелов
            const orderData = `${latitude},${longitude},${radiusValue}`;
            const command = `node generate_map.js "${orderData}" "My_Home"`;
            console.log(`Running: ${command}`);

            // Запускаем generate_map.js с использованием exec
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Execution error: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.error(`Error output: ${stderr}`);
                    return;
                }
                console.log(`Output: ${stdout}`);
            });

            rl.close();
        });
    });
});