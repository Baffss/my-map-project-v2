const express = require('express');
const { exec } = require('child_process');

const app = express();

console.log('PORT from env:', process.env.PORT);
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.get('/generate', (req, res) => {
  const { lat, lon, radius } = req.query;

  if (!lat || !lon || !radius) {
    return res.status(400).send('Missing lat, lon or radius parameters');
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);
  const radiusValue = parseInt(radius);

  if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusValue)) {
    return res.status(400).send('Invalid lat, lon or radius');
  }

  const orderData = `${latitude},${longitude},${radiusValue}`;
  const command = `node generate_map.js "${orderData}" "My_Home"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Execution error: ${error.message}`);
      return res.status(500).send('Server error');
    }
    if (stderr) {
      console.error(`Error output: ${stderr}`);
    }
    res.send(stdout);
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
