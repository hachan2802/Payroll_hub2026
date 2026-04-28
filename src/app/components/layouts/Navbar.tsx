/* eslint-disable @typescript-eslint/no-unused-vars */
import { Link, useLocation } from 'react-router';
import {
  LayoutGrid,
  Building2,
  Database,
  ShieldCheck,
  CreditCard,
  Table2,
  Bell,
  User,
  Settings,
  Trash2,
  Menu,
  Calculator,
  ListChecks,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useAppData } from '../../lib/contexts/AppDataContext';
import { toast } from 'sonner';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const navigationItems = [
  { id: 'centers', label: 'Centers', icon: Building2, path: '/centers' },
  { id: 'master-ae', label: 'Master AE', icon: Database, path: '/master-ae' },
  { id: 'audit', label: 'Audit', icon: ShieldCheck, path: '/audit' },
  { id: 'payment', label: 'Payment', icon: CreditCard, path: '/payment' },
  { id: 'pivot', label: 'Pivot', icon: Table2, path: '/pivot' },
];

const configItems = [
  { to: '/timesheet-summary', icon: Calculator, label: 'Timesheet Summary' },
  { to: '/config/centers', icon: ListChecks, label: 'Centers Data' },
  { to: '/config/ae', icon: Users, label: 'AE Data' },
];

interface NavbarProps {
  onToggleMobileMenu: () => void;
}

export function Navbar({ onToggleMobileMenu }: NavbarProps) {
  const location = useLocation();
  const { updateAppData } = useAppData();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearAll = () => {
    updateAppData((prev) => ({
      ...prev,
      Fr_InputList: prev.Fr_InputList.map((row) => ({
        ...row,
        url: '',
        fileObj: undefined,
        status: 'ready',
        cachedData: undefined,
      })),
      Final_Centers: { ...prev.Final_Centers, data: [] },
      Final_AE: { ...prev.Final_AE, data: [] },
      Bank_North_AE: { ...prev.Bank_North_AE, data: [] },
      Sheet1_AE: { ...prev.Sheet1_AE, data: [] },
      Hold_AE: { ...prev.Hold_AE, data: [] },
      SoSanh_AE: { ...prev.SoSanh_AE, data: [] },
      AuditReport: { ...prev.AuditReport, data: [] },
      BankExport: { ...prev.BankExport, data: [] },
      CustomReport: { ...prev.CustomReport, data: [] },
      Q_Staff: [],
      Q_Salary_Scale: [],
      Q_Roster: [],
      Timesheets: [],
    }));
    setShowClearConfirm(false);
    toast.success('Đã xóa toàn bộ dữ liệu ứng dụng.');
  };

  return (
    <div className="h-16 flex items-center px-0 gap-6 bg-transparent shrink-0">
      {/* Mobile Menu Button */}
      <button
        onClick={onToggleMobileMenu}
        className="lg:hidden vintage-button bg-primary text-primary-foreground"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Nav items - Hidden on mobile */}
      <nav className="hidden lg:flex items-center justify-center gap-3 flex-1">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`relative flex items-center gap-2 py-2.5 text-xs font-medium uppercase tracking-wide transition-colors duration-200 whitespace-nowrap border-2 px-[12px] mx-[12px] my-[0px] rounded-[40px] ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-[2px_2px_0px_rgba(0,0,0,0.1)]'
                  : 'bg-card text-muted-foreground border-border hover:bg-secondary hover:text-secondary-foreground hover:border-secondary transition-colors'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearAll}
        title="Xác nhận xóa toàn bộ dữ liệu"
        description="Hành động này sẽ xóa sạch toàn bộ dữ liệu đã tải lên và các kết quả tính toán. Bạn có chắc chắn muốn tiếp tục?"
        confirmText="Xoá sạch"
        variant="destructive"
      />
    </div>
  );
}
