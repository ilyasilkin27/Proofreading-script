import puppeteer from 'puppeteer';
import cheerio from 'cheerio';

const criteria = {
    'Физкультура':                                                  'Физическая культура                             \t',
    'История':                                                      'История                                         \t',
    'Ин.язык в проф. деятельности - Шлыкова (СПб)':                 'Ин. язык Шлыкова                                \t',
    'Ин.язык в проф. деятельности - Жернакова (СПб)':               'Ин. язык Жернакова                              \t',
    'Дискретная математика_Фархетдинова':                           'Дискретная математика                           \t',
    'Теория вероятностей и математическая статистика_Фархетдинова': 'Теория вероятностей и математическая статистика \t',
    'Разработка программных модулей_Цветкова (СПб)':                'РПМ Цветкова                                    \t',
    'Разработка программных модулей_Шайдаюк (СПб)':                 'РПМ Шайдаюк                                     \t',
    'Прикладное программирование_Шайдаюк (СПб)':                    'Прикладное программирование Шайдаюк             \t',
    'Прикладное программирование_Цветкова (СПб)':                   'Прикладное программирование Цветкова            \t',
    'Основы алгоритмизации и программирования_Цветкова':            'Основы алгоритмизации и программирования (ПП)   \t',
    'Основы проектирования баз данных_Цветкова':                    'Основы проектирования баз данных (ПП)           \t',
};

const parsePage = async (url, page) => {
    await page.goto(url, { waitUntil: 'networkidle0' });
    const content = await page.content();
    const $ = cheerio.load(content);
    const lessons = [];

    $('.container.main-container .l-page .row.mt-8 > div.col .row-lessons .lesson > div').each((i, element) => {
        const name = $(element).find(':first-child').text().trim();
        const type = $(element).find(':nth-child(2)').text().trim();
        const typeLabel = type === '(ПР)' ? 'Практика' : 'Лекция';
        const label = criteria[name];
        // console.log('name', name);
        // console.log('label', label);
        // console.log('typeLabel', typeLabel);
        if (label) {
            lessons.push({ name, label, typeLabel });
        }
    });

    return lessons;
};

const main = async (urls) => {
    // const browser = await puppeteer.launch();
    // const page = await browser.newPage();
    const results = [];

    const browser = await puppeteer.launch();
    for (const url of urls) {
        const page = await browser.newPage();
        const lessons = await parsePage(url, page);

        results.push(lessons);
    }
    await browser.close();


    let columns = 'Имя предмета' + ' '.repeat(40) + 'Тип предмета ';
    results.forEach((lessons, index) => {
        const dayAndMonth = urls[index].split('date=')[1].replace('2024-', '').split('-').reverse();
        const columnName = `${dayAndMonth[0]}.${dayAndMonth[1]}`;
        columns += columnName + '  ';
    });
    //console.log('results', results);
    console.log('\x1b[0m', columns);

    const lessonType = ['Лекция', 'Практика']

    for (const [key, value] of Object.entries(criteria)) {
        // const lessonCounts = {};

        lessonType.forEach((type) => {
            let logMessage = `${value}`;
            const typeLabel = type === 'Лекция' ? 'Лекция  ' : type;
            logMessage += `${typeLabel}  `;
            let hasLesson = false;
            results.forEach((lessons, index) => {

                let count = lessons.filter((lesson) => lesson.label === value && lesson.typeLabel === type).length;
                hasLesson = hasLesson || count > 0;

                logMessage += `${count*2}      `;
            });

            let color = type === 'Лекция' ? '\x1b[34m' : '\x1b[32m';
            color = hasLesson ? color : '\x1b[31m';

            console.log(color, logMessage);
            //console.log(logMessage);
        });
        console.log('\x1b[0m', '-'.repeat(200));
    }
};

// Запуск главной функции

const startingUrl = 'https://schedule.mstimetables.ru/publications/173aba53-0f37-46e7-b14c-91b2d3ef1af7#/groups/6/lessons?date=2024-01-15';
// nextUrl will be 'https://schedule.mstimetables.ru/publications/173aba53-0f37-46e7-b14c-91b2d3ef1af7#/groups/6/lessons?date=2024-01-22';
const startingDate = new Date('2024-01-15');
// const endingDate = new Date('2024-05-27');
const endingDate = new Date('2024-05-27');
const urls = [startingUrl];
// generate urls
let date = startingDate;
while (date <= endingDate) {
    const newDate = new Date(date);
    newDate.setDate(date.getDate() + 7);
    const dateString = '2024-' + (newDate.getMonth() + 1).toString().padStart(2, '0') + '-' + newDate.getDate().toString().padStart(2, '0');
    const url = startingUrl.replace('2024-01-15', dateString);
    urls.push(url);
    date = newDate;
}
urls.pop();

main(urls);
