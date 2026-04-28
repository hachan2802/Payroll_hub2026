/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars */
import React, { useState, useCallback, useMemo } from 'react';
import { useAppData } from '../lib/contexts/AppDataContext';
import {
  ShieldCheck,
  PlayCircle,
  Trash2,
  Settings,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Zap,
  RefreshCw,
  Download,
} from 'lucide-react';
import { parseMoneyToNumber } from '../lib/utils/data-utils';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '../components/ui/tooltip';
import { DataTable } from '../components/DataTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

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

import * as XLSX from 'xlsx';

export function Audit() {
  const { appData, updateAppData } = useAppData();
  const [src1, setSrc1] = useState<string>('Final_Centers');
  const [src2, setSrc2] = useState<string>('Sheet1_AE');
  const [currentSubTab, setCurrentSubTab] = useState<
    'AuditReport' | 'AuditSource1' | 'AuditSource2'
  >('AuditReport');

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const sourceOptions = [
    { value: 'Final_Centers', label: '1. Final Centers (Fr centers)' },
    { value: 'Sheet1_AE', label: '2. Sheet 1 AE (Fr AE)' },
    { value: 'Bank_North_AE', label: '3. Bank North AE (Fr AE)' },
    { value: 'Hold_AE', label: '4. Hold AE (Fr AE)' },
    { value: 'SoSanh_AE', label: '5. So Sánh AE (Fr AE)' },
    { value: 'TA_Employee_Summary', label: '6. TA Timesheet (Theo ID number)' },
    { value: 'TA_Center_Summary', label: '7. TA Timesheet (Theo L07)' },
  ];

  const handleExportExcel = () => {
    const data = getActiveData().data;
    if (data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, currentSubTab);
    XLSX.writeFile(wb, `Audit_${currentSubTab}.xlsx`);
  };

  const handleRunAudit = useCallback(() => {
    const data1 = (appData as any)[src1]?.data || [];
    const data2 = (appData as any)[src2]?.data || [];

    if (!data1.length || !data2.length) {
      toast.error('Thiếu dữ liệu nguồn!');
      return;
    }

    const findCol = (row: any, patterns: string[]) => {
      if (!row) return null;
      const keys = Object.keys(row);
      for (const p of patterns) {
        const found = keys.find(
          (k) => k.toUpperCase().trim() === p.toUpperCase()
        );
        if (found) return found;
      }
      for (const p of patterns) {
        const foundPartial = keys.find((k) =>
          k.toUpperCase().includes(p.toUpperCase())
        );
        if (foundPartial) return foundPartial;
      }
      return null;
    };

    const amtPatterns = [
      'TOTAL PAYMENT',
      'TOTAL',
      'THỰC NHẬN',
      'AMOUNT',
      'SỐ TIỀN',
      'PAYMENT AMOUNT',
      'TIỀN',
    ];
    const amtKey1 = findCol(data1[0], amtPatterns);
    const amtKey2 = findCol(data2[0], amtPatterns);

    if (!amtKey1 || !amtKey2) {
      toast.error(
        "Không tìm thấy cột 'Total Payment' (hoặc tương đương) ở một trong hai bảng!"
      );
      return;
    }

    const keyPatterns = [
      'L07',
      'Mã AE',
      'CENTER',
      'Centers',
      'BUSINESS UNIT',
      'MÃ CENTER',
      'TRUNG TÂM',
    ];
    const key1 = findCol(data1[0], keyPatterns);
    const key2 = findCol(data2[0], keyPatterns);

    const useKey = !!(key1 && key2);

    const aggregate = (data: any[], keyCol: string | null, amtCol: string) => {
      const map = new Map<string, { Key: string; Total: number }>();
      let grandTotal = 0;
      data.forEach((row) => {
        const val = parseMoneyToNumber(row[amtCol]);
        grandTotal += val;

        const k = keyCol
          ? String(row[keyCol] || 'Unknown')
              .trim()
              .toUpperCase()
          : 'GRAND_TOTAL';

        if (!map.has(k)) map.set(k, { Key: k, Total: 0 });
        map.get(k)!.Total += val;
      });
      return { map, grandTotal };
    };

    const res1 = aggregate(data1, useKey ? key1 : null, amtKey1);
    const res2 = aggregate(data2, useKey ? key2 : null, amtKey2);

    const auditResults: any[] = [];
    const src1Label =
      sourceOptions.find((o) => o.value === src1)?.label || src1;
    const src2Label =
      sourceOptions.find((o) => o.value === src2)?.label || src2;

    if (useKey) {
      const allKeys = new Set([...res1.map.keys(), ...res2.map.keys()]);
      allKeys.forEach((k) => {
        const v1 = res1.map.get(k)?.Total || 0;
        const v2 = res2.map.get(k)?.Total || 0;
        const diff = v2 - v1;

        if (Math.abs(diff) > 5) {
          const rowObj: any = {
            'Khóa Cột So Sánh': k,
            'Mã AE': k,
            'Chênh Lệch': diff,
          };
          rowObj[`Total (${src1Label})`] = v1;
          rowObj[`Total (${src2Label})`] = v2;
          auditResults.push(rowObj);
        }
      });
    } else {
      const diff = res2.grandTotal - res1.grandTotal;
      if (Math.abs(diff) > 5) {
        const rowObj: any = {
          'Khóa Cột So Sánh': 'TỔNG TOÀN BẢNG',
          'Mã AE': '-',
          'Chênh Lệch': diff,
        };
        rowObj[`Total (${src1Label})`] = res1.grandTotal;
        rowObj[`Total (${src2Label})`] = res2.grandTotal;
        auditResults.push(rowObj);
      }
    }

    updateAppData((prev) => ({
      ...prev,
      AuditReport: {
        headers: [
          'Khóa Cột So Sánh',
          'Mã AE',
          `Total (${src1Label})`,
          `Total (${src2Label})`,
          'Chênh Lệch',
        ],
        data: auditResults,
      },
    }));
    setCurrentSubTab('AuditReport');
  }, [appData, src1, src2, updateAppData]);

  const handleClearAudit = () => {
    updateAppData((prev) => ({
      ...prev,
      AuditReport: { ...prev.AuditReport, data: [] },
    }));
    setShowClearDialog(false);
  };

  const getActiveData = () => {
    if (currentSubTab === 'AuditReport') return appData.AuditReport;
    if (currentSubTab === 'AuditSource1')
      return (appData as any)[src1] || { headers: [], data: [] };
    if (currentSubTab === 'AuditSource2')
      return (appData as any)[src2] || { headers: [], data: [] };
    return { headers: [], data: [] };
  };

  const activeData = getActiveData();

  const columns = useMemo(() => {
    return activeData.headers.map((header: string) => {
      let type: 'text' | 'number' | 'currency' = 'text';
      if (header.includes('Total') || header === 'Chênh Lệch') {
        type = 'currency';
      }
      return {
        key: header,
        label: header,
        type,
        sortable: true,
        filterable: true,
      };
    });
  }, [activeData.headers]);

  const handleCellChange = (row: any, colKey: string, value: any) => {
    updateAppData((prev) => {
      const targetTab =
        currentSubTab === 'AuditReport'
          ? 'AuditReport'
          : currentSubTab === 'AuditSource1'
            ? src1
            : src2;
      const newData = [...(prev as any)[targetTab].data];
      const rowIndex = newData.indexOf(row);
      if (rowIndex === -1) return prev;
      newData[rowIndex] = { ...newData[rowIndex], [colKey]: value };
      return {
        ...prev,
        [targetTab]: { ...(prev as any)[targetTab], data: newData },
      };
    });
  };

  const handleDeleteRow = (rowIndex: number) => {
    updateAppData((prev) => {
      const targetTab =
        currentSubTab === 'AuditReport'
          ? 'AuditReport'
          : currentSubTab === 'AuditSource1'
            ? src1
            : src2;
      const newData = [...(prev as any)[targetTab].data];
      newData.splice(rowIndex, 1);
      return {
        ...prev,
        [targetTab]: { ...(prev as any)[targetTab], data: newData },
      };
    });
    toast.success('Đã xóa dòng dữ liệu');
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 flex flex-col min-h-0 bg-transparent p-4 md:p-8 gap-8 items-center overflow-auto custom-scrollbar"
    >
      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-[1360px] flex-1 min-h-0">
        {/* Left Panel - Source Selection */}
        <div className="w-full lg:w-80 bg-white soft-card force-light p-6 flex flex-col gap-6 flex-1 lg:flex-none shrink-0 relative">
          <div className="absolute inset-0 pattern-dots opacity-[0.05] pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10 shrink-0">
            <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center text-primary border border-primary/30 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-normal font-serif text-foreground tracking-tight leading-tight">
                  Config <span className="not-italic font-script text-primary text-2xl lowercase">audit</span>
                </h3>
              <p className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">
                AUDIT & RECONCILIATION
              </p>
            </div>
          </div>

          <div className="space-y-6 relative z-10 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
            <div className="space-y-3">
              <label className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                Nguồn 1 (Gốc)
              </label>
              <div className="relative">
                <select
                  value={src1}
                  onChange={(e) => setSrc1(e.target.value)}
                  className="w-full p-3 bg-muted/20 border border-border rounded-xl text-[0.65rem] font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer pr-10 shadow-inner"
                >
                  {sourceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                Nguồn 2 (So sánh)
              </label>
              <div className="relative">
                <select
                  value={src2}
                  onChange={(e) => setSrc2(e.target.value)}
                  className="w-full p-3 bg-muted/20 border border-border rounded-xl text-[0.65rem] font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer pr-10 shadow-inner"
                >
                  {sourceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="mt-auto px-4 py-2 bg-rose-50/50 rounded-2xl border border-rose-100/50 shrink-0">
            <button
              onClick={handleRunAudit}
              className="h-12 w-full rounded-xl bg-[#F08FA8] hover:bg-[#E07D96] text-white shadow-lg shadow-rose-200 flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <PlayCircle className="w-4 h-4 fill-current" />
              </div>
              <span className="text-[0.65rem] font-black tracking-widest uppercase">Thực hiện đối soát</span>
            </button>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="flex-1 bg-white soft-card force-light flex flex-col min-h-0 relative">
          <div className="absolute inset-0 striped-pattern opacity-[0.05] pointer-events-none rounded-[2.5rem] overflow-hidden" />
          {/* Tabs & Actions */}
          <div
            className="px-8 py-6 flex items-center justify-between border-b border-border bg-muted/10 shrink-0"
          >
            <div className="flex gap-4">
              {[
                { id: 'AuditReport', label: 'Báo Cáo Đối Soát' },
                { id: 'AuditSource1', label: 'Xem Nguồn 1' },
                { id: 'AuditSource2', label: 'Xem Nguồn 2' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setCurrentSubTab(tab.id as any);
                  }}
                  className={`px-8 py-3 text-[0.7rem] font-bold uppercase tracking-widest rounded-full transition-all relative overflow-hidden
                    ${
                      currentSubTab === tab.id
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-primary/5 text-primary/40 hover:bg-primary/10 hover:text-primary border border-primary/10'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button className="p-3 rounded-full border border-border bg-white text-muted-foreground hover:text-primary transition-all group shadow-sm">
                        <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Cài đặt</TooltipContent>
                </Tooltip>
                <DropdownMenuContent
                  align="end"
                  className="w-64 border border-primary/10 shadow-2xl p-2 bg-white rounded-2xl"
                >
                  <DropdownMenuLabel className="font-bold uppercase text-[0.625rem] tracking-widest text-primary/60 px-3 py-2">
                    Thao tác
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary/5 mx-1" />
                  <div className="p-1">
                    <DropdownMenuItem
                      onClick={() => setShowClearDialog(true)}
                      className="cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 hover:bg-rose-50 text-rose-500 p-3 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Xoá báo cáo</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleExportExcel}
                      className="cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 hover:bg-primary/5 p-3 rounded-xl transition-all"
                    >
                      <Download className="w-4 h-4 text-primary" />
                      <span>Tải file Excel (.xlsx)</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {activeData.data.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-primary/10 bg-white">
              <div className="w-32 h-32 bg-primary/5 rounded-full flex items-center justify-center mb-8 border border-primary/10 shadow-inner">
                <Search className="w-12 h-12 text-primary/20" />
              </div>
              <p className="font-serif text-2xl text-muted-foreground/60 italic">
                Chưa có kết quả đối soát
              </p>
              <p className="text-[0.625rem] font-bold uppercase opacity-40 tracking-[0.2em] mt-3">
                Vui lòng nhấn nút thực hiện để xem kết quả
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 bg-white relative z-10 flex flex-col">
              <DataTable
                columns={columns}
                data={activeData.data}
                onCellChange={handleCellChange}
                onDeleteRow={handleDeleteRow}
                isEditable={true}
                selectable={true}
                externalSearchTerm={searchTerm}
                onExternalSearchChange={setSearchTerm}
                storageKey={`audit_${currentSubTab}`}
                hideSearch={true}
                headerClassName="bg-slate-200 text-[1em] font-bold uppercase tracking-wider text-slate-800"
              />
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onConfirm={handleClearAudit}
        title="Xác nhận xoá báo cáo"
        description="Bạn có chắc chắn muốn xóa toàn bộ dữ liệu trong báo cáo đối soát hiện tại? Hành động này không thể hoàn tác."
        confirmText="Xác nhận xoá"
        variant="destructive"
      />
    </motion.div>
  );
}
