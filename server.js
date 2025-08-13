const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Проверка, что сервер работает
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Генерация карты
app.get('/generate', (req, res) => {
  const { lat, lon, radius } = req.query;

  if (!lat || !lon || !radius) {
    return res.status(400).send('Missing lat, lon or radius parameters');
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);
  let radiusValue = parseInt(radius);

  if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusValue)) {
    return res.status(400).send('Invalid lat, lon or radius');
  }

  // Ограничение радиуса до 3000 для Render Free
  if (radiusValue > 3000) radiusValue = 3000;

  console.log(`Processing with radius: ${radiusValue}`);
  console.log(`Starting map generation for ${latitude}, ${longitude}`);

  const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(way["highway"](around:${radiusValue},${latitude},${longitude}););out geom;out body qt 30;`;
  console.log("Overpass URL:", overpassUrl);

  fs.writeFileSync(path.join(__dirname, 'last_overpass_url.txt'), overpassUrl);

  const command = `node generate_map.js "${latitude},${longitude},${radiusValue}" "My_Home"`;

  exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Execution error: ${error.message}`);
      return res.status(500).send('Server error');
    }
    if (stderr) {
      console.error(`Error output: ${stderr}`);
    }

    fs.writeFileSync(path.join(__dirname, 'last_stdout.txt'), stdout);
    res.send('Map generation started. Check server logs for details.');
  });
});

// Список всех файлов
app.get('/list-files', (req, res) => {
  fs.readdir(__dirname, (err, files) => {
    if (err) return res.status(500).send('Cannot read files');
    res.send(files);
  });
});

// Доступ к конкретному файлу
app.get('/files/:filename', (req, res) => {
  const filePath = path.join(__dirname, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
  res.sendFile(filePath);
});

console.log('PORT from env:', process.env.PORT);
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
