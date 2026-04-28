/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useMemo, useRef, useState, useCallback } from 'react';
import { useAppData } from '../lib/contexts/AppDataContext';
import {
  FileText,
  Landmark,
  PauseCircle,
  Diff,
  Trash2,
  Settings,
  Download,
  Search,
  Users,
  FileSpreadsheet,
  ChevronDown,
  RefreshCw,
  Plus,
  Save,
  Loader2,
} from 'lucide-react';
import { DataTable } from '../components/DataTable';
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
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { parseMoneyToNumber } from '../lib/utils/data-utils';
import { Button } from '../components/ui/button';
import { useMasterAELogic, MasterAETab } from '../hooks/useMasterAELogic';
import { MasterAEImportDialog } from '../components/MasterAE/MasterAEImportDialog';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

export function MasterAE() {
  const { appData } = useAppData();
  const {
    activeTab,
    setActiveTab,
    isProcessing,
    searchTerm,
    setSearchTerm,
    showSearch,
    setShowSearch,
    processAEData,
    reMapAECodes,
    addCustomRow,
    importL07ToCustomRow,
    handleCellChange,
    handleDeleteRow,
    clearAllData
  } = useMasterAELogic();

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSearch, setImportSearch] = useState('');

  const tabs = useMemo(() => [
    { id: 'Sheet1_AE', label: 'Sheet 1 AE', icon: FileText },
    { id: 'Bank_North_AE', label: 'Bank North AE', icon: Landmark },
    { id: 'Hold_AE', label: 'Hold AE', icon: PauseCircle },
    { id: 'SoSanh_AE', label: 'So Sánh AE', icon: Diff },
    { id: 'CustomReport', label: 'Báo Cáo Tùy Chỉnh', icon: FileSpreadsheet },
  ] as const, []);

  const currentData = appData[activeTab];

  const columns = useMemo(() => {
    return currentData.headers
      .filter((h) => h.toUpperCase() !== 'NO')
      .map((header) => {
        const h = header.toUpperCase();
        const isLabel = h === 'LABEL';
        let type: 'text' | 'number' | 'currency' | 'label' = 'text';
        if (
          h.includes('TOTAL') ||
          h.includes('CHARGE') ||
          h.includes('PAYMENT') ||
          h.includes('AE') ||
          h.includes('LỆCH') ||
          h.includes('TIỀN')
        ) {
          if (
            !(
              h.includes('ID') ||
              h.includes('ACCOUNT') ||
              h.includes('NUMBER') ||
              h.includes('CODE') ||
              h.includes('STK')
            )
          ) {
            type = 'currency';
          }
        }
        if (isLabel) type = 'label';
        return {
          key: header,
          label: header,
          type,
          sortable: true,
          filterable: true,
        };
      });
  }, [currentData.headers]);

  const bulkActions = useMemo(
    () => [
      {
        label: 'Xóa đã chọn',
        icon: <Trash2 className="w-4 h-4" />,
        variant: 'destructive' as const,
        onClick: (selectedRows: any[]) => {
          toast.info("Vui lòng xóa từng dòng hoặc sử dụng chức năng Reset Table.");
        },
      },
    ],
    []
  );

  const handleExportExcel = () => {
    if (currentData.data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(currentData.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab);
    XLSX.writeFile(wb, `Master_AE_${activeTab}.xlsx`);
  };

  const filteredImportList = useMemo(() => {
    const grouped: Record<string, any> = {};
    appData.Sheet1_AE.data.forEach((row) => {
      const l07 = row['L07'] || 'Unknown';
      if (!grouped[l07]) {
        grouped[l07] = {
          l07,
          total: 0,
          count: 0,
          business: row['Business'] || '',
        };
      }
      grouped[l07].total += parseMoneyToNumber(row['TOTAL PAYMENT']);
      grouped[l07].count++;
    });

    return Object.values(grouped).filter((item) => {
      if (!importSearch) return true;
      const q = importSearch.toLowerCase();
      return (
        item.l07.toLowerCase().includes(q) ||
        item.business.toLowerCase().includes(q)
      );
    });
  }, [appData.Sheet1_AE.data, importSearch]);

  const tableRef = useRef<any>(null);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 flex flex-col min-h-0 bg-transparent px-4 md:px-8 pb-4 md:pb-8 pt-0 gap-8 items-center overflow-auto custom-scrollbar"
    >
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px] -z-10" />

      {/* Main Content Card */}
      <div className="bg-white soft-card force-light flex-1 flex flex-col min-h-0 relative z-10 w-full max-w-[1240px]">
        <div className="absolute inset-0 striped-pattern opacity-[0.05] pointer-events-none rounded-[2.5rem] overflow-hidden" />
        
        {/* Integrated Header & Controls */}
        <div className="px-[32px] py-[12px] flex flex-row items-center justify-between gap-6 border-b border-border bg-muted/10 shrink-0 relative">
          <div className="absolute inset-0 pattern-dots opacity-[0.05] pointer-events-none" />
          <div className="flex items-center gap-5 relative z-10 shrink-0">
            <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center text-primary shrink-0 border border-primary/30 shadow-inner hidden md:flex">
              <Users className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl md:text-3xl font-normal font-serif text-foreground tracking-tight flex items-end gap-1 mb-2">
                Final from <span className="not-italic font-bold font-script text-primary text-3xl md:text-5xl lowercase inline-block transform -translate-y-0.5">ae</span>
              </h2>
              <p className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1 whitespace-nowrap">
                MANAGEMENT & RECONCILIATION • {currentData.data.length || 0} RECORDS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10 shrink-0 ml-auto justify-end">
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  className="relative group hidden md:block"
                >
                  <input
                    type="text"
                    placeholder="TÌM KIẾM..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-primary/5 border border-primary/10 rounded-2xl pl-12 pr-6 py-2 text-xs w-64 uppercase font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:w-80 shadow-inner"
                    autoFocus
                  />
                  <Search className="w-4 h-4 text-primary/30 absolute left-4.5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-4 px-6 h-11 border border-border rounded-full bg-white text-muted-foreground hover:text-primary transition-all group shadow-sm">
                        {(() => {
                          const active = tabs.find((t) => t.id === activeTab);
                          const Icon = active?.icon || FileText;
                          return (
                            <>
                              <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              <span className="text-[0.7rem] font-bold uppercase tracking-widest">
                                {active?.label}
                              </span>
                            </>
                          );
                        })()}
                        <ChevronDown className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Chuyển bảng dữ liệu</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start" className="w-64 border border-primary/10 shadow-2xl p-2 bg-white rounded-2xl">
                  <DropdownMenuLabel className="font-bold uppercase text-[0.625rem] tracking-widest text-primary/60 px-3 py-2">
                    Chọn bảng dữ liệu
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary/10 mx-1.5" />
                  {tabs.map((tab) => (
                    <DropdownMenuItem
                      key={tab.id}
                      onSelect={() => setActiveTab(tab.id as MasterAETab)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                        activeTab === tab.id ? 'bg-primary/10 text-primary' : 'hover:bg-primary/5'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="text-[0.7rem] font-bold uppercase tracking-wider">{tab.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button className="p-3 rounded-full border border-border bg-white text-muted-foreground hover:text-primary transition-all group shadow-sm">
                        <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Cài đặt & Thao tác</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-64 border border-primary/10 shadow-2xl p-2 bg-white rounded-2xl">
                  <DropdownMenuLabel className="text-[0.625rem] font-bold uppercase tracking-widest text-primary/60 px-3 py-2">
                    Thao tác nâng cao
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary/5 mx-1" />
                  <div className="p-1">
                    <DropdownMenuItem
                      onSelect={() => setShowSearch(!showSearch)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors"
                    >
                      <Search className="w-4 h-4 text-primary" />
                      <span className="text-[0.6875rem] font-bold uppercase tracking-wider">Tìm kiếm nhanh</span>
                    </DropdownMenuItem>

                    {activeTab === 'Sheet1_AE' && (
                       <DropdownMenuItem
                        onSelect={reMapAECodes}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4 text-primary" />
                        <span className="text-[0.6875rem] font-bold uppercase tracking-wider">Re-Map AE Codes</span>
                      </DropdownMenuItem>
                    )}

                    {activeTab === 'CustomReport' && (
                      <>
                        <DropdownMenuItem
                          onSelect={addCustomRow}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors"
                        >
                          <Plus className="w-4 h-4 text-primary" />
                          <span className="text-[0.6875rem] font-bold uppercase tracking-wider">Thêm dòng mới</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            setImportSearch('');
                            setShowImportModal(true);
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors"
                        >
                          <Save className="w-4 h-4 text-primary" />
                          <span className="text-[0.6875rem] font-bold uppercase tracking-wider">Nhập từ Sheet 1</span>
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuItem
                      onSelect={handleExportExcel}
                      disabled={currentData.data.length === 0}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors"
                    >
                      <Download className="w-4 h-4 text-primary" />
                      <span className="text-[0.6875rem] font-bold uppercase tracking-wider">Xuất Excel</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-primary/5 mx-1" />
                    <DropdownMenuItem
                      onSelect={() => setShowClearDialog(true)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-rose-50 text-rose-500 transition-colors group"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-[0.6875rem] font-bold uppercase tracking-wider">Xóa toàn bộ dữ liệu</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0 relative z-10 w-full overflow-hidden">
          {currentData.data.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-primary/10 p-12">
              <div className="w-28 h-28 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mb-8 border border-primary/10 shadow-inner">
                <Users className="w-12 h-12 text-primary/20" />
              </div>
              <p className="font-bold uppercase text-xl tracking-tight text-primary/40">
                Chưa có dữ liệu {tabs.find((t) => t.id === activeTab)?.label}
              </p>
              <p className="text-[0.625rem] font-bold uppercase opacity-40 tracking-widest mt-2 text-center max-w-md">
                Vui lòng vào phần Cấu hình để chọn file AE Final, hệ thống sẽ tự động cập nhật dữ liệu.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <DataTable
                ref={tableRef}
                columns={columns}
                data={currentData.data}
                onCellChange={(row, col, val) => handleCellChange(activeTab, row, col, val)}
                onDeleteRow={(idx) => handleDeleteRow(activeTab, idx)}
                isEditable={true}
                selectable={true}
                bulkActions={bulkActions}
                externalSearchTerm={searchTerm}
                onExternalSearchChange={setSearchTerm}
                storageKey={`master_ae_${activeTab}`}
                hideSearch={true}
                showFooter={true}
                headerClassName="bg-white border-b border-border text-[0.85em] font-bold uppercase tracking-[0.2em] text-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* Extracted Dialog Components */}
      <MasterAEImportDialog
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        searchTerm={importSearch}
        onSearchChange={setImportSearch}
        filteredList={filteredImportList}
        onImport={(l07) => {
          importL07ToCustomRow(l07);
          setShowImportModal(false);
        }}
      />

      <ConfirmDialog
        isOpen={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onConfirm={() => {
          clearAllData();
          setShowClearDialog(false);
        }}
        title="Xóa toàn bộ dữ liệu?"
        description="Hành động này sẽ xóa sạch dữ liệu trong tất cả các bảng của Master AE. Bạn có chắc chắn muốn tiếp tục?"
        confirmText="XÓA TẤT CẢ"
        variant="destructive"
      />
    </motion.div>
  );
}
