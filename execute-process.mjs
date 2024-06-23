import puppeteer from 'puppeteer';
import { executablePath, headless, login, password, timeout } from './envs.mjs';
import { logger } from './logger.mjs';
import waitForElement from './wait-fot-element.mjs';
import exportSheet from './export-sheet.mjs';

const executeProcess = async (clockButtonSelector, tries = 1) => {
  const browser = await puppeteer.launch({
    executablePath,
    headless,
  });
  try {

    const page = await browser.newPage();
    await page.goto('https://sed.educacao.sp.gov.br/');

    // Login
    const loginInput = await page.waitForSelector('input#name');
    await loginInput.type(login);
    const passwordInput = await page.waitForSelector('input#senha');
    await passwordInput.type(password);
    const enterButton = await page.waitForSelector('#botaoEntrar');
    await enterButton.click();

    // Navigate to Consultation
    const classJournalLink = await page.waitForSelector('#decorAsidePopup > li:nth-child(4) a:nth-child(1)', {
      timeout
    });
    await classJournalLink.click();
    const evaluationsLink = await page.waitForSelector('#decorAsidePopup > li:nth-child(4) ul:nth-child(2) > li > a', {
      timeout
    });
    await evaluationsLink.click();
    await page.waitForSelector('#decorAsidePopup > li:nth-child(4) ul:nth-child(2) > li > ul > li > a', {
      timeout
    });
    await page.goto('https://sed.educacao.sp.gov.br/AvaliacaoNova/Consultar');

    // Get all classes
    await page.select('[name=tabelaDadosTurma_length]', '100');
    const classes = await page.$$('#tabelaDadosTurma > tbody > tr', {
      timeout
    });

    logger.info('Conseguimos recuperar as turmas');
    const gradesBySchool = {};

    for (let i = 0; i < 1; i++) {
      const classRow = classes[i];
      let school;
      let className;

      try {
        school = await classRow.$eval(
          'td:nth-child(1)',
          ({ innerText }) => innerText,
          { timeout }
        );
        className = await classRow.$eval(
          'td:nth-child(3)',
          ({ innerText }) => innerText,
          { timeout }
        );

        logger.info(`Buscando notas da turma: ${className} escola: ${school}`);


        if (!gradesBySchool[school])
          gradesBySchool[school] = [];

        const classObject = { className, students: [] };
        gradesBySchool[school].push(classObject);

        // Opening class grades
        await page.evaluate(waitForElement, 'td:nth-child(5) a');
        const magnifyButton = await classRow.$('td:nth-child(5) a', { timeout });
        await magnifyButton.click();

        // Getting avaliations from class
        await page.evaluate(waitForElement, 'th.colAvaliacao > a');
        const avaliations = await page.$$eval(
          'th.colAvaliacao > a',
          (avaliations) => avaliations.map(a => a.innerText.split(`\n`)[0]),
          { timeout }
        );

        // Getting students
        const studentsTable = await page.waitForSelector('tbody.linhasAlunosConsulta', { timeout });
        await page.select('[name=tabelaAlunos_length]', '100');
        const students = await studentsTable.$$('tr');

        for (let j = 0; j < students.length; j++) {
          const studentRow = students[j];
          let studentName;

          try {
            studentName = (await studentRow.$eval(
              'td:nth-child(3)',
              ({ innerText }) => innerText,
              { timeout }
            )).trim();
            logger.info(`Buscando notas do aluno: ${studentName}`);

            const code = await studentRow.$eval(
              'td:nth-child(1)',
              ({ innerText }) => innerText,
              { timeout }
            );

            const status = await studentRow.$eval(
              'td:nth-child(2)',
              ({ innerText }) => innerText,
              { timeout }
            );

            const grades = []

            for (let g = 4; g < avaliations.length + 4; g++) {
              const grade = await studentRow.$eval(
                `td:nth-child(${g}) > input`,
                (input) => input.value,
                { timeout }
              );
              
              const gradeName = avaliations[g - 4];
              const grageObject = { gradeName, grade };
              grades.push(grageObject);
              logger.info(`Avaliação: ${gradeName}, nota: ${grade}`);
            }

            const studentObject = {
              studentName,
              code,
              status,
              grades,
            };

            classObject.students.push(studentObject);
          } catch (error) {
            logger.warn(`Erro ao buscar dados do aluno [${studentName}], turma [${className}] na escola [${school}]: ${error}`);
          }
        }

        await page.evaluate(waitForElement, '.close');
        const closeButton = await page.waitForSelector('.close');
        closeButton.click();
      } catch (error) {
        logger.warn(`Erro ao buscar turma [${className}] na escola [${school}]: ${error}`);
      }
    }

    logger.info('Processo executado com sucesso');

    logger.info('Gerando planilhas');
    exportSheet(gradesBySchool);
  } catch (error) {
    await browser.close();
    logger.error(`Erro batendo realizando backup, tentativa: ${tries}, ${error}`);
    if (tries < 5) return executeProcess(clockButtonSelector, tries + 1);
  }

  try {
    await browser.close();
  } catch (error) {
  }
}

export default executeProcess;
