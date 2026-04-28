/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, @typescript-eslint/no-unused-vars */
import React, { useState, useMemo, useCallback } from 'react';
import { Link as RouterLink } from 'react-router';
import { useAppData } from '../lib/contexts/AppDataContext';
import { DEFAULT_CENTERS } from '../constants';
import { getCenterInfoByL07 } from '../lib/utils/center-utils';
import { isDateColumn, parseAnyDate } from '../lib/utils/data-utils';
import {
  Building2,
  Database,
  Trash2,
  Download,
  Wrench,
  Search,
  Play,
  RefreshCw,
  CheckSquare,
  Loader2,
  Landmark,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { DataTable, DataTableRef } from '../components/DataTable';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '../components/ui/tooltip';
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

export function DataCenters() {
  const { appData, updateAppData } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const tableRef = React.useRef<DataTableRef>(null);

  // Thêm state cho ngày tháng (Dùng đối tượng Date để dùng với Calendar)
  const [fromDate, setFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [toDate, setToDate] = useState<Date>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    d.setHours(23, 59, 59, 999);
    return d;
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    count: number;
    type: 'selection' | 'all' | 'page';
  }>({ isOpen: false, count: 0, type: 'selection' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [, setUpdateTrigger] = useState(0);

  const parseMoneyToNumber = (val: any) => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;

    let str = String(val).trim();

    // Handle comma as decimal separator
    // If comma is the last separator, treat it as decimal
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');

    if (lastComma > lastDot) {
      // Comma is likely the decimal separator
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Dot is likely the decimal separator
      str = str.replace(/,/g, '');
    }

    const cleanStr = str.replace(/[^0-9.-]+/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  };

  const handleProcessFiles = async () => {
    setIsProcessing(true);
    setProgress(0);
    try {
      if (!appData.Q_Roster || appData.Q_Roster.length === 0) {
        toast.warning(
          'Không có dữ liệu Q_Roster để xử lý. Vui lòng upload file.'
        );
        return;
      }

      // 1. Hàm tạo bảng tra cứu mức lương (Salary Map)
      const salaryMap: Record<string, any> = {};
      if (appData.Q_Salary_Scale) {
        appData.Q_Salary_Scale.forEach((row: any) => {
          const id = String(row['ID'] || row['ID Number'] || '').trim();
          if (id && id !== '#N/A') {
            salaryMap[id] = {
              scale: row['S Code'],
              academicPrice: parseMoneyToNumber(row['Academic Price']) || 33000,
              adminPrice:
                parseMoneyToNumber(row['Administrative Price']) || 20000,
            };
          }
        });
      }

      // 1.5. Hàm tạo bảng tra cứu nhân viên (Staff Map)
      const staffMap: Record<string, any> = {};
      if (appData.Q_Staff) {
        appData.Q_Staff.forEach((row: any) => {
          const id = String(row['ID'] || row['ID Number'] || '').trim();
          if (id) {
            staffMap[id] = row;
          }
        });
      }

      // 2. Lấy toàn bộ dữ liệu Q_Roster, không lọc theo ngày nữa
      const filteredRoster = appData.Q_Roster || [];

      // 3. Gom nhóm theo TA và tính toán
      const aggregatedData: Record<string, any> = {};

      filteredRoster.forEach((row: any) => {
        const id = String(row['ID'] || row['ID Number'] || '').trim();
        if (!id) return;

        // Lấy thông tin từ Q_Staff qua staffMap
        const staffInfo = staffMap[id] || {};

        // Kiểm tra Full name - Loại bỏ các dòng đặc biệt
        const fullName = String(
          staffInfo['Full name'] ||
            staffInfo['Name'] ||
            staffInfo['Họ và tên'] ||
            ''
        ).trim();
        const upperFullName = fullName.toUpperCase();
        if (
          upperFullName.includes('TOTAL COST') ||
          upperFullName.includes('PREPARED BY') ||
          upperFullName.includes('TA SUPERVISOR')
        )
          return;

        // Kiểm tra Bank Account Number - Chỉ lấy dữ liệu khi có số tài khoản
        const bankAccount = String(
          staffInfo['Bank Account Number'] || staffInfo['STK'] || ''
        ).trim();
        if (!bankAccount) return;

        const type = row['Type'] || row['Task Type'] || '';
        const duration =
          parseMoneyToNumber(row['Duration'] || row['Hours']) || 0;

        const rates = salaryMap[id] || {
          academicPrice: 33000,
          adminPrice: 20000,
        };

        const academicTasks = [
          'In-class',
          'In-class ATLS',
          'Tutoring',
          'Waiting class',
          'Club activity',
          'Demo',
          'Parent meeting',
          'PT',
        ];

        let finalPrice = rates.adminPrice;

        if (academicTasks.includes(type)) {
          finalPrice = rates.academicPrice;
        } else if (type === 'Discovery Camp' || type === 'Summer') {
          finalPrice = 29474;
        } else if (type === 'Outing') {
          finalPrice = 26316;
        }

        let total = duration * finalPrice;

        if (type === 'Tutoring') {
          total += 1 * rates.adminPrice;
        } else if (type === 'Club activity') {
          total += 1 * rates.adminPrice;
        }

        if (!aggregatedData[id]) {
          const l07 = staffInfo['L07'] || '';
          let business = staffInfo['Business'] || '';

          // Logic nhận biết L07 và Business giống CenterDataConfig
          if (l07) {
            const centerInfo = getCenterInfoByL07(l07);
            if (centerInfo) {
              business = centerInfo.bus;
            }
          }

          aggregatedData[id] = {
            L07: l07,
            Business: business,
            'ID Number': id,
            'Full name': fullName,
            'Salary Scale': rates.scale || 'S1',
            From: appData.Timesheet_Dates?.from || '',
            To: appData.Timesheet_Dates?.to || '',
            'Bank Account Number': bankAccount,
            'Bank Name': staffInfo['Bank Name'] || staffInfo['Ngân hàng'] || '',
            'CITAD code': staffInfo['CITAD code'] || '',
            'TAX CODE': staffInfo['TAX CODE'] || staffInfo['MST'] || '',
            'Contract No': staffInfo['Contract No'] || '',
            'CHARGE TO LXO': 0,
            'CHARGE TO EC': 0,
            'CHARGE TO PT-DEMO': 0,
            'Charge MKT Local': 0,
            'Charge Renewal Projects': 0,
            'Charge Discovery Camp': 0,
            'Charge Summer Outing': 0,
            'TOTAL PAYMENT': 0,
          };
        }

        const aggRow = aggregatedData[id];
        aggRow['TOTAL PAYMENT'] += total;

        // Tính các cột Charge
        if (type === 'Support LXO')
          aggRow['CHARGE TO LXO'] += duration * rates.adminPrice;
        if (type === 'Support EC')
          aggRow['CHARGE TO EC'] += duration * rates.adminPrice;
        if (type === 'PT' || type === 'Demo')
          aggRow['CHARGE TO PT-DEMO'] += total;
        if (type === 'Support MKT')
          aggRow['Charge MKT Local'] += duration * rates.adminPrice;
        if (type === 'Renewal Projects')
          aggRow['Charge Renewal Projects'] += duration * rates.adminPrice;
        if (type === 'Discovery Camp') aggRow['Charge Discovery Camp'] += total;
        if (type === 'Outing' || type === 'Summer')
          aggRow['Charge Summer Outing'] += total;
      });

      // Chuyển object thành array và thêm số thứ tự
      const finalData = Object.values(aggregatedData).map((row, index) => {
        const roundedRow = { ...row };
        const chargeCols = [
          'CHARGE TO LXO',
          'CHARGE TO EC',
          'CHARGE TO PT-DEMO',
          'Charge MKT Local',
          'Charge Renewal Projects',
          'Charge Discovery Camp',
          'Charge Summer Outing',
        ];

        let calculatedTotal = 0;
        chargeCols.forEach((col) => {
          const val = Math.round(Number(row[col]) || 0);
          roundedRow[col] = val;
          calculatedTotal += val;
        });

        roundedRow['TOTAL PAYMENT'] =
          calculatedTotal > 0
            ? calculatedTotal
            : Math.round(Number(row['TOTAL PAYMENT']) || 0);

        return {
          No: index + 1,
          ...roundedRow,
        };
      });

      updateAppData(
        (prev) => ({
          ...prev,
          Final_Centers: { ...prev.Final_Centers, data: finalData },
        }),
        false
      );

      setProgress(100);
      toast.success(`Đã tính toán xong ${finalData.length} dòng dữ liệu.`);
    } catch (error: any) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi xử lý tệp tin: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportExcel = () => {
    if (appData.Final_Centers.data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(appData.Final_Centers.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Final Centers');
    XLSX.writeFile(wb, 'Final_Centers_Report.xlsx');
  };

  const columns = useMemo(() => {
    return appData.Final_Centers.headers.map((header) => {
      const isAmount =
        header.toUpperCase().includes('PAYMENT') ||
        header.toUpperCase().includes('TOTAL') ||
        header.toUpperCase().includes('LƯƠNG') ||
        header.toUpperCase().includes('CHARGE');
      const isDate = isDateColumn(header);
      const isLabel = header.toUpperCase() === 'LABEL';

      let type: 'text' | 'currency' | 'date' | 'label' = 'text';
      if (isAmount) type = 'currency';
      else if (isDate) type = 'date';
      else if (isLabel) type = 'label';

      return {
        key: header,
        label: header,
        type,
        sortable: true,
        filterable: true,
      };
    });
  }, [appData.Final_Centers.headers]);

  const bulkActions = useMemo(
    () => [
      {
        label: 'Xóa đã chọn',
        icon: <Trash2 className="w-4 h-4" />,
        variant: 'destructive' as const,
        onClick: (selectedRows: any[]) => {
          setDeleteConfirm({ isOpen: true, count: selectedRows.length, type: 'selection' });
        },
      },
    ],
    []
  );

  const handleCellChange = useCallback(
    (row: any, colKey: string, value: any) => {
      updateAppData((prev) => {
        const newData = [...prev.Final_Centers.data];
        const rowIndex = newData.findIndex(
          (r) => r === row || (r.No && r.No === row.No)
        );
        if (rowIndex === -1) return prev;
        newData[rowIndex] = { ...newData[rowIndex], [colKey]: value };
        return {
          ...prev,
          Final_Centers: { ...prev.Final_Centers, data: newData },
        };
      });
    },
    [updateAppData]
  );

  const handleDeleteRow = useCallback(
    (rowIndex: number) => {
      updateAppData((prev) => {
        const newData = [...prev.Final_Centers.data];
        newData.splice(rowIndex, 1);
        // Re-index "No"
        const reindexedData = newData.map((row, idx) => ({
          ...row,
          No: idx + 1,
        }));
        return {
          ...prev,
          Final_Centers: { ...prev.Final_Centers, data: reindexedData },
        };
      });
      toast.success('Đã xóa dòng dữ liệu');
    },
    [updateAppData]
  );

  const handleDeleteAll = () => {
    setDeleteConfirm({
      isOpen: true,
      count: appData.Final_Centers.data.length,
      type: 'all',
    });
  };

  const handleDeletePage = () => {
    const pageData = tableRef.current?.getCurrentPageData();
    if (pageData && pageData.length > 0) {
      setDeleteConfirm({ isOpen: true, count: pageData.length, type: 'page' });
    }
  };

  const confirmDelete = () => {
    if (deleteConfirm.type === 'page') {
      const pageData = tableRef.current?.getCurrentPageData();
      if (pageData) {
        const idsToRemove = new Set(pageData.map((r) => r.id || r.No));
        updateAppData((prev) => {
          const newData = prev.Final_Centers.data.filter(
            (r) => !idsToRemove.has(r.id || r.No)
          );
          // Re-index
          const reindexedData = newData.map((row, idx) => ({
            ...row,
            No: idx + 1,
          }));
          return {
            ...prev,
            Final_Centers: { ...prev.Final_Centers, data: reindexedData },
          };
        });
        toast.success(`Đã xóa ${pageData.length} dòng trên trang hiện tại.`);
      }
    } else {
      // Handle selection delete if needed, but DataTable already has bulk actions
      toast.success(`Đã xóa ${deleteConfirm.count} dòng dữ liệu.`);
    }
    setDeleteConfirm({ ...deleteConfirm, isOpen: false });
  };

  // Tự động xử lý khi có dữ liệu roster nhưng chưa có dữ liệu final
  React.useEffect(() => {
    if (
      appData.Q_Roster?.length > 0 &&
      appData.Final_Centers.data.length === 0 &&
      !isProcessing
    ) {
      handleProcessFiles();
    }
  }, [appData.Q_Roster, appData.Final_Centers.data.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col min-h-0 bg-transparent pt-0 pb-3 pr-4 pl-6 gap-4 items-center overflow-auto custom-scrollbar"
    >
      {/* Floating Header Card */}
      <div className="mx-auto w-full max-w-[1240px] pl-8 pr-3 pt-[2px] pb-[12px] flex flex-col md:flex-row items-center justify-between gap-6 bg-transparent rounded-[2.5rem] border border-primary/10 shrink-0 relative z-10 mb-2">
        <div className="absolute inset-0 gingham-pattern opacity-[0.02] pointer-events-none rounded-[2.5rem] overflow-hidden" />
        
        {/* Integrated Header & Controls */}
        <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center text-primary shrink-0 border border-primary/30 shadow-inner">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-[30px] font-normal text-left font-serif text-foreground tracking-tight flex items-end gap-1 mb-0 leading-[36px] pl-[7px] pt-[7px]">
                Final from <span className="not-italic leading-[45px] font-script text-primary text-5xl lowercase inline-block transform -translate-y-0.5">centers</span>
              </h2>
              <p className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">
                SUMMARY PAYROLL DATA • {appData.Final_Centers.data.length} RECORDS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <RouterLink 
                to="/config/centers" 
                className="soft-button flex items-center gap-2 px-4 h-12 bg-transparent text-muted-foreground hover:bg-muted/50 rounded-2xl border border-border shadow-sm transition-all"
              >
                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <span className="text-[0.65rem] font-bold tracking-[0.1em] uppercase">Quản lý file</span>
              </RouterLink>

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button className="p-3 rounded-full border border-border bg-transparent text-muted-foreground hover:text-primary transition-all group shadow-sm">
                        <Wrench className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Cài đặt</TooltipContent>
                </Tooltip>
                <DropdownMenuContent
                  align="end"
                  className="w-64 border border-primary/10 shadow-2xl p-2 bg-white rounded-2xl"
                >
                  <DropdownMenuLabel className="text-[0.625rem] font-bold uppercase tracking-widest text-primary/60 px-3 py-2">
                    Thao tác
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary/5 mx-1" />
                  <div className="p-1">
                    <DropdownMenuItem
                      onSelect={() => setShowSearch(!showSearch)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors"
                    >
                      <Search className="w-4 h-4 text-primary" />
                      <span className="text-[0.6875rem] font-bold uppercase tracking-wider">Tìm kiếm</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={handleExportExcel}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors"
                    >
                      <Download className="w-4 h-4 text-primary" />
                      <span className="text-[0.6875rem] font-bold uppercase tracking-wider">Xuất Excel</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-primary/5 mx-1" />
                    <DropdownMenuItem
                       onSelect={handleDeletePage}
                       className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-rose-50 text-rose-500 transition-colors group"
                    >
                       <Trash2 className="w-4 h-4" />
                       <span className="text-[0.6875rem] font-bold uppercase tracking-wider">Xoá toàn bộ trang</span>
                    </DropdownMenuItem>
                     <DropdownMenuItem
                      onSelect={() => {
                        tableRef.current?.resetTableConfig();
                        setTimeout(() => {
                          setUpdateTrigger((prev) => prev + 1);
                        }, 0);
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-rose-50 text-rose-500 transition-colors group"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-[0.6875rem] font-bold uppercase tracking-wider">Reset Table</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>



      {/* Floating Table Card */}
      {appData.Final_Centers.data.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] border border-primary/10 shadow-lg flex-1 h-full flex flex-col items-center justify-center text-primary/10 p-12 relative overflow-hidden mx-auto w-full max-w-[1240px] mb-4">
          <div className="absolute inset-0 striped-pattern opacity-[0.03] pointer-events-none" />
          <div className="w-32 h-32 bg-primary/5 rounded-full flex items-center justify-center mb-8 border border-primary/10 shadow-inner relative z-10">
            <Building2 className="w-12 h-12 text-primary/20" />
          </div>
          <p className="font-serif text-3xl text-muted-foreground/40 italic relative z-10">
            Chưa có dữ liệu Centers
          </p>
          <p className="text-[0.625rem] font-bold uppercase tracking-[0.2em] mt-4 text-primary/40 text-center max-w-md relative z-10">
            HỆ THỐNG ĐANG CHỜ DỮ LIỆU ROSTER TỪ TRANG SUMMARY ĐỂ TỰ ĐỘNG TÍNH TOÁN.
          </p>
          <button
            onClick={handleProcessFiles}
            className="soft-button mt-10 border border-primary/30 text-primary uppercase tracking-widest text-[0.625rem] font-bold h-12 px-10 hover:bg-primary/5 transition-all shadow-sm relative z-10"
            disabled={isProcessing || !appData.Q_Roster?.length}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-3 inline" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-3 inline" />
            )}
            Tính toán lại
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden relative z-10 flex flex-col min-h-0 w-full max-w-[1240px] rounded-[2.5rem] mx-auto pt-0 pb-0">
          <DataTable
            ref={tableRef}
            columns={columns}
            data={appData.Final_Centers.data}
            onCellChange={handleCellChange}
            onDeleteRow={handleDeleteRow}
            isEditable={true}
            selectable={false}
            bulkActions={bulkActions}
            storageKey="final_centers"
            externalSearchTerm={searchTerm}
            onExternalSearchChange={setSearchTerm}
            hideSearch={true}
            hideToolbar={true}
            showFooter={true}
            headerClassName="bg-transparent border-b border-border text-[0.85em] font-bold uppercase tracking-[0.2em] text-primary"
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
        onConfirm={confirmDelete}
        title="Xác nhận xóa dữ liệu"
        description={
          deleteConfirm.type === 'page'
            ? `Bạn có chắc chắn muốn xóa ${deleteConfirm.count} dòng trên trang hiện tại? Hành động này không thể hoàn tác.`
            : `Bạn có chắc chắn muốn xóa ${deleteConfirm.count} dòng đã chọn? Hành động này không thể hoàn tác.`
        }
        confirmText="Xác nhận xóa"
        variant="destructive"
      />
    </motion.div>
  );
}
