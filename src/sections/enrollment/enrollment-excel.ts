import { ENROLLMENT_IMPORT_LIMIT, enrollmentImportRowSchema } from './enrollment-import-schema';

const HEADERS = ['รหัสนักเรียน', 'ชื่อห้องเรียน', 'เลขที่'];
const ENROLLMENT_SHEET = 'ลงทะเบียน';
const CLASSROOM_SHEET = 'ห้องเรียน';

export async function createEnrollmentWorkbook(
  academicYearId: string,
  year: string,
  classroomNames: string[]
) {
  const XLSX = await import('xlsx');
  const entrySheet = XLSX.utils.aoa_to_sheet([
    HEADERS,
    ...Array.from({ length: ENROLLMENT_IMPORT_LIMIT }, () => ['', '', '']),
  ]);
  entrySheet['!cols'] = [{ wch: 22 }, { wch: 30 }, { wch: 15 }];
  for (let row = 2; row <= ENROLLMENT_IMPORT_LIMIT + 1; row += 1) {
    entrySheet[`A${row}`].z = '@';
    entrySheet[`B${row}`].z = '@';
    entrySheet[`C${row}`].z = '@';
  }

  const roomSheet = XLSX.utils.aoa_to_sheet([
    ['ปีการศึกษา', year],
    ['รหัสปีการศึกษา', academicYearId],
    [],
    ['ชื่อห้องเรียน'],
    ...classroomNames.map((name) => [name]),
  ]);
  roomSheet['!cols'] = [{ wch: 30 }, { wch: 42 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, entrySheet, ENROLLMENT_SHEET);
  XLSX.utils.book_append_sheet(workbook, roomSheet, CLASSROOM_SHEET);
  return { workbook, XLSX };
}

export async function readEnrollmentWorkbook(file: File, academicYearId: string) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: 'array',
    sheetRows: ENROLLMENT_IMPORT_LIMIT + 2,
  });
  const sheet = workbook.Sheets[ENROLLMENT_SHEET];
  if (!sheet || workbook.Sheets[CLASSROOM_SHEET]?.B2?.v !== academicYearId) {
    throw new Error('กรุณาใช้เทมเพลตของปีการศึกษาที่เลือก');
  }
  if (
    HEADERS.some((header, col) => sheet[XLSX.utils.encode_cell({ r: 0, c: col })]?.v !== header)
  ) {
    throw new Error('หัวคอลัมน์ในไฟล์ไม่ตรงกับเทมเพลต');
  }

  const data = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: true,
    range: 0,
  });
  const rows = [];
  for (const [index, cells] of data.entries()) {
    if (!index) continue;
    const [studentCode = '', classroomName = '', studentNumber = ''] = cells;
    if (![studentCode, classroomName, studentNumber].some((value) => value.trim())) continue;
    if (index > ENROLLMENT_IMPORT_LIMIT) {
      throw new Error(`กรุณากรอกข้อมูลใน ${ENROLLMENT_IMPORT_LIMIT} แถวแรกของเทมเพลต`);
    }
    const result = enrollmentImportRowSchema.safeParse({
      row: index + 1,
      studentCode,
      classroomName,
      studentNumber,
    });
    if (!result.success) {
      throw new Error(`แถว ${index + 1}: ${result.error.issues[0].message}`);
    }
    rows.push(result.data);
  }
  // SheetJS exposes the full range when reading only the first rows.
  if (
    sheet['!fullref'] &&
    XLSX.utils.decode_range(sheet['!fullref']).e.r > ENROLLMENT_IMPORT_LIMIT
  ) {
    throw new Error(`กรุณากรอกข้อมูลใน ${ENROLLMENT_IMPORT_LIMIT} แถวแรกของเทมเพลต`);
  }
  if (!rows.length) throw new Error('ไม่พบรายการลงทะเบียนในไฟล์');
  return rows;
}
