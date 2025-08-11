const puppeteer = require('puppeteer');

async function generateCityMap(cityName) {
    // Запускаем браузер
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Устанавливаем размер окна для высокого качества
    await page.setViewport({ width: 3840, height: 2160, deviceScaleFactor: 2 });

    // Открываем локальный сайт city-roads
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });

    // Вводим название города в поисковую строку
    await page.waitForSelector('.query-input', { timeout: 5000 });
    await page.type('.query-input', cityName);
    await page.keyboard.press('Enter');

    // Ждём, пока карта отрендерится (15 секунд)
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Делаем скриншот
    await page.screenshot({ path: `${cityName}_map.png`, fullPage: false });

    // Закрываем браузер
    await browser.close();
    console.log(`Map for ${cityName} saved as ${cityName}_map.png`);
}

// Пример использования
generateCityMap('Paris').catch(console.error);