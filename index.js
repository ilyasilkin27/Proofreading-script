import fs from 'fs';
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import readline from 'readline';

const criteria = {
    'Физкультура': 'Физкультура',
    'Физкультура (онлайн)': 'Физкультура (онлайн)',
    'История': 'История',
    'Ин.язык в проф. деятельности - Шлыкова (СПб)': 'Ин. язык Шлыкова (СПб)',
    'Ин. язык в проф. деятельности - Шлыкова (онлайн)': 'Ин. язык Шлыкова (онлайн)',
    'Ин.язык в проф. деятельности - Жернакова (СПб)': 'Ин. язык Жернакова (СПб)',
    'Ин. язык в проф. деятельности - Жернакова (онлайн)': 'Ин. язык Жернакова (онлайн)',
    'Дискретная математика_Фархетдинова': 'Дискретная математика',
    'Теория вероятностей и математическая статистика_Фархетдинова': 'Теория вероятностей и математическая статистика',
    'Разработка программных модулей_Цветкова (СПб)': 'РПМ Цветкова',
    'Разработка программных модулей_Шайдаюк (СПб)': 'РПМ Шайдаюк',
    'Прикладное программирование_Шайдаюк (СПб)': 'Прикладное программирование Шайдаюк',
    'Прикладное программирование_Цветкова (СПб)': 'Прикладное программирование Цветкова',
    'Основы алгоритмизации и программирования_Цветкова': 'Основы алгоритмизации и программирования (ПП)',
    'Основы проектирования баз данных_Цветкова': 'Основы проектирования баз данных (ПП)',
    'Разработка ПМ_Латников (дистант)': 'Разработка ПМ_Латников (дистант)',
    'Основы алгоритмизации и программирования_Латников (дист)': 'Основы алгоритмизации и программирования_Латников (дист)',
    'Основы алгоритмизации и программирования_Дернов (дист)': 'Основы алгоритмизации и программирования_Дернов (дист)',
    'Разработка ПМ_Дернов (дистант)': 'Разработка ПМ_Дернов (дистант)',
};

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
        rl.question('Please enter the URL: ', (url) => {
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
        console.log('CSV file created successfully!');
    } catch (error) {
        console.error(error);
    } finally {
        await browser.close();
    }
};

main();
