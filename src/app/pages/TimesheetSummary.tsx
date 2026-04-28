/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet, ListChecks, UserCheck, Table2, ChevronDown,
  Download, Calculator, Wrench, Search, RefreshCw, Trash2, PieChart, CalendarIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { useAppData } from '../lib/contexts/AppDataContext';

// Import Input Table giao diện mới thay vì bảng cũ
import { TimesheetInputTable } from '../components/TimesheetInputTable'; 
import type { TimesheetInputRow } from '../components/TimesheetInputTable';
import { DataTable, DataTableRef } from '../components/DataTable';
import { Button } from '../components/ui/button';
import { getL07FromFileName, getCenterInfoByL07 } from '../lib/utils/center-utils';
import { generateUUID } from '../lib/utils/id-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { format } from 'date-fns';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '../components/ui/tooltip';

// ============================================================================
// 1. STYLES & TOKENS
// ============================================================================

const S = {
  appWrap: 'flex-1 flex flex-col min-h-0 bg-transparent w-full h-full text-foreground items-center overflow-auto custom-scrollbar gap-8',
  mainCard: 'bg-white soft-card force-light flex flex-col min-h-0 overflow-hidden w-full max-w-[1360px] flex-1 shrink-0 relative z-10',
  header: 'p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-border bg-white z-20 shrink-0 relative',
  headerLeft: 'flex items-center gap-5 relative z-10',
  logoBox: 'w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center text-primary shrink-0 border border-primary/30 shadow-inner',
  headerRight: 'flex flex-wrap items-center gap-4 relative z-10',
  dateWrap: 'flex items-center bg-white border border-border rounded-full p-1 shadow-sm px-4',
  dateInput: 'px-2 py-2 bg-transparent text-[0.625rem] font-bold text-primary outline-none w-28 sm:w-auto appearance-none cursor-pointer uppercase tracking-widest focus:text-secondary transition-colors',
  btnDropdown: 'soft-button bg-white border border-border text-foreground hover:bg-muted/30 flex items-center gap-3 px-6 h-12 shadow-sm transition-all'
};

// ...

// Trong hàm DataTable, phần pagination (dòng 267+)
// Tôi sẽ sửa lại phần return của DataTable cho đẹp hơn

// ============================================================================
// 2. CONFIGS & DICTIONARIES
// ============================================================================

const DEFAULT_SALARY_SCALES: Record<string, { ac: number, ad: number, summer: number, outing: number }> = {
  'S1': { ac: 33000, ad: 20000, summer: 29473.68, outing: 26315.79 },
  'S2': { ac: 36000, ad: 20000, summer: 29473.68, outing: 26315.79 },
  'S3': { ac: 40000, ad: 20000, summer: 29473.68, outing: 26315.79 },
  'S4': { ac: 45000, ad: 20000, summer: 29473.68, outing: 26315.79 },
  'S5': { ac: 50000, ad: 20000, summer: 29473.68, outing: 26315.79 },
  'S6': { ac: 53000, ad: 20000, summer: 29473.68, outing: 26315.79 },
  'S7': { ac: 20000, ad: 20000, summer: 0, outing: 0 },
  'S-CORP': { ac: 85714, ad: 0, summer: 0, outing: 0 },
  'SDN1': { ac: 32000, ad: 18000, summer: 29473.68, outing: 26315.79 },
  'SDN2': { ac: 36000, ad: 18000, summer: 29473.68, outing: 26315.79 },
  'SDN3': { ac: 40000, ad: 18000, summer: 29473.68, outing: 26315.79 },
  'SDN7': { ac: 20000, ad: 20000, summer: 0, outing: 0 },
};

const TASK_COLUMNS: Record<string, string> = {
  'in-class': 'inClass', 'in-class atls': 'inClassAtls', 'demo': 'demo', 'tutoring': 'tutoring',
  'waiting class': 'waitingClass', 'club activity': 'clubActivity', 'parent meeting': 'parentMeeting',
  'pt': 'pt', 'placement test': 'pt', 'discovery camp': 'discoveryCamp', 'outing': 'outing', 'summer': 'summer',
  'pick up/ drop off': 'pickUpDropOff', 'pick up/ drop off atls': 'pickUpDropOffAtls', 'sms': 'sms', 'sms atls': 'smsAtls',
  'progress/gradebook report': 'progressReport', 'gradebook report atls': 'progressReportAtls',
  'progress report': 'progressReport', 'progress report atls': 'progressReportAtls',
  'prepare lesson - tutoring': 'prepareLessonTutoring', 'prepare lesson - clubs': 'prepareLessonClubs',
  'meeting/ training': 'meetingTraining', 'conduct test': 'conductTest', 'renewal projects': 'renewalProjects',
  'support lxo': 'supportLxo', 'support ec': 'supportEc', 'support mkt': 'supportMkt',
  'lpar': 'parentMeeting', 'ldem': 'demo', 'lret': 'tutoring', 'ldec': 'clubActivity'
};

const ACADEMIC_FIELDS = ['inClass', 'inClassAtls', 'demo', 'tutoring', 'waitingClass', 'clubActivity', 'parentMeeting'];
const ADMIN_FIELDS = ['pickUpDropOff', 'pickUpDropOffAtls', 'sms', 'smsAtls', 'progressReport', 'progressReportAtls', 'prepareLessonTutoring', 'meetingTraining', 'pt', 'prepareLessonClubs', 'renewalProjects', 'supportLxo', 'supportEc', 'supportMkt', 'conductTest'];

const DETAIL_COLUMNS = [
  { key: 'id', label: 'No.', type: 'text' as const }, { key: 'center', label: 'Center', type: 'text' as const }, { key: 'employeeId', label: 'ID Number', type: 'text' as const, headerClassName: 'leading-[16.4px]' },
  { key: 'fullName', label: 'Full Name', type: 'text' as const }, { key: 'maAE', label: 'Mã AE', type: 'text' as const }, { key: 'date', label: 'Date', type: 'text' as const }, { key: 'taskType', label: 'Type', type: 'text' as const },
  { key: 'classCode', label: 'Class', type: 'text' as const }, { key: 'from', label: 'From', type: 'text' as const }, { key: 'to', label: 'To', type: 'text' as const },
  { key: 'duration', label: 'Duration', type: 'text' as const }, { key: 'notes', label: 'Notes', type: 'text' as const }
];

const BASE_TASK_COLUMNS = [
  { key: 'inClass', label: 'In-class', type: 'number' as const }, { key: 'inClassAtls', label: 'In-class ATLS', type: 'number' as const },
  { key: 'demo', label: 'Demo', type: 'number' as const }, { key: 'tutoring', label: 'Tutoring', type: 'number' as const },
  { key: 'waitingClass', label: 'Waiting class', type: 'number' as const }, { key: 'clubActivity', label: 'Club activity', type: 'number' as const },
  { key: 'parentMeeting', label: 'Parent meeting', type: 'number' as const }, { key: 'pickUpDropOff', label: 'Pick up/ Drop off', type: 'number' as const },
  { key: 'pickUpDropOffAtls', label: 'Pick up/ Drop off ATLS', type: 'number' as const }, { key: 'sms', label: 'SMS', type: 'number' as const },
  { key: 'smsAtls', label: 'SMS ATLS', type: 'number' as const }, { key: 'progressReport', label: 'Progress/Gradebook Report', type: 'number' as const },
  { key: 'progressReportAtls', label: 'Gradebook Report ATLS', type: 'number' as const }, { key: 'prepareLessonTutoring', label: 'Prepare lesson - Tutoring', type: 'number' as const },
  { key: 'meetingTraining', label: 'Meeting/ Training', type: 'number' as const }, { key: 'pt', label: 'PT', type: 'number' as const },
  { key: 'discoveryCamp', label: 'Discovery Camp', type: 'number' as const }, { key: 'outing', label: 'Outing', type: 'number' as const },
  { key: 'summer', label: 'Summer', type: 'number' as const }, { key: 'prepareLessonClubs', label: 'Prepare lesson - Clubs', type: 'number' as const },
  { key: 'conductTest', label: 'Conduct test', type: 'number' as const }, { key: 'renewalProjects', label: 'Renewal Projects', type: 'number' as const },
  { key: 'supportLxo', label: 'Support LXO', type: 'number' as const }, { key: 'supportEc', label: 'Support EC', type: 'number' as const },
  { key: 'supportMkt', label: 'Support MKT', type: 'number' as const }, { key: 'totalHours', label: 'Total Hours', type: 'number' as const },
  { key: 'academicHours', label: 'Academic Hours', type: 'number' as const }, { key: 'adminHours', label: 'Admin Hours', type: 'number' as const, cellClassName: 'text-xs leading-[2px]', headerSpanClassName: 'text-xs no-underline leading-[11px] text-[#49780f]' }
];

const SALARY_COLUMNS = [
  { key: 'deductionHours', label: 'Deduction Hours', type: 'number' as const }, { key: 'baseSalary', label: 'Base Salary', type: 'currency' as const },
  { key: 'totalSalary', label: 'Total Salary', type: 'currency' as const }
];

const EMPLOYEE_COLUMNS = [
  { key: 'id', label: 'No.', type: 'text' as const, width: 60 }, { key: 'center', label: 'L07', type: 'text' as const, width: 100 }, { key: 'employeeId', label: 'ID Number', type: 'text' as const, width: 120, headerClassName: 'leading-[16.4px]' },
  { key: 'fullName', label: 'Name', type: 'text' as const, width: 220 }, { key: 'salaryScale', label: 'Salary Scale', type: 'text' as const, width: 120 }, { key: 'from', label: 'From', type: 'text' as const, width: 100 }, { key: 'to', label: 'To', type: 'text' as const, width: 100 },
  ...BASE_TASK_COLUMNS
];

const CENTER_COLUMNS = [
  { key: 'id', label: 'No.', type: 'text' as const, width: 60 },
  { key: 'l07', label: 'L07 (Center)', type: 'text' as const, width: 150 },
  { key: 'business', label: 'Business', type: 'text' as const, width: 120, headerClassName: 'leading-[16.4px]' },
  { key: 'salaryScale', label: 'Salary Scale', type: 'text' as const, width: 120 },
  { key: 'from', label: 'From', type: 'text' as const, width: 100 },
  { key: 'to', label: 'To', type: 'text' as const, width: 100 },
  { key: 'chargeLxo', label: 'Charge LXO', type: 'currency' as const, width: 140 },
  { key: 'chargeEc', label: 'Charge EC', type: 'currency' as const, width: 140 },
  { key: 'chargePtDemo', label: 'Charge PT-DEMO', type: 'currency' as const, width: 140 },
  { key: 'chargeMktLocal', label: 'Charge MKT Local', type: 'currency' as const, width: 140 },
  { key: 'chargeRenewal', label: 'Charge Renewal', type: 'currency' as const, width: 140 },
  { key: 'chargeDiscovery', label: 'Charge Discovery', type: 'currency' as const, width: 140 },
  { key: 'chargeSummerOuting', label: 'Charge Summer Outing', type: 'currency' as const, width: 140 },
  { key: 'totalSalary', label: 'Total Salary', type: 'currency' as const, width: 160 }
];

// ============================================================================
// 3. UTILITIES & PARSERS
// ============================================================================

const parseAnyDate = (dateVal: any): Date | null => {
  if (dateVal === null || dateVal === undefined || dateVal === '') return null;
  if (dateVal instanceof Date) { if (isNaN(dateVal.getTime())) return null; return new Date(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate()); }
  if (typeof dateVal === 'number') { const excelEpoch = new Date(Date.UTC(1899, 11, 30)); const d = new Date(excelEpoch.getTime() + Math.floor(dateVal) * 86400000); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }
  const str = String(dateVal).trim();
  const clean = str.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*[,\s]+/i, '').trim();
  const matchIso = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (matchIso) return new Date(parseInt(matchIso[1], 10), parseInt(matchIso[2], 10) - 1, parseInt(matchIso[3], 10));
  const matchDmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (matchDmy) { const p1 = parseInt(matchDmy[1], 10), p2 = parseInt(matchDmy[2], 10), year = parseInt(matchDmy[3], 10); let day = p1, month = p2 - 1; if (p1 <= 12 && p2 > 12) { month = p1 - 1; day = p2; } const d = new Date(year, month, day); if (!isNaN(d.getTime())) return d; }
  const d2 = new Date(clean);
  if (!isNaN(d2.getTime())) return new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return null;
};

const getVal = (obj: any, searchKeys: string[]) => {
  for (const k in obj) { if (searchKeys.includes(k.trim().toLowerCase())) return obj[k]; }
  return undefined;
};

const normalizeId = (id: string) => String(id).replace(/^0+/, '').trim();

const parseTimeStrToHours = (val: any): number => {
  if (!val) return 0;
  if (val instanceof Date) return (val.getHours() * 3600 + val.getMinutes() * 60 + val.getSeconds()) / 86400;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const str = val.trim();
    if (str.includes(':')) {
      const p = str.split(':');
      return (parseInt(p[0]) || 0) / 24 + (parseInt(p[1]) || 0) / 1440 + (parseInt(p[2] || '0')) / 86400;
    }
    const parsed = parseFloat(str);
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
};

const formatTime12Hour = (val: any): string => {
  if (!val) return '';
  if (val instanceof Date) { let h = val.getHours(); const m = String(val.getMinutes()).padStart(2, '0'); const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12; h = h ? h : 12; return `${h}:${m} ${ampm}`; }
  let timeStr = String(val).trim();
  if (!timeStr.includes(':') && !isNaN(parseFloat(timeStr))) {
    const totalMinutes = Math.round(parseFloat(timeStr) * 24 * 60);
    const h = Math.floor(totalMinutes / 60); const m = totalMinutes % 60;
    timeStr = `${h}:${String(m).padStart(2, '0')}`;
  }
  if (timeStr.toLowerCase().includes('m')) return timeStr;
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    let h = parseInt(parts[0], 10); const m = parts[1].padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12; h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
  }
  return timeStr;
};

const formatDurationFromHours = (hours: number): string => {
  if (!hours || isNaN(hours)) return '';
  const h = Math.floor(hours); const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// ============================================================================
// 4. MAIN APP (Trái tim điều hướng dữ liệu)
// ============================================================================

export default function TimesheetSummaryPage() {
  const { appData, updateAppData } = useAppData();

  // STATE: Tabs
  const [activeTab, setActiveTab] = useState<'files' | 'roster_raw' | 'employee' | 'center'>('files');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const tableRef = useRef<DataTableRef>(null);

  // DATA FROM CONTEXT
  const rosterData = appData.Q_Roster || [];
  const salaryScaleData = appData.Q_Salary_Scale || [];
  const staffData = appData.Q_Staff || [];
  const cacheData = appData.Q_Cache || [];
  const inputRows = appData.Timesheet_InputList || [
    { id: '1', l07: '', aeCode: '', bus: '', url: '', status: 'pending' }
  ];

  const [skippedCount, setSkippedCount] = useState(0);

  // LOGIC: Bảng Input
  const handleAddRow = () => {
    updateAppData(prev => ({
      ...prev,
      Timesheet_InputList: [...inputRows, { id: generateUUID(), l07: '', aeCode: '', bus: '', url: '', status: 'pending' }]
    }));
  };
  const handleUpdateRow = (id: string, field: keyof TimesheetInputRow, val: any) => {
    updateAppData(prev => ({
      ...prev,
      Timesheet_InputList: inputRows.map(r => r.id === id ? { ...r, [field]: val } : r)
    }), false); // No history for typing
  };
  const handleDeleteRow = (id: string) => {
    updateAppData(prev => ({
      ...prev,
      Timesheet_InputList: inputRows.filter(r => r.id !== id)
    }));
  };
  const handleClearAll = () => {
    updateAppData(prev => ({
      ...prev,
      Timesheet_InputList: [], Q_Roster: [], Q_Salary_Scale: [], Q_Staff: [], Q_Cache: []
    }));
    toast?.success("Đã xóa toàn bộ dữ liệu.");
  };

  const handleDeleteTotalData = () => {
    updateAppData(prev => ({
      ...prev,
      Timesheet_InputList: (prev.Timesheet_InputList || []).map(row => ({
        ...row,
        url: '',
        status: 'pending'
      })),
      Q_Roster: [],
      Q_Salary_Scale: [],
      Q_Staff: [],
      Q_Cache: []
    }));
    toast?.success("Đã reset dữ liệu tổng, giữ lại cấu trúc file.");
  };

  const handleUploadFiles = async (files: File[]) => {
    const newRows: TimesheetInputRow[] = [];
    for (const file of files) {
      const newId = generateUUID();
      const l07 = getL07FromFileName(file.name) || '';
      const centerInfo = l07 ? getCenterInfoByL07(l07) : null;
      newRows.push({ 
        id: newId, 
        l07: l07, 
        aeCode: centerInfo?.aeCode || '', 
        bus: centerInfo?.bus || '', 
        url: '', 
        status: 'processing' 
      });
    }

    updateAppData(prev => ({
      ...prev,
      Timesheet_InputList: [...inputRows, ...newRows]
    }));

    // Process each file
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const rowId = newRows[i].id;
        setTimeout(() => {
          handleUploadFile(rowId, file);
        }, 100 * (i + 1));
    }
  };

  // LOGIC: Đọc File (XLSX, CSV)
  const handleUploadFile = async (rowId: string, file: File) => {
    handleUpdateRow(rowId, 'status', 'processing');
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      let isSalary = false, isStaff = false, isCache = false, isRoster = false;
      const fn = file.name.toLowerCase();
      if (fn.includes('salary')) isSalary = true;
      else if (fn.includes('staff')) isStaff = true;
      else if (fn.includes('cache')) isCache = true;
      else isRoster = true;

      let foundData = false;

      workbook.SheetNames.forEach(sheetName => {
         const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
         if(json.length > 0) {
            foundData = true;
            json.forEach((r: any) => { r._sourceFile = file.name; r._rowId = rowId; });
            const headers = Object.keys(json[0] as any).map(k => k.toLowerCase().trim());
            
            // Nhận diện tự động qua cột và cập nhật vào AppData
            updateAppData(prev => {
                const next = { ...prev };
                if (headers.includes('academic price') || isSalary) next.Q_Salary_Scale = [...(next.Q_Salary_Scale || []), ...json];
                else if (headers.includes('bank account number') || isStaff) next.Q_Staff = [...(next.Q_Staff || []), ...json];
                else if (headers.includes('today') || isCache) next.Q_Cache = [...(next.Q_Cache || []), ...json];
                else next.Q_Roster = [...(next.Q_Roster || []), ...json];
                return next;
            });
         }
      });
      
      if (foundData) {
        handleUpdateRow(rowId, 'status', 'success');
        handleUpdateRow(rowId, 'fileName', file.name);
        const d = new Date();
        handleUpdateRow(rowId, 'date', `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} ${d.getDate()}/${d.getMonth()+1}`);
        toast?.success(`Đọc thành công file ${file.name}`);
      } else {
        throw new Error("File trống hoặc không hợp lệ");
      }
    } catch (err) {
      handleUpdateRow(rowId, 'status', 'error');
      toast?.error(`Lỗi đọc file: ${file.name}`);
    }
  };

  // LOGIC LÕI: Tính Lương và Dội Giờ (Đã FIX bug 290h)
  const computedData = useMemo(() => {
    if (rosterData.length === 0) return { processedRosterData: [], employeeSummary: [], centerSummary: [] };
    let skipped = 0;
    const fDate = fromDate ? new Date(fromDate + 'T00:00:00') : null;
    const tDate = toDate ? new Date(toDate + 'T23:59:59') : null;

    const getSalaryRate = (id: string, name: string) => {
      const nid = normalizeId(id);
      const row = salaryScaleData.find(s => {
        const sid = normalizeId(getVal(s, ['id', 'id number']) || '');
        const sn = String(getVal(s, ['full name', 'name'])).trim().toLowerCase();
        return (sid && sid === nid) || (sn && sn === name.toLowerCase());
      });
      const sCode = String(getVal(row || {}, ['s code', 'scale']) || 'S1').trim().toUpperCase();
      const def = DEFAULT_SALARY_SCALES[sCode] || DEFAULT_SALARY_SCALES['S1'];
      let ac = def.ac, ad = def.ad;
      const su = def.summer, ou = def.outing;
      if (row) {
        const rAc = getVal(row, ['academic price', 'academic']);
        const rAd = getVal(row, ['administrative price', 'admin']);
        if (rAc !== undefined && rAc !== '') ac = parseFloat(String(rAc).replace(/,/g, '')) || 0;
        if (rAd !== undefined && rAd !== '') ad = parseFloat(String(rAd).replace(/,/g, '')) || 0;
      }
      return { ac, ad, su, ou, sCode };
    };

    const details: any[] = [];
    const empGroup: Record<string, any> = {};
    const cenGroup: Record<string, any> = {};

    rosterData.forEach(t => {
      let invalid = false;
      if (String(getVal(t, ['check']) || '').toUpperCase() === 'DUPLICATE') invalid = true;
      for (const k in t) { if (k.toLowerCase().startsWith('check') && String(t[k]).toUpperCase().includes('FALSE')) { invalid = true; break; } }
      if (invalid) { skipped++; return; }

      const dStr = getVal(t, ['date', 'ngày', 'ngày làm việc', 'tk_date']);
      const rd = parseAnyDate(dStr);
      if (!rd || (fDate && rd < fDate) || (tDate && rd > tDate)) { skipped++; return; }

      const rawId = String(getVal(t, ['id', 'id number', 'tk_id']) || '').trim();
      if (!rawId) { skipped++; return; }

      let fullName = getVal(t, ['full name', 'name']);
      const staff = staffData.find(s => normalizeId(getVal(s, ['id', 'id number']) || '') === normalizeId(rawId)) || {};
      if (!fullName) fullName = staff['Full Name (VN)'] || staff['Full Name (EN)'] || 'Unknown';
      fullName = String(fullName).toUpperCase();

      const taskType = getVal(t, ['type', 'task type', 'tk_type']);
      if (!taskType) { skipped++; return; }

      // Tham chiếu ngược từ file upload để lấy L07 / AE / Bus nếu có
      const rowInfo = inputRows.find(ir => ir.id === t._rowId);
      const center = String(rowInfo?.l07 || getVal(t, ['center', 'location', 'cơ sở']) || '').trim();
      const maAE = String(rowInfo?.aeCode || getVal(t, ['mã ae', 'ae']) || 'UNKNOWN');
      const business = String(rowInfo?.bus || getVal(t, ['business']) || 'UNKNOWN');
      
      const classCode = String(getVal(t, ['class', 'lớp']) || '');
      const from = getVal(t, ['from', 'từ']) || '';
      const to = getVal(t, ['to', 'đến']) || '';
      const durRaw = getVal(t, ['duration', 'tk_duration']);
      const notes = String(getVal(t, ['notes', 'ghi chú']) || '');

      // TÍNH GIỜ (Chống lỗi 290h)
      let hours = 0;
      if (from && to) {
        const hF = parseTimeStrToHours(from); const hT = parseTimeStrToHours(to);
        hours = hT >= hF ? (hT - hF) * 24 : (hT + 1 - hF) * 24;
      } else if (durRaw !== undefined && durRaw !== '') {
        const strVal = String(durRaw).trim().replace(',', '.'); 
        if (strVal.includes(':')) {
           const p = strVal.split(':');
           hours = (parseFloat(p[0]) || 0) + (parseFloat(p[1]) || 0) / 60;
        } else {
           const parsed = parseFloat(strVal);
           if (!isNaN(parsed)) {
              hours = (parsed > 0 && parsed <= 1 && strVal.length > 4) ? parsed * 24 : parsed;
           }
        }
      }

      if (isNaN(hours) || hours <= 0) return;

      const { ac, ad, su, ou, sCode } = getSalaryRate(rawId, fullName);
      const ds = `${rd.getFullYear()}-${String(rd.getMonth()+1).padStart(2,'0')}-${String(rd.getDate()).padStart(2,'0')}`;
      
      details.push({ id: details.length + 1, center, employeeId: rawId, fullName, maAE, date: ds, taskType, classCode, from: formatTime12Hour(from), to: formatTime12Hour(to), duration: formatDurationFromHours(hours), notes });

      const empKey = `${center}_${rawId}`;
      const cenKey = `${center}|${business}|${t._sourceFile}|${sCode}`;
      const ctr = () => ({ inClass: 0, inClassAtls: 0, demo: 0, tutoring: 0, waitingClass: 0, clubActivity: 0, parentMeeting: 0, pickUpDropOff: 0, pickUpDropOffAtls: 0, sms: 0, smsAtls: 0, progressReport: 0, progressReportAtls: 0, prepareLessonTutoring: 0, meetingTraining: 0, pt: 0, discoveryCamp: 0, outing: 0, summer: 0, prepareLessonClubs: 0, conductTest: 0, renewalProjects: 0, supportLxo: 0, supportEc: 0, supportMkt: 0, totalHours: 0, academicHours: 0, adminHours: 0 });

      if (!empGroup[empKey]) empGroup[empKey] = { employeeId: rawId, fullName, maAE, center, salaryScale: sCode, acRate: ac, adRate: ad, suRate: su, ouRate: ou, from: fromDate || 'Tất cả', to: toDate || 'Tất cả', ...ctr() };
      if (!cenGroup[cenKey]) cenGroup[cenKey] = { l07: center, business, maAE, sourceFile: t._sourceFile, salaryScale: sCode, acRate: ac, adRate: ad, suRate: su, ouRate: ou, from: fromDate || 'Tất cả', to: toDate || 'Tất cả', ...ctr() };

      const col = TASK_COLUMNS[String(taskType).trim().toLowerCase().replace(/\s+/g, ' ')];
      if (col) {
        [empGroup[empKey], cenGroup[cenKey]].forEach(g => {
          g[col] += hours; g.totalHours += hours;
          if (ACADEMIC_FIELDS.includes(col)) g.academicHours += hours;
          if (ADMIN_FIELDS.includes(col)) g.adminHours += hours;
        });
      }
    });

    if (skipped > 0) setTimeout(() => setSkippedCount(skipped), 0);

    const finalize = (obj: any) => Object.values(obj).map((r: any, idx) => {
      const ded = (r.inClass + r.inClassAtls + r.clubActivity + r.parentMeeting) / 2;
      const salary = (r.academicHours * r.acRate) + ((r.adminHours - ded) * r.adRate) + (r.summer * r.suRate) + (r.outing * r.ouRate) + (r.discoveryCamp * r.suRate);

      const chargeLxo = r.supportLxo * r.adRate;
      const chargeEc = r.supportEc * r.adRate;
      const chargePtDemo = (r.pt * r.adRate) + (r.demo * r.acRate);
      const chargeMktLocal = r.supportMkt * r.adRate;
      const chargeRenewal = r.renewalProjects * r.adRate;
      const chargeDiscovery = r.discoveryCamp * r.suRate;
      const chargeSummerOuting = (r.summer * r.suRate) + (r.outing * r.ouRate);

      return { 
        ...r, 
        id: idx + 1, 
        deductionHours: ded, 
        baseSalary: salary, 
        totalSalary: Math.round(salary),
        chargeLxo: Math.round(chargeLxo),
        chargeEc: Math.round(chargeEc),
        chargePtDemo: Math.round(chargePtDemo),
        chargeMktLocal: Math.round(chargeMktLocal),
        chargeRenewal: Math.round(chargeRenewal),
        chargeDiscovery: Math.round(chargeDiscovery),
        chargeSummerOuting: Math.round(chargeSummerOuting)
      };
    });

    return { processedRosterData: details, employeeSummary: finalize(empGroup), centerSummary: finalize(cenGroup) };
  }, [rosterData, salaryScaleData, staffData, cacheData, fromDate, toDate, inputRows]);

  useEffect(() => {
    updateAppData((prev: any) => ({
      ...prev,
      TA_Employee_Summary: {
        headers: EMPLOYEE_COLUMNS.map(c => c.label),
        data: computedData.employeeSummary
      },
      TA_Center_Summary: {
        headers: CENTER_COLUMNS.map(c => c.label),
        data: computedData.centerSummary
      }
    }), false);
  }, [computedData.employeeSummary, computedData.centerSummary]);

  // Điều phối View
  const activeColumns = activeTab === 'roster_raw' ? DETAIL_COLUMNS : activeTab === 'employee' ? EMPLOYEE_COLUMNS : CENTER_COLUMNS;
  const activeData = activeTab === 'roster_raw' ? computedData.processedRosterData : activeTab === 'employee' ? computedData.employeeSummary : computedData.centerSummary;

  const handleExport = () => {
    if (activeData.length === 0) { toast?.error("Không có dữ liệu"); return; }
    const ws = XLSX.utils.json_to_sheet(activeData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab);
    XLSX.writeFile(wb, `Timesheet_Export_${activeTab}.xlsx`);
  };

  const TAB_LABELS: Record<string, string> = { files: 'Data', roster_raw: 'Roster Gốc', employee: 'Số Giờ Làm Việc', center: 'Total Payment' };
  const TAB_ICONS: Record<string, React.ReactNode> = { files: <FileSpreadsheet className="w-5 h-5 text-primary" />, roster_raw: <ListChecks className="w-5 h-5 text-primary" />, employee: <UserCheck className="w-5 h-5 text-primary" />, center: <Table2 className="w-5 h-5 text-primary" /> };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent px-4 pt-0 pb-6 md:px-6 gap-4 items-center overflow-auto custom-scrollbar">
      {/* Floating Header Card */}
      <div 
        className="mx-auto w-full max-w-[1360px] px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-6 bg-white rounded-[2.5rem] shadow-xl shadow-primary/5 shrink-0 relative z-[90] mb-2 border-0"
        style={{ borderWidth: '0px' }}
      >
        <div className="absolute inset-0 striped-pattern opacity-[0.05] pointer-events-none rounded-[2.5rem] overflow-hidden" />
        
        <div className="flex items-center gap-5 relative z-10 shrink-0">
          <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center text-primary shrink-0 border border-primary/30 shadow-inner">
            <Calculator className="w-7 h-7 text-primary" />
          </div>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-foreground tracking-tight flex items-center gap-1 font-bold m-0 p-0" style={{ fontSize: '22px' }}>
                  <span className="text-3xl leading-none">Timesheet</span> 
                  <span className="not-italic font-script text-primary text-[30px] lowercase inline-block transform translate-y-1 w-[48px]">Hub</span>
                </h2>
                <div className="px-3 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full text-[0.625rem] font-bold uppercase tracking-widest">
                  Live System
                </div>
              </div>
              <p className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Payroll Management Summary • {activeData.length} records
              </p>
            </div>
          </div>

          <div className={S.headerRight}>
            <div className={`${S.dateWrap} ring-1 ring-border/50 hover:ring-border hover:shadow-md focus-within:ring-primary/50 focus-within:shadow-md transition-all duration-300 bg-white/80 backdrop-blur-sm`}>
              <Popover>
                <PopoverTrigger asChild>
                  <button 
                    id="fromDate"
                    name="fromDate" 
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-transparent text-[0.6875rem] font-bold outline-none uppercase tracking-widest transition-colors ${fromDate ? 'text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
                  >
                    <CalendarIcon className="w-3.5 h-3.5 opacity-70" />
                    {fromDate ? format(new Date(`${fromDate}T00:00:00`), 'dd/MM/yyyy') : 'Chọn từ ngày'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[10000] border-border/50 shadow-2xl rounded-2xl overflow-hidden" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate ? new Date(`${fromDate}T00:00:00`) : undefined}
                    onSelect={(d) => setFromDate(d ? format(d, 'yyyy-MM-dd') : '')}
                    initialFocus
                    className="p-3 pointer-events-auto bg-white"
                  />
                </PopoverContent>
              </Popover>

              <div className="w-[2px] h-4 bg-border/50 mx-1 rounded-full" />

              <Popover>
                <PopoverTrigger asChild>
                  <button 
                    id="toDate" 
                    name="toDate"
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-transparent text-[0.6875rem] font-bold outline-none uppercase tracking-widest transition-colors ${toDate ? 'text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
                  >
                    <CalendarIcon className="w-3.5 h-3.5 opacity-70" />
                    {toDate ? format(new Date(`${toDate}T00:00:00`), 'dd/MM/yyyy') : 'Chọn đến ngày'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[10000] border-border/50 shadow-2xl rounded-2xl overflow-hidden" align="end">
                  <Calendar
                    mode="single"
                    selected={toDate ? new Date(`${toDate}T00:00:00`) : undefined}
                    onSelect={(d) => setToDate(d ? format(d, 'yyyy-MM-dd') : '')}
                    initialFocus
                    className="p-3 pointer-events-auto bg-white"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={S.btnDropdown}>
                  {TAB_ICONS[activeTab]}
                  <span className="text-[11px] font-black uppercase tracking-widest">{TAB_LABELS[activeTab]}</span>
                  <ChevronDown className="w-4 h-4 opacity-50 ml-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 border border-primary/10 shadow-2xl p-2 bg-white rounded-2xl">
                <DropdownMenuLabel className="text-[0.625rem] font-bold uppercase tracking-widest text-primary/60 px-3 py-2">Chế độ xem</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-primary/5 mx-1" />
                {(['files', 'roster_raw', 'employee', 'center'] as const).map((tab, i) => (
                  <DropdownMenuItem 
                    key={tab} 
                    onSelect={() => setActiveTab(tab)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${activeTab === tab ? 'bg-primary/10 text-primary' : 'hover:bg-primary/5'}`}
                  >
                    {TAB_ICONS[tab]} 
                    <span className="text-[0.6875rem] font-bold uppercase tracking-wider">{TAB_LABELS[tab]}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button className="p-3 rounded-full border border-border bg-white text-muted-foreground hover:text-primary transition-all group shadow-sm">
                      <Wrench className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Cài đặt</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-64 border border-primary/10 shadow-2xl p-2 bg-white rounded-2xl">
                <DropdownMenuLabel className="text-[0.625rem] font-bold uppercase tracking-widest text-primary/60 px-3 py-2">Tiện ích</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-primary/5 mx-1" />
                <DropdownMenuItem onSelect={handleClearAll} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-rose-50 transition-colors text-rose-500">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-rose-500">Xóa toàn bộ trang</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleDeleteTotalData} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-amber-50 transition-colors text-amber-600">
                  <RefreshCw className="w-4 h-4 text-amber-600" />
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-amber-600">Reset dữ liệu tổng</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-primary/5 mx-1" />
                  {activeTab === 'files' && (
                    <>
                      <DropdownMenuItem onSelect={() => { setActiveTab('files'); (document.querySelector('input[type="file"]') as HTMLInputElement)?.click(); }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors">
                        <FileSpreadsheet className="w-4 h-4 text-primary" />
                        <span className="text-[0.6875rem] font-bold uppercase tracking-wider">Upload Nhiều File</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={handleAddRow} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors">
                        <ListChecks className="w-4 h-4 text-primary" />
                        <span className="text-[0.6875rem] font-bold uppercase tracking-wider">Thêm mới 1 dòng file</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-primary/5 mx-1" />
                    </>
                  )}
                <DropdownMenuItem onSelect={handleExport} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors">
                  <Download className="w-4 h-4 text-primary" />
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider">Xuất Excel</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSearchTerm('')} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider">Xóa tìm kiếm</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content Card */}
        <div className="w-full max-w-[1360px] bg-white rounded-[2.5rem] shadow-xl shadow-primary/5 overflow-hidden flex-1 relative flex flex-col border border-primary/10 p-0">
          {activeTab === 'files' ? (
            <TimesheetInputTable 
              rows={inputRows}
              onAddRow={handleAddRow}
              onUpdateRow={handleUpdateRow}
              onDeleteRow={handleDeleteRow}
              onClearAll={handleClearAll}
              onUploadFile={handleUploadFile}
              onUploadFiles={handleUploadFiles}
            />
          ) : (
            <DataTable
              ref={tableRef}
              columns={activeColumns}
              data={activeData}
              storageKey={`ts_summary_${activeTab}`}
              externalSearchTerm={searchTerm}
              onExternalSearchChange={setSearchTerm}
              showFooter={activeTab !== 'roster_raw'}
              headerClassName={activeTab === 'center' ? "bg-white border-b border-slate-200 text-[0.85em] font-bold uppercase tracking-[0.05em] text-slate-800 text-center" : "bg-[#F3EFE0] border-b border-[#E2E8F0] text-[1em] font-bold uppercase tracking-[0.05em] text-primary text-center"}
              footerClassName={activeTab === 'center' ? "bg-white border-t border-slate-200 text-slate-900" : ""}
              className={activeTab === 'center' ? 'final-centers-table rounded-[2.5rem] overflow-hidden border-2 border-slate-200/60 shadow-xl' : ''}
              striped={activeTab === 'center'}
              style={activeTab === 'center' ? { '--stripe-color1': '#ffffff', '--stripe-color2': '#F8FAFC' } as any : undefined}
              hideSearch={true}
              hideToolbar={true}
            />
          )}
        </div>
      </div>
  );
}
