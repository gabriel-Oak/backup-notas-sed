import * as XLSX from 'xlsx/xlsx.mjs';
import * as fs from 'fs';
import { logger } from './logger.mjs';

/* load 'fs' for readFile and writeFile support */
XLSX.set_fs(fs);



export default function exportSheet(data) {
  const schools = Object.keys(data);

  schools.forEach((key) => {
    const school = data[key];
    const workbook = XLSX.utils.book_new();

    school.forEach((classObj) => {
      // {className, students: []}
      const header = ['Número', 'Situação', 'Nome'];
      const sanitizedStudents = classObj.students.map((student, index) => {
        if (!index)
          header.concat(student.grades.map(({ gradeName }) => gradeName));

        const newStudent = {
          'Número': student.code,
          'Situação': student.status,
          'Nome': student.studentName,
        }

        student.grades.forEach((grade) => {
          newStudent[grade.gradeName] = grade.grade;
        });

        return newStudent;
      });
      const worksheet = XLSX.utils.json_to_sheet(sanitizedStudents, { header });
      XLSX.utils.book_append_sheet(workbook, worksheet, classObj.className);
    });

    XLSX.writeFile(workbook, `sheets/${key}.xlsx`, { compression: true });
  });
}