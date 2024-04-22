import fs from 'fs';
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import readline from 'readline';
import criteria from './criteria.js';

const parseLesson = ($lesson) => {
    const name = $lesson.find(':first-child').text().trim();
    const type = $lesson.find(':nth-child(2)').text().trim();
    const typeLabel = type === '(ПР)' ? 'Практика' : 'Лекция';
    return { name, label: criteria[name], typeLabel };
};

const parsePage = async (url, page) => {
    await page.goto(url, { waitUntil: 'networkidle0' });
    const content = await page.content();
    const $ = cheerio.load(content);
    return $('.container.main-container .l-page .row.mt-8 > div.col .row-lessons .lesson > div')
        .map((i, element) => parseLesson($(element)))
        .get();
};

const generateColumns = (urls) => {
    let columns = 'Имя предмета,Тип предмета,';
    urls.forEach((url) => {
        const dayAndMonth = url.split('date=')[1].replace('2024-', '').split('-').reverse();
        const columnName = `${dayAndMonth[0]}.${dayAndMonth[1]}`;
        columns += columnName + ',';
    });
    return columns + '\n';
};

const generateRows = (criteria, results) => {
    let rows = '';
    const lessonType = ['Лекция', 'Практика'];
    for (const [key, value] of Object.entries(criteria)) {
        lessonType.forEach((type) => {
            let row = `"${value}","${type}",`;
            results.forEach((lessons) => {
                const count = lessons.filter((lesson) => lesson.label === value && lesson.typeLabel === type).length;
                row += `${count * 2},`;
            });
            rows += row + '\n';
        });
    }
    return rows;
};

const generateUrls = (startingUrl, startDate, endDate) => {
    const urls = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().slice(0, 10);
        urls.push(startingUrl.replace('2024-01-15', dateString));
        currentDate.setDate(currentDate.getDate() + 7);
    }
    return urls;
};

const promptForUrl = () => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question('Пожалуйста, введите ссылку: ', (url) => {
            rl.close();
            resolve(url);
        });
    });
};

const main = async () => {
    const startingUrl = await promptForUrl();
    const startingDate = new Date('2024-01-15');
    const endingDate = new Date('2024-04-15');
    const urls = generateUrls(startingUrl, startingDate, endingDate);

    const browser = await puppeteer.launch();
    try {
        const results = await Promise.all(urls.map(async (url) => {
            const page = await browser.newPage();
            return await parsePage(url, page);
        }));
        const columns = generateColumns(urls);
        const rows = generateRows(criteria, results);
        const data = columns + rows;

        fs.writeFileSync('schedule.csv', data);
        console.log('CSV файл успешно создан!');
    } catch (error) {
        console.error(error);
    } finally {
        await browser.close();
    }
};

main();
