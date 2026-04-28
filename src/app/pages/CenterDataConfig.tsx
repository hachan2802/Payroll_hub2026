/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useState, useRef } from 'react';
import { Link as RouterLink } from 'react-router';
import {
  UploadCloud,
  Layers,
  Trash2,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Link,
  List,
  Building2,
  Plus,
  FileCheck,
  CheckCircle2,
  Circle,
  Save,
} from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { useAppData } from '../lib/contexts/AppDataContext';
import { DEFAULT_CENTERS } from '../constants';
import { getL07FromFileName, getCenterInfoByL07 } from '../lib/utils/center-utils';
import {
  readExcelFile,
  parseMoneyToNumber,
  isMoneyColumn,
  findColumnMapping,
  COMMON_FIELD_ALIASES,
} from '../lib/utils/data-utils';
import { ContextMenu } from '../components/ContextMenu';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Button } from '../components/ui/button';
import { ColumnMappingDialog } from '../components/ColumnMappingDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

interface CenterRow {
  id: string;
  l07: string;
  aeCode: string;
  bus: string;
  url: string;
  status: string;
  timePeriod: string;
  fileObj?: File | null;
  cachedData?: any[];
  lastProcessedUrl?: string;
  columnMapping?: Record<string, string>;
  errorMessage?: string;
}

export function CenterDataConfig() {
  const { appData, updateAppData } = useAppData();

  const [searchTerm, setSearchTerm] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const filteredData = appData.Fr_InputList.filter(
    (row) =>
      !searchTerm ||
      row.l07?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.aeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.bus?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.url?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const clearPageData = () => {
    updateAppData((prev) => ({
      ...prev,
      Fr_InputList: prev.Fr_InputList.map((row) => ({
        ...row,
        url: '',
        fileObj: undefined,
        status: 'ready',
        cachedData: undefined,
        errorMessage: undefined,
      })),
    }));
    setShowClearDialog(false);
    toast.success('Đã xóa tệp và reset trạng thái (giữ lại cấu hình L07, Mã AE, Business).');
  };

  const deletePageRows = () => {
    const idsToKeep = new Set(appData.Fr_InputList.map((r) => r.id));
    paginatedData.forEach((r) => idsToKeep.delete(r.id));
    updateAppData((prev) => ({
      ...prev,
      Fr_InputList: prev.Fr_InputList.filter((row) => idsToKeep.has(row.id)),
    }));
    toast.success(`Đã xóa ${paginatedData.length} dòng trên trang hiện tại.`);
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rowId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const configInputRef = useRef<HTMLInputElement>(null);

  const handleContextMenu = (e: React.MouseEvent, rowId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, rowId });
  };

  const handleContextMenuAction = (action: string) => {
    if (!contextMenu) return;
    if (action === 'deleteRow') deleteRow(contextMenu.rowId);
    setContextMenu(null);
  };

  const handleConfigFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const wb = await readExcelFile(file);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];
      
      const getVal = (row: any, aliases: string[]) => {
        const key = Object.keys(row).find(k => aliases.includes(k.toUpperCase().trim()));
        return key ? String(row[key]).trim() : '';
      };

      const newList = data.map((row: any) => ({
        id: Date.now().toString() + Math.random(),
        l07: getVal(row, ['L07', 'MÃ L07', 'MÃ TRUNG TÂM']),
        aeCode: getVal(row, ['MÃ AE', 'AE CODE', 'AE', 'MA AE', 'MÃAE', 'MÃ TT']),
        bus: getVal(row, ['BUSINESS', 'BUS']),
        url: '',
        status: 'ready',
        timePeriod: new Date().toISOString().slice(0, 7),
      }));

      // Create AE Map for mapping AE codes to center info
      const aeMap: Record<string, { name: string; bus: string }> = {};
      newList.forEach(item => {
        if (item.aeCode) {
          const code = String(item.aeCode).trim().toLowerCase();
          if (code) aeMap[code] = { name: item.l07, bus: item.bus };
        }
      });

      updateAppData((prev) => ({ 
        ...prev, 
        Fr_InputList: newList,
        Timesheet_InputList: newList.map(item => ({ ...item, id: 'ts-' + item.id })),
        AE_Map: { ...prev.AE_Map, ...aeMap }
      }));
      toast.success(`Đã nạp thành công ${newList.length} cấu hình center và đồng bộ hóa sang Timesheet Hub.`);
    } catch (e: any) {
      toast.error('Lỗi khi nạp file cấu hình: ' + e.message);
    }
    e.target.value = '';
  };

  const addRow = () => {
    const newRow: CenterRow = {
      id: Date.now().toString(),
      l07: '',
      aeCode: '',
      bus: '',
      url: '',
      status: 'ready',
      timePeriod: new Date().toISOString().slice(0, 7),
    };
    updateAppData((prev) => ({
      ...prev,
      Fr_InputList: [...prev.Fr_InputList, newRow],
    }));
  };

  const deleteRow = (id: string) => {
    updateAppData((prev) => ({
      ...prev,
      Fr_InputList: prev.Fr_InputList.filter((row) => row.id !== id),
    }));
  };

  const updateRow = (id: string, field: keyof CenterRow, value: any) => {
    updateAppData((prev) => {
      const newList = prev.Fr_InputList.map((row) => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value };
          if (field === 'l07' && typeof value === 'string') {
            const l07 = value.trim().toUpperCase();
            const centerInfo = getCenterInfoByL07(l07);
            if (centerInfo) {
              updatedRow.aeCode = centerInfo.aeCode;
              updatedRow.bus = centerInfo.bus;
            } else if (l07 !== '') {
              toast.info(
                `Không tìm thấy thông tin cho L07: ${l07}. Bạn có thể nhập thủ công Mã AE và Business.`,
                { id: 'l07-not-found' }
              );
            }
            if (l07 !== '' && updatedRow.status === 'Error' && updatedRow.errorMessage?.includes('nhận diện Mã AE')) {
              updatedRow.status = 'Uploaded';
              updatedRow.errorMessage = undefined;
            }
          }
          return updatedRow;
        }
        return row;
      });
      return { ...prev, Fr_InputList: newList };
    });
  };

  const handleFileUpload = (id: string, file: File) => {
    const allowedExtensions = ['.xlsx', '.xls', '.gsheet'];
    const maxSize = 100 * 1024 * 1024;
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    let status = 'Uploaded';
    let errorMessage: string | undefined = undefined;

    if (!allowedExtensions.includes(fileExtension)) {
      status = 'Error';
      errorMessage = `Định dạng file không hợp lệ. Vui lòng tải lên file Excel (.xlsx, .xls).`;
    } else if (file.size > maxSize) {
      status = 'Error';
      errorMessage = `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Vui lòng tải lên file nhỏ hơn 100MB.`;
    }

    updateAppData((prev) => ({
      ...prev,
      Fr_InputList: prev.Fr_InputList.map((row) => {
        if (row.id === id) {
          const newL07 = row.l07 || getL07FromFileName(file.name) || '';
          let finalStatus = status;
          let finalErrorMessage = errorMessage;
          if (!newL07 && finalStatus !== 'Error') {
            finalStatus = 'Error';
            finalErrorMessage = 'Không thể tự động nhận diện Mã AE. Vui lòng nhập L07 thủ công.';
          }
          return { ...row, fileObj: file, url: file.name, status: finalStatus, errorMessage: finalErrorMessage, l07: newL07 };
        }
        return row;
      }),
    }));
  };

  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [mappingTargetRow, setMappingTargetRow] = useState<CenterRow | null>(null);

  const centerTargetFields = [
    'ID Number', 'Full name', 'Salary Scale', 'From', 'To',
    'Bank Account Number', 'Bank Name', 'CITAD code', 'TAX CODE', 'Contract No',
    'CHARGE TO LXO', 'CHARGE TO EC', 'CHARGE TO PT-DEMO', 'Charge MKT Local',
    'Charge Renewal Projects', 'Charge Discovery Camp', 'Charge Summer Outing', 'TOTAL PAYMENT',
  ];

  const openMappingDialog = (row: CenterRow) => {
    setMappingTargetRow(row);
    setMappingDialogOpen(true);
  };

  const handleSaveMapping = (mapping: Record<string, string>) => {
    if (mappingTargetRow) {
      updateRow(mappingTargetRow.id, 'columnMapping', mapping);
      toast.success(`Đã lưu mapping cho ${mappingTargetRow.l07 || mappingTargetRow.url}`);
    }
  };

  const handleMultiUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const allowedExtensions = ['.xlsx', '.xls', '.gsheet'];
    const maxSize = 100 * 1024 * 1024;

    updateAppData((prev) => {
      const newList = [...prev.Fr_InputList];
      Array.from(files).forEach((file) => {
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        let isInvalid = false;
        let errorMessage: string | undefined = undefined;
        if (!allowedExtensions.includes(fileExtension)) {
          isInvalid = true;
          errorMessage = `Định dạng file không hợp lệ.`;
        } else if (file.size > maxSize) {
          isInvalid = true;
          errorMessage = `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB).`;
        }
        const l07 = getL07FromFileName(file.name);
        if (isInvalid) {
          newList.push({ id: Date.now().toString() + Math.random(), l07: l07 || '', aeCode: '', bus: '', url: file.name, status: 'Error', fileObj: file, errorMessage, timePeriod: new Date().toISOString().slice(0, 7) });
          return;
        }
        if (l07) {
          const existingIdx = newList.findIndex((row) => row.l07 === l07);
          const centerInfo = getCenterInfoByL07(l07);
          const aeCode = centerInfo?.aeCode || '';
          const bus = centerInfo?.bus || '';
          if (existingIdx !== -1) {
            newList[existingIdx] = { ...newList[existingIdx], url: file.name, status: 'Uploaded', fileObj: file, aeCode: newList[existingIdx].aeCode || aeCode, bus: newList[existingIdx].bus || bus, errorMessage: undefined };
          } else {
            newList.push({ id: Date.now().toString() + Math.random(), l07, aeCode, bus, url: file.name, status: 'Uploaded', fileObj: file, timePeriod: new Date().toISOString().slice(0, 7) });
          }
        } else {
          newList.push({ id: Date.now().toString() + Math.random(), l07: '', aeCode: '', bus: '', url: file.name, status: 'Error', fileObj: file, errorMessage: 'Không thể tự động nhận diện Mã AE. Vui lòng nhập L07 thủ công.', timePeriod: new Date().toISOString().slice(0, 7) });
        }
      });
      return { ...prev, Fr_InputList: newList };
    });
    e.target.value = '';
  };

  const processFrCenters = async (onlyNew = false) => {
    const currentList = [...appData.Fr_InputList];
    const targets = onlyNew
      ? currentList.filter((item) => item.status !== 'Success' && item.status !== 'Error' && (item.fileObj || item.url))
      : currentList.filter((item) => item.status !== 'Error' && (item.fileObj || item.url));

    if (targets.length === 0) { toast.error('Không có dữ liệu mới để tổng hợp!'); return; }

    setIsProcessing(true);
    setProgress(0);
    setProcessingMessage('Bắt đầu tổng hợp dữ liệu Centers...');
    await new Promise((resolve) => setTimeout(resolve, 10));

    let successCount = 0;
    let failCount = 0;
    const finalHeaders = [
      'No', 'L07', 'Mã AE', 'Tên File', 'Business', 'ID Number', 'Full name', 'Salary Scale',
      'From', 'To', 'Bank Account Number', 'Bank Name', 'CITAD code', 'TAX CODE',
      'Contract No', 'CHARGE TO LXO', 'CHARGE TO EC', 'CHARGE TO PT-DEMO',
      'Charge MKT Local', 'Charge Renewal Projects', 'Charge Discovery Camp',
      'Charge Summer Outing', 'TOTAL PAYMENT'
    ];

    try {
      for (let i = 0; i < targets.length; i++) {
        const item = targets[i];
        setProgress(Math.round(((i + 1) / targets.length) * 100));
        setProcessingMessage(`Đang xử lý ${i + 1}/${targets.length}: ${item.l07 || item.url}...`);
        await new Promise((resolve) => setTimeout(resolve, 10));

        try {
          const wb = await readExcelFile(item.fileObj || item.url);
          const relevantSheets = wb.SheetNames.filter((name, index) => {
            const n = name.toUpperCase();
            return n.includes('STAFF') || n.includes('NHÂN VIÊN') || n.includes('SALARY') ||
              n.includes('SCALE') || n.includes('ĐƠN GIÁ') || n.includes('ROSTER') ||
              n.includes('LỊCH TRỰC') || n.includes('TIMESHEET') || n.includes('BẢNG CÔNG') ||
              n.includes('COST') || n.includes('PAYROLL') || n.includes('SHEET') ||
              n.includes('BANK') || n.includes('HOLD') || index === 0;
          });

          const dataRows: any[] = [];
          let foundAnySheet = false;

          relevantSheets.forEach((sheetName) => {
            try {
              const nameUpper = sheetName.toUpperCase();
              const ws = wb.Sheets[sheetName];
              if (!ws) return;
              const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
              if (rows.length === 0) return;

              const isStaff = nameUpper.includes('STAFF') || nameUpper.includes('NHÂN VIÊN');
              const isScale = nameUpper.includes('SALARY') || nameUpper.includes('SCALE') || nameUpper.includes('ĐƠN GIÁ');
              const isRoster = nameUpper.includes('ROSTER') || nameUpper.includes('LỊCH TRỰC');
              const isTimesheet = nameUpper.includes('TIMESHEET') || nameUpper.includes('BẢNG CÔNG');

              if (isStaff || isScale || isRoster || isTimesheet) {
                const headers = rows[0] as string[];
                const dataObjects = rows.slice(1).map((row) => {
                  const obj: any = {};
                  headers.forEach((header, index) => { obj[header] = row[index]; });
                  obj._sourceFile = item.fileObj?.name || item.url || 'Unknown';
                  return obj;
                });
                if (isStaff) updateAppData((prev) => ({ ...prev, Q_Staff: [...(prev.Q_Staff || []), ...dataObjects] }));
                else if (isScale) updateAppData((prev) => ({ ...prev, Q_Salary_Scale: [...(prev.Q_Salary_Scale || []), ...dataObjects] }));
                else if (isRoster) updateAppData((prev) => ({ ...prev, Q_Roster: [...(prev.Q_Roster || []), ...dataObjects] }));
                else if (isTimesheet) updateAppData((prev) => ({ ...prev, Timesheets: [...(prev.Timesheets || []), ...dataObjects] }));
                return;
              }

              let headerRowIdx = -1;
              let h: string[] = [];
              for (let i = 0; i < Math.min(30, rows.length); i++) {
                const row = rows[i].map((x) => String(x || '').trim().toUpperCase());
                const hasId = row.some((x) => COMMON_FIELD_ALIASES['ID Number'].some((a) => x.includes(a.toUpperCase())) || COMMON_FIELD_ALIASES['Full name'].some((a) => x.includes(a.toUpperCase())));
                const hasTotal = row.some((x) => COMMON_FIELD_ALIASES['TOTAL PAYMENT'].some((a) => x.includes(a.toUpperCase())));
                if (hasId && hasTotal) { headerRowIdx = i; h = rows[i].map((x) => String(x || '').trim()); break; }
              }

              if (headerRowIdx !== -1) {
                foundAnySheet = true;
                const colMap = findColumnMapping(h, finalHeaders, item.columnMapping);
                const iId = colMap['ID Number'];
                const iN = colMap['Full name'];
                const iT = colMap['TOTAL PAYMENT'];
                const iAcc = colMap['Bank Account Number'];

                if ((iId !== undefined || iN !== undefined) && iT !== undefined) {
                  for (let r = headerRowIdx + 1; r < rows.length; r++) {
                    const rData = rows[r];
                    if (!rData) continue;
                    const nameVal = iN !== undefined ? String(rData[iN] || '').trim() : '';
                    const totalValFromFile = iT !== undefined ? parseMoneyToNumber(rData[iT]) : 0;
                    let accVal = '';
                    if (iAcc !== undefined) {
                      const rawAcc = rData[iAcc];
                      accVal = rawAcc !== undefined && rawAcc !== null ? String(rawAcc).replace(/\s/g, '') : '';
                      if (typeof rawAcc === 'number' && (accVal.includes('E') || accVal.includes('e'))) {
                        accVal = rawAcc.toLocaleString('fullwide', { useGrouping: false });
                      }
                    }
                    if (!nameVal) continue;
                    const upperName = nameVal.toUpperCase();
                    if (upperName.includes('TOTAL COST') || upperName.includes('PREPARED BY') || upperName.includes('TA SUPERVISOR')) continue;
                    if (!accVal) continue;

                    const obj: any = {};
                    let calculatedTotal = 0;
                    const chargeColumns = ['CHARGE TO LXO', 'CHARGE TO EC', 'CHARGE TO PT-DEMO', 'Charge MKT Local', 'Charge Renewal Projects', 'Charge Discovery Camp', 'Charge Summer Outing'];
                    finalHeaders.forEach((th) => {
                      if (th === 'L07' || th === 'Business') return;
                      const colIdx = colMap[th];
                      if (colIdx !== undefined) {
                        let val = rData[colIdx];
                        if (th === 'Bank Account Number') val = accVal;
                        else if (isMoneyColumn(th)) {
                          val = parseMoneyToNumber(val);
                          if (chargeColumns.includes(th)) calculatedTotal += val;
                        }
                        obj[th] = val;
                      } else { obj[th] = ''; }
                    });
                    obj['L07'] = item.l07;
                    obj['Mã AE'] = item.aeCode;
                    obj['Business'] = item.bus;
                    obj['TOTAL PAYMENT'] = calculatedTotal > 0 ? calculatedTotal : totalValFromFile;
                    obj['Tên File'] = item.fileObj?.name || item.url || 'Unknown';
                    dataRows.push(obj);
                  }
                }
              }
            } catch (sheetError: any) {
              console.error(`Lỗi xử lý sheet ${sheetName}:`, sheetError);
            }
          });

          if (dataRows.length > 0) { item.cachedData = dataRows; item.status = 'Success'; successCount++; }
          else if (!foundAnySheet) throw new Error('Không tìm thấy dòng tiêu đề chứa thông tin ID/Tên và Total Payment.');
          else { item.status = 'Error: No data rows found'; failCount++; }
        } catch (e: any) {
          item.status = `Error: ${e.message}`;
          failCount++;
        }

        updateAppData((prev) => ({ ...prev, Fr_InputList: prev.Fr_InputList.map((row) => row.id === item.id ? { ...item } : row) }), false);
      }

      const allData: any[] = [];
      const seenKeys = new Set();
      const aeMapForMod2: Record<string, { name: string; bus: string }> = {};

      currentList.forEach((item, centerIdx) => {
        if (item.aeCode) {
          const code = String(item.aeCode).trim().toLowerCase();
          if (code) aeMapForMod2[code] = { name: item.l07, bus: item.bus };
        }
        if (item.l07) {
          const l07Key = String(item.l07).trim().toLowerCase();
          if (l07Key && !aeMapForMod2[l07Key]) aeMapForMod2[l07Key] = { name: item.l07, bus: item.bus };
        }
        if (item.cachedData && item.cachedData.length > 0) {
          item.cachedData.forEach((row: any, rowIdx: number) => {
            const idNum = String(row['ID Number'] || '').trim();
            const l07 = String(row['L07'] || '').trim();
            const total = parseMoneyToNumber(row['TOTAL PAYMENT']);
            const key = `${idNum}|${l07}|${total}`;
            row._centerIdx = centerIdx;
            row._rowIdx = rowIdx;
            if (!seenKeys.has(key)) { allData.push(row); seenKeys.add(key); }
          });
        }
      });

      updateAppData((prev) => ({ ...prev, Fr_InputList: currentList, Final_Centers: { headers: finalHeaders, data: allData }, AE_Map: aeMapForMod2 }));
      toast.success(`Tổng hợp xong! Thành công: ${successCount}, Lỗi/Trống: ${failCount}. Tổng ${allData.length} dòng.`);
    } catch (error: any) {
      console.error('Critical Error in processFrCenters:', error);
      toast.error('Lỗi hệ thống khi xử lý: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col min-h-0 bg-transparent p-4 md:p-6 gap-4 items-center overflow-auto custom-scrollbar"
    >
      {/* Floating Header Card */}
      <div
        className="mx-auto w-full max-w-[1240px] px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-white/95 backdrop-blur-md rounded-3xl border border-primary/10 shadow-xl shadow-primary/5 shrink-0 relative z-10 overflow-hidden mb-2"
      >
        <div className="absolute inset-0 striped-pattern-sage opacity-[0.15] pointer-events-none" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center text-primary shrink-0 border border-primary/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-3xl font-normal font-serif text-foreground tracking-tight flex items-end gap-1">
              Files from <span className="not-italic font-script text-primary text-3xl lowercase inline-block transform -translate-y-0.5">centers</span>
            </h2>
            <p className="text-[0.625rem] font-bold text-primary/60 uppercase tracking-[0.3em] mt-1">
              MANAGEMENT • {appData.Fr_InputList.length} CENTERS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <RouterLink 
              to="/centers" 
              className="soft-button flex items-center gap-2 px-6 h-12 bg-white text-muted-foreground hover:text-primary rounded-2xl border border-primary/20 shadow-sm transition-all group"
            >
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <FileCheck className="w-3.5 h-3.5" />
              </div>
              <span className="text-[0.65rem] font-bold tracking-[0.1em] uppercase">Kết quả</span>
            </RouterLink>

            <button
              onClick={() => processFrCenters(false)}
              disabled={isProcessing}
              className="soft-button bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center gap-3 px-8 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Layers className="w-4 h-4" />
              )}
              <span className="text-[0.7rem] font-bold tracking-widest uppercase">Tổng hợp</span>
            </button>

            <DropdownMenu>
              <button
                id="settings-trigger"
                className="p-3 rounded-full border border-primary/10 bg-white text-muted-foreground hover:text-primary transition-all group shadow-sm"
              >
                <DropdownMenuTrigger asChild>
                  <Wrench className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
                </DropdownMenuTrigger>
              </button>
              <DropdownMenuContent align="end" className="w-64 border border-primary/10 shadow-xl p-1.5 bg-white rounded-2xl">
                <DropdownMenuLabel className="font-bold uppercase text-[0.625rem] tracking-widest text-primary/60 px-3 py-2">Thao tác dữ liệu</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-primary/10 mx-1.5" />
                
                <DropdownMenuItem onClick={addRow} className="cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 p-3 rounded-xl transition-all hover:bg-primary/5">
                  <Plus className="w-4 h-4 text-primary" />
                  <span>Thêm dòng mới</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 p-3 rounded-xl transition-all hover:bg-primary/5">
                  <UploadCloud className="w-4 h-4 text-primary" />
                  <span>Tải lên nhiều file</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => configInputRef.current?.click()} className="cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 p-3 rounded-xl transition-all hover:bg-primary/5">
                  <Save className="w-4 h-4 text-primary" />
                  <span>Nạp file cấu hình</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-primary/10 mx-1.5" />

                <DropdownMenuItem onClick={deletePageRows} className="cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 p-3 rounded-xl transition-all hover:bg-rose-50 text-rose-500">
                  <Trash2 className="w-4 h-4" />
                  <span>Xoá toàn bộ trang</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => setShowClearDialog(true)} className="cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 p-3 rounded-xl transition-all hover:bg-rose-50 text-rose-500">
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa toàn bộ dữ liệu</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Floating Table Card */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-primary/10 shadow-lg flex-1 flex flex-col min-h-0 w-full max-w-[1240px] relative overflow-hidden mx-auto mb-4 pt-0 pb-3">
        <div className="absolute inset-0 striped-pattern opacity-[0.03] pointer-events-none" />

        {/* ── Table ── */}
        <datalist id="l07-options">
          {DEFAULT_CENTERS.map((c, idx) => (
            <option key={`${c.l07}-${idx}`} value={c.l07}>{c.aeCode} - {c.bus}</option>
          ))}
        </datalist>

        <div className="flex-1 min-h-0 flex flex-col w-full overflow-hidden font-[family-name:var(--font-table,var(--font-main))]">
          <div className="flex-1 min-h-0 w-full overflow-auto custom-scrollbar">
            <table className="w-full border-separate border-spacing-0 table-auto text-left relative border-l border-t border-[#E2E8F0]">
              <thead>
                <tr className="bg-[#F3EFE0]">
                  <th style={{ width: '60px', padding: 'var(--table-padding, 12px 16px)' }} className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] text-center border-b border-r border-[#E2E8F0] whitespace-nowrap shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                    No
                  </th>
                  <th style={{ width: '190px', padding: 'var(--table-padding, 12px 16px)' }} className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] border-b border-r border-[#E2E8F0] whitespace-nowrap text-center shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                    L07
                  </th>
                  <th style={{ width: '235px', padding: 'var(--table-padding, 12px 16px)' }} className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] border-b border-r border-[#E2E8F0] whitespace-nowrap text-center shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                    Mã AE
                  </th>
                  <th style={{ width: '190px', padding: 'var(--table-padding, 12px 16px)' }} className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] border-b border-r border-[#E2E8F0] whitespace-nowrap text-center shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                    Business
                  </th>
                  <th style={{ padding: 'var(--table-padding, 12px 16px)' }} className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] border-b border-r border-[#E2E8F0] whitespace-nowrap text-center shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                    FILE DỮ LIỆU
                  </th>
                  <th style={{ width: '150px', padding: 'var(--table-padding, 12px 16px)' }} className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] border-b border-r border-[#E2E8F0] whitespace-nowrap text-center shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                    TRẠNG THÁI
                  </th>
                  <th style={{ width: '80px', padding: 'var(--table-padding, 12px 16px)' }} className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] text-center border-b border-[#E2E8F0] whitespace-nowrap shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                    XÓA
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400 border border-slate-200/50 bg-slate-50/30">
                      <div className="flex flex-col items-center gap-6">
                        <div className="w-24 h-24 bg-primary/5 rounded-3xl flex items-center justify-center border border-primary/10">
                          <Building2 className="w-10 h-10 text-primary/20" />
                        </div>
                        <div className="space-y-2">
                          <p className="font-bold uppercase text-lg tracking-tight text-primary/40 font-[family-name:var(--font-display,var(--font-main))]">
                            Chưa có file From Centers
                          </p>
                          <p className="text-[0.625rem] font-bold uppercase opacity-40 tracking-widest">
                            Thêm dòng, nạp cấu hình hoặc upload file để bắt đầu
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item, index) => (
                    <tr key={item.id} className="group hover:bg-primary/5 transition-colors">
                      <td style={{ padding: 'var(--table-padding, 12px 16px)', fontSize: 'var(--font-size)', fontFamily: 'var(--font-table, var(--font-main))' }} className="text-center border-b border-r border-[#E2E8F0] whitespace-nowrap">
                        <span className="text-[1em] font-medium text-foreground/30">{(currentPage - 1) * itemsPerPage + index + 1}</span>
                      </td>
                      <td style={{ padding: 'var(--table-padding, 12px 16px)', fontSize: 'var(--font-size)', fontFamily: 'var(--font-table, var(--font-main))' }} className="border-b border-r border-[#E2E8F0] text-left whitespace-nowrap">
                        <input id={`l07-${item.id}`} name={`l07-${item.id}`} type="text" list="l07-options" value={item.l07 || ''} onChange={(e) => updateRow(item.id, 'l07', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-[1em] font-medium text-foreground placeholder:text-foreground/20 p-0 uppercase tracking-tight text-left" style={{ fontFamily: 'inherit' }} placeholder="L07" />
                      </td>
                      <td style={{ padding: 'var(--table-padding, 12px 16px)', fontSize: 'var(--font-size)', fontFamily: 'var(--font-table, var(--font-main))' }} className="border-b border-r border-[#E2E8F0] text-left whitespace-nowrap">
                        <input id={`aeCode-${item.id}`} name={`aeCode-${item.id}`} type="text" value={item.aeCode || ''} onChange={(e) => updateRow(item.id, 'aeCode', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-[1em] font-medium text-foreground placeholder:text-foreground/20 p-0 uppercase tracking-tight text-left" style={{ fontFamily: 'inherit' }} placeholder="Mã AE" />
                      </td>
                      <td style={{ padding: 'var(--table-padding, 12px 16px)', fontSize: 'var(--font-size)', fontFamily: 'var(--font-table, var(--font-main))' }} className="border-b border-r border-[#E2E8F0] text-left whitespace-nowrap">
                        <input id={`bus-${item.id}`} name={`bus-${item.id}`} type="text" value={item.bus || ''} onChange={(e) => updateRow(item.id, 'bus', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-[1em] font-medium text-foreground placeholder:text-foreground/20 p-0 uppercase tracking-tight text-left" style={{ fontFamily: 'inherit' }} placeholder="Business" />
                      </td>
                      <td style={{ padding: 'var(--table-padding, 12px 16px)', fontSize: 'var(--font-size)' }} className="border-b border-r border-[#E2E8F0] whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <input type="file" id={`file-${item.id}`} name={`file-${item.id}`} className="hidden" accept=".xlsx, .xls, .gsheet" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(item.id, e.target.files[0]); }} />
                            <button
                              onClick={() => document.getElementById(`file-${item.id}`)?.click()}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-[0.625rem] tracking-widest uppercase transition-all shrink-0 ${item.fileObj ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'bg-white text-primary border-primary/10 hover:bg-primary/5'}`}
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                              {item.fileObj ? 'ĐÃ CHỌN' : 'UPLOAD'}
                            </button>
                            {item.fileObj && (
                              <button onClick={() => openMappingDialog(item)} className="p-2 border border-primary/10 rounded-xl bg-white text-primary hover:bg-primary/5 transition-all shadow-sm shrink-0" title="Mapping">
                                <Wrench className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {item.url && (
                              <span className="text-[0.75rem] text-primary/70 truncate max-w-[200px]" title={item.url}>
                                {item.url}
                              </span>
                            )}
                          </div>

                        </div>
                      </td>
                      <td style={{ padding: 'var(--table-padding, 12px 16px)', fontSize: 'var(--font-size)' }} className="border-b border-r border-[#E2E8F0] text-center whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          {item.status === 'Error' ? (
                            <div className="flex items-center gap-1.5 text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-widest">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Lỗi</span>
                            </div>
                          ) : (item.status === 'ready' && !item.fileObj && !item.url) ? (
                            <div className="flex items-center gap-1.5 text-foreground/30 bg-foreground/5 px-3 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-widest">
                              <Circle className="w-3 h-3" />
                              <span>Sẵn sàng</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-3 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-widest border border-primary/20">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Ok</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: 'var(--table-padding, 12px 16px)', fontSize: 'var(--font-size)' }} className="text-center border-b border-[#E2E8F0] whitespace-nowrap">
                        <button onClick={() => deleteRow(item.id)} className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 rounded-xl transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Pagination ── */}
        <div className="px-6 py-4 border-t border-primary/5 bg-transparent flex items-center justify-between shrink-0">
          <p className="text-[0.625rem] font-bold uppercase tracking-widest text-foreground/40">
            Hiển thị{' '}
            <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span>
            {' – '}
            <span className="text-foreground">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span>
            {' / '}
            <span className="text-foreground">{filteredData.length}</span>
            {' cấu hình'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="h-[35px] w-[35px] flex items-center justify-center text-primary/60 hover:bg-primary/10 rounded-xl disabled:opacity-30 transition-all border border-primary/10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`h-[35px] w-[35px] flex items-center justify-center rounded-xl font-bold text-[0.625rem] transition-all border ${currentPage === p ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'text-primary/60 hover:bg-primary/10 border-primary/10'}`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="h-[35px] w-[35px] flex items-center justify-center text-primary/60 hover:bg-primary/10 rounded-xl disabled:opacity-30 transition-all border border-primary/10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>{/* end white card */}

      {/* ── Processing Banner ── */}
      {isProcessing && (
        <div className="mt-3 w-full max-w-[1400px] p-4 border border-primary/10 bg-white flex flex-col gap-3 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="font-bold uppercase text-[0.6875rem] tracking-widest text-primary">{processingMessage}</span>
            </div>
            <span className="text-xs font-bold text-primary">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* ── Dialogs ── */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="border border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight text-primary">Xác nhận xoá file và trạng thái</DialogTitle>
            <DialogDescription className="font-bold text-primary/60">
              Bạn có chắc chắn muốn xóa toàn bộ file đã tải lên và đặt lại trạng thái? Các cấu hình L07 (Mã), Mã AE và Business sẽ được giữ nguyên.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowClearDialog(false)} className="border border-slate-200 font-black uppercase text-xs rounded-xl">Hủy</Button>
            <Button variant="destructive" onClick={clearPageData} className="bg-rose-500 font-black uppercase text-xs hover:bg-rose-600 rounded-xl">Xác nhận xoá</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ColumnMappingDialog
        isOpen={mappingDialogOpen}
        onClose={() => setMappingDialogOpen(false)}
        file={mappingTargetRow?.fileObj || null}
        onSave={handleSaveMapping}
        initialMapping={mappingTargetRow?.columnMapping}
        targetFields={centerTargetFields}
      />

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        multiple 
        accept=".xlsx, .xls, .gsheet" 
        onChange={handleMultiUpload} 
      />
      <input 
        type="file" 
        ref={configInputRef} 
        style={{ display: 'none' }} 
        accept=".xlsx, .xls, .gsheet" 
        onChange={handleConfigFileUpload} 
      />
    </motion.div>
  );
}
