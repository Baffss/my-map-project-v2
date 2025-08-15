const { exec } = require('child_process');

const orderData = process.env.ORDER_DATA || '51.5074,-0.1278,2000'; // Уменьшен радиус до 2000 м
const name = process.env.NAME || 'Order';
const markerType = process.env.MARKER_TYPE || 'circle';
const customText = process.env.CUSTOM_TEXT || 'My home';

const command = `node generate_map.js "${orderData}" "${name}" ${markerType} "${customText}" > output.log 2>&1`;
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