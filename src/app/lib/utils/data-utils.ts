/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-useless-escape */
import * as XLSX from 'xlsx';

export function cleanText(str: any) {
  return str ? String(str).replace(/_/g, ' ') : '';
}

export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
  str = str.replace(/Đ/g, 'D');
  return str.toUpperCase().trim();
}

export function findColumnMapping(
  fileHeaders: string[],
  targetHeaders: string[],
  manualMapping?: Record<string, string>
): Record<string, number> {
  const colMap: Record<string, number> = {};

  targetHeaders.forEach((target) => {
    // 1. Check manual mapping first
    if (manualMapping && manualMapping[target]) {
      const mappedHeader = manualMapping[target].toUpperCase().trim();
      const idx = fileHeaders.findIndex(
        (h) => h.toUpperCase().trim() === mappedHeader
      );
      if (idx !== -1) {
        colMap[target] = idx;
        return;
      }
    }

    const tUp = target.toUpperCase().trim();

    // 2. Exact match
    let idx = fileHeaders.findIndex((h) => h.toUpperCase().trim() === tUp);

    // 2. Fuzzy match if not found
    if (idx === -1) {
      if (tUp === 'FULL NAME') {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return (
            v.includes('FULL NAME') ||
            v.includes('HỌ VÀ TÊN') ||
            v.includes('TÊN NHÂN VIÊN')
          );
        });
      } else if (tUp === 'ID NUMBER') {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return v.includes('ID') || v.includes('MÃ NV') || v.includes('CMND');
        });
      } else if (tUp === 'TOTAL PAYMENT') {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return (
            v.includes('TOTAL') || v.includes('TỔNG') || v.includes('THỰC NHẬN')
          );
        });
      } else if (tUp === 'BANK ACCOUNT NUMBER') {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return (
            v.includes('ACCOUNT') ||
            v.includes('TÀI KHOẢN') ||
            v.includes('STK')
          );
        });
      } else if (tUp === 'BANK NAME') {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return v.includes('BANK NAME') || v.includes('NGÂN HÀNG');
        });
      } else if (tUp === 'CITAD CODE') {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return v.includes('CITAD');
        });
      } else if (tUp === 'TAX CODE') {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return (
            v.includes('TAX') || v.includes('MST') || v.includes('MÃ SỐ THUẾ')
          );
        });
      } else if (tUp === 'CONTRACT NO') {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return v.includes('CONTRACT') || v.includes('HỢP ĐỒNG');
        });
      } else if (tUp === 'FROM') {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return (
            v === 'FROM' ||
            v === 'TỪ' ||
            v.includes('TỪ NGÀY') ||
            v === 'START DATE'
          );
        });
      } else if (tUp === 'TO') {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return (
            v === 'TO' ||
            v === 'ĐẾN' ||
            v.includes('ĐẾN NGÀY') ||
            v === 'END DATE'
          );
        });
      } else if (tUp === 'NO') {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return v === 'NO' || v === 'STT';
        });
      } else if (tUp === 'SALARY SCALE') {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return (
            v.includes('SCALE') || v.includes('MỨC LƯƠNG') || v.includes('RANK')
          );
        });
      } else if (tUp === 'BUSINESS') {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return (
            v.includes('BUSINESS') || v.includes('KHỐI') || v.includes('BUS')
          );
        });
      } else if (tUp === 'L07') {
        idx = fileHeaders.findIndex((h) => {
          const v = h.toUpperCase();
          return (
            v.includes('L07') || v.includes('CENTER') || v.includes('TRUNG TÂM')
          );
        });
      }
    }

    colMap[target] = idx;
  });

  return colMap;
}

export function parseMoneyToNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let str = String(val).trim();
  if (!str) return 0;

  // Remove currency symbols and spaces
  str = str.replace(/[₫$€\s]/g, '');

  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');

  // Logic to distinguish between VN (1.234.567,89) and US (1,234,567.89)
  if (lastComma > lastDot) {
    // Likely VN format: 1.234,56 — dots are thousand sep, comma is decimal
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    const dotCount = (str.match(/\./g) || []).length;
    const commaCount = (str.match(/,/g) || []).length;
    if (dotCount > 1) {
      // Multiple dots → thousands seps, e.g. 1.234.567
      str = str.replace(/\./g, '');
    } else if (dotCount === 1) {
      const parts = str.split('.');
      if (parts[1].length === 3 && lastComma === -1 && commaCount === 0) {
        // Ambiguous: 178.000 — in VN context this is 178,000
        str = str.replace(/\./g, '');
      } else {
        // US decimal: 178.5
        str = str.replace(/,/g, '');
      }
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (lastComma !== -1 && lastDot === -1) {
    // Only commas — could be US thousands: 178,000
    const parts = str.split(',');
    const allThree = parts.slice(1).every((p) => p.length === 3);
    if (allThree) {
      str = str.replace(/,/g, ''); // thousands
    } else {
      str = str.replace(/,/g, '.'); // decimal fallback
    }
  } else {
    str = str.replace(/[,.]/g, '');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export const COMMON_FIELD_ALIASES: Record<string, string[]> = {
  No: ['STT', 'NO', 'NUMBER', 'SỐ THỨ TỰ'],
  'ID Number': ['ID', 'MÃ NV', 'CMND', 'MÃ NHÂN VIÊN', 'EMPLOYEE ID', 'MÃ SỐ'],
  'Full name': ['NAME', 'TÊN', 'HỌ VÀ TÊN', 'TÊN NHÂN VIÊN', 'FULL NAME'],
  'Salary Scale': ['SCALE', 'MỨC LƯƠNG', 'RANK', 'BẬC LƯƠNG', 'SALARY RANK'],
  From: [
    'FROM',
    'TỪ',
    'TỪ NGÀY',
    'START DATE',
    'NGÀY BẮT ĐẦU',
    'START',
    'DATE FROM',
    'FROM DATE',
  ],
  To: [
    'TO',
    'ĐẾN',
    'ĐẾN NGÀY',
    'END DATE',
    'NGÀY KẾT THÚC',
    'END',
    'DATE TO',
    'TO DATE',
  ],
  'Bank Account Number': [
    'ACCOUNT',
    'TÀI KHOẢN',
    'STK',
    'SỐ TÀI KHOẢN',
    'BANK ACCOUNT',
  ],
  'Bank Name': ['BANK NAME', 'NGÂN HÀNG', 'TÊN NGÂN HÀNG', 'TEN NGAN HANG'],
  'CITAD code': ['CITAD', 'MÃ CITAD', 'CITAD CODE'],
  'TAX CODE': ['TAX', 'MST', 'MÃ SỐ THUẾ', 'TAX CODE'],
  'Contract No': ['CONTRACT', 'HỢP ĐỒNG', 'SỐ HỢP ĐỒNG', 'CONTRACT NO'],
  'CHARGE TO LXO': ['LXO', 'CHARGE LXO', 'CHARGE TO LXO'],
  'CHARGE TO EC': ['EC', 'CHARGE EC', 'CHARGE TO EC'],
  'CHARGE TO PT-DEMO': ['PT-DEMO', 'CHARGE PT-DEMO', 'CHARGE TO PT-DEMO'],
  'Charge MKT Local': ['MKT', 'MKT LOCAL', 'CHARGE MKT LOCAL'],
  'Charge Renewal Projects': [
    'RENEWAL',
    'RENEWAL PROJECTS',
    'CHARGE TO RENEWAL PROJECTS',
  ],
  'Charge Discovery Camp': [
    'DISCOVERY',
    'DISCOVERY CAMP',
    'CHARGE TO DISCOVERY CAMP',
  ],
  'Charge Summer Outing': [
    'SUMMER',
    'SUMMER OUTING',
    'CHARGE TO SUMMER OUTING',
  ],
  'TOTAL PAYMENT': [
    'TOTAL',
    'TỔNG',
    'THỰC NHẬN',
    'TỔNG THANH TOÁN',
    'TOTAL PAYMENT',
    'NET PAY',
    'AMOUNT',
  ],
  Center: [
    'CENTER',
    'COST CENTER',
    'TRUNG TÂM',
    'AE CODE',
    'AE',
    'MÃ AE',
    'MÃ TT',
    'MÃ TRUNG TÂM',
  ],
  Business: ['BUSINESS', 'KHỐI', 'BUS', 'BỘ PHẬN'],
};

// Reliable VN number formatter — does NOT depend on browser locale
export function formatVNThousands(num: number): string {
  if (isNaN(num)) return '0';
  const isNeg = num < 0;
  const abs = Math.abs(num);
  const intPart = Math.floor(abs);
  const decPart = abs - intPart;

  // Add dots every 3 digits (VN standard: 1.234.567)
  const intStr = intPart
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (decPart > 0) {
    // Keep up to 2 decimal digits, remove trailing zeros
    const dec = decPart.toFixed(2).slice(1).replace(/0+$/, '');
    return (isNeg ? '-' : '') + intStr + dec;
  }
  return (isNeg ? '-' : '') + intStr;
}

export function formatVND(val: any): string {
  return formatMoneyVND(val);
}

export function formatMoneyVND(val: any): string {
  const num = Math.round(parseMoneyToNumber(val));
  if (num === 0) return '0';
  return formatVNThousands(num);
}

export function formatNumber(
  val: any,
  type: 'string' | 'number' | 'money' | 'date' = 'number'
): string {
  if (val === null || val === undefined) return '';

  switch (type) {
    case 'money':
      return formatMoneyVND(val);
    case 'number': {
      const num = parseMoneyToNumber(val);
      if (isNaN(num)) return '';
      // Use VN thousands separator for readability
      return formatVNThousands(num);
    }
    case 'date':
      return formatExcelDate(val);
    default:
      return String(val);
  }
}

export function parseAnyDate(val: any): Date | null {
  if (val === null || val === undefined || val === '') return null;

  let date: Date;

  if (val instanceof Date) {
    date = val;
  } else if (typeof val === 'number') {
    // Excel serial number to JS date (UTC)
    date = new Date(Math.round((val - 25569) * 86400 * 1000));
    // Convert UTC date to local date at midnight to avoid timezone shifts
    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    );
  } else {
    let str = String(val).trim();
    if (!str) return null;

    // Remove day of week prefix like "Sat ", "Sun ", "Mon ", etc.
    str = str.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s+/i, '').trim();

    // 1. Try DD/MM/YYYY or DD-MM-YYYY
    const dmyPattern = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/;
    const match = str.match(dmyPattern);
    if (match) {
      const [_, d, m, y] = match;
      const day = parseInt(d);
      const month = parseInt(m) - 1;
      let year = parseInt(y);
      if (year < 100) year += 2000;

      const dObj = new Date(year, month, day);
      if (
        dObj.getFullYear() === year &&
        dObj.getMonth() === month &&
        dObj.getDate() === day
      ) {
        return dObj;
      }
    }

    // 2. Try YYYY/MM/DD or YYYY-MM-DD
    const ymdPattern = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
    const ymdMatch = str.match(ymdPattern);
    if (ymdMatch) {
      const [_, y, m, d] = ymdMatch;
      const year = parseInt(y);
      const month = parseInt(m) - 1;
      const day = parseInt(d);
      const dObj = new Date(year, month, day);
      if (
        dObj.getFullYear() === year &&
        dObj.getMonth() === month &&
        dObj.getDate() === day
      ) {
        return dObj;
      }
    }

    // 3. Fallback to native Date parsing
    date = new Date(str);
  }

  if (isNaN(date.getTime())) return null;

  // If the date has a time component or was parsed as UTC (like ISO strings),
  // we might want to normalize it to local midnight of the "intended" day.
  // For simplicity and common use cases in this app, we'll treat it as local.
  // If it was an ISO string like "2023-01-01T00:00:00Z", we extract UTC parts.
  const strVal = String(val);
  if (
    typeof val === 'string' &&
    (strVal.includes('T') || strVal.endsWith('Z'))
  ) {
    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    );
  }

  // Otherwise return a local midnight version
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatExcelDate(val: any): string {
  const date = parseAnyDate(val);
  if (!date) return String(val || '');

  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
}

export function isMoneyColumn(header: string): boolean {
  const h = String(header).toUpperCase();
  const excluded = [
    'PAYMENT DETAILS',
    'PAYMENT TYPE',
    'PAYMENT SERIAL NUMBER',
    'CHARGE TYPE',
    'DOCUMENT ID',
  ];
  if (excluded.includes(h)) return false;
  return (
    h.includes('CHARGE') ||
    h.includes('PAYMENT') ||
    h.includes('TOTAL') ||
    h.includes('LƯƠNG') ||
    h.includes('CHÊNH LỆCH') ||
    h.includes('TIỀN') ||
    h.includes('AMOUNT') ||
    h.includes('FEE') ||
    h.includes('THƯỞNG')
  );
}

export function scoreMatch(
  header: string,
  target: string,
  aliases: string[]
): number {
  const h = header.toUpperCase().trim();
  const t = target.toUpperCase().trim();

  if (h === t) return 100;
  if (aliases.some((a) => a.toUpperCase().trim() === h)) return 95;

  const hNorm = removeVietnameseTones(h);
  const tNorm = removeVietnameseTones(t);
  if (hNorm === tNorm) return 90;
  if (aliases.some((a) => removeVietnameseTones(a) === hNorm)) return 85;

  if (h.includes(t) || t.includes(h)) return 80;
  if (
    aliases.some((a) => {
      const aUp = a.toUpperCase().trim();
      return h.includes(aUp) || aUp.includes(h);
    })
  )
    return 70;

  if (hNorm.includes(tNorm) || tNorm.includes(hNorm)) return 60;

  return 0;
}

export async function autoMapColumns(
  file: File,
  targetFields: string[]
): Promise<Record<string, string>> {
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { sheetRows: 10 });
    let allHeaders: string[] = [];

    wb.SheetNames.forEach((name) => {
      const ws = wb.Sheets[name];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: '',
      });

      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i];
        if (row.some((cell) => typeof cell === 'string' && cell.length > 0)) {
          const rowHeaders = row
            .map((c) => String(c).trim())
            .filter((c) => c.length > 0);
          if (rowHeaders.length > 3) {
            allHeaders = [...new Set([...allHeaders, ...rowHeaders])];
            break;
          }
        }
      }
    });

    const mapping: Record<string, string> = {};
    targetFields.forEach((target) => {
      const aliases = COMMON_FIELD_ALIASES[target] || [target.toUpperCase()];
      let bestMatch = '';
      let bestScore = 0;

      allHeaders.forEach((h) => {
        const score = scoreMatch(h, target, aliases);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = h;
        }
      });

      if (bestScore >= 60) {
        mapping[target] = bestMatch;
      }
    });

    return mapping;
  } catch (error) {
    console.error('Error auto-mapping columns:', error);
    return {};
  }
}

export function isDateColumn(header: string): boolean {
  const h = String(header).toUpperCase();
  return (
    h === 'FROM' ||
    h === 'TO' ||
    h.includes('DATE') ||
    h.includes('NGÀY') ||
    h.includes('DOB') ||
    h.includes('THÁNG')
  );
}

async function fetchWithBackoff(url: string, options?: RequestInit, retries = 3, backoff = 1000): Promise<Response> {
  const response = await fetch(url, options);
  
  if (response.status === 429 && retries > 0) {
    console.warn(`Quá tải! Thử lại sau ${backoff}ms...`);
    await new Promise(resolve => setTimeout(resolve, backoff));
    return fetchWithBackoff(url, options, retries - 1, backoff * 2);
  }
  
  return response;
}

export async function readExcelFile(
  file: File | string
): Promise<XLSX.WorkBook> {
  if (typeof file === 'string') {
    if (file.startsWith('http')) {
      const match = file.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) throw new Error('URL Google Sheet không hợp lệ.');
      const id = match[1];
      const exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;
      const response = await fetchWithBackoff(exportUrl);
      if (!response.ok)
        throw new Error(
          'Không thể tải file từ Google Sheet. Vui lòng kiểm tra quyền truy cập (cần public).'
        );
      const buf = await response.arrayBuffer();
      return XLSX.read(buf, { cellDates: true });
    }
    throw new Error('URL không hợp lệ.');
  } else {
    const buf = await file.arrayBuffer();
    return XLSX.read(buf, { cellDates: true });
  }
}
