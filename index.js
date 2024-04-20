import puppeteer from 'puppeteer';
import cheerio from 'cheerio';

const criteria = {
    'Физкультура': 'Физическая культура',
    'История': 'История',
    'Ин.язык в проф. деятельности - Шлыкова (СПб)': 'Ин. язык Шлыкова',
    'Ин.язык в проф. деятельности - Жернакова (СПб)': 'Ин. язык Жернакова',
    'Дискретная математика_Фархетдинова': 'Дискретная математика',
    'Теория вероятностей и математическая статистика_Фархетдинова': 'Теория вероятностей и математическая статистика',
    'Разработка программных модулей_Цветкова (СПб)': 'РПМ Цветкова',
    'Разработка программных модулей_Шайдаюк (СПб)': 'РПМ Шайдаюк',
    'Прикладное программирование_Шайдаюк (СПб)': 'Прикладное программирование Шайдаюк',
    'Прикладное программирование_Цветкова (СПб)': 'Прикладное программирование Цветкова',
    'Основы алгоритмизации и программирования_Цветкова': 'Основы алгоритмизации и программирования (ПП)',
    'Основы проектирования баз данных_Цветкова': 'Основы проектирования баз данных (ПП)',
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

const printColumns = (urls) => {
    let columns = 'Имя предмета'.padEnd(40) + 'Тип предмета ';
    urls.forEach((url) => {
        const dayAndMonth = url.split('date=')[1].replace('2024-', '').split('-').reverse();
        const columnName = `${dayAndMonth[0]}.${dayAndMonth[1]}`;
        columns += columnName.padEnd(10);
    });
    console.log('\x1b[0m', columns);
};

const printLessons = (criteria, results) => {
    const lessonType = ['Лекция', 'Практика'];
    for (const [key, value] of Object.entries(criteria)) {
        lessonType.forEach((type) => {
            let logMessage = `${value}`;
            const typeLabel = type === 'Лекция' ? 'Лекция  ' : type;
            logMessage += `${typeLabel}  `;
            let hasLesson = false;
            results.forEach((lessons) => {
                const count = lessons.filter((lesson) => lesson.label === value && lesson.typeLabel === type).length;
                hasLesson = hasLesson || count > 0;
                logMessage += `${count * 2}      `;
            });
            let color = type === 'Лекция' ? '\x1b[34m' : '\x1b[32m';
            color = hasLesson ? color : '\x1b[31m';
            console.log(color, logMessage);
        });
        console.log('\x1b[0m', '-'.repeat(200));
    }
};

const main = async (urls) => {
    const browser = await puppeteer.launch();
    const results = [];
    try {
        for (const url of urls) {
            const page = await browser.newPage();
            const lessons = await parsePage(url, page);
            results.push(lessons);
        }
        printColumns(urls);
        printLessons(criteria, results);
    } catch (error) {
        console.error(error);
    } finally {
        await browser.close();
    }
};

const startingUrl = 'https://schedule.mstimetables.ru/publications/173aba53-0f37-46e7-b14c-91b2d3ef1af7#/groups/6/lessons?date=2024-01-15';
const startingDate = new Date('2024-01-15');
const endingDate = new Date('2024-04-15');
const urls = [startingUrl];
let date = new Date(startingDate);
while (date <= endingDate) {
    date.setDate(date.getDate() + 7);
    const dateString = '2024-' + (date.getMonth() + 1).toString().padStart(2, '0') + '-' + date.getDate().toString().padStart(2, '0');
    const url = startingUrl.replace('2024-01-15', dateString);
    urls.push(url);
}
urls.pop();

main(urls);





