/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Banknote,
  Users,
  AlertCircle,
  Zap,
  ShieldCheck,
  ArrowRight,
  Table2,
  CreditCard,
  LayoutDashboard,
  Settings,
  FileCheck,
  ChevronRight,
  TrendingUp,
  Activity,
  Database,
  Flower2,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAppData } from '../lib/contexts/AppDataContext';
import { formatVND, parseMoneyToNumber } from '../lib/utils/data-utils';
import { StatCard } from '../components/StatCard';
import { motion } from 'motion/react';
import { DashboardCharts } from '../components/DashboardCharts';

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
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
} as const;

export function Dashboard() {
  const navigate = useNavigate();
  const { appData } = useAppData();

  const totalPayroll = appData.Final_Centers.data.reduce((sum, row) => {
    const amt = parseMoneyToNumber(row['TOTAL PAYMENT'] || 0);
    return sum + amt;
  }, 0);

  const totalInterns = appData.Final_Centers.data.length;
  const totalAuditErrors = appData.AuditReport.data.length;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 flex flex-col h-full overflow-y-auto bg-transparent p-6 gap-8 max-w-[1360px] mx-auto w-full"
    >
      {/* Header Section */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-end justify-between gap-8"
      >
        <div className="space-y-4">
          <div className="flex items-stretch gap-3">
            <div className="vintage-button-icon bg-primary/30 border border-border !h-auto aspect-square">
              <LayoutDashboard className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[12px] font-bold uppercase tracking-[0.3em] text-muted-foreground leading-none">
                System Status
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary mt-1 leading-none">
                Operational
              </span>
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-display text-foreground leading-tight flex flex-wrap items-baseline gap-x-4">
            <span className="not-italic font-script text-primary text-5xl md:text-7xl lowercase">Payroll</span>
            <span>Management</span>
            <span className="text-secondary text-2xl uppercase tracking-[0.2em] block w-full mt-2 font-sans font-black">
              Dashboard
            </span>
          </h1>
          <p className="text-foreground/70 text-lg font-medium italic font-serif max-w-[600px] leading-relaxed">
            Quản lý lương và kiểm toán chuyên nghiệp. Theo dõi phân phối thời gian thực và phát hiện các sai lệch.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/audit')}
            className="vintage-button bg-primary text-white border-none shadow-md hover:shadow-xl px-10"
          >
            <div className="flex items-center gap-3">
              <FileCheck className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-widest">
                Run Audit
              </span>
            </div>
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-8"
      >
        <StatCard
          title="Total Payroll"
          value={formatVND(totalPayroll)}
          icon={Banknote}
          iconColor="text-accent"
          subtitle="Current Cycle Distribution"
          onClick={() => navigate('/payment')}
        />
        <StatCard
          title="Active Interns"
          value={totalInterns}
          icon={Users}
          iconColor="text-primary"
          subtitle="Total Headcount Tracking"
          onClick={() => navigate('/centers')}
        />
        <StatCard
          title="Audit Exceptions"
          value={totalAuditErrors}
          icon={AlertCircle}
          iconColor="text-rose-400"
          subtitle="Critical Items Flagged"
          onClick={() => navigate('/audit')}
        />
      </motion.div>

      {/* Charts Section */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-accent/30 rounded-full flex items-center justify-center border border-accent">
            <TrendingUp className="w-5 h-5 text-accent-foreground" />
          </div>
          <h2 className="text-4xl font-normal font-serif text-foreground tracking-tight">
            Data <span className="not-italic font-script text-primary text-5xl lowercase">Visualization</span>
          </h2>
          <div className="h-1.5 w-32 bg-primary/10 rounded-full mt-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/20 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
          </div>
        </div>
        <DashboardCharts />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Quick Access Column */}
        <motion.div variants={itemVariants} className="lg:col-span-3 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary/30 rounded-full flex items-center justify-center border border-secondary">
              <Zap className="w-5 h-5 text-secondary-foreground" />
            </div>
            <h2 className="text-4xl font-normal font-serif text-foreground tracking-tight">
              Quick <span className="not-italic font-script text-primary text-5xl lowercase">Actions</span>
            </h2>
            <div className="h-1.5 w-32 bg-primary/10 rounded-full mt-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-primary/20 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Master AE',
                icon: Database,
                path: '/master-ae',
                desc: 'Manage AE data sheets',
                color: 'text-primary',
                bg: 'bg-primary/5',
              },
              {
                title: 'Pivot Report',
                icon: Table2,
                path: '/pivot',
                desc: 'Generate pivot summaries',
                color: 'text-accent-foreground',
                bg: 'bg-accent/10',
              },
              {
                title: 'Bulk Payment',
                icon: CreditCard,
                path: '/payment',
                desc: 'Process bank exports',
                color: 'text-secondary-foreground',
                bg: 'bg-secondary/10',
              },
              {
                title: 'Audit Center',
                icon: ShieldCheck,
                path: '/audit',
                desc: 'Compare payroll data',
                color: 'text-rose-500',
                bg: 'bg-rose-50',
              },
            ].map((link) => (
              <div
                key={link.path}
                onClick={() => navigate(link.path)}
                className="group p-8 bg-white force-light border border-border rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all cursor-pointer flex flex-col gap-6"
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`p-5 ${link.bg} rounded-full transition-all duration-500 shadow-sm`}
                  >
                    <link.icon
                      className={`w-7 h-7 ${link.color} transition-colors`}
                    />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center transition-colors">
                    <ChevronRight className="w-5 h-5 text-foreground/20 transition-all" />
                  </div>
                </div>
                <div>
                  <h3 className="font-serif text-xl text-foreground mb-1">
                    {link.title}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.1em]">
                    {link.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
