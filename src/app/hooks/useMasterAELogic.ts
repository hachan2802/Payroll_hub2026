import { useState, useCallback } from 'react';
import { useAppData } from '../lib/contexts/AppDataContext';
import { toast } from 'sonner';

export type MasterAETab = 'Sheet1_AE' | 'Bank_North_AE' | 'Hold_AE' | 'SoSanh_AE' | 'CustomReport';

export function useMasterAELogic() {
  const { updateAppData } = useAppData();
  const [activeTab, setActiveTab] = useState<MasterAETab>('Sheet1_AE');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const processAEData = useCallback(() => {
    setIsProcessing(true);
    // Placeholder logic for processing AE Data
    setTimeout(() => {
      setIsProcessing(false);
      toast.success('Dữ liệu đã được xử lý (Mock)');
    }, 1000);
  }, []);

  const reMapAECodes = useCallback(() => {
    toast.success('Re-map AE Codes (Mock)');
  }, []);

  const addCustomRow = useCallback(() => {
    updateAppData((prev) => ({
      ...prev,
      CustomReport: {
        ...prev.CustomReport,
        data: [...prev.CustomReport.data, {
            'STT': prev.CustomReport.data.length + 1,
            'Trung Tâm': '',
            'Tháng': '',
            'Tổng tiền': 0,
            'Ghi chú': ''
        }]
      }
    }));
    toast.success('Đã thêm dòng mới');
  }, [updateAppData]);

  const importL07ToCustomRow = useCallback((l07: string) => {
    toast.success(`Imported ${l07} (Mock)`);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCellChange = useCallback((tab: MasterAETab, rowIndex: number, columnKey: string, value: any) => {
    updateAppData((prev) => {
      const data = [...prev[tab].data];
      data[rowIndex] = { ...data[rowIndex], [columnKey]: value };
      return {
        ...prev,
        [tab]: { ...prev[tab], data }
      };
    });
  }, [updateAppData]);

  const handleDeleteRow = useCallback((tab: MasterAETab, rowIndex: number) => {
    updateAppData((prev) => {
      const data = [...prev[tab].data];
      data.splice(rowIndex, 1);
      return {
        ...prev,
        [tab]: { ...prev[tab], data }
      };
    });
    toast.success('Đã xóa dòng');
  }, [updateAppData]);

  const clearAllData = useCallback(() => {
    updateAppData((prev) => ({
      ...prev,
      Sheet1_AE: { ...prev.Sheet1_AE, data: [] },
      Bank_North_AE: { ...prev.Bank_North_AE, data: [] },
      Hold_AE: { ...prev.Hold_AE, data: [] },
      SoSanh_AE: { ...prev.SoSanh_AE, data: [] },
      CustomReport: { ...prev.CustomReport, data: [] }
    }));
    toast.success('Đã xóa tất cả dữ liệu');
  }, [updateAppData]);

  return {
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
  };
}
