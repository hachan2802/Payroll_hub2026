/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect */
import React, { useState, useMemo, useEffect, useRef, useCallback, useDeferredValue, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Download,
  CheckSquare,
  Square,
  Copy,
  ChevronLeft,
  ChevronRight,
  Table2,
  Wrench,
  Eraser,
  Type,
  Trash2,
  RefreshCw,
  X,
  Calendar,
  Play,
  Minus,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import { parseMoneyToNumber, formatNumber } from '../lib/utils/data-utils';
import { formatVNRobust } from '../lib/utils/format-utils';
import { ColumnFormatDialog } from './ColumnFormatDialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';

export interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'currency' | 'money' | 'label';
  sortable?: boolean;
  filterable?: boolean;
  hidden?: boolean;
  width?: number | string;
  headerClassName?: string;
  headerSpanClassName?: string;
  cellClassName?: string;
  footerClassName?: string;
}

const GITHUB_LABELS: Record<string, { color: string; textColor: string }> = {
  bug: { color: '#d73a4a', textColor: '#ffffff' },
  documentation: { color: '#0075ca', textColor: '#ffffff' },
  duplicate: { color: '#cfd3d7', textColor: '#1f2328' },
  enhancement: { color: '#a2eeef', textColor: '#1f2328' },
  'good first issue': { color: '#7057ff', textColor: '#ffffff' },
  'help wanted': { color: '#008672', textColor: '#ffffff' },
  invalid: { color: '#e4e669', textColor: '#1f2328' },
  question: { color: '#d876e3', textColor: '#ffffff' },
  wontfix: { color: '#ffffff', textColor: '#1f2328' },
};

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedRows: any[]) => void;
  variant?: 'default' | 'destructive';
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  title?: string;
  onExport?: () => void;
  showFilters?: boolean;
  selectable?: boolean;
  onSelectionChange?: (selectedRows: any[]) => void;
  onCellChange?: (row: any, colKey: string, value: any) => void;
  onDeleteRow?: (rowIndex: number) => void;
  onDeleteSelection?: (range: {
    startR: number;
    endR: number;
    startC: number;
    endC: number;
  }) => void;
  bulkActions?: BulkAction[];
  isEditable?: boolean;
  externalSearchTerm?: string;
  onExternalSearchChange?: (value: string) => void;
  storageKey?: string;
  hideSearch?: boolean;
  hideToolbar?: boolean;
  showFooter?: boolean;
  headerClassName?: string;
  footerClassName?: string;
  className?: string;
  striped?: boolean;
  style?: React.CSSProperties;
}

const ColumnFilter = ({
  column,
  allData,
  filterState,
  onFilterChange,
  onSort,
  searchTerm
}: any) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const uniqueValues = useMemo(() => {
    if (!isOpen) return [];
    
    const vals = new Set<any>();
    
    // Dependent Filtering: Calculate options based on other filters
    let currentData = allData;

    // 1. Apply Global Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      currentData = currentData.filter((row: any) =>
        Object.values(row).some(
          (val) => val != null && String(val).toLowerCase().includes(lowerSearch)
        )
      );
    }

    // 2. Apply ALL OTHER column filters
    Object.entries(filterState).forEach(([key, allowedValues]) => {
      if (key !== column.key && allowedValues instanceof Set) {
        currentData = currentData.filter((row: any) => allowedValues.has(row[key]));
      }
    });

    // 3. Extract unique values from contextually filtered data
    currentData.forEach((row: any) => {
      const val = row[column.key];
      if (val != null && val !== '') {
        vals.add(val);
      } else {
        vals.add('undefined'); 
      }
    });
    
    // Also include currently selected values even if they aren't in the contextually filtered data
    // so the user can see what they've selected and potentially unselect them.
    const currentSelection = filterState[column.key];
    if (currentSelection instanceof Set) {
      currentSelection.forEach(val => vals.add(val));
    }

    return Array.from(vals).sort((a: any, b: any) => {
      if (a === 'undefined') return -1;
      if (b === 'undefined') return 1;
      return String(a).localeCompare(String(b), undefined, { numeric: true });
    });
  }, [allData, column.key, filterState, searchTerm, isOpen]);

  const filteredValues = useMemo(() => {
    if (!search) return uniqueValues;
    return uniqueValues.filter(v => String(v).toLowerCase().includes(search.toLowerCase()));
  }, [uniqueValues, search]);

  const currentFilters = filterState[column.key];
  const isAllSelected = !currentFilters;

  const handleToggleValue = (val: any, checked: boolean) => {
    let next: Set<any>;
    if (isAllSelected) {
      next = new Set(uniqueValues);
      next.delete(val);
    } else {
      next = new Set(currentFilters);
      if (checked) next.add(val);
      else next.delete(val);
    }

    if (next.size === uniqueValues.length) {
      onFilterChange(column.key, undefined);
    } else {
      onFilterChange(column.key, next);
    }
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      onFilterChange(column.key, undefined);
    } else {
      onFilterChange(column.key, new Set());
    }
  };

  return (
    <Popover onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center justify-center p-1 rounded hover:bg-rose-100 transition-colors ${currentFilters && currentFilters.size !== uniqueValues.length ? 'text-rose-500' : 'text-rose-200 group-hover:text-rose-400'}`}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Filter className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 rounded-xl bg-white shadow-2xl border-2 border-primary/20" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col p-2 border-b">
          <button
            className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded text-left font-bold"
            onClick={() => onSort(column.key, 'asc')}
          >
             <ChevronUp className="w-4 h-4" /> Sort A-Z
          </button>
          <button
            className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded text-left font-bold"
            onClick={() => onSort(column.key, 'desc')}
          >
             <ChevronDown className="w-4 h-4" /> Sort Z-A
          </button>
        </div>
        <div className="p-2">
          <Input
            id={`filter-search-${column.key}`}
            name={`filter-search-${column.key}`}
            placeholder="Tìm kiếm..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 text-xs mb-2 outline-none border-primary/20"
          />
          <div className="flex flex-col gap-1 max-h-48 overflow-auto custom-scrollbar">
            <div className="flex items-center gap-2 px-2 hover:bg-muted/50 rounded py-1 cursor-pointer">
              <Checkbox
                 id={`all-${column.key}`}
                 name={`all-${column.key}`}
                 checked={isAllSelected}
                 onCheckedChange={(c) => handleToggleAll(!!c)}
              />
              <label htmlFor={`all-${column.key}`} className="text-xs font-bold leading-none cursor-pointer flex-1">
                (Chọn tất cả)
              </label>
            </div>
            {filteredValues.map((val, i) => (
              <div key={i} className="flex items-center gap-2 px-2 hover:bg-muted/50 rounded py-1 cursor-pointer">
                <Checkbox
                  id={`val-${column.key}-${i}`}
                  name={`val-${column.key}-${i}`}
                  checked={isAllSelected || currentFilters.has(val)}
                  onCheckedChange={(c) => handleToggleValue(val, !!c)}
                />
                <label htmlFor={`val-${column.key}-${i}`} className="text-xs truncate leading-none cursor-pointer flex-1" title={String(val)}>
                  {String(val) === 'undefined' ? '(Trống)' : String(val)}
                </label>
              </div>
            ))}
            {filteredValues.length === 0 && (
               <div className="text-xs text-center text-muted-foreground p-2">Không tìm thấy</div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const DataRow = React.memo(
  ({
    row,
    rIdx,
    selectable,
    selectedRowIds,
    activeCell,
    selectionRange,
    editingCell,
    editValue,
    visibleColumns,
    columnWidths,
    isEditable,
    onCellChange,
    toggleRow,
    startEditing,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleContextMenu,
    setEditValue,
    commitEdit,
    formatValue,
    getAlignment,
    inputRef,
    setRowHeight,
    striped,
  }: any) => {
    const rowId = row.id || rIdx;
    const isSelected = selectedRowIds.has(rowId);
    
    // Row resize handle
    const [isResizing, setIsResizing] = useState(false);
    
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            setRowHeight((h: number) => Math.max(30, h + e.movementY));
        };
        const handleMouseUp = () => setIsResizing(false);
        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, setRowHeight]);
    const isRowActive = activeCell?.r === rIdx;
    const isRowInRange =
      selectionRange &&
      rIdx >= Math.min(selectionRange.startR, selectionRange.endR) &&
      rIdx <= Math.max(selectionRange.startR, selectionRange.endR);

    return (
      <tr
        className={`group ${selectable ? 'cursor-pointer' : 'cursor-default'} ${isSelected ? 'bg-primary/[0.05]' : isRowActive ? 'bg-primary/[0.03]' : isRowInRange ? 'bg-primary/[0.015]' : (striped ? (rIdx % 2 === 0 ? 'bg-[var(--stripe-color1,white)]' : 'bg-[var(--stripe-color2,white)]') : 'bg-white')} relative`}
        style={undefined}
      >
        {isSelected && (
          <div
            className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize z-50 hover:bg-rose-400 transition-colors"
            onMouseDown={(e) => {
                e.stopPropagation();
                setIsResizing(true);
            }}
          />
        )}

        {selectable && (
          <td
            onClick={() => toggleRow(rowId)}
            className={`text-rose-400 whitespace-nowrap border-b border-r border-[#E2E8F0] ${isSelected ? 'bg-rose-50' : ''}`}
            style={{
              padding: 'var(--table-padding, 1rem 1.5rem)',
              boxShadow: isRowActive ? 'inset 4px 0 0 #F08FA8' : undefined,
            }}
          >
            <div className="flex items-center justify-center">
              {isSelected ? (
                <div className="w-5 h-5 bg-[#F08FA8] rounded-md flex items-center justify-center border border-[#F08FA8] shadow-sm transition-transform active:scale-95">
                  <CheckSquare className="w-3.5 h-3.5 text-white" />
                </div>
              ) : (
                <div className="w-5 h-5 border-2 border-rose-200 bg-white rounded-md hover:border-[#F08FA8]/50 transition-all" />
              )}
            </div>
          </td>
        )}
        {visibleColumns.map((col: any, cIdx: number) => {
          const isActive = activeCell?.r === rIdx && activeCell?.c === cIdx;
          const isEditing = editingCell?.r === rIdx && editingCell?.c === cIdx;
          const isColActive = activeCell?.c === cIdx;
          const isInRange =
            selectionRange &&
            rIdx >= Math.min(selectionRange.startR, selectionRange.endR) &&
            rIdx <= Math.max(selectionRange.startR, selectionRange.endR) &&
            cIdx >= Math.min(selectionRange.startC, selectionRange.endC) &&
            cIdx <= Math.max(selectionRange.startC, selectionRange.endC);

          const colWidth = columnWidths[col.key] || col.width;
          const widthStyle = colWidth
            ? typeof colWidth === 'number'
              ? `${colWidth}px`
              : colWidth
            : undefined;

          return (
            <td
              key={col.key}
              onMouseDown={(e) => handleCellMouseDown(e, rIdx, cIdx)}
              onMouseEnter={(e) => handleCellMouseEnter(e, rIdx, cIdx)}
              onDoubleClick={() => startEditing(rIdx, cIdx)}
              onContextMenu={(e) => handleContextMenu(e, rIdx, cIdx)}
              className={`whitespace-nowrap select-none ${getAlignment(col.type, col.key)} relative 
              ${isInRange ? 'bg-rose-50/50 z-10' : ''} 
              ${isActive ? 'ring-2 ring-inset ring-[#F08FA8]/40 z-20 bg-white shadow-xl' : ''} 
              ${isColActive && !isActive && !isInRange ? 'bg-rose-50/20' : ''}
              text-[1em] leading-[1.7] font-medium text-[#4A3E3E] border-b border-r border-[#E2E8F0] ${col.cellClassName || ''}
            `}
              style={{
                padding: 'var(--table-padding, 0.65rem 1rem)',
                fontFamily: 'var(--font-table, var(--font-main))',
                fontSize: 'var(--font-size)',
                width: widthStyle,
                minWidth: widthStyle,
                boxShadow: (!selectable && isRowActive && cIdx === 0)
                  ? 'inset 4px 0 0 #F08FA8'
                  : undefined,
              }}
            >
              {/* Range Borders */}
              {isInRange && selectionRange && (
                <>
                  {rIdx ===
                    Math.min(selectionRange.startR, selectionRange.endR) && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/30 z-20" />
                    )}
                  {rIdx ===
                    Math.max(selectionRange.startR, selectionRange.endR) && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/30 z-20" />
                    )}
                  {cIdx ===
                    Math.min(selectionRange.startC, selectionRange.endC) && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/30 z-20" />
                    )}
                  {cIdx ===
                    Math.max(selectionRange.startC, selectionRange.endC) && (
                      <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-primary/30 z-20" />
                    )}
                </>
              )}

              {isEditing ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 z-50 p-0 bg-white shadow-2xl ring-2 ring-primary/60 rounded-md overflow-hidden flex items-center"
                >
                  {col.type === 'label' ? (
                    <select
                      id={`edit-${col.key}-${row.id}`}
                      name={`edit-${col.key}-${row.id}`}
                      aria-label="Chọn nhãn"
                      ref={inputRef as any}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      className="w-full h-full px-4 py-2 bg-transparent border-none focus:ring-0 text-[0.7rem] font-bold text-foreground uppercase appearance-none cursor-pointer"
                      autoFocus
                    >
                      <option value="">-- NO LABEL --</option>
                      {Object.keys(GITHUB_LABELS).map((label) => (
                        <option key={label} value={label}>
                          {label.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`edit-${col.key}-${row.id}`}
                      name={`edit-${col.key}-${row.id}`}
                      aria-label="Nhập giá trị"
                      ref={inputRef as any}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      className="w-full h-full px-4 py-2 bg-transparent border-none focus:ring-0 text-[0.8rem] font-medium text-foreground tracking-tight"
                      autoFocus
                    />
                  )}
                </motion.div>
              ) : (
                <div className={`flex items-center group/cell ${getAlignment(col.type, col.key) === 'text-right' ? 'justify-end' : getAlignment(col.type, col.key) === 'text-center' ? 'justify-center' : 'justify-start'}`}>
                  <span className="relative z-0 truncate">
                    {formatValue(row[col.key], col.type, col.key)}
                  </span>
                  {isEditable && !isActive && !isInRange && (
                    <Type className="w-3 h-3 text-primary/0 shrink-0 ml-2" />
                  )}
                </div>
              )}
            </td>
          );
        })}
      </tr>
    );
  }
);

DataRow.displayName = 'DataRow';

export interface DataTableRef {
  columns: Column[];
  hiddenColumns: Set<string>;
  toggleColumn: (key: string) => void;
  resetTableConfig: () => void;
  getCurrentPageData: () => any[];
}

export const DataTable = React.forwardRef<DataTableRef, DataTableProps>(
  (
    {
      columns,
      data,
      title,
      onExport,
      selectable = false,
      onSelectionChange,
      onCellChange,
      onDeleteRow,
      onDeleteSelection,
      bulkActions,
      isEditable = true,
      externalSearchTerm,
      onExternalSearchChange,
      storageKey,
      hideSearch = false,
      hideToolbar = false,
      showFooter = false,
      headerClassName,
      footerClassName,
      className,
      striped = false,
      style: customStyle,
    },
    ref
  ) => {
    const [sortConfig, setSortConfig] = useState<{
      key: string;
      direction: 'asc' | 'desc';
    } | null>(null);
    const [columnFilters, setColumnFilters] = useState<Record<string, Set<any> | undefined>>({});
    const [internalSearchTerm, setInternalSearchTerm] = useState('');

    const searchTerm =
      externalSearchTerm !== undefined
        ? externalSearchTerm
        : internalSearchTerm;
    const setSearchTerm = onExternalSearchChange || setInternalSearchTerm;
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

    const [resizingCol, setResizingCol] = useState<{
      key: string;
      startX: number;
      startWidth: number;
      currentX: number;
    } | null>(null);

    const [resizingLineLeft, setResizingLineLeft] = useState<number | null>(null);

    useLayoutEffect(() => {
      let raf: number;
      if (resizingCol && scrollContainerRef.current) {
         raf = requestAnimationFrame(() => {
             const el = scrollContainerRef.current;
             if (el) {
                 const rect = el.getBoundingClientRect();
                 setResizingLineLeft(resizingCol.currentX - rect.left + el.scrollLeft);
             }
         });
      } else {
         setResizingLineLeft(null);
      }
      return () => cancelAnimationFrame(raf);
    }, [resizingCol?.currentX, resizingCol]);

    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
      }, 300);
      return () => clearTimeout(timer);
    }, [searchTerm]);

    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
    const [rowDensity, setRowDensity] = useState<'compact' | 'normal' | 'relaxed'>('normal');
    const [columnFormats, setColumnFormats] = useState<Record<string, { alignment?: 'left' | 'center' | 'right' }>>({});
    const [formatModal, setFormatModal] = useState<{ isOpen: boolean; colKey: string } | null>(null);
    const [selectedRowIds, setSelectedRowIds] = useState<Set<string | number>>(
      new Set()
    );
    const [contextMenu, setContextMenu] = useState<{
      x: number;
      y: number;
      r: number;
      c: number;
    } | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(100);

    // Grid selection & editing
    const [activeCell, setActiveCell] = useState<{
      r: number;
      c: number;
    } | null>(null);
    const [selectionRange, setSelectionRange] = useState<{
      startR: number;
      endR: number;
      startC: number;
      endC: number;
    } | null>(null);
    const [editingCell, setEditingCell] = useState<{
      r: number;
      c: number;
    } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [isSelecting, setIsSelecting] = useState(false);
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
      {}
    );
    const [columnTypes, setColumnTypes] = useState<Record<string, string>>({});

    // Use standard effect or simple initial state setup instead to avoid rendering cycle
    // Note: since this is just parsing localStorage it can be done once initially instead
    // of in an effect. We will just use an effect and accept that it will trigger a re-render.
    // However, to fix the lint error, we need to disable the exhaustive-deps or just let it happen in useEffect rather than useLayoutEffect
    useEffect(() => {
      if (!storageKey) return;
      // ... rest is same
      const initStates = {
        hiddenColumns: new Set<string>(),
        columnWidths: {} as Record<string, number>,
        columnTypes: {} as Record<string, string>,
        columnFormats: {} as Record<string, { alignment?: 'left' | 'center' | 'right' }>,
        sortConfig: null as { key: string; direction: 'asc' | 'desc' } | null,
        rowDensity: 'normal' as 'compact' | 'normal' | 'relaxed',
        itemsPerPage: 100 as number | typeof Infinity
      };
      
      let hasUpdates = false;

      // Hidden columns
      try {
        const savedHidden = localStorage.getItem(`dt_hidden_${storageKey}`);
        if (savedHidden) {
          initStates.hiddenColumns = new Set(JSON.parse(savedHidden));
          hasUpdates = true;
        }
      } catch (e) {
        console.error(e);
      }

      // Row density
      try {
        const savedDensity = localStorage.getItem(`dt_density_${storageKey}`);
        if (savedDensity) {
          initStates.rowDensity = savedDensity as 'compact' | 'normal' | 'relaxed';
          hasUpdates = true;
        }
      } catch (e) {
        console.error(e);
      }

      // Column widths
      try {
        const savedWidths = localStorage.getItem(`dt_widths_${storageKey}`);
        if (savedWidths) {
          initStates.columnWidths = JSON.parse(savedWidths);
          hasUpdates = true;
        }
      } catch (e) {
        console.error(e);
      }

      // Column types
      try {
        const savedTypes = localStorage.getItem(`dt_types_${storageKey}`);
        if (savedTypes) {
          initStates.columnTypes = JSON.parse(savedTypes);
          hasUpdates = true;
        }
      } catch (e) {
        console.error(e);
      }

      // Column formats
      try {
        const savedFormats = localStorage.getItem(`dt_formats_${storageKey}`);
        if (savedFormats) {
          initStates.columnFormats = JSON.parse(savedFormats);
          hasUpdates = true;
        }
      } catch (e) {
        console.error(e);
      }

      // Sort config
      try {
        const savedSort = localStorage.getItem(`dt_sort_${storageKey}`);
        if (savedSort) {
          initStates.sortConfig = JSON.parse(savedSort);
          hasUpdates = true;
        }
      } catch (e) {
        console.error(e);
      }

      // Items per page
      try {
        const savedItemsPerPage = localStorage.getItem(`dt_ipp_${storageKey}`);
        if (savedItemsPerPage) {
          const parsed = JSON.parse(savedItemsPerPage);
          if (parsed === 'all') {
             initStates.itemsPerPage = Infinity;
          } else if (typeof parsed === 'number' && !isNaN(parsed) && parsed > 0) {
             initStates.itemsPerPage = parsed;
          }
          hasUpdates = true;
        }
      } catch (e) {
        console.error(e);
      }

      if (hasUpdates) {
        setHiddenColumns(initStates.hiddenColumns);
        setColumnWidths(initStates.columnWidths);
        setColumnTypes(initStates.columnTypes);
        setColumnFormats(initStates.columnFormats);
        setSortConfig(initStates.sortConfig);
        setItemsPerPage(initStates.itemsPerPage);
        setRowDensity(initStates.rowDensity);
      }
    }, [storageKey]);

    // Save hidden columns
    useEffect(() => {
      if (storageKey)
        localStorage.setItem(
          `dt_hidden_${storageKey}`,
          JSON.stringify(Array.from(hiddenColumns))
        );
    }, [hiddenColumns, storageKey]);

    // Save row density
    useEffect(() => {
      if (storageKey)
        localStorage.setItem(`dt_density_${storageKey}`, rowDensity);
    }, [rowDensity, storageKey]);

    // Save column formats
    useEffect(() => {
      if (storageKey)
        localStorage.setItem(`dt_formats_${storageKey}`, JSON.stringify(columnFormats));
    }, [columnFormats, storageKey]);

    // Save sort config
    useEffect(() => {
      if (storageKey)
        localStorage.setItem(
          `dt_sort_${storageKey}`,
          JSON.stringify(sortConfig)
        );
    }, [sortConfig, storageKey]);

    // Save items per page
    useEffect(() => {
      if (storageKey)
        localStorage.setItem(
          `dt_ipp_${storageKey}`,
          itemsPerPage === Infinity ? '"all"' : JSON.stringify(itemsPerPage)
        );
    }, [itemsPerPage, storageKey]);

    // Save column widths
    const saveColumnWidths = (widths: Record<string, number>) => {
      if (storageKey)
        localStorage.setItem(`dt_widths_${storageKey}`, JSON.stringify(widths));
    };

    const visibleColumns = useMemo(
      () => columns.filter((col) => !hiddenColumns.has(col.key)),
      [columns, hiddenColumns]
    );

    const filteredAndSortedData = useMemo(() => {
      let result = [...data];

      // Apply search
      if (debouncedSearchTerm) {
        const lowerSearch = debouncedSearchTerm.toLowerCase();
        result = result.filter((row) =>
          Object.values(row).some(
            (val) =>
              val != null && String(val).toLowerCase().includes(lowerSearch)
          )
        );
      }

      // Apply filters
      Object.entries(columnFilters).forEach(([key, allowedValues]) => {
        if (allowedValues) {
          result = result.filter((row) => allowedValues.has(row[key]));
        }
      });

      // Apply sorting
      if (sortConfig) {
        result.sort((a, b) => {
          const aVal = a[sortConfig.key];
          const bVal = b[sortConfig.key];

          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }

      return result;
    }, [data, sortConfig, columnFilters, debouncedSearchTerm]);

    const totalPages =
      itemsPerPage === Infinity
        ? 1
        : Math.ceil(filteredAndSortedData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
      if (itemsPerPage === Infinity) return filteredAndSortedData;
      const start = (currentPage - 1) * itemsPerPage;
      return filteredAndSortedData.slice(start, start + itemsPerPage);
    }, [filteredAndSortedData, currentPage, itemsPerPage]);

    // ── Custom Virtual Scrolling (no library needed) ──────────────────────────
    const [rowHeight, setRowHeight] = useState(52); // px
    const OVERSCAN    = 6;   // extra rows above/below viewport to avoid flicker

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [vsScrollTop, setVsScrollTop] = useState(0);
    const [vsContainerHeight, setVsContainerHeight] = useState(600);
    const [vsContainerWidth, setVsContainerWidth] = useState(1000);

    // Track container height via ResizeObserver
    useEffect(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      if (typeof ResizeObserver === 'undefined') return;
      
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setVsContainerHeight(entry.contentRect.height);
          setVsContainerWidth(entry.contentRect.width);
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    // Reset scroll to top when data changes (search/sort)
    useEffect(() => {
      scrollContainerRef.current?.scrollTo({ top: 0 });
      setVsScrollTop(0);
    }, [debouncedSearchTerm, sortConfig]);

    const handleVScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      setVsScrollTop((e.currentTarget as HTMLDivElement).scrollTop);
    }, []);

    const totalVirtualHeight = paginatedData.length * rowHeight;
    const vsStartIndex = Math.max(0, Math.floor(vsScrollTop / rowHeight) - OVERSCAN);
    const vsEndIndex   = Math.min(
      paginatedData.length - 1,
      Math.ceil((vsScrollTop + vsContainerHeight) / rowHeight) + OVERSCAN
    );
    const vsTopPad    = vsStartIndex * rowHeight;
    const vsBottomPad = Math.max(0, (paginatedData.length - vsEndIndex - 1) * rowHeight);
    const virtualRows = paginatedData.slice(vsStartIndex, vsEndIndex + 1);

    // Defer heavy table re-render — user interactions stay responsive during data updates
    const deferredPaginatedData = useDeferredValue(paginatedData);
    const isStale = deferredPaginatedData !== paginatedData;

    // Notify selection change
    useEffect(() => {
      if (onSelectionChange) {
        const selectedRows = filteredAndSortedData.filter((row, idx) =>
          selectedRowIds.has(row.id || idx)
        );
        onSelectionChange(selectedRows);
      }
    }, [selectedRowIds, filteredAndSortedData, onSelectionChange]);

    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!resizingCol) return;

        const { key, startX, startWidth } = resizingCol;
        const delta = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + delta);

        setResizingCol(prev => prev ? { ...prev, currentX: e.clientX } : null);
        setColumnWidths((prev) => ({
          ...prev,
          [key]: newWidth,
        }));
      };

      const handleMouseUp = () => {
        if (resizingCol) {
          const { key } = resizingCol;
          setColumnWidths((prev) => {
            saveColumnWidths(prev);
            return prev;
          });
          setResizingCol(null);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      };

      if (resizingCol) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [resizingCol]);

    const handleResizeStart = (e: React.MouseEvent, colKey: string) => {
      e.preventDefault();
      e.stopPropagation();
      const th = (e.target as HTMLElement).closest('th');
      if (!th) return;

      setResizingCol({
        key: colKey,
        startX: e.clientX,
        startWidth: th.offsetWidth,
        currentX: e.clientX,
      });

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const handleResizeDoubleClick = (colKey: string) => {
      const values = paginatedData.map(row => String(formatValue(row[colKey], 'text', colKey)));
      
      // Measure text tool
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;
      context.font = '700 0.7rem Inter, sans-serif'; // Matches table cell font
      
      // Measure header
      const col = columns.find(c => c.key === colKey);
      let maxWidth = context.measureText(col?.label || '').width + 60; // Padding + Filter icon
      
      context.font = '500 0.8125rem Inter, sans-serif'; // Matches row cell font
      values.forEach(v => {
        const w = context.measureText(v).width + 32; // Cell padding
        if (w > maxWidth) maxWidth = w;
      });

      const finalWidth = Math.min(600, Math.max(80, maxWidth));
      setColumnWidths(prev => {
        const next = { ...prev, [colKey]: finalWidth };
        saveColumnWidths(next);
        return next;
      });
      toast.success(`Đã tự động căn chỉnh cột ${col?.label}`);
    };

    const tableRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    useEffect(() => {
      const handleGlobalMouseUp = () => {
        setIsSelecting(false);
      };
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    const handleSort = (key: string, direction?: 'asc' | 'desc') => {
      setSortConfig((prev) => {
        if (direction) return { key, direction };
        if (prev?.key === key) {
          return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        }
        return { key, direction: 'asc' };
      });
    };

    const handleFilterChange = (key: string, values: Set<any> | undefined) => {
      setColumnFilters(prev => ({ ...prev, [key]: values }));
    };

    const resetTableConfig = () => {
      if (storageKey) {
        localStorage.removeItem(`dt_hidden_${storageKey}`);
        localStorage.removeItem(`dt_widths_${storageKey}`);
        localStorage.removeItem(`dt_sort_${storageKey}`);
        localStorage.removeItem(`dt_ipp_${storageKey}`);
        setHiddenColumns(new Set());
        setColumnWidths({});
        setSortConfig(null);
        setItemsPerPage(50);
        setCurrentPage(1);
        toast.success('Đã khôi phục cấu hình bảng mặc định');
      }
    };

    const toggleColumn = (key: string) => {
      setHiddenColumns((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    };

    const updateAlignment = (colKey: string, alignment: 'left' | 'center' | 'right') => {
      setColumnFormats((prev) => ({
        ...prev,
        [colKey]: { ...prev[colKey], alignment },
      }));
    };

    const updateColumnType = (key: string, type: string) => {
      setColumnTypes((prev) => {
        const next = { ...prev, [key]: type };
        if (storageKey)
          localStorage.setItem(`dt_types_${storageKey}`, JSON.stringify(next));
        return next;
      });
      toast.success(`Đã đổi định dạng cột sang ${type}`);
    };

    React.useImperativeHandle(ref, () => ({
      columns,
      hiddenColumns,
      toggleColumn,
      resetTableConfig,
      getCurrentPageData: () => paginatedData,
    }));

    const formatValue = (value: any, type?: string, colKey?: string) => {
      const effectiveType = (colKey && columnTypes[colKey]) || type || 'text';

      // ── Guard: Date objects cannot be rendered as React children ────────────
      if (value instanceof Date) {
        if (isNaN(value.getTime())) return ''; // Invalid Date
        if (effectiveType === 'date') {
          return value.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        return value.toLocaleDateString('vi-VN');
      }

      if (effectiveType === 'currency' || effectiveType === 'money') {
        const num = parseMoneyToNumber(value);
        return formatVNRobust(num);
      }
      if (effectiveType === 'number') {
        const num = parseMoneyToNumber(value);
        return formatVNRobust(num);
      }
      if (effectiveType === 'date') {
        return formatNumber(value, 'date');
      }
      if (effectiveType === 'label') {
        const label = String(value || '').toLowerCase();
        const config = GITHUB_LABELS[label];
        if (config) {
          return (
            <span
              className="px-2 py-0.5 rounded-full text-[0.55rem] font-black uppercase tracking-wider shadow-sm border border-black/5"
              style={{ backgroundColor: config.color, color: config.textColor }}
            >
              {label}
            </span>
          );
        }
      }
      if (React.isValidElement(value)) {
        return value;
      }
      // Guard: prevent any remaining plain objects from crashing React render
      if (value !== null && typeof value === 'object') {
        return String(value);
      }
      return value == null ? '' : String(value);
    };


    const getAlignment = (type?: string, key?: string) => {
      if (key && columnFormats[key]?.alignment) {
        return `text-${columnFormats[key].alignment}`;
      }
      const k = key?.toLowerCase() || '';
      if (k.includes('salaryscale')) {
        return 'text-center';
      }
      if (k === 'no' || k === 'stt' || k === 'id') {
        return 'text-center';
      }
      // Specific columns căn trái as requested
      if (k.includes('l07') || k.includes('ae') || k.includes('business')) {
        return 'text-left';
      }

      switch (type) {
        case 'number':
        case 'currency':
        case 'money':
          return 'text-right';
        case 'text':
        default:
          return 'text-left';
      }
    };

    const toggleAll = () => {
      setSelectedRowIds((prev) => {
        if (prev.size === filteredAndSortedData.length) {
          return new Set();
        } else {
          return new Set(filteredAndSortedData.map((row, idx) => row.id || idx));
        }
      });
    };

    const toggleRow = useCallback((id: string | number) => {
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    }, []);

    const startEditing = useCallback((r: number, c: number, clear: boolean = false) => {
      if (!isEditable) return;
      const col = visibleColumns[c];
      const row = filteredAndSortedData[r];
      setEditingCell({ r, c });
      setEditValue(clear ? '' : String(row[col.key] || ''));

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if (!clear) {
            if (
              inputRef.current instanceof HTMLInputElement ||
              inputRef.current instanceof HTMLTextAreaElement
            ) {
              inputRef.current.select();
            }
          }
        }
      }, 0);
    }, [isEditable, visibleColumns, filteredAndSortedData]);

    const commitEdit = useCallback(() => {
      if (editingCell && onCellChange) {
        const col = visibleColumns[editingCell.c];
        const row = filteredAndSortedData[editingCell.r];
        onCellChange(row, col.key, editValue);
      }
      setEditingCell(null);
    }, [editingCell, onCellChange, visibleColumns, filteredAndSortedData, editValue]);

    const cancelEdit = () => {
      setEditingCell(null);
    };

    const handleContextMenu = useCallback((e: React.MouseEvent, r: number, c: number) => {
      e.preventDefault();
      if (r !== -1) {
        setActiveCell({ r, c });
      }
      setContextMenu({ x: e.clientX, y: e.clientY, r, c });
    }, []);

    const closeContextMenu = () => setContextMenu(null);

    useEffect(() => {
      const handleGlobalClick = () => closeContextMenu();
      window.addEventListener('click', handleGlobalClick);
      return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    const handleHeaderMouseDown = (e: React.MouseEvent, cIdx: number) => {
      if (e.button !== 0) return;
      if (filteredAndSortedData.length === 0) return;
      setIsSelecting(true);
      setActiveCell({ r: 0, c: cIdx });
      setSelectionRange({
        startR: 0,
        endR: filteredAndSortedData.length - 1,
        startC: cIdx,
        endC: cIdx,
      });
    };

    const handleHeaderMouseEnter = (e: React.MouseEvent, cIdx: number) => {
      if (
        e.buttons === 1 &&
        selectionRange &&
        selectionRange.startR === 0 &&
        selectionRange.endR === filteredAndSortedData.length - 1
      ) {
        setSelectionRange((prev) => (prev ? { ...prev, endC: cIdx } : null));
      }
    };

    const copyColumn = (cIdx: number) => {
      const col = visibleColumns[cIdx];
      const values = filteredAndSortedData.map((row) =>
        formatValue(row[col.key], col.type)
      );
      try {
        navigator.clipboard.writeText(values.join('\n'));
        toast.success(`Đã sao chép cột ${col.label}`);
      } catch (err) {
        console.error('Failed to copy!', err);
        toast.error(
          'Không thể sao chép vào clipboard. Vui lòng kiểm tra quyền truy cập.'
        );
      }
    };

    const copySelection = () => {
      if (selectionRange) {
        const { startR, endR, startC, endC } = selectionRange;
        const minR = Math.min(startR, endR);
        const maxR = Math.max(startR, endR);
        const minC = Math.min(startC, endC);
        const maxC = Math.max(startC, endC);

        try {
          if (minR === maxR && minC === maxC) {
            const row = filteredAndSortedData[minR];
            const col = visibleColumns[minC];
            const val = formatValue(row[col.key], col.type);
            navigator.clipboard.writeText(String(val));
            toast.success('Đã sao chép nội dung ô');
          } else {
            const rows = [];
            for (let i = minR; i <= maxR; i++) {
              const rowVals = [];
              for (let j = minC; j <= maxC; j++) {
                const col = visibleColumns[j];
                rowVals.push(
                  formatValue(filteredAndSortedData[i][col.key], col.type)
                );
              }
              rows.push(rowVals.join('\t'));
            }
            navigator.clipboard.writeText(rows.join('\n'));
            toast.success(
              `Đã sao chép ${rows.length} dòng, ${maxC - minC + 1} cột`
            );
          }
        } catch (err) {
          console.error('Failed to copy!', err);
          toast.error(
            'Không thể sao chép vào clipboard. Vui lòng kiểm tra quyền truy cập.'
          );
        }
      } else if (activeCell) {
        try {
          const row = filteredAndSortedData[activeCell.r];
          const val = formatValue(
            row[visibleColumns[activeCell.c].key],
            visibleColumns[activeCell.c].type
          );
          navigator.clipboard.writeText(String(val));
          toast.success('Đã sao chép nội dung ô');
        } catch (err) {
          console.error('Failed to copy!', err);
          toast.error(
            'Không thể sao chép vào clipboard. Vui lòng kiểm tra quyền truy cập.'
          );
        }
      }
    };

    const handleCellMouseDown = useCallback((e: React.MouseEvent, r: number, c: number) => {
      if (e.button !== 0) return;
      setIsSelecting(true);
      if (e.shiftKey && activeCell) {
        setSelectionRange({
          startR: activeCell.r,
          endR: r,
          startC: activeCell.c,
          endC: c,
        });
      } else {
        setActiveCell({ r, c });
        setSelectionRange({ startR: r, endR: r, startC: c, endC: c });
      }
    }, [activeCell]);

    const handleCellMouseEnter = useCallback((
      e: React.MouseEvent,
      r: number,
      c: number
    ) => {
      if (e.buttons === 1 && selectionRange) {
        setSelectionRange((prev) =>
          prev ? { ...prev, endR: r, endC: c } : null
        );
      }
    }, [selectionRange]);

    // Keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (editingCell) {
          if (e.key === 'Enter' && !e.altKey) {
            e.preventDefault();
            const { r, c } = editingCell;
            commitEdit();
            const nextR = Math.min(r + 1, filteredAndSortedData.length - 1);
            setActiveCell({ r: nextR, c });
            if (nextR !== r) setTimeout(() => startEditing(nextR, c), 10);
          } else if (e.key === 'Tab') {
            e.preventDefault();
            const { r, c } = editingCell;
            commitEdit();
            let nextR = r,
              nextC = c;
            if (e.shiftKey) {
              if (c > 0) nextC = c - 1;
              else if (r > 0) {
                nextR = r - 1;
                nextC = visibleColumns.length - 1;
              }
            } else {
              if (c < visibleColumns.length - 1) nextC = c + 1;
              else if (r < filteredAndSortedData.length - 1) {
                nextR = r + 1;
                nextC = 0;
              }
            }
            setActiveCell({ r: nextR, c: nextC });
            if (nextR !== r || nextC !== c)
              setTimeout(() => startEditing(nextR, nextC), 10);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
          }
          return;
        }

        if (
          !tableRef.current?.contains(document.activeElement) &&
          document.activeElement !== document.body
        )
          return;
        if (!activeCell) return;
        const { r, c } = activeCell;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextR = Math.min(r + 1, filteredAndSortedData.length - 1);
          setActiveCell({ r: nextR, c });
          if (e.shiftKey && selectionRange)
            setSelectionRange({ ...selectionRange, endR: nextR });
          else
            setSelectionRange({
              startR: nextR,
              endR: nextR,
              startC: c,
              endC: c,
            });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const nextR = Math.max(r - 1, 0);
          setActiveCell({ r: nextR, c });
          if (e.shiftKey && selectionRange)
            setSelectionRange({ ...selectionRange, endR: nextR });
          else
            setSelectionRange({
              startR: nextR,
              endR: nextR,
              startC: c,
              endC: c,
            });
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          const nextC = Math.min(c + 1, visibleColumns.length - 1);
          setActiveCell({ r, c: nextC });
          if (e.shiftKey && selectionRange)
            setSelectionRange({ ...selectionRange, endC: nextC });
          else
            setSelectionRange({
              startR: r,
              endR: r,
              startC: nextC,
              endC: nextC,
            });
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const nextC = Math.max(c - 1, 0);
          setActiveCell({ r, c: nextC });
          if (e.shiftKey && selectionRange)
            setSelectionRange({ ...selectionRange, endC: nextC });
          else
            setSelectionRange({
              startR: r,
              endR: r,
              startC: nextC,
              endC: nextC,
            });
        } else if (e.key === 'Tab') {
          e.preventDefault();
          const nextC = e.shiftKey
            ? Math.max(c - 1, 0)
            : Math.min(c + 1, visibleColumns.length - 1);
          setActiveCell({ r, c: nextC });
          setSelectionRange({ startR: r, endR: r, startC: nextC, endC: nextC });
        } else if (e.key === 'Enter' || e.key === 'F2') {
          e.preventDefault();
          startEditing(r, c);
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          if (onCellChange) {
            if (selectionRange) {
              const { startR, endR, startC, endC } = selectionRange;
              const minR = Math.min(startR, endR),
                maxR = Math.max(startR, endR);
              const minC = Math.min(startC, endC),
                maxC = Math.max(startC, endC);
              for (let i = minR; i <= maxR; i++) {
                for (let j = minC; j <= maxC; j++) {
                  const row = filteredAndSortedData[i];
                  onCellChange(row, visibleColumns[j].key, '');
                }
              }
              toast.success(
                `Đã xóa dữ liệu trong ${(maxR - minR + 1) * (maxC - minC + 1)} ô`
              );
            } else {
              const row = filteredAndSortedData[r];
              onCellChange(row, visibleColumns[c].key, '');
            }
          }
        } else if (e.ctrlKey && e.key === 'a') {
          e.preventDefault();
          toggleAll();
        } else if (e.ctrlKey && e.key === 'c') {
          e.preventDefault();
          copySelection();
        } else if (e.ctrlKey && e.key === 'v') {
          e.preventDefault();
          try {
            navigator.clipboard.readText().then((text) => {
              if (!onCellChange) return;
              const rows = text.split('\n');
              rows.forEach((rowText, rOffset) => {
                const cells = rowText.split('\t');
                cells.forEach((cellText, cOffset) => {
                  const targetR = r + rOffset,
                    targetC = c + cOffset;
                  if (
                    targetR < filteredAndSortedData.length &&
                    targetC < visibleColumns.length
                  ) {
                    const row = filteredAndSortedData[targetR];
                    onCellChange(
                      row,
                      visibleColumns[targetC].key,
                      cellText.trim()
                    );
                  }
                });
              });
              toast.success('Đã dán dữ liệu');
            });
          } catch (err) {
            console.error('Failed to read clipboard!', err);
            toast.error(
              'Không thể dán từ clipboard. Vui lòng kiểm tra quyền truy cập.'
            );
          }
        } else if (
          /^[a-zA-Z0-9]$/.test(e.key) &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey
        ) {
          startEditing(r, c, true);
          setEditValue(e.key);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
      filteredAndSortedData,
      activeCell,
      editingCell,
      editValue,
      visibleColumns,
      isEditable,
      onCellChange,
      selectionRange,
    ]);

    const totalTableWidth = (selectable ? 56 : 0) + visibleColumns.reduce((sum, col) => {
      const w = columnWidths[col.key] || col.width || 150;
      return sum + (typeof w === 'number' ? w : parseInt(String(w)) || 150);
    }, 0);

    const densityStyles = {
      compact: { padding: '4px 8px', fontSize: '0.75rem', headerFontSize: '0.7rem' },
      normal: { padding: '12px 16px', fontSize: '0.8125rem', headerFontSize: '0.85em' },
      relaxed: { padding: '16px 24px', fontSize: '0.9rem', headerFontSize: '0.9rem' }
    };

    return (
      <>
        <div
          ref={tableRef}
          className={`flex flex-col flex-1 min-h-0 outline-none overflow-hidden rounded-[2.5rem] relative ${className || ''} data-table-wrapper`}
          style={{
            '--table-padding': densityStyles[rowDensity].padding,
            '--font-size': densityStyles[rowDensity].fontSize,
            '--header-font-size': densityStyles[rowDensity].headerFontSize,
            ...customStyle
          } as any}
        >
          {/* Integrated Toolbar */}
          {!hideToolbar && (
            <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-white shrink-0 z-50">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[1.5rem] bg-rose-50 border border-rose-100 flex items-center justify-center shadow-sm">
                  <Table2 className="w-8 h-8 text-rose-400" />
                </div>
                
                <div className="flex flex-col items-center flex-1">
                  <div className="flex items-center justify-center gap-3">
                    <h2 className="text-[14px] font-[var(--font-table,var(--font-display))] font-normal text-primary tracking-tight uppercase text-center">
                      {title || 'Final Centers'}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-[#E6F7F0] text-[#00A76F] text-[0.6rem] font-bold tracking-widest border border-[#BFF0DA]">
                      VERIFIED
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-widest leading-none text-center">
                      Dữ liệu bảng lương tổng hợp • {filteredAndSortedData.length} Bản ghi
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 lg:gap-4">
                {/* Visual Date Range Picker Mock */}
                {!hideSearch && (
                  <div className="flex items-center bg-rose-50/50 border border-rose-100 rounded-xl px-3 py-1.5 gap-3 shadow-sm group">
                    <div className="flex items-center gap-2 hover:bg-white/50 px-1.5 py-1 rounded-lg transition-colors cursor-pointer">
                       <span className="text-[0.7rem] font-bold text-foreground/60 font-mono">31/03/2026</span>
                       <Calendar className="w-3 h-3 text-foreground/30" />
                    </div>
                    <div className="w-px h-3.5 bg-rose-200" />
                    <div className="flex items-center gap-2 hover:bg-white/50 px-1.5 py-1 rounded-lg transition-colors cursor-pointer">
                       <span className="text-[0.7rem] font-bold text-foreground/60 font-mono">29/04/2026</span>
                       <Calendar className="w-3 h-3 text-foreground/30" />
                    </div>
                  </div>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-10 h-10 flex items-center justify-center bg-white hover:bg-rose-50 rounded-xl border border-rose-100 shadow-sm transition-all text-rose-400 shrink-0">
                      <Wrench className="w-4 h-4 group-hover:rotate-45" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-72 bg-white border border-border rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95"
                  >
                    <div className="flex items-center justify-between p-2 mb-1 border-b border-rose-50">
                       <span className="text-[0.7rem] font-black uppercase tracking-widest text-[#F08FA8]">Độ cao hàng</span>
                       <div className="flex items-center gap-1">
                         <button
                           onClick={() => setRowHeight(h => Math.max(30, h - 5))}
                           className="w-6 h-6 flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg text-xs font-bold"
                         >-</button>
                         <span className="text-xs font-bold text-rose-400 w-8 text-center">{rowHeight}px</span>
                         <button
                           onClick={() => setRowHeight(h => Math.min(150, h + 5))}
                           className="w-6 h-6 flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg text-xs font-bold"
                         >+</button>
                       </div>
                    </div>
                    <div className="p-1 mb-2 grid grid-cols-3 gap-1">
                       <button
                         onClick={() => setRowDensity('compact')}
                         className={`py-1.5 rounded-lg text-[0.6rem] font-bold uppercase tracking-wider transition-colors ${rowDensity === 'compact' ? 'bg-[#F08FA8] text-white' : 'bg-rose-50 text-rose-400 hover:bg-rose-100'}`}
                       >
                         Nhỏ
                       </button>
                       <button
                         onClick={() => setRowDensity('normal')}
                         className={`py-1.5 rounded-lg text-[0.6rem] font-bold uppercase tracking-wider transition-colors ${rowDensity === 'normal' ? 'bg-[#F08FA8] text-white' : 'bg-rose-50 text-rose-400 hover:bg-rose-100'}`}
                       >
                         Vừa
                       </button>
                       <button
                         onClick={() => setRowDensity('relaxed')}
                         className={`py-1.5 rounded-lg text-[0.6rem] font-bold uppercase tracking-wider transition-colors ${rowDensity === 'relaxed' ? 'bg-[#F08FA8] text-white' : 'bg-rose-50 text-rose-400 hover:bg-rose-100'}`}
                       >
                         Lớn
                       </button>
                    </div>

                    <div className="flex items-center justify-between p-2 mb-1 border-b border-rose-50">
                       <span className="text-[0.7rem] font-black uppercase tracking-widest text-[#F08FA8]">Cột Hiển Thị</span>
                       <button 
                         onClick={(e) => {
                           e.preventDefault();
                           if (hiddenColumns.size > 0) {
                             setHiddenColumns(new Set());
                           } else {
                             setHiddenColumns(new Set(columns.map(c => c.key)));
                           }
                         }}
                         className="text-[0.6rem] font-black text-primary hover:underline uppercase tracking-tighter"
                       >
                         {hiddenColumns.size > 0 ? 'Hiện tất cả' : 'Ẩn tất cả'}
                       </button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-1 space-y-1">
                      {columns.map((col) => (
                        <DropdownMenuItem
                          key={col.key} 
                          onSelect={(e) => {
                            e.preventDefault();
                            toggleColumn(col.key);
                          }}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-rose-50/80 transition-all border border-transparent hover:border-rose-100 group"
                        >
                        <div className="flex items-center gap-3">
                            <div className={`w-4.5 h-4.5 rounded-md border-2 transition-all flex items-center justify-center ${!hiddenColumns.has(col.key) ? 'bg-[#F08FA8] border-[#F08FA8] shadow-sm' : 'border-rose-200 bg-white'}`}>
                               {!hiddenColumns.has(col.key) && <CheckSquare className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-[0.65rem] font-bold tracking-wider uppercase transition-colors ${!hiddenColumns.has(col.key) ? 'text-[#4A3E3E]' : 'text-slate-300'}`}>
                              {col.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                            {['left', 'center', 'right'].map((align) => (
                              <button
                                key={align}
                                onClick={() => updateAlignment(col.key, align as 'left' | 'center' | 'right')}
                                className={`w-6 h-6 flex items-center justify-center rounded text-[0.6rem] font-black ${
                                  (columnFormats[col.key]?.alignment || 'left') === align
                                    ? 'bg-[#F08FA8] text-white'
                                    : 'bg-rose-50 text-rose-300 hover:bg-rose-100'
                                }`}
                              >
                                {align[0].toUpperCase()}
                              </button>
                            ))}
                          </div>
                          {hiddenColumns.has(col.key) && (
                            <span className="text-[0.55rem] font-black text-rose-300 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Đang ẩn</span>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {onExport && (
                  <button
                    onClick={onExport}
                    className="h-10 px-6 rounded-xl bg-[#F08FA8] hover:bg-[#E07D96] text-white shadow-lg shadow-rose-200 transition-all active:scale-95 flex items-center gap-3 overflow-hidden group shrink-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                    <span className="text-[0.7rem] font-black tracking-widest uppercase">Xử lý dữ liệu</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Table Scroll Container — virtual scrolling host */}
          <div
            ref={scrollContainerRef}
            tabIndex={0}
            className={`flex-1 overflow-y-scroll overflow-x-auto custom-scrollbar outline-none bg-transparent relative min-h-0 transition-opacity duration-100 ${isStale ? 'opacity-60' : 'opacity-100'}`}
            onFocus={() => !activeCell && setActiveCell({ r: 0, c: 0 })}
            onScroll={handleVScroll}
            style={{ overscrollBehavior: 'contain' }}
          >

            {resizingLineLeft !== null && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-rose-500 z-[100] pointer-events-none"
                style={{
                  left: resizingLineLeft
                }}
              />
            )}

            <table
              className={`border-separate border-spacing-0 table-fixed border-l border-t border-[#E2E8F0] bg-white ${isSelecting ? 'select-none' : ''}`}
              style={{ 
                height: paginatedData.length === 0 ? 'auto' : (totalVirtualHeight + 56 + (showFooter ? rowHeight * 2 : 0)),
                width: totalTableWidth,
                minWidth: totalTableWidth,
                minHeight: paginatedData.length === 0 ? 400 : 0,
                borderWidth: '0px'
              }}
            >
              <colgroup>
                {selectable && <col style={{ width: 56 }} />}
                {visibleColumns.map(col => {
                  const colWidth = columnWidths[col.key] || col.width || 150;
                  const widthStyle = colWidth
                    ? typeof colWidth === 'number'
                      ? `${colWidth}px`
                      : colWidth
                    : '150px';
                  return <col key={`col-${col.key}`} style={{ width: widthStyle }} />;
                })}
              </colgroup>
              <thead>
                <tr className={headerClassName ? '' : 'bg-[#F3EFE0]'}>
                  {selectable && (
                    <th
                      className={`sticky top-0 z-[60] w-10 border-b border-r border-[#E2E8F0] text-center ${headerClassName ? headerClassName : 'bg-[#F3EFE0] text-[0.85em] font-bold uppercase tracking-[0.2em] text-primary'}`}
                      style={{ padding: 'var(--table-padding, 0.75rem 1rem)' }}
                    >
                      <button
                        onClick={toggleAll}
                        className="flex items-center justify-center hover:text-rose-600 transition-colors mx-auto"
                      >
                        {selectedRowIds.size > 0 &&
                          selectedRowIds.size === filteredAndSortedData.length ? (
                          <div className="w-5 h-5 bg-[#F08FA8] rounded-md flex items-center justify-center border border-[#F08FA8] shadow-sm transition-transform active:scale-95">
                            <CheckSquare className="w-3.5 h-3.5 text-white" />
                          </div>
                        ) : selectedRowIds.size > 0 ? (
                          <div className="w-5 h-5 bg-rose-50 rounded-md flex items-center justify-center border border-[#F08FA8] shadow-sm transition-transform active:scale-95">
                            <Minus className="w-3 h-3 text-[#F08FA8]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 border-2 border-rose-200 bg-white rounded-md hover:border-[#F08FA8]/50 transition-colors" />
                        )}
                      </button>
                    </th>
                  )}
                  {visibleColumns.map((col, cIdx) => {
                    const isColActive =
                      activeCell?.c === cIdx ||
                      (selectionRange &&
                        cIdx >=
                        Math.min(
                          selectionRange.startC,
                          selectionRange.endC
                        ) &&
                        cIdx <=
                        Math.max(selectionRange.startC, selectionRange.endC));
                    const colWidth = columnWidths[col.key] || col.width;
                    const widthStyle = colWidth
                      ? typeof colWidth === 'number'
                        ? `${colWidth}px`
                        : colWidth
                      : undefined;
                    return (
                      <th
                        key={col.key}
                        onMouseDown={(e) => handleHeaderMouseDown(e, cIdx)}
                        onMouseEnter={(e) => handleHeaderMouseEnter(e, cIdx)}
                        onContextMenu={(e) => handleContextMenu(e, -1, cIdx)}
                        className={`sticky top-0 z-[60] whitespace-nowrap cursor-pointer select-none group border-b border-r border-[#E2E8F0] text-center ${headerClassName || 'bg-[#F3EFE0] text-[0.85em] font-bold uppercase tracking-[0.1em] text-primary'} ${col.headerClassName || ''} ${isColActive ? 'bg-rose-200/50' : ''}`}
                        style={{
                          padding: 'var(--table-padding, 0.75rem 1rem)',
                          width: widthStyle,
                          minWidth: widthStyle,
                          maxWidth: widthStyle,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        <div className="flex items-center gap-2 justify-center h-full px-2">
                          <span className={`transition-colors truncate ${col.headerSpanClassName || ''}`}>
                            {col.label}
                          </span>
                          {col.sortable !== false && (
                            <ColumnFilter
                              column={col}
                              allData={data}
                              filterState={columnFilters}
                              onFilterChange={handleFilterChange}
                              onSort={handleSort}
                              searchTerm={debouncedSearchTerm}
                            />
                          )}
                        </div>
                        <div
                          onMouseDown={(e) => handleResizeStart(e, col.key)}
                          onDoubleClick={() => handleResizeDoubleClick(col.key)}
                          className={`absolute -right-[8px] top-0 bottom-0 w-[16px] cursor-col-resize group/resizer z-[70] flex justify-center`}
                        >
                          <div className={`w-[1px] h-full transition-colors bg-[#E2E8F0] group-hover/resizer:bg-rose-400 ${resizingCol?.key === col.key ? 'bg-rose-500' : ''}`} />
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y border-primary/5">
                {/* Top spacer */}
                {vsTopPad > 0 && (
                  <tr style={{ height: vsTopPad }} aria-hidden="true">
                    {selectable && <td />}
                    {visibleColumns.map((col) => (
                      <td key={`vtop-${col.key}`} />
                    ))}
                  </tr>
                )}

                {filteredAndSortedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                      className="p-0 border-none relative h-[400px]"
                    >
                      <div 
                        className="sticky left-0 flex flex-col items-center justify-center gap-6"
                        style={{ width: vsContainerWidth, height: 400 }}
                      >
                        <div className="w-24 h-24 bg-primary/5 rounded-[32px] flex items-center justify-center border-2 border-dashed border-primary/20">
                          <Search className="w-10 h-10 text-primary/20" />
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-lg font-black uppercase tracking-[0.2em] text-primary/80" style={{ fontFamily: 'Verdana' }}>
                            {searchTerm ? 'Không tìm thấy kết quả' : 'Dữ liệu trống'}
                          </p>
                          <p className="text-foreground/40 font-bold text-[0.625rem] uppercase tracking-[0.3em] max-w-[300px] leading-relaxed text-center">
                            {searchTerm ? (
                              <>Không khớp với từ khóa <span className="text-primary">"{searchTerm}"</span></>
                            ) : (
                              'Vui lòng tải file hoặc phân phối dữ liệu từ bảng Data'
                            )}
                          </p>
                        </div>
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm('')}
                            className="px-6 py-2.5 rounded-xl border-2 border-primary text-primary font-black text-[0.625rem] uppercase tracking-widest hover:bg-primary hover:text-white transition-all active:scale-95"
                          >
                            Xóa tìm kiếm
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  virtualRows.map((row, i) => (
                    <DataRow
                      key={row.id ?? (vsStartIndex + i)}
                      row={row}
                      rIdx={vsStartIndex + i}
                      selectable={selectable}
                      selectedRowIds={selectedRowIds}
                      activeCell={activeCell}
                      selectionRange={selectionRange}
                      editingCell={editingCell}
                      editValue={editValue}
                      visibleColumns={visibleColumns}
                      columnWidths={columnWidths}
                      isEditable={isEditable}
                      onCellChange={onCellChange}
                      toggleRow={toggleRow}
                      startEditing={startEditing}
                      handleCellMouseDown={handleCellMouseDown}
                      handleCellMouseEnter={handleCellMouseEnter}
                      handleContextMenu={handleContextMenu}
                      setEditValue={setEditValue}
                      commitEdit={commitEdit}
                      formatValue={formatValue}
                      getAlignment={getAlignment}
                      inputRef={inputRef}
                      setRowHeight={setRowHeight}
                      striped={striped}
                    />
                  ))
                )}

                {/* Bottom spacer */}
                {vsBottomPad > 0 && (
                  <tr style={{ height: vsBottomPad }} aria-hidden="true">
                    {selectable && <td />}
                    {visibleColumns.map((col) => (
                      <td key={`vbottom-${col.key}`} />
                    ))}
                  </tr>
                )}
              </tbody>
              {showFooter && (
                <tfoot
                  className="sticky bottom-0 z-30"
                  style={{ willChange: 'transform', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}
                >
                  {/* Grand Total Row */}
                  <tr className={`${footerClassName || "divide-x divide-slate-300 bg-transparent shadow-[0_-1px_0_theme(colors.slate.300)_inset]"} total-row`}>
                    {selectable && <td />}
                    {visibleColumns.map((col: any, cIdx: number) => {
                      const isNumeric =
                        col.type === 'number' ||
                        col.type === 'currency' ||
                        col.type === 'money';
                      const grandTotal = isNumeric
                        ? filteredAndSortedData.reduce(
                          (sum, row) =>
                            sum + (parseMoneyToNumber(row[col.key]) || 0),
                          0
                        )
                        : null;
                      const colWidth = columnWidths[col.key] || col.width;
                      const widthStyle = colWidth
                        ? typeof colWidth === 'number'
                          ? `${colWidth}px`
                          : colWidth
                        : undefined;

                      return (
                        <td
                          key={`footer-grand-${col.key}`}
                          className={`whitespace-nowrap font-black border-b border-r border-[#E2E8F0] ${getAlignment(col.type, col.key)} text-slate-800 uppercase tracking-widest bg-transparent leading-normal ${col.footerClassName || ''}`}
                          style={{
                            padding: 'var(--table-padding, 1rem 1rem)',
                            fontSize: 'var(--font-size)',
                            height: rowHeight,
                            width: widthStyle,
                            minWidth: widthStyle,
                            maxWidth: widthStyle,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {cIdx === 0
                            ? 'TỔNG CỘNG'
                            : grandTotal !== null
                              ? formatValue(grandTotal, col.type)
                              : ''}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Footer — Virtual Scroll Info Bar (replaces pagination) */}
          <div className="px-3 py-0 h-[52px] border-t border-border flex items-center justify-between shrink-0 z-40 relative">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[0.5625rem] font-black uppercase tracking-widest text-foreground/40">Phân trang:</span>
                <select
                  id="itemsPerPage"
                  name="itemsPerPage"
                  value={itemsPerPage === Infinity ? 'all' : itemsPerPage}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItemsPerPage(val === 'all' ? Infinity : Number(val));
                    setCurrentPage(1);
                    setVsScrollTop(0);
                    scrollContainerRef.current?.scrollTo({ top: 0 });
                  }}
                  className="h-7 px-2 text-[13px] font-bold uppercase tracking-widest text-primary border border-border rounded-[90px] flex items-center bg-transparent focus:ring-0 cursor-pointer hover:bg-primary/5 transition-colors"
                >
                  <option value="50">50 dòng</option>
                  <option value="100">100 dòng</option>
                  <option value="all">Tất cả</option>
                </select>
              </div>

              <p className="text-[0.5625rem] font-black uppercase tracking-widest text-foreground/40 border-l border-border pl-4">
                Hiển thị{' '}
                <span className="text-primary font-black">
                  {paginatedData.length > 0 ? vsStartIndex + 1 : 0}
                </span>
                {' – '}
                <span className="text-primary font-black">
                  {Math.min(vsEndIndex + 1, paginatedData.length)}
                </span>
                {' / '}
                <span className="text-primary font-black">{paginatedData.length}</span>
                {' dòng'}
                {filteredAndSortedData.length !== data.length && (
                  <span className="ml-2 text-foreground/30">(lọc từ {data.length})</span>
                )}
              </p>
            </div>
            
            {/* Pagination Controls - Added purely for navigation mimicking pagination feeling */}
            <div className="flex items-center gap-1.5 opacity-80">
              <button
                onClick={() => {
                  setCurrentPage(1);
                  scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === 1}
                title="Trang đầu"
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-border bg-transparent hover:bg-primary/5 hover:border-primary/20 text-muted-foreground hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <ChevronLeft className="w-4 h-4 -ml-2" />
              </button>
              <button
                onClick={() => {
                  setCurrentPage(p => Math.max(1, p - 1));
                  scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === 1}
                title="Trang trước"
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-border bg-transparent hover:bg-primary/5 hover:border-primary/20 text-muted-foreground hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="px-2 font-black text-[0.6rem] text-muted-foreground select-none">
                TRANG {currentPage} / {totalPages || 1}
              </div>

              <button
                onClick={() => {
                  setCurrentPage(p => Math.min(totalPages, p + 1));
                  scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage >= totalPages || totalPages === 0}
                title="Trang sau"
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-border bg-transparent hover:bg-primary/5 hover:border-primary/20 text-muted-foreground hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCurrentPage(totalPages);
                  scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage >= totalPages || totalPages === 0}
                title="Trang cuối"
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-border bg-transparent hover:bg-primary/5 hover:border-primary/20 text-muted-foreground hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
                <ChevronRight className="w-4 h-4 -ml-2" />
              </button>
            </div>
          </div>
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed z-[100] bg-white/90 backdrop-blur-md shadow-hard py-1 min-w-[180px] rounded border-2 border-primary overflow-hidden animate-in fade-in zoom-in slide-in-from-top-2 duration-150"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 text-[0.5625rem] font-black uppercase tracking-widest text-primary/40 mb-1 border-b border-primary/10">
              Thao tác nhanh
            </div>

            {contextMenu.r !== -1 && (
              <>
                <button
                  onClick={() => {
                    const row = filteredAndSortedData[contextMenu.r];
                    const col = visibleColumns[contextMenu.c];
                    const val = formatValue(row[col.key], col.type);
                    navigator.clipboard.writeText(String(val));
                    toast.success('Đã sao chép nội dung ô');
                    closeContextMenu();
                  }}
                  className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group"
                >
                  <Copy className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors" />
                  <span>Sao chép giá trị ô</span>
                </button>

                <button
                  onClick={() => {
                    if (onCellChange) {
                      const row = filteredAndSortedData[contextMenu.r];
                      onCellChange(row, visibleColumns[contextMenu.c].key, '');
                      toast.success('Đã xóa dữ liệu ô');
                    }
                    closeContextMenu();
                  }}
                  className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group text-destructive hover:text-destructive"
                >
                  <Eraser className="w-3.5 h-3.5 text-destructive/40 group-hover:text-destructive transition-colors" />
                  <span>Xóa giá trị ô</span>
                </button>

                <button
                  onClick={() => {
                    if (onDeleteRow) {
                      onDeleteRow(contextMenu.r);
                    } else {
                      toast.error(
                        'Tính năng xóa dòng không khả dụng cho bảng này'
                      );
                    }
                    closeContextMenu();
                  }}
                  className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive/40 group-hover:text-destructive transition-colors" />
                  <span>Xóa dòng này</span>
                </button>

                <button
                  onClick={() => {
                    const col = visibleColumns[contextMenu.c];
                    setFormatModal({ isOpen: true, colKey: col.key });
                    closeContextMenu();
                  }}
                  className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group"
                >
                  <Type className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors" />
                  <span>Định dạng ô</span>
                </button>

                <DropdownMenuSeparator className="bg-primary/10 mx-1" />
              </>
            )}

            <button
              onClick={() => {
                copyColumn(contextMenu.c);
                closeContextMenu();
              }}
              className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group"
            >
              <Copy className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors" />
              <span>Sao chép cột</span>
            </button>
            <button
              onClick={() => {
                copySelection();
                closeContextMenu();
              }}
              className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group"
            >
              <Table2 className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors" />
              <span>Sao chép vùng chọn</span>
            </button>
            {selectionRange && (
              <button
                onClick={() => {
                  if (onDeleteSelection) {
                    onDeleteSelection(selectionRange);
                  } else if (onCellChange) {
                    const { startR, endR, startC, endC } = selectionRange;
                    const minR = Math.min(startR, endR),
                      maxR = Math.max(startR, endR);
                    const minC = Math.min(startC, endC),
                      maxC = Math.max(startC, endC);
                    for (let i = minR; i <= maxR; i++) {
                      for (let j = minC; j <= maxC; j++) {
                        const row = filteredAndSortedData[i];
                        onCellChange(row, visibleColumns[j].key, '');
                      }
                    }
                    toast.success(
                      `Đã xóa dữ liệu trong ${(maxR - minR + 1) * (maxC - minC + 1)} ô`
                    );
                  }
                  closeContextMenu();
                }}
                className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive/40 group-hover:text-destructive transition-colors" />
                <span>Xóa vùng chọn</span>
              </button>
            )}
            <DropdownMenuSeparator className="bg-primary/10 mx-1" />
            <button
              onClick={() => {
                setSortConfig({
                  key: visibleColumns[contextMenu.c].key,
                  direction: 'asc',
                });
                closeContextMenu();
              }}
              className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group"
            >
              <ChevronUp className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors" />
              <span>Sắp xếp A-Z</span>
            </button>
            <button
              onClick={() => {
                setSortConfig({
                  key: visibleColumns[contextMenu.c].key,
                  direction: 'desc',
                });
                closeContextMenu();
              }}
              className="w-full px-3 py-2 text-left text-[0.625rem] font-black uppercase tracking-wider hover:bg-primary/5 flex items-center gap-2.5 transition-colors group"
            >
              <ChevronDown className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors" />
              <span>Sắp xếp Z-A</span>
            </button>
          </div>
        )}
        {/* Column Format Dialog */}
        {formatModal && (
          <ColumnFormatDialog
            key={formatModal.colKey}
            isOpen={formatModal.isOpen}
            onClose={() => setFormatModal(null)}
            colKey={formatModal.colKey}
            initialFormat={columnFormats[formatModal.colKey] || {}}
            onSave={(format: { alignment?: 'left' | 'center' | 'right' }) => {
              setColumnFormats((prev) => ({ ...prev, [formatModal.colKey]: format }));
            }}
          />
        )}
      </>
    );
  }
);

DataTable.displayName = 'DataTable';
