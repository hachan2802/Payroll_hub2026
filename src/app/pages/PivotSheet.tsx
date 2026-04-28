/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from 'react';
import { useAppData } from '../lib/contexts/AppDataContext';
import {
  Table2,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Settings,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import { parseMoneyToNumber, formatMoneyVND } from '../lib/utils/data-utils';
import * as XLSX from 'xlsx';
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

type PivotRow = {
  center: string;
  business: string;
  totals: Record<string, number>;
  rowTotal: number;
};

export function PivotSheet() {
  const { appData, updateAppData } = useAppData();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc' | null;
  }>({ key: 'center', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const itemsPerPage = 50;

  const pivotData = useMemo(() => {
    const data = appData.Sheet1_AE.data;
    if (!data || data.length === 0) return null;

    const chargeCols = appData.PivotConfig.chargeCols;
    const result: Record<string, PivotRow> = {};

    data.forEach((row) => {
      const center = row['L07'] || 'Unknown';
      const business = row['Business'] || '';
      const key = `${center}_${business}`;

      if (!result[key]) {
        result[key] = {
          center: center,
          business: business,
          totals: {},
          rowTotal: 0,
        };
        chargeCols.forEach((c) => (result[key].totals[c.key] = 0));
      }

      let rowSum = 0;
      chargeCols.forEach((c) => {
        const amount = parseMoneyToNumber(row[c.key]);
        result[key].totals[c.key] += amount;
        rowSum += amount;
      });
      result[key].rowTotal += rowSum;
    });

    let sortedRows = Object.values(result);

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      sortedRows = sortedRows.filter(
        (r) =>
          r.center.toLowerCase().includes(s) ||
          r.business.toLowerCase().includes(s)
      );
    }

    if (sortConfig.key && sortConfig.direction) {
      sortedRows.sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortConfig.key === 'center') {
          valA = a.center;
          valB = b.center;
        } else if (sortConfig.key === 'business') {
          valA = a.business;
          valB = b.business;
        } else if (sortConfig.key === 'rowTotal') {
          valA = a.rowTotal;
          valB = b.rowTotal;
        } else {
          valA = a.totals[sortConfig.key] || 0;
          valB = b.totals[sortConfig.key] || 0;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default sort by Fr_InputList order if no sort config
      const l07Order: Record<string, number> = {};
      if (appData.Fr_InputList && appData.Fr_InputList.length > 0) {
        appData.Fr_InputList.forEach((item, index) => {
          if (item.l07) {
            const k = String(item.l07).trim().toUpperCase();
            if (l07Order[k] === undefined) l07Order[k] = index;
          }
        });
      }

      sortedRows.sort((a, b) => {
        const keyA = String(a.center).trim().toUpperCase();
        const keyB = String(b.center).trim().toUpperCase();
        const idxA = l07Order[keyA] !== undefined ? l07Order[keyA] : 99999;
        const idxB = l07Order[keyB] !== undefined ? l07Order[keyB] : 99999;

        if (idxA !== idxB) return idxA - idxB;
        return a.center.localeCompare(b.center);
      });
    }

    const colTotals: Record<string, number> = {};
    let grandTotal = 0;
    chargeCols.forEach((c) => (colTotals[c.key] = 0));

    sortedRows.forEach((row) => {
      chargeCols.forEach((c) => {
        colTotals[c.key] += row.totals[c.key];
      });
      grandTotal += row.rowTotal;
    });

    const activeCols = chargeCols.filter(
      (c) => colTotals[c.key] > 0 || c.code !== ''
    );

    return { sortedRows, colTotals, grandTotal, activeCols };
  }, [
    appData.Sheet1_AE.data,
    appData.PivotConfig.chargeCols,
    appData.Fr_InputList,
    sortConfig,
    searchTerm,
  ]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc')
          return { key: 'center', direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
    setCurrentPage(1);
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key)
      return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    if (sortConfig.direction === 'asc')
      return <ArrowUp className="w-3 h-3 text-primary" />;
    return <ArrowDown className="w-3 h-3 text-primary" />;
  };

  const totalPages = pivotData
    ? Math.ceil(pivotData.sortedRows.length / itemsPerPage)
    : 0;
  const paginatedRows = pivotData
    ? pivotData.sortedRows.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
    : [];

  const handleExportExcel = () => {
    if (!pivotData) return;

    // Create a simple table for export
    const exportData = pivotData.sortedRows.map((row) => {
      const exportRow: any = {
        [appData.PivotConfig.headers['Business']]: row.business,
        [appData.PivotConfig.headers['L07']]: row.center,
      };
      pivotData.activeCols.forEach((c) => {
        exportRow[`${c.code} - ${c.label}`] = row.totals[c.key];
      });
      exportRow[appData.PivotConfig.headers['GRAND_TOTAL']] = row.rowTotal;
      return exportRow;
    });

    // Add total row
    const totalRow: any = {
      [appData.PivotConfig.headers['Business']]: 'GRAND TOTAL',
      [appData.PivotConfig.headers['L07']]: '',
    };
    pivotData.activeCols.forEach((c) => {
      totalRow[`${c.code} - ${c.label}`] = pivotData.colTotals[c.key];
    });
    totalRow[appData.PivotConfig.headers['GRAND_TOTAL']] = pivotData.grandTotal;
    exportData.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pivot Report');
    XLSX.writeFile(wb, 'Pivot_Report.xlsx');
  };

  const handleUpdateHeader = (key: string, value: string) => {
    updateAppData((prev) => ({
      ...prev,
      PivotConfig: {
        ...prev.PivotConfig,
        headers: { ...prev.PivotConfig.headers, [key]: value },
      },
    }));
  };

  const handleUpdateChargeCode = (key: string, value: string) => {
    updateAppData((prev) => ({
      ...prev,
      PivotConfig: {
        ...prev.PivotConfig,
        chargeCols: prev.PivotConfig.chargeCols.map((c) =>
          c.key === key ? { ...c, code: value } : c
        ),
      },
    }));
  };

  const handleUpdateChargeLabel = (key: string, value: string) => {
    updateAppData((prev) => ({
      ...prev,
      PivotConfig: {
        ...prev.PivotConfig,
        chargeCols: prev.PivotConfig.chargeCols.map((c) =>
          c.key === key ? { ...c, label: value } : c
        ),
      },
    }));
  };

  if (!pivotData) {
    return (
      <div className="p-10 text-center space-y-4 bg-transparent min-h-full flex flex-col items-center justify-center">
        <Table2 className="w-16 h-16 mx-auto text-primary/20" />
        <p className="text-primary/60 italic font-bold uppercase tracking-widest">
          Chưa có dữ liệu Sheet 1 AE để tạo Pivot.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 flex flex-col h-full bg-transparent p-4 md:p-8 gap-6 overflow-hidden"
    >
      {/* Header Card */}
      <motion.div
        variants={itemVariants}
        className="soft-card force-light w-full max-w-[1600px] p-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 relative z-50"
      >
        <div className="absolute inset-0 striped-pattern opacity-[0.08] pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary shrink-0 border border-primary/30 shadow-inner">
            <Table2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-normal font-serif text-foreground tracking-tight leading-tight">
              Dữ liệu <span className="not-italic font-script text-primary text-3xl lowercase">Pivot Sheet</span>
            </h2>
            <p className="text-[0.6rem] font-black text-muted-foreground uppercase tracking-[0.2em] mt-0.5">
              SUMMARY & DATA ANALYSIS • {pivotData.sortedRows.length} RECORDS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                className="relative group hidden lg:block"
              >
                <input
                  type="text"
                  placeholder="TÌM KIẾM..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-primary/5 border border-primary/10 rounded-xl pl-10 pr-4 py-2 text-xs w-48 uppercase font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:w-64 shadow-inner"
                  autoFocus
                />
                <Search className="w-4 h-4 text-primary/30 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-white text-muted-foreground hover:text-primary transition-all group shadow-sm"
                    >
                      <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Cài đặt & Thao tác</TooltipContent>
              </Tooltip>
              <DropdownMenuContent
                align="end"
                className="w-64 border border-primary/10 shadow-xl p-2 bg-white rounded-2xl"
              >
                <DropdownMenuLabel className="font-bold uppercase text-[0.625rem] tracking-widest text-primary/60 px-3 py-2">
                  Thao tác báo cáo
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-primary/10 mx-1.5" />

                <DropdownMenuItem
                  onClick={handleExportExcel}
                  className="cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 p-3 rounded-xl transition-all hover:bg-primary/5 text-primary"
                >
                  <Download className="w-4 h-4" />
                  <span>Xuất báo cáo Excel</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setShowSearch(!showSearch)}
                  className={`cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 p-3 rounded-xl transition-all ${showSearch ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/5'}`}
                >
                  <Search className="w-4 h-4" />
                  <span>{showSearch ? 'Ẩn tìm kiếm' : 'Hiện tìm kiếm'}</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {}}
                  className="cursor-pointer font-bold uppercase text-[0.6875rem] gap-3 hover:bg-primary/5 p-3 rounded-xl transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Làm mới dữ liệu</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={handleExportExcel}
              className="h-10 px-6 rounded-xl bg-primary text-white shadow-md flex items-center gap-2 active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="text-[0.65rem] font-bold tracking-widest uppercase">Export Excel</span>
            </button>
          </div>
        </div>
      </motion.div>

        {/* Content Card */}
        <motion.div
          variants={itemVariants}
          className="bg-white soft-card force-light w-full max-w-[1600px] flex-1 flex flex-col min-h-0 border-none shadow-2xl shadow-rose-100/20 z-10 relative"
        >
          <div className="absolute inset-0 striped-pattern opacity-[0.05] pointer-events-none rounded-[2.5rem] overflow-hidden" />
          {/* Main Scroll Container */}
          <div className="flex-1 overflow-auto custom-scrollbar relative bg-white"
            style={{ overscrollBehavior: 'contain' }}
          >
            <table className="w-full text-left border-separate border-spacing-0 min-w-max relative" style={{ tableLayout: 'fixed' }}>
              <thead className="relative z-[40]">
                <tr className="h-10">
                  <th
                    rowSpan={2}
                    style={{ height: '70px', width: '120px', minWidth: '120px', maxWidth: '120px', padding: 'var(--table-padding, 8px 12px)' }}
                    className="border-b border-r border-primary/10 bg-primary/5 sticky top-0 left-0 z-[45] shadow-[2px_2px_5px_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        aria-label="Tên cột Business"
                        value={appData.PivotConfig.headers['Business']}
                        onChange={(e) =>
                          handleUpdateHeader('Business', e.target.value)
                        }
                        className="bg-transparent border-none outline-none w-full text-[0.6rem] font-bold uppercase tracking-widest text-primary/80 hover:text-primary transition-colors"
                      />
                      <button
                        onClick={() => handleSort('business')}
                        className="p-1 hover:bg-primary/10 rounded-full transition-colors text-primary/40 hover:text-primary"
                      >
                        {getSortIcon('business')}
                      </button>
                    </div>
                  </th>
                  <th
                    rowSpan={2}
                    style={{ height: '70px', width: '150px', minWidth: '150px', maxWidth: '150px', padding: 'var(--table-padding, 6px 12px)' }}
                    className="border-b border-r border-primary/10 bg-primary/5 sticky top-0 left-[120px] z-[45] shadow-[2px_2px_5px_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        aria-label="Tên cột L07"
                        value={appData.PivotConfig.headers['L07']}
                        onChange={(e) =>
                          handleUpdateHeader('L07', e.target.value)
                        }
                        style={{ textAlign: 'center', fontSize: '12px', lineHeight: '6.4px' }}
                        className="bg-transparent border-none outline-none w-full text-[0.6rem] font-bold uppercase tracking-widest text-primary/80 hover:text-primary transition-colors"
                      />
                      <button
                        onClick={() => handleSort('center')}
                        className="p-1 hover:bg-primary/10 rounded-full transition-colors text-primary/40 hover:text-primary"
                      >
                        {getSortIcon('center')}
                      </button>
                    </div>
                  </th>
                  {pivotData.activeCols.map((c) => (
                    <th
                      key={c.key}
                      style={{ width: '140px', minWidth: '140px', padding: 'var(--table-padding, 4px 16px)' }}
                      className="border-b border-r border-[#E2E8F0] text-center bg-muted/30 sticky top-0 z-[40] h-10 text-[1em] text-muted-foreground/60"
                    >
                      <input
                        value={c.code}
                        onChange={(e) =>
                          handleUpdateChargeCode(c.key, e.target.value)
                        }
                        style={{ fontSize: '12px', lineHeight: '5px' }}
                        className="bg-transparent border-none outline-none w-full text-center font-bold uppercase tracking-widest hover:text-primary transition-colors"
                      />
                    </th>
                  ))}
                  <th
                    rowSpan={2}
                    style={{ width: '150px', minWidth: '150px', padding: 'var(--table-padding, 8px 16px)' }}
                    className="border-b border-[#E2E8F0] bg-primary/5 sticky top-0 right-0 z-[45] shadow-[-2px_2px_5px_rgba(0,0,0,0.02)] h-22 text-center"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <input
                        aria-label="Tên cột Tổng cộng"
                        value={appData.PivotConfig.headers['GRAND_TOTAL']}
                        onChange={(e) =>
                          handleUpdateHeader('GRAND_TOTAL', e.target.value)
                        }
                        className="bg-transparent border-none outline-none w-full text-[0.6rem] font-bold uppercase tracking-[0.2em] text-primary/80 text-center"
                      />
                      <button
                        onClick={() => handleSort('rowTotal')}
                        className="p-1 hover:bg-primary/10 rounded-full transition-colors text-primary/40 hover:text-primary"
                      >
                        {getSortIcon('rowTotal')}
                      </button>
                    </div>
                  </th>
                </tr>
                <tr className="h-12">
                  {pivotData.activeCols.map((c) => {
                    const cleanLabel = (c.label || '').replace(/CHARGE TO\s*/gi, '').replace(/\s*CHARGE TO/gi, '').trim();
                    return (
                      <th
                        key={c.key}
                      style={{ width: '140px', minWidth: '140px', padding: 'var(--table-padding, 0)', fontSize: 'var(--font-size)' }}
                        className="border-b border-r border-[#E2E8F0] bg-[#F8FAFC] sticky top-[40px] z-[40] shadow-[0_2px_5px_rgba(0,0,0,0.02)] h-12 text-center"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <input
                            aria-label={`Nhãn cột ${c.code}`}
                            value={cleanLabel}
                            onChange={(e) =>
                              handleUpdateChargeLabel(c.key, e.target.value)
                            }
                            style={{ fontSize: '12px', lineHeight: '9.2px', textAlign: 'center' }}
                            className="bg-transparent border-none outline-none w-full font-black uppercase tracking-widest text-foreground/70 hover:text-primary transition-colors"
                          />
                          <button
                            onClick={() => handleSort(c.key)}
                            className="p-1 hover:bg-primary/10 rounded-full transition-colors"
                          >
                            {getSortIcon(c.key)}
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="relative z-0">
                {paginatedRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-primary/5 transition-all group"
                  >
                    <td 
                      style={{ height: '35px', padding: 'var(--table-padding, 6px)', width: '120px', minWidth: '120px', fontSize: 'var(--font-size)' }}
                      className="font-bold uppercase tracking-wider text-[1em] text-muted-foreground group-hover:text-primary transition-colors border-b border-r border-[#E2E8F0] sticky left-0 bg-white group-hover:bg-[#FFF5F7] z-20 shadow-[4px_0_5px_-2px_rgba(0,0,0,0.05)]"
                    >
                      {row.business}
                    </td>
                    <td 
                      style={{ height: '35px', padding: 'var(--table-padding, 6px)', width: '150px', minWidth: '150px', fontSize: 'var(--font-size)' }}
                      className="font-bold text-[1em] text-foreground border-b border-r border-[#E2E8F0] sticky left-[120px] bg-white group-hover:bg-[#FFF5F7] z-20 shadow-[4px_0_5px_-2px_rgba(0,0,0,0.05)]"
                    >
                      {row.center}
                    </td>
                    {pivotData.activeCols.map((c) => {
                      const val = row.totals[c.key];
                      return (
                        <td
                          key={c.key}
                          style={{ height: '35px', padding: 'var(--table-padding, 6px)', fontSize: 'var(--font-size)' }}
                          className="text-right tabular-nums text-[1em] border-b border-r border-[#E2E8F0] text-foreground/80 font-medium"
                        >
                          {val !== 0 ? formatMoneyVND(val) : <span className="opacity-20">-</span>}
                        </td>
                      );
                    })}
                    <td 
                      style={{ height: '35px', padding: 'var(--table-padding, 6px)', fontSize: 'var(--font-size)' }}
                      className="text-right font-bold tabular-nums text-[1em] bg-[#FFF5F7] text-primary border-b border-r border-[#E2E8F0] sticky right-0 z-20 shadow-[-2px_0_5px_rgba(0,0,0,0.02)]">
                      {formatMoneyVND(row.rowTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="relative z-[42]">
                <tr className="font-bold text-primary">
                  <td
                    className="h-[45px] text-right uppercase tracking-[0.3em] text-[1em] bg-[#FFF5F7] border-r border-[#E2E8F0] sticky bottom-0 left-0 z-[45] shadow-[2px_-2px_15px_rgba(0,0,0,0.08)]"
                    style={{ width: '270px', minWidth: '270px', padding: 'var(--table-padding, 0)', fontSize: 'var(--font-size)' }}
                  >
                    <div className="flex items-center justify-end gap-3 h-full px-6">
                      <Table2 className="w-4 h-4 text-primary animate-pulse" />
                      <span className="font-black">TỔNG CỘNG CHUNG</span>
                    </div>
                  </td>
                  {pivotData.activeCols.map((c) => (
                    <td key={c.key} style={{ width: '140px', minWidth: '140px', padding: 'var(--table-padding, 0 16px)', fontSize: 'var(--font-size)' }} className="h-[45px] text-right bg-[#FFF5F7] tabular-nums text-[1em] border-r border-[#E2E8F0] sticky bottom-0 z-[40] shadow-[0_-2px_15px_rgba(0,0,0,0.05)]">
                      {formatMoneyVND(pivotData.colTotals[c.key])}
                    </td>
                  ))}
                  <td style={{ width: '150px', minWidth: '150px', padding: 'var(--table-padding, 0 16px)', fontSize: 'var(--font-size)' }} className="h-[45px] text-right bg-[#F08FA8] text-white tabular-nums text-[1em] font-black sticky bottom-0 right-0 z-[45] shadow-[-2px_-2px_20px_rgba(0,0,0,0.15)] border-t-2 border-white/20">
                    {formatMoneyVND(pivotData.grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        
        {totalPages >= 1 && (
          <div 
            style={{ lineHeight: '0px' }}
            className="flex justify-between items-center px-8 h-[45px] bg-muted/5 border-t border-border shrink-0"
          >
            <div className="flex items-center gap-6">
              <span className="text-[0.6rem] font-black text-muted-foreground uppercase tracking-[0.2em]">
                Trang <span className="text-primary text-xs">{currentPage}</span> / {totalPages || 1}
              </span>
              <div className="w-px h-4 bg-border" />
              <span className="text-[0.6rem] font-black text-muted-foreground uppercase tracking-[0.2em]">
                Tổng cộng <span className="text-primary text-xs">{pivotData.sortedRows.length}</span> Bản ghi
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Trang trước"
                disabled={currentPage === 1}
                className="w-10 h-10 flex items-center justify-center border border-border rounded-xl disabled:opacity-30 bg-white text-muted-foreground hover:text-primary hover:border-primary transition-all shadow-sm group"
              >
                <ChevronLeft className="w-5 h-5 group-active:scale-95" />
              </button>
              <div className="flex items-center px-4 bg-primary/5 rounded-xl border border-primary/10">
                 <span className="text-xs font-black text-primary">{currentPage}</span>
              </div>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                aria-label="Trang tiếp theo"
                disabled={currentPage === totalPages || totalPages === 0}
                className="w-10 h-10 flex items-center justify-center border border-border rounded-xl disabled:opacity-30 bg-white text-muted-foreground hover:text-primary hover:border-primary transition-all shadow-sm group"
              >
                <ChevronRight className="w-5 h-5 group-active:scale-95" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      <div className="flex justify-between w-full max-w-[1560px] text-[0.6rem] font-black uppercase tracking-[0.3em] text-muted-foreground/40 px-4 mt-2">
        <span>KẾT QUẢ ĐỐI SOÁT PIVOT • {pivotData.sortedRows.length} DÒNG</span>
        <span>NGUỒN DỮ LIỆU: SHEET 1 AE</span>
      </div>
    </motion.div>
  );
}
