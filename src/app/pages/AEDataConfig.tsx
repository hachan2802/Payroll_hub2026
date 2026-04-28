/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Link as LinkIcon,
  UploadCloud,
  Layers,
  Trash2,
  FileSpreadsheet,
  Loader2,
  AlertTriangle,
  Check,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { useAppData } from '../lib/contexts/AppDataContext';
import {
  readExcelFile,
  parseMoneyToNumber,
  cleanText,
  isMoneyColumn,
  autoMapColumns,
} from '../lib/utils/data-utils';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '../components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { ColumnMappingDialog } from '../components/ColumnMappingDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

interface AERow {
  id: string;
  name: string;
  fileObj?: File | null;
  status: string;
  bank?: string;
  month?: string;
  columnMapping?: Record<string, string>;
}

interface PendingUpload {
  file: File;
  existingRowId?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
} as const;

export function AEDataConfig() {
  const { appData, updateAppData } = useAppData();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [choices, setChoices] = useState<
    { file: File; action: 'update' | 'new' | 'skip'; targetId?: string }[]
  >([]);
  const [showDialog, setShowDialog] = useState(false);

  // Initialize choices when pendingUploads changes
  useEffect(() => {
    setChoices(
      pendingUploads.map((p) => ({
        file: p.file,
        action: p.existingRowId ? 'update' : 'new',
        targetId: p.existingRowId,
      }))
    );
  }, [pendingUploads]);

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [mappingDialog, setMappingDialog] = useState<{
    isOpen: boolean;
    rowId: string | null;
  }>({
    isOpen: false,
    rowId: null,
  });

  const masterAeFields = [
    'No',
    'ID Number',
    'Full name',
    'Salary Scale',
    'From',
    'To',
    'Bank Account Number',
    'Bank Name',
    'CITAD code',
    'TAX CODE',
    'Contract No',
    'CHARGE TO LXO',
    'CHARGE TO EC',
    'CHARGE TO PT-DEMO',
    'Charge MKT Local',
    'Charge Renewal Projects',
    'Charge Discovery Camp',
    'Charge Summer Outing',
    'TOTAL PAYMENT',
    'Center',
  ];

  const filteredData = appData.Ae_Global_Inputs.filter(
    (row) =>
      row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.bank || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.month || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const clearPageData = () => {
    updateAppData((prev) => ({
      ...prev,
      Ae_Global_Inputs: prev.Ae_Global_Inputs.map((row) => ({
        ...row,
        fileObj: undefined,
        status: 'ready',
        cachedData: undefined,
      })),
    }));
    setShowClearDialog(false);
    toast.success('Đã xóa toàn bộ file và trạng thái.');
  };

  const addRow = () => {
    const newRow: AERow = {
      id: Date.now().toString(),
      name: '',
      status: 'ready',
      bank: '',
      month: '',
    };
    updateAppData((prev) => ({
      ...prev,
      Ae_Global_Inputs: [...prev.Ae_Global_Inputs, newRow],
    }));
  };

  const deleteRow = (id: string | undefined) => {
    if (!id) return;
    updateAppData((prev) => ({
      ...prev,
      Ae_Global_Inputs: prev.Ae_Global_Inputs.filter((row) => row.id !== id),
    }));
  };

  const updateRow = (id: string, field: keyof AERow, value: any) => {
    updateAppData((prev) => ({
      ...prev,
      Ae_Global_Inputs: prev.Ae_Global_Inputs.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      ),
    }));
  };

  const handleFileUpload = async (id: string, file: File) => {
    const allowedExtensions = ['.xlsx', '.xls'];
    const maxSize = 100 * 1024 * 1024; // 100MB

    const fileExtension = file.name
      .substring(file.name.lastIndexOf('.'))
      .toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      toast.error(
        `Định dạng file không hợp lệ: ${file.name}. Vui lòng tải lên file Excel (.xlsx, .xls).`
      );
      return;
    }

    if (file.size > maxSize) {
      toast.error(
        `File quá lớn: ${file.name}. Vui lòng tải lên file nhỏ hơn 100MB.`
      );
      return;
    }

    setIsProcessing(true);
    setProcessingMessage('Đang tự động map cột...');
    const mapping = await autoMapColumns(file, masterAeFields);
    setIsProcessing(false);

    updateAppData((prev) => ({
      ...prev,
      Ae_Global_Inputs: prev.Ae_Global_Inputs.map((row) =>
        row.id === id
          ? {
              ...row,
              fileObj: file,
              name: file.name,
              status: 'Uploaded',
              columnMapping: mapping,
            }
          : row
      ),
    }));
    toast.success(`Đã tải lên và tự động map cột cho file: ${file.name}`);
  };

  const handleMultiUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPending: PendingUpload[] = [];
    Array.from(files).forEach((file) => {
      const existingRow = appData.Ae_Global_Inputs.find(
        (row) => row.name === file.name
      );
      if (existingRow) {
        newPending.push({ file, existingRowId: existingRow.id });
      } else {
        newPending.push({ file });
      }
    });

    setPendingUploads(newPending);
    setShowDialog(true);
    e.target.value = ''; // Reset input
  };

  const confirmUploads = async (
    choices: {
      file: File;
      action: 'update' | 'new' | 'skip';
      targetId?: string;
    }[]
  ) => {
    const newRows: AERow[] = [];
    const updates: {
      id: string;
      file: File;
      columnMapping?: Record<string, string>;
    }[] = [];

    setIsProcessing(true);
    setProcessingMessage('Đang tự động map cột...');

    for (const choice of choices) {
      if (choice.action === 'skip') continue;

      const mapping = await autoMapColumns(choice.file, masterAeFields);

      if (choice.action === 'update' && choice.targetId) {
        updates.push({
          id: choice.targetId,
          file: choice.file,
          columnMapping: mapping,
        });
      } else if (choice.action === 'new') {
        newRows.push({
          id: Date.now().toString() + Math.random(),
          name: choice.file.name,
          status: 'Uploaded',
          fileObj: choice.file,
          bank: '',
          month: '',
          columnMapping: mapping,
        });
      }
    }

    updateAppData((prev) => ({
      ...prev,
      Ae_Global_Inputs: prev.Ae_Global_Inputs.map((row) => {
        const update = updates.find((u) => u.id === row.id);
        return update
          ? {
              ...row,
              fileObj: update.file,
              status: 'Uploaded',
              columnMapping: update.columnMapping,
            }
          : row;
      }).concat(newRows),
    }));

    setIsProcessing(false);
    setShowDialog(false);
    setPendingUploads([]);
    toast.success(
      `Đã tải lên và tự động map cột cho ${newRows.length + updates.length} file`
    );
  };

  const processAEData = async () => {
    const targets = appData.Ae_Global_Inputs.filter((item) => item.fileObj);
    if (targets.length === 0) {
      toast.error('Vui lòng chọn ít nhất một File AE Final!');
      return;
    }

    const getColIndex = (
      headers: string[],
      targetField: string,
      mapping?: Record<string, string>,
      fuzzyKeywords: string[] = []
    ) => {
      if (mapping && mapping[targetField]) {
        const mappedHeader = mapping[targetField].toUpperCase().trim();
        const idx = headers.findIndex(
          (h) => String(h).toUpperCase().trim() === mappedHeader
        );
        if (idx !== -1) return idx;
      }
      return headers.findIndex((h: any) => {
        const hUp = String(h).toUpperCase().trim();
        if (hUp === targetField.toUpperCase()) return true;
        return fuzzyKeywords.some((k) => hUp.includes(k.toUpperCase()));
      });
    };

    setIsProcessing(true);
    setProgress(0);
    setProcessingMessage('Đang chuẩn bị xử lý dữ liệu AE...');
    await new Promise((resolve) => setTimeout(resolve, 10));

    const totalFiles = targets.length;
    let processedFiles = 0;

    try {
      const bankData: any[] = [];
      const sheet1Data: any[] = [];
      const holdData: any[] = [];
      const soSanhAeData: any[] = [];

      const sheet1Headers = [
        'No',
        'L07',
        'Business',
        'ID Number',
        'Full name',
        'Salary Scale',
        'From',
        'To',
        'Bank Account Number',
        'Bank Name',
        'CITAD code',
        'TAX CODE',
        'Contract No',
        'CHARGE TO LXO',
        'CHARGE TO EC',
        'CHARGE TO PT-DEMO',
        'Charge MKT Local',
        'Charge Renewal Projects',
        'Charge Discovery Camp',
        'Charge Summer Outing',
        'TOTAL PAYMENT',
      ];

      let foundAnySheet = false;
      const aeMap = appData.AE_Map;

      for (let i = 0; i < targets.length; i++) {
        const item = targets[i];
        if (!item.fileObj && !item.url) continue;

        processedFiles++;
        setProgress(Math.round((processedFiles / totalFiles) * 100));
        setProcessingMessage(
          `Đang xử lý file ${i + 1}/${targets.length}: ${item.name || item.url}...`
        );
        await new Promise((resolve) => setTimeout(resolve, 10));

        updateAppData(
          (prev) => ({
            ...prev,
            Ae_Global_Inputs: prev.Ae_Global_Inputs.map((row) =>
              row.id === item.id ? { ...row, status: 'Processing...' } : row
            ),
          }),
          false
        );

        try {
          const wb = await readExcelFile(item.fileObj || item.url);
          let fileProcessedSuccessfully = false;

          if (wb.SheetNames.length === 0) {
            throw new Error('File không có sheet nào.');
          }

          // Optimized: Only process relevant sheets
          const relevantSheets = wb.SheetNames.filter((name) => {
            const n = name.toUpperCase();
            return (
              n.includes('BANK') ||
              n.includes('NGÂN HÀNG') ||
              n.includes('SHEET 1') ||
              n.includes('SHEET1') ||
              n.includes('HOLD') ||
              n.includes('SO SÁNH AE')
            );
          });

          for (const sheetName of relevantSheets) {
            try {
              const ws = wb.Sheets[sheetName];
              if (!ws) continue;

              // Use raw: true to get actual number objects for Bank Account handling
              const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
                header: 1,
                defval: '',
                raw: true,
              });
              if (rows.length <= 1) continue;

              const nameUpper = sheetName.toUpperCase();
              let sheetProcessed = false;

              if (
                nameUpper.includes('BANK') ||
                nameUpper.includes('NGÂN HÀNG')
              ) {
                let headerRowIndex = -1;
                for (let r = 0; r < Math.min(30, rows.length); r++) {
                  const rowStr = rows[r]
                    .map((c) => String(c || '').toUpperCase())
                    .join(' ');
                  if (
                    (rowStr.includes('FULL NAME') ||
                      rowStr.includes('HỌ VÀ TÊN') ||
                      rowStr.includes('TÊN')) &&
                    (rowStr.includes('ACCOUNT') ||
                      rowStr.includes('SỐ TÀI KHOẢN') ||
                      rowStr.includes('TÀI KHOẢN') ||
                      rowStr.includes('STK'))
                  ) {
                    headerRowIndex = r;
                    break;
                  }
                }

                if (headerRowIndex !== -1) {
                  foundAnySheet = true;
                  sheetProcessed = true;
                  const h = rows[headerRowIndex].map((c) =>
                    String(c || '').trim()
                  );

                  const iS = getColIndex(h, 'No', item.columnMapping, [
                    'NO',
                    'STT',
                  ]);
                  const iId = getColIndex(h, 'ID Number', item.columnMapping, [
                    'ID',
                    'CMND',
                    'MÃ NV',
                  ]);
                  const iN = getColIndex(h, 'Full name', item.columnMapping, [
                    'NAME',
                    'TÊN',
                  ]);
                  const iA = getColIndex(
                    h,
                    'Bank Account Number',
                    item.columnMapping,
                    ['ACCOUNT', 'TÀI KHOẢN', 'STK']
                  );
                  const iT = getColIndex(
                    h,
                    'TOTAL PAYMENT',
                    item.columnMapping,
                    ['TOTAL', 'TỔNG', 'THỰC NHẬN']
                  );
                  const iP = getColIndex(
                    h,
                    'Payment details',
                    item.columnMapping,
                    ['DETAILS', 'NỘI DUNG', 'DIỄN GIẢI', 'DESCRIPTION']
                  );
                  const iBank = getColIndex(
                    h,
                    'Bank Name',
                    item.columnMapping,
                    ['BANK', 'NGÂN HÀNG', 'TEN NGAN HANG', 'TÊN NGÂN HÀNG']
                  );
                  const iThang = getColIndex(h, 'Tháng', item.columnMapping, [
                    'THÁNG',
                    'MONTH',
                    'KỲ',
                  ]);
                  const iCenter = getColIndex(h, 'Center', item.columnMapping, [
                    'CENTER',
                    'COST CENTER',
                    'TRUNG TÂM',
                    'AE CODE',
                    'AE',
                    'MÃ AE',
                  ]);

                  for (let r = headerRowIndex + 1; r < rows.length; r++) {
                    const row = rows[r];
                    if (!row || row.every((cell) => cell === '')) continue;

                    const rawTP =
                      iT !== -1 && row[iT] !== undefined ? row[iT] : '';
                    const t = parseMoneyToNumber(rawTP);
                    const nameVal =
                      iN !== -1 && row[iN] !== undefined
                        ? String(row[iN]).trim()
                        : '';

                    // Force Bank Account Number to be string
                    let acc = '';
                    if (iA !== -1) {
                      const rawAcc = row[iA];
                      acc =
                        rawAcc !== undefined && rawAcc !== null
                          ? String(rawAcc).replace(/\s/g, '')
                          : '';
                      if (
                        typeof rawAcc === 'number' &&
                        (acc.includes('E') || acc.includes('e'))
                      ) {
                        acc = rawAcc.toLocaleString('fullwide', {
                          useGrouping: false,
                        });
                      }
                    }

                    const idVal =
                      iId !== -1 && row[iId] !== undefined
                        ? String(row[iId]).trim()
                        : '';

                    let type = 'Liên ngân hàng';
                    if (!acc) type = '⚠️ Thiếu STK';
                    else if (acc.length < 6 || acc.length > 25)
                      type = '⚠️ Sai độ dài';
                    else if (acc.startsWith('0') || acc.startsWith('10'))
                      type = 'Nội bộ VCB';

                    const rawCenterVal =
                      iCenter !== -1 && row[iCenter] !== undefined
                        ? String(row[iCenter]).trim()
                        : '';
                    const rawCenterKey = rawCenterVal.toLowerCase();
                    let l07 = rawCenterVal;
                    let business = '';

                    if (aeMap[rawCenterKey]) {
                      l07 = aeMap[rawCenterKey].name;
                      business = aeMap[rawCenterKey].bus;
                    }

                    bankData.push({
                      No: iS !== -1 && row[iS] !== undefined ? row[iS] : '',
                      'ID Number': idVal,
                      'Full name': nameVal,
                      L07: l07,
                      Business: business,
                      'Bank Account Number': acc,
                      Bank:
                        iBank !== -1 &&
                        row[iBank] !== undefined &&
                        String(row[iBank]).trim() !== ''
                          ? String(row[iBank]).trim()
                          : item.bank || '',
                      Tháng:
                        iThang !== -1 &&
                        row[iThang] !== undefined &&
                        String(row[iThang]).trim() !== ''
                          ? String(row[iThang]).trim()
                          : item.month || '',
                      'TOTAL PAYMENT': t,
                      'LOẠI CK': type,
                      'Payment details':
                        iP !== -1 && row[iP] !== undefined
                          ? String(row[iP]).trim()
                          : '',
                    });
                  }
                }
              }

              if (nameUpper.includes('HOLD')) {
                let headerRowIndex = -1;
                for (let r = 0; r < Math.min(30, rows.length); r++) {
                  const rowStr = rows[r]
                    .map((c) => String(c || '').toUpperCase())
                    .join(' ');
                  if (
                    (rowStr.includes('FULL NAME') ||
                      rowStr.includes('HỌ VÀ TÊN') ||
                      rowStr.includes('TÊN')) &&
                    (rowStr.includes('ACCOUNT') ||
                      rowStr.includes('SỐ TÀI KHOẢN') ||
                      rowStr.includes('TÀI KHOẢN') ||
                      rowStr.includes('STK'))
                  ) {
                    headerRowIndex = r;
                    break;
                  }
                }

                foundAnySheet = true;
                sheetProcessed = true;

                if (headerRowIndex !== -1) {
                  // Header found - use dynamic mapping
                  const h = rows[headerRowIndex].map((c) =>
                    String(c || '').trim()
                  );
                  const iId = getColIndex(h, 'ID Number', item.columnMapping, [
                    'ID',
                    'CMND',
                    'MÃ NV',
                  ]);
                  const iN = getColIndex(h, 'Full name', item.columnMapping, [
                    'NAME',
                    'TÊN',
                  ]);
                  const iA = getColIndex(
                    h,
                    'Bank Account Number',
                    item.columnMapping,
                    ['ACCOUNT', 'TÀI KHOẢN', 'STK']
                  );
                  const iT = getColIndex(
                    h,
                    'TOTAL PAYMENT',
                    item.columnMapping,
                    ['TOTAL', 'TỔNG', 'THỰC NHẬN']
                  );
                  const iBank = getColIndex(
                    h,
                    'Bank Name',
                    item.columnMapping,
                    ['BANK', 'NGÂN HÀNG', 'TEN NGAN HANG', 'TÊN NGÂN HÀNG']
                  );
                  const iThang = getColIndex(h, 'Tháng', item.columnMapping, [
                    'THÁNG',
                    'MONTH',
                    'KỲ',
                  ]);
                  const iTax = getColIndex(h, 'TAX CODE', item.columnMapping, [
                    'TAX',
                    'MST',
                  ]);
                  const iContract = getColIndex(
                    h,
                    'Contract No',
                    item.columnMapping,
                    ['CONTRACT', 'HỢP ĐỒNG']
                  );
                  const iCenterNote = getColIndex(
                    h,
                    'CENTER NOTE',
                    item.columnMapping,
                    ['CENTER NOTE', 'GHI CHÚ']
                  );
                  const iNote = getColIndex(h, 'Note', item.columnMapping, [
                    'NOTE',
                    'GHI CHÚ',
                  ]);

                  for (let r = headerRowIndex + 1; r < rows.length; r++) {
                    const row = rows[r];
                    if (!row || row.length < 3) continue;

                    const idVal =
                      iId !== -1 && row[iId] !== undefined
                        ? String(row[iId]).trim()
                        : '';
                    const nameVal =
                      iN !== -1 && row[iN] !== undefined
                        ? String(row[iN]).trim()
                        : '';

                    let accVal = '';
                    if (iA !== -1) {
                      const rawAcc = row[iA];
                      accVal =
                        rawAcc !== undefined && rawAcc !== null
                          ? String(rawAcc).replace(/\s/g, '')
                          : '';
                      if (
                        typeof rawAcc === 'number' &&
                        (accVal.includes('E') || accVal.includes('e'))
                      ) {
                        accVal = rawAcc.toLocaleString('fullwide', {
                          useGrouping: false,
                        });
                      }
                    }

                    const taxCode =
                      iTax !== -1 && row[iTax] !== undefined
                        ? String(row[iTax]).trim()
                        : '';
                    const contractNo =
                      iContract !== -1 && row[iContract] !== undefined
                        ? String(row[iContract]).trim()
                        : '';
                    const rawTP =
                      iT !== -1 && row[iT] !== undefined ? row[iT] : '';
                    const numTP = parseMoneyToNumber(rawTP);
                    const centerNote =
                      iCenterNote !== -1 && row[iCenterNote] !== undefined
                        ? String(row[iCenterNote]).trim()
                        : '';
                    const note =
                      iNote !== -1 && row[iNote] !== undefined
                        ? String(row[iNote]).trim()
                        : '';
                    const bankVal =
                      iBank !== -1 &&
                      row[iBank] !== undefined &&
                      String(row[iBank]).trim() !== ''
                        ? String(row[iBank]).trim()
                        : item.bank || '';
                    const thangVal =
                      iThang !== -1 &&
                      row[iThang] !== undefined &&
                      String(row[iThang]).trim() !== ''
                        ? String(row[iThang]).trim()
                        : item.month || '';

                    if (!idVal && !nameVal && numTP === 0) continue;
                    if (!accVal) continue;

                    holdData.push({
                      No: holdData.length + 1,
                      'ID Number': idVal,
                      'Full name': nameVal,
                      'Bank Account Number': accVal,
                      Bank: bankVal,
                      Tháng: thangVal,
                      'TAX CODE': taxCode,
                      'Contract No': contractNo,
                      'TOTAL PAYMENT': numTP,
                      'CENTER NOTE': centerNote,
                      'Sheet Source': sheetName,
                      Note: note,
                    });
                  }
                } else {
                  // No header found - use fixed column indices (A-I) as fallback
                  for (let r = 0; r < rows.length; r++) {
                    const row = rows[r];
                    if (!row || row.length < 7) continue;

                    if (
                      String(row[1] || '')
                        .toUpperCase()
                        .includes('ID NUMBER') ||
                      String(row[2] || '')
                        .toUpperCase()
                        .includes('FULL NAME')
                    )
                      continue;

                    const idVal = String(row[1] || '').trim();
                    const nameVal = String(row[2] || '').trim();

                    let accVal = '';
                    const rawAcc = row[3];
                    accVal =
                      rawAcc !== undefined && rawAcc !== null
                        ? String(rawAcc).replace(/\s/g, '')
                        : '';
                    if (
                      typeof rawAcc === 'number' &&
                      (accVal.includes('E') || accVal.includes('e'))
                    ) {
                      accVal = rawAcc.toLocaleString('fullwide', {
                        useGrouping: false,
                      });
                    }

                    const taxCode = String(row[4] || '').trim();
                    const contractNo = String(row[5] || '').trim();
                    const numTP = parseMoneyToNumber(row[6]);
                    const centerNote = String(row[7] || '').trim();
                    const note = String(row[8] || '').trim();

                    if (!idVal && !nameVal && numTP === 0) continue;
                    if (!accVal) continue;

                    holdData.push({
                      No: holdData.length + 1,
                      'ID Number': idVal,
                      'Full name': nameVal,
                      'Bank Account Number': accVal,
                      Bank: item.bank || '',
                      Tháng: item.month || '',
                      'TAX CODE': taxCode,
                      'Contract No': contractNo,
                      'TOTAL PAYMENT': numTP,
                      'CENTER NOTE': centerNote,
                      'Sheet Source': sheetName,
                      Note: note,
                    });
                  }
                }
              }

              if (
                nameUpper.includes('SHEET 1') ||
                nameUpper.includes('SHEET1')
              ) {
                let headerRowIndex = -1;
                for (let r = 0; r < Math.min(30, rows.length); r++) {
                  const rowStr = rows[r]
                    .map((c) => String(c || '').toUpperCase())
                    .join(' ');
                  let matchCount = 0;
                  if (
                    rowStr.includes('FULL NAME') ||
                    rowStr.includes('HỌ VÀ TÊN') ||
                    rowStr.includes('TÊN NHÂN VIÊN')
                  )
                    matchCount++;
                  if (
                    rowStr.includes('ID NUMBER') ||
                    rowStr.includes('MÃ NV') ||
                    rowStr.includes('ID')
                  )
                    matchCount++;
                  if (
                    rowStr.includes('TOTAL PAYMENT') ||
                    rowStr.includes('THỰC NHẬN') ||
                    rowStr.includes('TỔNG')
                  )
                    matchCount++;

                  if (matchCount >= 2) {
                    headerRowIndex = r;
                    break;
                  }
                }

                if (headerRowIndex !== -1) {
                  foundAnySheet = true;
                  sheetProcessed = true;
                  const h = rows[headerRowIndex].map((c) =>
                    String(c || '').trim()
                  );
                  const colIndices: Record<string, number> = {};
                  sheet1Headers.forEach((th) => {
                    if (th === 'L07' || th === 'Business') return;

                    const fuzzyMap: Record<string, string[]> = {
                      'Full name': ['FULL NAME', 'HỌ VÀ TÊN', 'TÊN NHÂN VIÊN'],
                      'ID Number': ['ID', 'MÃ NV', 'CMND'],
                      'Bank Account Number': ['ACCOUNT', 'TÀI KHOẢN', 'STK'],
                      'TOTAL PAYMENT': ['TOTAL', 'TỔNG', 'THỰC NHẬN'],
                      'Bank Name': ['BANK NAME', 'NGÂN HÀNG'],
                      Bank: [
                        'BANK',
                        'NGÂN HÀNG',
                        'TEN NGAN HANG',
                        'TÊN NGÂN HÀNG',
                      ],
                      Tháng: ['THÁNG', 'MONTH', 'KỲ'],
                    };

                    colIndices[th] = getColIndex(
                      h,
                      th,
                      item.columnMapping,
                      fuzzyMap[th] || []
                    );
                  });

                  let centerColIndex = getColIndex(
                    h,
                    'Center',
                    item.columnMapping,
                    [
                      'CENTER',
                      'COST CENTER',
                      'CENTERS',
                      'AE CODE',
                      'AE',
                      'MÃ AE',
                      'MÃ CENTERS',
                      'MÃ TT',
                    ]
                  );
                  if (centerColIndex === -1) centerColIndex = 19;

                  for (let r = headerRowIndex + 1; r < rows.length; r++) {
                    const row = rows[r];
                    const idxTP = colIndices['TOTAL PAYMENT'];
                    const rawTP =
                      idxTP !== -1 && row[idxTP] !== undefined
                        ? row[idxTP]
                        : '';
                    const numTP = parseMoneyToNumber(rawTP);

                    const idxAcc = colIndices['Bank Account Number'];
                    let accVal = '';
                    if (idxAcc !== -1) {
                      const rawAcc = row[idxAcc];
                      accVal =
                        rawAcc !== undefined && rawAcc !== null
                          ? String(rawAcc).trim()
                          : '';
                      if (
                        typeof rawAcc === 'number' &&
                        (accVal.includes('E') || accVal.includes('e'))
                      ) {
                        accVal = rawAcc.toLocaleString('fullwide', {
                          useGrouping: false,
                        });
                      }
                    }

                    const idxName = colIndices['Full name'];
                    const nameVal =
                      idxName !== -1 && row[idxName] !== undefined
                        ? String(row[idxName]).trim()
                        : '';

                    if (
                      (accVal !== '' || numTP !== 0) &&
                      (nameVal !== '' || idxName === -1)
                    ) {
                      const obj: any = {};
                      sheet1Headers.forEach((th) => {
                        if (th === 'L07' || th === 'Business') return;
                        const idx = colIndices[th];
                        let val =
                          idx !== -1 && row[idx] !== undefined ? row[idx] : '';

                        const valStr = String(val).toUpperCase().trim();
                        if (
                          valStr === 'NA' ||
                          valStr === 'N/A' ||
                          valStr === '#N/A' ||
                          valStr === 'NAN'
                        ) {
                          val = '';
                        }

                        if (th === 'Bank Account Number') {
                          val = accVal;
                        } else if (isMoneyColumn(th)) {
                          val = parseMoneyToNumber(val);
                        }

                        obj[th] = val;
                      });

                      const rawCenterVal =
                        centerColIndex !== -1
                          ? String(row[centerColIndex] || '').trim()
                          : '';
                      obj['_rawAE'] = rawCenterVal;
                      const rawCenterKey =
                        cleanText(rawCenterVal).toLowerCase();

                      if (aeMap[rawCenterKey]) {
                        obj['L07'] = aeMap[rawCenterKey].name;
                        obj['Business'] = aeMap[rawCenterKey].bus;
                      } else {
                        obj['L07'] = rawCenterVal + ' (Chưa Map)';
                        obj['Business'] = '';
                      }
                      sheet1Data.push(obj);
                    }
                  }
                }
              }

              if (nameUpper.includes('SO SÁNH AE')) {
                foundAnySheet = true;
                sheetProcessed = true;
                for (let r = 1; r < rows.length; r++) {
                  const row = rows[r];
                  soSanhAeData.push({
                    'ID Number': row[0] || '',
                    'Full name': row[1] || '',
                    'Sheet 1 AE': row[2] || 0,
                    'Bank North AE': row[3] || 0,
                    'Chênh Lệch': row[4] || 0,
                  });
                }
              }

              if (sheetProcessed) fileProcessedSuccessfully = true;
            } catch (sheetError: any) {
              console.error(
                `Lỗi xử lý sheet ${sheetName} trong file ${item.name}:`,
                sheetError
              );
            }
          }

          if (fileProcessedSuccessfully) {
            updateAppData(
              (prev) => ({
                ...prev,
                Ae_Global_Inputs: prev.Ae_Global_Inputs.map((row) =>
                  row.id === item.id ? { ...row, status: 'Success' } : row
                ),
              }),
              false
            );
          } else {
            updateAppData(
              (prev) => ({
                ...prev,
                Ae_Global_Inputs: prev.Ae_Global_Inputs.map((row) =>
                  row.id === item.id
                    ? { ...row, status: 'Error: Invalid format' }
                    : row
                ),
              }),
              false
            );
          }
        } catch (e: any) {
          updateAppData(
            (prev) => ({
              ...prev,
              Ae_Global_Inputs: prev.Ae_Global_Inputs.map((row) =>
                row.id === item.id
                  ? { ...row, status: `Error: ${e.message}` }
                  : row
              ),
            }),
            false
          );
        }
      }

      if (!foundAnySheet) {
        toast.error(
          "Không tìm thấy Sheet 'BANK', 'SHEET 1', 'HOLD' hoặc 'SO SÁNH AE' hợp lệ!"
        );
        return;
      }

      setProcessingMessage('Đang tổng hợp và khử trùng dữ liệu...');
      await new Promise((resolve) => setTimeout(resolve, 10));

      const finalSheet1Data: any[] = [];
      const seenSheet1Keys = new Set();
      sheet1Data.forEach((row) => {
        const idNum = String(row['ID Number'] || '').trim();
        const l07 = String(row['L07'] || '').trim();
        const total = parseMoneyToNumber(row['TOTAL PAYMENT']);
        const key = `${idNum}|${l07}|${total}`;
        if (!seenSheet1Keys.has(key)) {
          finalSheet1Data.push(row);
          seenSheet1Keys.add(key);
        }
      });

      const finalBankData: any[] = [];
      const seenBankKeys = new Set();
      bankData.forEach((row) => {
        const idNum = String(row['ID Number'] || '').trim();
        const acc = String(row['Bank Account Number'] || '').trim();
        const total = parseMoneyToNumber(row['TOTAL PAYMENT']);
        const key = `${idNum}|${acc}|${total}`;
        if (!seenBankKeys.has(key)) {
          row['No'] = finalBankData.length + 1;
          finalBankData.push(row);
          seenBankKeys.add(key);
        }
      });

      const finalHoldData: any[] = [];
      const seenHoldKeys = new Set();
      holdData.forEach((row) => {
        const idNum = String(row['ID Number'] || '').trim();
        const acc = String(row['Bank Account Number'] || '').trim();
        const total = parseMoneyToNumber(row['TOTAL PAYMENT']);
        const key = `${idNum}|${acc}|${total}`;
        if (!seenHoldKeys.has(key)) {
          row['No'] = finalHoldData.length + 1;

          let type = 'Liên ngân hàng';
          if (!acc) type = '⚠️ Thiếu STK';
          else if (acc.length < 6 || acc.length > 25) type = '⚠️ Sai độ dài';
          else if (acc.startsWith('0') || acc.startsWith('10'))
            type = 'Nội bộ VCB';
          row['LOẠI CK'] = type;

          const rawCenterVal = String(row['CENTER NOTE'] || '').trim();
          const rawCenterKey = rawCenterVal.toUpperCase();
          const aeMap = appData.AE_Map;

          if (aeMap[rawCenterKey]) {
            row['L07'] = aeMap[rawCenterKey].name;
            row['Business'] = aeMap[rawCenterKey].bus;
          } else if (rawCenterVal) {
            row['L07'] = rawCenterVal;
            row['Business'] = '';
          } else {
            row['L07'] = '';
            row['Business'] = '';
          }

          finalHoldData.push(row);
          seenHoldKeys.add(key);
        }
      });

      const finalSoSanhAeData: any[] = [];
      const seenSoSanhAeKeys = new Set();
      soSanhAeData.forEach((row) => {
        const idNum = String(row['ID Number'] || '').trim();
        if (!seenSoSanhAeKeys.has(idNum)) {
          finalSoSanhAeData.push(row);
          seenSoSanhAeKeys.add(idNum);
        }
      });

      updateAppData((prev) => ({
        ...prev,
        Bank_North_AE: {
          headers: [
            'No',
            'L07',
            'Business',
            'ID Number',
            'Full name',
            'Bank Account Number',
            'Bank',
            'Tháng',
            'TOTAL PAYMENT',
            'LOẠI CK',
            'Payment details',
          ],
          data: finalBankData,
        },
        Sheet1_AE: { headers: sheet1Headers, data: finalSheet1Data },
        SoSanh_AE: {
          headers: [
            'ID Number',
            'Full name',
            'Sheet 1 AE',
            'Bank North AE',
            'Chênh Lệch',
          ],
          data: finalSoSanhAeData,
        },
        Hold_AE: {
          headers: [
            'No',
            'L07',
            'Business',
            'ID Number',
            'Full name',
            'Bank Account Number',
            'Bank',
            'Tháng',
            'LOẠI CK',
            'TAX CODE',
            'Contract No',
            'TOTAL PAYMENT',
            'CENTER NOTE',
            'Sheet Source',
            'Note',
          ],
          data: finalHoldData,
        },
      }));

      toast.success(
        `Xử lý xong: ${finalSheet1Data.length} Sheet1, ${finalBankData.length} Bank, ${finalHoldData.length} Hold.`
      );
    } catch (error: any) {
      console.error('Error processing AE data:', error);
      toast.error('Lỗi xử lý file: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 flex flex-col min-h-0 bg-transparent p-4 md:p-8 gap-8 items-center overflow-auto custom-scrollbar"
    >
      {/* Main Content Card */}
      <div className="bg-white soft-card force-light flex-1 flex flex-col min-h-0 w-full max-w-[1240px] relative overflow-hidden">
        <div className="absolute inset-0 striped-pattern opacity-[0.05] pointer-events-none" />
        
        {/* Integrated Header & Controls */}
        <div
          className="px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-muted/20 shrink-0 border-b border-border relative z-10 overflow-hidden"
        >
          <div className="absolute inset-0 striped-pattern-sage opacity-[0.1] pointer-events-none" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center text-primary shrink-0 border border-primary/30 shadow-inner">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-3xl font-normal font-serif text-foreground tracking-tight flex items-end gap-1">
                Files from <span className="not-italic font-script text-primary text-4xl lowercase inline-block transform -translate-y-0.5">AE</span>
              </h2>
              <p className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                MANAGEMENT • {appData.Sheet1_AE.data.length} RECORDS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  className="relative group"
                >
                  <input
                    id="search-input"
                    name="search-input"
                    type="text"
                    placeholder="TÌM KIẾM..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-primary/5 border border-primary/10 rounded-xl pl-10 pr-4 py-2 text-xs w-64 uppercase font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:w-80"
                    autoFocus
                  />
                  <Search className="w-4 h-4 text-primary/30 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => processAEData()}
                    disabled={isProcessing}
                    className="p-3 rounded-full border border-border bg-white text-muted-foreground hover:text-primary transition-all group shadow-sm"
                    title="Reload Files"
                  >
                    <RefreshCw
                      className={`w-5 h-5 ${isProcessing ? 'animate-spin' : ''}`}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Reload Files</TooltipContent>
              </Tooltip>

              <button
                onClick={processAEData}
                disabled={isProcessing}
                className="soft-button bg-primary text-white shadow-md flex items-center gap-3 px-8"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Layers className="w-4 h-4" />
                )}
                <span className="text-[0.7rem] font-bold tracking-widest uppercase">Xử lý dữ liệu</span>
              </button>

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
                <DropdownMenuContent
                  align="end"
                  className="w-64 border border-primary/10 shadow-xl p-1.5 bg-white"
                >
                  <DropdownMenuLabel className="font-bold uppercase text-[0.625rem] tracking-widest text-primary/60 px-3 py-2">
                    Thao tác dữ liệu
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary/10 mx-1.5" />

                  <DropdownMenuItem
                    onClick={addRow}
                    className="cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 p-3 rounded-xl transition-all hover:bg-primary/5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm dòng mới</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setShowSearch(!showSearch)}
                    className={`cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 p-3 rounded-xl transition-all ${showSearch ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/5'}`}
                  >
                    <Search className="w-4 h-4" />
                    <span>{showSearch ? 'Ẩn tìm kiếm' : 'Hiện tìm kiếm'}</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 hover:bg-primary/5 text-primary p-3 rounded-xl transition-all"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload nhiều File</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-primary/10 mx-1.5" />

                  <DropdownMenuItem
                    onClick={() => setShowClearDialog(true)}
                    className="cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 hover:bg-rose-50 text-rose-500 p-3 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa toàn bộ dữ liệu</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {isProcessing && (
          <div className="mx-6 mt-4 p-4 border border-primary/10 bg-primary/5 flex flex-col gap-3 text-primary rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-bold uppercase text-[0.625rem] tracking-widest">
                  {processingMessage}
                </span>
              </div>
              <span className="text-xs font-bold">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-white/50 rounded-full h-2 overflow-hidden border border-primary/5">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        <div
          className="flex-1 min-h-0 overflow-auto custom-scrollbar flex flex-col p-2 md:p-4 w-full font-[family-name:var(--font-table,var(--font-main))]"
        >
          <div className="bg-white flex-1 min-h-0 w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <table className="w-full border-separate border-spacing-0 table-auto text-left border-l border-t border-[#E2E8F0]">
              <thead>
                <tr className="bg-[#F3EFE0]">
                  <th style={{ padding: 'var(--table-padding, 12px 16px)' }} className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] text-center border-b border-r border-[#E2E8F0] whitespace-nowrap shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                    No
                  </th>
                  <th style={{ padding: 'var(--table-padding, 12px 16px)' }} className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] border-b border-r border-[#E2E8F0] whitespace-nowrap text-center shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                    TÊN FILE
                  </th>
                  <th style={{ padding: 'var(--table-padding, 12px 16px)' }} className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] border-b border-r border-[#E2E8F0] whitespace-nowrap text-center w-32 shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                    BANK
                  </th>
                  <th style={{ padding: 'var(--table-padding, 12px 16px)' }} className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] border-b border-r border-[#E2E8F0] whitespace-nowrap text-center w-32 shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                    THÁNG
                  </th>
                  <th style={{ padding: 'var(--table-padding, 12px 16px)' }} className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] border-b border-r border-[#E2E8F0] whitespace-nowrap text-center shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                    NGUỒN
                  </th>
                  <th style={{ padding: 'var(--table-padding, 12px 16px)' }} className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] border-b border-r border-[#E2E8F0] whitespace-nowrap text-center w-40 shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                    TRẠNG THÁI
                  </th>
                  <th style={{ padding: 'var(--table-padding, 12px 16px)' }} className="sticky top-0 z-20 bg-[#F3EFE0] text-[0.85em] font-bold text-primary uppercase tracking-[0.22em] text-center border-b border-[#E2E8F0] whitespace-nowrap w-20 shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                    XÓA
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-400 border border-slate-200/50 bg-slate-50/30"
                    >
                      <div className="flex flex-col items-center gap-6">
                        <div className="w-24 h-24 bg-primary/5 rounded-3xl flex items-center justify-center border border-primary/10">
                          <FileSpreadsheet className="w-10 h-10 text-primary/20" />
                        </div>
                        <div className="space-y-2">
                          <p className="font-bold uppercase text-lg tracking-tight text-primary/40 font-display">
                            Chưa có file From AE
                          </p>
                          <p className="text-[0.625rem] font-bold uppercase opacity-40 tracking-widest">
                            Thêm dòng hoặc upload file để bắt đầu
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, idx) => (
                    <motion.tr
                      key={row.id}
                      variants={itemVariants}
                      className="group hover:bg-primary/5 transition-colors"
                    >
                      <td style={{ padding: 'var(--table-padding, 12px 16px)', fontFamily: 'var(--font-table, var(--font-main))', fontSize: 'var(--font-size)' }} className="text-center border-b border-r border-[#E2E8F0]">
                        <span className="text-[1em] font-medium text-foreground/30">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--table-padding, 12px 16px)', fontFamily: 'var(--font-table, var(--font-main))', fontSize: 'var(--font-size)' }} className="border-b border-r border-[#E2E8F0]">
                        <input
                          id={`name-${row.id}`}
                          name={`name-${row.id}`}
                          type="text"
                          value={row.name}
                          onChange={(e) =>
                            updateRow(row.id, 'name', e.target.value)
                          }
                          placeholder="Tên file..."
                          className="w-full bg-transparent border-none focus:ring-0 text-[1em] font-medium text-foreground placeholder:text-foreground/20 p-0 uppercase tracking-tight"
                          style={{ fontFamily: 'inherit', fontSize: 'inherit' }}
                        />
                      </td>
                      <td style={{ padding: 'var(--table-padding, 12px 16px)', fontFamily: 'var(--font-table, var(--font-main))', fontSize: 'var(--font-size)' }} className="border-b border-r border-[#E2E8F0]">
                        <select
                          id={`bank-${row.id}`}
                          name={`bank-${row.id}`}
                          value={row.bank || ''}
                          onChange={(e) =>
                            updateRow(row.id, 'bank', e.target.value)
                          }
                          className="w-full bg-transparent border-none focus:ring-0 text-[1em] font-bold text-foreground/60 p-0 uppercase cursor-pointer appearance-none tracking-widest"
                          style={{ fontFamily: 'inherit', fontSize: 'inherit' }}
                        >
                          <option value="" className="text-foreground/40">
                            Chọn Bank...
                          </option>
                          <option value="North">North</option>
                          <option value="Thanh Hoa">Thanh Hoa</option>
                          <option value="Phu Tho">Phu Tho</option>
                          <option value="Thai Nguyen">Thai Nguyen</option>
                        </select>
                      </td>
                      <td style={{ padding: 'var(--table-padding, 12px 16px)', fontFamily: 'var(--font-table, var(--font-main))', fontSize: 'var(--font-size)' }} className="border-b border-r border-[#E2E8F0]">
                        <select
                          id={`month-${row.id}`}
                          name={`month-${row.id}`}
                          value={row.month || ''}
                          onChange={(e) =>
                            updateRow(row.id, 'month', e.target.value)
                          }
                          className="w-full bg-transparent border-none focus:ring-0 text-[1em] font-bold text-foreground/60 p-0 uppercase cursor-pointer appearance-none tracking-widest"
                          style={{ fontFamily: 'inherit', fontSize: 'inherit' }}
                        >
                          <option value="" className="text-foreground/40">
                            Chọn Tháng...
                          </option>
                          {[
                            'JAN',
                            'FEB',
                            'MAR',
                            'APR',
                            'MAY',
                            'JUN',
                            'JUL',
                            'AUG',
                            'SEP',
                            'OCT',
                            'NOV',
                            'DEC',
                          ].map((m) => (
                            <option key={m} value={`${m} 2026`}>
                              {m} 2026
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: 'var(--table-padding, 12px 16px)', fontFamily: 'var(--font-table, var(--font-main))', fontSize: 'var(--font-size)' }} className="border-b border-r border-[#E2E8F0]">
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id={`file-${row.id}`}
                            name={`file-${row.id}`}
                            className="hidden"
                            accept=".xlsx,.xls"
                            onChange={(e) =>
                              e.target.files?.[0] &&
                              handleFileUpload(row.id, e.target.files[0])
                            }
                          />
                          <button
                            onClick={() =>
                              document.getElementById(`file-${row.id}`)?.click()
                            }
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-[0.625rem] tracking-widest uppercase transition-all ${row.fileObj ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-white text-primary border-primary/10 hover:bg-primary/5'}`}
                          >
                            <LinkIcon className="w-3.5 h-3.5" />
                            {row.fileObj ? 'ĐÃ CHỌN' : 'CHỌN FILE'}
                          </button>
                          {row.fileObj && (
                            <button
                              onClick={() =>
                                setMappingDialog({
                                  isOpen: true,
                                  rowId: row.id,
                                })
                              }
                              className="p-2 border border-primary/10 rounded-xl bg-white text-primary hover:bg-primary/5 transition-all shadow-sm"
                              title="Cấu hình Mapping Cột"
                            >
                              <Wrench className="w-4 h-4" />
                            </button>
                          )}
                          {row.fileObj && (
                            <span className="text-[0.625rem] font-bold text-foreground/40 truncate max-w-[100px] uppercase tracking-widest" style={{ fontSize: '0.625rem' }}>
                              {row.fileObj.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: 'var(--table-padding, 12px 16px)', fontFamily: 'var(--font-table, var(--font-main))', fontSize: 'var(--font-size)' }} className="border-b border-r border-[#E2E8F0]">
                        <div className="flex items-center gap-2">
                          {row.status === 'Success' ? (
                            <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-widest">
                              <Check className="w-3 h-3" />
                              <span>Thành công</span>
                            </div>
                          ) : row.status === 'ready' ? (
                            <div className="flex items-center gap-1.5 text-foreground/30 bg-foreground/5 px-3 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-widest">
                              <div className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
                              <span>Sẵn sàng</span>
                            </div>
                          ) : row.status.includes('Error') ? (
                            <div className="flex items-center gap-1.5 text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-widest">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Lỗi</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-widest">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Xử lý...</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center border-b border-slate-200">
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Integrated Pagination */}
        <div className="px-6 py-4 border-t border-primary/5 bg-transparent flex items-center justify-between shrink-0">
          <p className="text-[0.625rem] font-bold uppercase tracking-widest text-foreground/40">
            Hiển thị{' '}
            <span className="text-foreground">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{' '}
            -{' '}
            <span className="text-foreground">
              {Math.min(currentPage * itemsPerPage, filteredData.length)}
            </span>{' '}
            / <span className="text-foreground">{filteredData.length}</span>{' '}
            file
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
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2)
                  pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-[35px] w-[35px] flex items-center justify-center rounded-xl font-bold text-[0.625rem] transition-all border ${currentPage === pageNum ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'text-primary/60 hover:bg-primary/10 border-primary/10'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="h-[35px] w-[35px] flex items-center justify-center text-primary/60 hover:bg-primary/10 rounded-xl disabled:opacity-30 transition-all border border-primary/10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <input
        type="file"
        id="file-upload"
        name="file-upload"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept=".xlsx,.xls"
        onChange={handleMultiUpload}
      />

      {/* Confirmation Dialog for Multi-Upload */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl border border-primary/10 shadow-2xl bg-white rounded-2xl p-6 max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-bold uppercase tracking-widest text-primary text-sm">
              Xác nhận tải lên danh sách file
            </DialogTitle>
            <DialogDescription className="font-bold text-foreground/40 text-[0.625rem] uppercase tracking-widest mt-2">
              Phát hiện {pendingUploads.length} file. Vui lòng chọn hành động
              cho từng file.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto custom-scrollbar my-6 border border-primary/10 rounded-xl bg-primary/5 font-[family-name:var(--font-table,var(--font-main))]">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="bg-primary/10">
                  <th className="px-4 py-3 text-[0.625rem] font-bold uppercase tracking-widest text-primary/60 border-b border-primary/10">
                    Tên File
                  </th>
                  <th className="px-4 py-3 text-[0.625rem] font-bold uppercase tracking-widest text-primary/60 border-b border-primary/10">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {choices.map((choice, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-primary/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-[0.6875rem] font-bold text-foreground truncate max-w-[300px] uppercase tracking-tight">
                      {choice.file.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <select
                          id={`action-${idx}`}
                          name={`action-${idx}`}
                          value={choice.action}
                          onChange={(e) => {
                            const newChoices = [...choices];
                            newChoices[idx].action = e.target.value as any;
                            setChoices(newChoices);
                          }}
                          className="bg-white border border-primary/10 rounded-lg px-3 py-1.5 text-[0.625rem] font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="new">Tạo mới</option>
                          {choice.targetId && (
                            <option value="update">Ghi đè</option>
                          )}
                          <option value="skip">Bỏ qua</option>
                        </select>
                        {choice.action === 'update' && (
                          <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                        )}
                        {choice.action === 'new' && (
                          <Plus className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        {choice.action === 'skip' && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="border-primary/10 bg-white font-bold uppercase text-[0.625rem] tracking-widest px-6 py-2.5 rounded-xl hover:bg-primary/5 transition-all"
            >
              Hủy bỏ
            </Button>
            <Button
              onClick={() => confirmUploads(choices)}
              className="bg-primary text-white font-bold uppercase text-[0.625rem] tracking-widest px-6 py-2.5 rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
            >
              Xác nhận tải lên
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="sm:max-w-md border border-primary/10 shadow-2xl bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-bold uppercase tracking-widest text-primary text-sm">
              Xác nhận xoá file và trạng thái
            </DialogTitle>
            <DialogDescription className="font-bold text-foreground/40 text-[0.625rem] uppercase tracking-widest mt-2">
              Bạn có chắc chắn muốn xóa toàn bộ file đã tải lên và đặt lại trạng
              thái? Các cấu hình Tên File, Bank và Tháng sẽ được giữ nguyên.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowClearDialog(false)}
              className="border-primary/10 bg-white font-bold uppercase text-[0.625rem] tracking-widest px-6 py-2.5 rounded-xl hover:bg-primary/5 transition-all"
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={clearPageData}
              className="bg-rose-500 text-white font-bold uppercase text-[0.625rem] tracking-widest px-6 py-2.5 rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all"
            >
              Xác nhận xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ColumnMappingDialog
        isOpen={mappingDialog.isOpen}
        onClose={() => setMappingDialog({ isOpen: false, rowId: null })}
        file={
          appData.Ae_Global_Inputs.find((r) => r.id === mappingDialog.rowId)
            ?.fileObj || null
        }
        targetFields={masterAeFields}
        initialMapping={
          appData.Ae_Global_Inputs.find((r) => r.id === mappingDialog.rowId)
            ?.columnMapping || {}
        }
        onSave={(mapping) => {
          if (mappingDialog.rowId) {
            updateRow(mappingDialog.rowId, 'columnMapping', mapping);
            toast.success('Đã lưu cấu hình mapping cột');
          }
        }}
      />
    </motion.div>
  );
}
