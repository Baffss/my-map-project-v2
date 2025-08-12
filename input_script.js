const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
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

  console.log(`Processing with radius: ${radiusValue}`);
  console.log(`Starting map generation for ${latitude}, ${longitude}`);

  const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(way["highway"](around:${radiusValue},${latitude},${longitude}););out geom;out body qt 30;`;
  console.log("Overpass URL:", overpassUrl);

  fs.writeFileSync('last_overpass_url.txt', overpassUrl);

  const command = `node generate_map.js "${latitude},${longitude},${radiusValue}" "My_Home"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Execution error: ${error.message}`);
      return res.status(500).send('Server error');
    }
    if (stderr) {
      console.error(`Error output: ${stderr}`);
    }

    fs.writeFileSync('last_stdout.txt', stdout);

    res.send('Map generation started. Теперь зайди на /list-files чтобы посмотреть логи.');
  });
});

// Новый маршрут для показа файлов логов
app.get('/list-files', (req, res) => {
  try {
    const overpassLog = fs.readFileSync('last_overpass_url.txt', 'utf8');
    const stdoutLog = fs.readFileSync('last_stdout.txt', 'utf8');

    res.type('text/plain').send(`=== last_overpass_url.txt ===\n${overpassLog}\n\n=== last_stdout.txt ===\n${stdoutLog}`);
  } catch (err) {
    res.status(500).send('Ошибка при чтении логов. Возможно, файлы ещё не созданы.');
  }
});

console.log('PORT from env:', process.env.PORT);
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
