const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter latitude (e.g., 51.5074): ', (lat) => {
    rl.question('Enter longitude (e.g., -0.1278): ', (lon) => {
        rl.question('Enter radius in meters (e.g., 3000): ', (radius) => {
            rl.question('Choose marker type (circle/arrow): ', (markerType) => {
                rl.question('Enter custom text (e.g., My home, press Enter for default): ', (customText) => {
                    const latitude = parseFloat(lat);
                    const longitude = parseFloat(lon);
                    const radiusValue = parseInt(radius);
                    const marker = markerType.toLowerCase() === 'arrow' ? 'arrow' : 'circle';
                    const text = customText.trim() || 'My home';

                    if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusValue)) {
                        console.log('Invalid input. Please enter valid numbers.');
                        rl.close();
                        return;
                    }

                    const orderData = `${latitude},${longitude},${radiusValue}`; // Исправленная строка
                    const command = `node generate_map.js "${orderData}" "My_Home" ${marker} "${text}"`;
                    console.log(`Running: ${command}`);

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
    });
});