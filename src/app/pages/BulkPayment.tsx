/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useCallback, useMemo } from 'react';
import { useAppData } from '../lib/contexts/AppDataContext';
import {
  CreditCard,
  PlayCircle,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Settings,
  Search,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import {
  parseMoneyToNumber,
  formatMoneyVND,
  removeVietnameseTones,
} from '../lib/utils/data-utils';
import * as XLSX from 'xlsx';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '../components/ui/tooltip';
import { DataTable } from '../components/DataTable';
import { motion, AnimatePresence } from 'motion/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

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

export function BulkPayment() {
  const { appData, updateAppData } = useAppData();
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const bulkActions = useMemo(
    () => [
      {
        label: 'Xóa đã chọn',
        icon: <Trash2 className="w-4 h-4" />,
        variant: 'destructive' as const,
        onClick: (selectedRows: any[]) => {
          updateAppData((prev) => {
            const newData = prev.BankExport.data.filter(
              (row) => !selectedRows.includes(row)
            );
            return {
              ...prev,
              BankExport: { ...prev.BankExport, data: newData },
            };
          });
          toast.success(`Đã xóa ${selectedRows.length} dòng dữ liệu`);
        },
      },
    ],
    [updateAppData]
  );

  const handleGenerateReport = useCallback(async () => {
    const src = appData.Bank_North_AE.data;
    if (src.length === 0) {
      toast.error(
        'KHÔNG CÓ DỮ LIỆU: Vui lòng kiểm tra bảng Bank North AE trước khi tạo bảng kê.'
      );
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setValidationMsg(null);

    // Artificial delay for better UX feedback
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      setProgress((i / steps) * 100);
    }

    try {
      const bankNorthTotal = src.reduce(
        (sum, r) => sum + parseMoneyToNumber(r['TOTAL PAYMENT'] || 0),
        0
      );

      const bizMap: Record<string, string> = {
        NORTH: 'AHN',
        'PHU THO': 'APT',
        'THANH HOA': 'ATH',
        'THAI NGUYEN': 'ATN',
      };

      const bankNorthBizTotals: Record<string, number> = {};
      const idToSheet1: Record<string, any> = {};
      const nameToSheet1: Record<string, any> = {};
      const accToSheet1: Record<string, any> = {};

      appData.Sheet1_AE.data.forEach((row) => {
        const id = String(row['ID Number'] || '').trim();
        const name = removeVietnameseTones(
          row['Full name'] || ''
        ).toUpperCase();
        const acc = String(row['Bank Account Number'] || '').trim();

        const info = {
          biz: row['Business'] || 'Unknown',
          bank: String(row['Bank Name'] || '').trim(),
          month: String(row['Tháng'] || '').trim(),
          taxCode: row['TAX CODE'] || '',
          contractNo: row['Contract No'] || '',
        };

        if (id) idToSheet1[id] = info;
        if (name) nameToSheet1[name] = info;
        if (acc) accToSheet1[acc] = info;
      });

      src.forEach((row) => {
        const id = String(row['ID Number'] || '').trim();
        const name = removeVietnameseTones(
          row['Full name'] || ''
        ).toUpperCase();
        const acc = String(row['Bank Account Number'] || '').trim();

        let info = idToSheet1[id];
        if (!info && acc) info = accToSheet1[acc];
        if (!info && name) info = nameToSheet1[name];

        const biz = info ? info.biz : 'Unknown';
        const amount = parseMoneyToNumber(row['TOTAL PAYMENT'] || 0);
        bankNorthBizTotals[biz] = (bankNorthBizTotals[biz] || 0) + amount;
      });

      const reportBizTotals: Record<string, number> = {};
      let matchedCount = 0;
      let unknownBizCount = 0;

      const data = src.map((row, idx) => {
        const id = String(row['ID Number'] || '').trim();
        const name = removeVietnameseTones(
          row['Full name'] || ''
        ).toUpperCase();
        const acc = String(row['Bank Account Number'] || '').trim();

        let sheet1Info = idToSheet1[id];
        if (!sheet1Info && acc) sheet1Info = accToSheet1[acc];
        if (!sheet1Info && name) sheet1Info = nameToSheet1[name];

        if (sheet1Info) matchedCount++;

        sheet1Info = sheet1Info || {
          bank: '',
          month: '',
          taxCode: '',
          contractNo: '',
          biz: 'Unknown',
        };

        const bizVal = String(sheet1Info.biz).toUpperCase().trim();
        const monthVal = String(
          row['_fileMonth'] || sheet1Info.month || ''
        ).trim();

        let paymentDetails = String(row['Payment details'] || '').trim();

        if (!paymentDetails) {
          if (bizVal === 'AHN' || bizVal.includes('NORTH')) {
            paymentDetails = 'Intern North salary ' + monthVal;
          } else if (
            bizVal === 'ATN' ||
            bizVal.includes('THAI NGUYEN') ||
            bizVal.includes('THAINGUYEN')
          ) {
            paymentDetails = 'Intern Thai Nguyen salary ' + monthVal;
          } else if (
            bizVal === 'ATH' ||
            bizVal.includes('THANH HOA') ||
            bizVal.includes('THANHHOA')
          ) {
            paymentDetails = 'Intern Thanh Hoa salary ' + monthVal;
          } else if (
            bizVal === 'APT' ||
            bizVal.includes('PHU THO') ||
            bizVal.includes('PHUTHO')
          ) {
            paymentDetails = 'Intern Phu Tho salary ' + monthVal;
          } else {
            paymentDetails = 'Intern salary ' + monthVal;
          }
        }

        paymentDetails = paymentDetails.trim();

        let identifiedBiz = 'Unknown';
        for (const [key, code] of Object.entries(bizMap)) {
          if (paymentDetails.toUpperCase().includes(key)) {
            identifiedBiz = code;
            break;
          }
        }

        if (identifiedBiz === 'Unknown') unknownBizCount++;

        const amount = parseMoneyToNumber(row['TOTAL PAYMENT'] || 0);
        reportBizTotals[identifiedBiz] =
          (reportBizTotals[identifiedBiz] || 0) + amount;

        return {
          'Payment Serial Number': idx + 1,
          'Transaction Type Code': 'BT',
          'Payment Type': '',
          'Customer Reference No': '',
          'Beneficiary Account No.': String(row['Bank Account Number'] || ''),
          'Beneficiary Name': removeVietnameseTones(row['Full name'] || ''),
          'Document ID': '',
          'Place of Issue': '',
          'ID Issuance Date': '',
          'Beneficiary Bank Swift Code / IFSC Code': '',
          'Transaction Currency': 'VND',
          'Payment Amount': amount,
          'Charge Type': 'OUR',
          'Payment details': paymentDetails,
          'Beneficiary - Nick Name': '',
          'Beneficiary Addr. Line 1': '',
          'Beneficiary Addr. Line 2': '',
        };
      });

      updateAppData((prev) => ({
        ...prev,
        BankExport: {
          ...prev.BankExport,
          data: data,
        },
      }));

      const reportTotal = data.reduce((sum, r) => sum + r['Payment Amount'], 0);
      const isTotalMatch = Math.abs(reportTotal - bankNorthTotal) < 1;

      let msg = `TỔNG CỘNG: ${formatMoneyVND(reportTotal)} `;
      msg += isTotalMatch
        ? '✅ KHỚP VỚI NGUỒN'
        : `❌ LỆCH ${formatMoneyVND(reportTotal - bankNorthTotal)}`;

      const bizDiffs: string[] = [];
      const allBiz = new Set([
        ...Object.keys(bankNorthBizTotals),
        ...Object.keys(reportBizTotals),
      ]);
      allBiz.forEach((biz) => {
        const north = bankNorthBizTotals[biz] || 0;
        const report = reportBizTotals[biz] || 0;
        if (Math.abs(north - report) > 1) {
          bizDiffs.push(`${biz}: Lệch ${formatMoneyVND(report - north)}`);
        }
      });

      if (bizDiffs.length > 0) {
        msg += ` | LỖI BUSINESS: ${bizDiffs.join(', ')}`;
      } else {
        msg += ' | BUSINESS: ✅ KHỚP';
      }

      if (unknownBizCount > 0) {
        msg += ` | CẢNH BÁO: ${unknownBizCount} dòng không xác định được Business Code.`;
      }

      setValidationMsg(msg);
      const success = isTotalMatch && bizDiffs.length === 0;
      setIsSuccess(success);

      if (success) {
        toast.success(
          `Tạo bảng kê thành công! Đã khớp ${matchedCount}/${src.length} nhân sự.`
        );
      } else {
        toast.warning(
          'Bảng kê đã được tạo nhưng phát hiện sai lệch dữ liệu. Vui lòng kiểm tra chi tiết.'
        );
      }
    } catch (err) {
      console.error(err);
      toast.error('Đã xảy ra lỗi trong quá trình xử lý dữ liệu.');
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  }, [appData, updateAppData]);

  const handleClearReport = () => {
    updateAppData((prev) => ({
      ...prev,
      BankExport: { ...prev.BankExport, data: [] },
    }));
    setValidationMsg(null);
    setShowClearDialog(false);
    toast.success('Đã xóa dữ liệu bảng kê');
  };

  const handleExportExcel = () => {
    if (appData.BankExport.data.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(appData.BankExport.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Export');
    XLSX.writeFile(
      wb,
      `Bank_Export_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const columns = useMemo(() => {
    return appData.BankExport.headers
      .filter((h) => h !== 'Payment Serial Number')
      .map((header) => ({
        key: header,
        label: header,
        type: (header === 'Payment Amount' ? 'currency' : 'text') as
          | 'currency'
          | 'text',
        sortable: true,
        filterable: true,
      }));
  }, [appData.BankExport.headers]);

  const handleCellChange = (row: any, colKey: string, value: any) => {
    updateAppData((prev) => {
      const newData = [...prev.BankExport.data];
      const rowIndex = newData.findIndex(
        (r) =>
          r === row ||
          (r['Payment Serial Number'] &&
            r['Payment Serial Number'] === row['Payment Serial Number'])
      );
      if (rowIndex === -1) return prev;
      newData[rowIndex] = { ...newData[rowIndex], [colKey]: value };
      return { ...prev, BankExport: { ...prev.BankExport, data: newData } };
    });
  };

  const handleDeleteRow = (rowIndex: number) => {
    updateAppData((prev) => {
      const newData = [...prev.BankExport.data];
      newData.splice(rowIndex, 1);
      // Re-index Payment Serial Number if it exists
      const updatedData = newData.map((row, idx) => ({
        ...row,
        'Payment Serial Number': idx + 1,
      }));
      return { ...prev, BankExport: { ...prev.BankExport, data: updatedData } };
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
      <div className="flex flex-col xl:flex-row gap-8 w-full max-w-[1360px] flex-1 min-h-0">
        {/* Left Panel - Actions & Info */}
        <div className="w-full xl:w-80 flex flex-col gap-8 shrink-0">
          {/* Main Controls Card */}
          <div className="bg-white soft-card p-6 flex flex-col gap-8 flex-1 relative overflow-hidden">
            <div className="absolute inset-0 pattern-dots opacity-[0.05] pointer-events-none" />
            
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center text-primary border border-primary/30 shadow-inner">
                <CreditCard className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-normal font-serif text-foreground tracking-tight leading-tight">
                  Bulk <span className="not-italic font-script text-primary text-2xl lowercase">payment</span>
                </h3>
                <p className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">
                  PAYMENT RECONCILIATION
                </p>
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="p-6 bg-muted/20 rounded-[2rem] border border-border">
                <h4 className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-primary/60 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> THÔNG TIN
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[0.625rem] font-bold uppercase tracking-widest text-muted-foreground">Số dòng</span>
                    <span className="text-sm font-bold text-foreground">{appData.BankExport.data.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[0.625rem] font-bold uppercase tracking-widest text-muted-foreground">Tổng tiền</span>
                    <span className="text-sm font-bold text-primary">
                      {formatMoneyVND(appData.BankExport.data.reduce((sum, r) => sum + r['Payment Amount'], 0))}
                    </span>
                  </div>
                </div>
              </div>

              {isGenerating && (
                <div className="space-y-3">
                   <div className="flex justify-between items-center px-1">
                    <span className="text-[0.625rem] font-bold uppercase tracking-widest text-primary animate-pulse">Processing...</span>
                    <span className="text-xs font-bold text-primary">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden border border-primary/10">
                    <motion.div 
                      className="h-full bg-primary" 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="soft-button bg-primary text-white shadow-md flex items-center justify-center gap-4 px-8 py-5 w-full transition-all group"
              >
                {isGenerating ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-5 h-5 group-hover:rotate-6 transition-transform" />
                )}
                <span className="text-[0.7rem] font-bold tracking-[0.2em] uppercase">TẠO BẢNG KÊ</span>
              </button>
            </div>
          </div>

          {/* Validation Results Card */}
          <AnimatePresence>
            {validationMsg && !isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`soft-card p-8 border-l-8 ${isSuccess ? 'border-emerald-400 bg-emerald-50/30' : 'border-amber-400 bg-amber-50/30'}`}
              >
                <h4 className={`text-[0.625rem] font-bold mb-6 uppercase flex items-center gap-3 tracking-[0.2em] ${isSuccess ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  Kết quả kiểm tra
                </h4>
                <div className="space-y-4 text-[0.7rem] font-medium leading-relaxed italic font-serif text-foreground/80">
                  {validationMsg.split('|').map((part, i) => (
                    <div key={i} className="flex items-start gap-4">
                       <span className="text-primary mt-1">✦</span>
                       <span>{part.trim()}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel - Data View */}
        <div className="flex-1 bg-white soft-card force-light flex flex-col overflow-hidden">
          {/* Internal Header */}
          <div className="px-8 py-6 flex items-center justify-between border-b border-border bg-muted/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(165,179,150,0.5)]" />
              <span className="text-[0.8rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                PREVIEW & FINALIZE
              </span>
            </div>

            <div className="flex items-center gap-4">
              <AnimatePresence>
                {showSearch && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="relative"
                  >
                    <input
                      type="text"
                      placeholder="TÌM KIẾM..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-primary/5 border border-primary/10 rounded-full pl-10 pr-4 py-2.5 text-[0.65rem] w-64 uppercase font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans"
                    />
                    <Search className="w-4 h-4 text-primary/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </motion.div>
                )}
              </AnimatePresence>

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
                  <DropdownMenuSeparator className="bg-primary/10 mx-1" />
                  <div className="p-1">
                    <DropdownMenuItem
                      onClick={() => setShowSearch(!showSearch)}
                      className="cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 hover:bg-primary/5 p-3 rounded-xl transition-all"
                    >
                      <Search className="w-4 h-4" />
                      <span>{showSearch ? 'Ẩn tìm kiếm' : 'Hiện tìm kiếm'}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-primary/5 mx-1" />
                    <DropdownMenuItem
                      onClick={() => setShowClearDialog(true)}
                      className="cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 hover:bg-rose-50 text-rose-500 p-3 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Xoá bảng kê</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

                {/* Removed Export Button */}
            </div>
          </div>

          {appData.BankExport.data.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center text-primary/10 bg-white">
               <div className="w-32 h-32 bg-primary/5 rounded-full flex items-center justify-center mb-8 border border-primary/10 shadow-inner">
                 <CreditCard className="w-12 h-12 text-primary/20" />
               </div>
               <p className="font-serif text-2xl text-muted-foreground/60 italic">
                 Chưa có dữ liệu bảng kê
               </p>
               <p className="text-[0.625rem] font-bold uppercase opacity-40 tracking-[0.2em] mt-3">
                 Vui lòng nhấn nút "TẠO BẢNG KÊ" để bắt đầu
               </p>
             </div>
           ) : (
             <div className="flex-1 min-h-0 bg-white relative z-10 flex flex-col">
               <DataTable
                 columns={columns}
                 data={appData.BankExport.data}
                 onCellChange={handleCellChange}
                 onDeleteRow={handleDeleteRow}
                 isEditable={true}
                 selectable={true}
                 bulkActions={bulkActions}
                 externalSearchTerm={searchTerm}
                 onExternalSearchChange={setSearchTerm}
                 storageKey="bulk_payment"
                 showFooter={true}
                 hideSearch={true}
                 headerClassName="bg-slate-200 text-[1em] font-bold uppercase tracking-wider text-slate-800"
               />
             </div>
           )}
        </div>
      </div>

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="sm:max-w-md border border-primary/10 shadow-2xl bg-white rounded-[2.5rem] p-10">
          <DialogHeader>
            <DialogTitle className="font-bold uppercase tracking-[0.2em] text-primary text-sm">
              Xác nhận xoá dữ liệu
            </DialogTitle>
            <DialogDescription className="font-bold text-foreground/40 text-[0.6875rem] uppercase tracking-widest mt-4 leading-relaxed">
              Bạn có chắc chắn muốn xóa toàn bộ dữ liệu bảng kê? Hành động này
              không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-4 mt-10">
            <Button
              variant="outline"
              onClick={() => setShowClearDialog(false)}
              className="border-primary/10 bg-white font-bold uppercase text-[0.625rem] tracking-[0.2em] px-8 py-3 h-12 rounded-2xl hover:bg-primary/5 transition-all"
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearReport}
              className="bg-rose-500 text-white font-bold uppercase text-[0.625rem] tracking-[0.2em] px-8 py-3 h-12 rounded-2xl hover:bg-rose-600 shadow-hard shadow-rose-500/20 transition-all"
            >
              Xác nhận xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
