import fs from 'fs';
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import readline from 'readline';
import criteria9 from './criteria9.js';

const parseLesson = (lesson) => {
    let name;
    let subGroup;
    if (lesson.find(':first-child').hasClass('lesson-subgroup')) {
        name = lesson.find(':nth-child(2)').text().trim();
        subGroup = lesson.find(':first-child').text().trim();
    } else {
        name = lesson.find(':first-child').text().trim();
    }
    return { name, subGroup, label: criteria9[name] };
};

const parsePage = async (url, page) => {
    await page.goto(url, { waitUntil: 'networkidle0' });
    const content = await page.content();
    const $ = cheerio.load(content);
    return $('.container.main-container .l-page .wrap .pb-6 .row-lessons .others .info-lesson .subject .lessons-detail div')
        .map((i, element) => parseLesson($(element)))
        .get();
};

const generateColumns = (urls) => {
    let columns = 'Имя предмета,';
    urls.forEach((url) => {
        const dayAndMonth = url.split('date=')[1].replace('2024-', '').split('-').reverse();
        const columnName = `${dayAndMonth[0]}.${dayAndMonth[1]}`;
        columns += columnName + ',';
    });
    return columns + '\n';
};

const generateRows = (criteria9, results) => {
    let rows = '';
    for (const [key, value] of Object.entries(criteria9)) {
        let subgroupRows = {};
        results.forEach((lessons) => {
            lessons.forEach((lesson) => {
                if (lesson.label === value) {
                    if (lesson.subGroup) {
                        if (!subgroupRows[lesson.subGroup]) {
                            subgroupRows[lesson.subGroup] = Array(results.length).fill(0);
                        }
                        subgroupRows[lesson.subGroup][results.indexOf(lessons)] += 2;
                    } else {
                        if (!subgroupRows['Без подгруппы']) {
                            subgroupRows['Без подгруппы'] = Array(results.length).fill(0);
                        }
                        subgroupRows['Без подгруппы'][results.indexOf(lessons)] += 2;
                    }
                }
            });
        });

        // Generate rows for each subgroup
        Object.entries(subgroupRows).forEach(([subgroup, counts]) => {
            rows += `${value} (${subgroup}),${counts.join(',')},`;
            rows += '\n';
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
        const rows = generateRows(criteria9, results);
        const data = columns + rows;

        fs.writeFileSync('grade9.csv', data);
        console.log('CSV файл успешно создан!');
    } catch (error) {
        console.error(error);
    } finally {
        await browser.close();
    }
};

main();
