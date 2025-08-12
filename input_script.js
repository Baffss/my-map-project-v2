const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();

console.log('PORT from env:', process.env.PORT);
const PORT = process.env.PORT || 3000;

const OUTPUT_DIR = path.join(__dirname, 'output');
// Убедимся, что папка output существует
try { fs.mkdirSync(OUTPUT_DIR, { recursive: true }); } catch (e) { console.error(e); }

// Простая проверка сервера
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Статическая отдача файлов из папки output
app.use('/files', express.static(OUTPUT_DIR));

// Список файлов (последние сверху)
app.get('/list-files', async (req, res) => {
  try {
    const files = await fs.promises.readdir(OUTPUT_DIR);
    const filesWithStat = await Promise.all(files.map(async f => {
      const st = await fs.promises.stat(path.join(OUTPUT_DIR, f));
      return { file: f, mtime: st.mtimeMs };
    }));
    filesWithStat.sort((a,b) => b.mtime - a.mtime);
    res.json(filesWithStat.map(x => ({ file: x.file, url: `/files/${encodeURIComponent(x.file)}` })));
  } catch (err) {
    console.error('list-files error', err);
    res.status(500).send('Cannot list files');
  }
});

// Вспомогательная функция: находит самый новый файл в output
async function getNewestFile() {
  const files = await fs.promises.readdir(OUTPUT_DIR);
  if (!files || files.length === 0) return null;
  let newest = null;
  let newestTime = 0;
  for (const f of files) {
    const st = await fs.promises.stat(path.join(OUTPUT_DIR, f));
    if (st.mtimeMs > newestTime) {
      newestTime = st.mtimeMs;
      newest = f;
    }
  }
  return newest;
}

// Генерация карты — запускает generate_map.js и пытается вернуть ссылку на сгенерированный файл
app.get('/generate', async (req, res) => {
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
  // Если generate_map.js принимает и сохраняет в ./output/, оставим вызов прежним
  const command = `node generate_map.js "${orderData}" "My_Home"`;
  console.log('Running:', command);

  exec(command, { maxBuffer: 1024 * 1024 * 10 }, async (error, stdout, stderr) => {
    if (error) {
      console.error(`Execution error: ${error.message}`);
      console.error('stderr:', stderr);
      return res.status(500).send('Server error while generating map');
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
    }

    // Попробуем найти последний созданный файл и вернуть ссылку
    try {
      const newest = await getNewestFile();
      if (newest) {
        const fileUrl = `/files/${encodeURIComponent(newest)}`;
        console.log('Generated file:', newest);
        return res.json({ message: 'Generated', file: fileUrl, stdout: stdout ? stdout.trim() : '' });
      } else {
        // Если файлов нет — вернём stdout (возможно script печатает путь)
        return res.json({ message: 'No file found in output, returning stdout', stdout: stdout ? stdout.trim() : '' });
      }
    } catch (e) {
      console.error('Error finding file', e);
      return res.status(500).send('Generation succeeded but cannot find file');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});