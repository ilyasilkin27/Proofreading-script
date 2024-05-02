import grade9 from './src/grade9.js';
import grade11 from './src/grade11.js';
import rl from './src/helpers/readlineInstance.js';

const chooseModule = async (rl) => {
  return new Promise((resolve, reject) => {
    rl.question('Выберите класс (9 или 11): ', async (answer) => {
      if (answer === '9') {
        await grade9();
        resolve();
      } else if (answer === '11') {
        await grade11();
        resolve();
      } else {
        console.log('Неверный выбор. Пожалуйста, введите 9 или 11.');
        resolve(chooseModule());
      }
    });
  });
};

const runProgram = async () => {
  await chooseModule(rl);
  rl.close();
};

runProgram();
