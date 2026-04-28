/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Navbar } from '../components/layouts/Navbar';
import { LeftSidebar } from '../components/layouts/LeftSidebar';
import { UiSettingsModal } from '../components/UiSettingsModal';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';

// ── Root không dùng framer-motion để tránh layout thrashing trên shell layout ──
export function Root() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div 
      className="flex h-screen overflow-hidden font-sans text-foreground bg-transparent"
    >
      {/* Mobile Sidebar Overlay — CSS transition thay vì framer-motion */}
      <div
        onClick={() => setIsMobileMenuOpen(false)}
        className={`fixed inset-0 bg-black/40 backdrop-blur-md z-[60] lg:hidden transition-opacity duration-300
          ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Left Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-[70] lg:relative lg:z-50 transition-all duration-300 transform w-[88px] shrink-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          my-4 ml-4 flex flex-col overflow-hidden`}
      >
        <LeftSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      </div>

      {/* Main Content Area */}
      <div 
        className="flex-1 flex flex-col overflow-hidden min-w-0 relative bg-transparent"
      >
        <div className="bg-transparent mx-4 mt-4 relative z-40">
          <Navbar onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        </div>

        <main className="flex-1 flex flex-col min-h-0 relative">
          <ErrorBoundary>
            <div className="flex-1 flex flex-col min-h-0">
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>

        <UiSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        {/* Version / Update Indicator */}
        <div className="fixed top-6 right-8 z-[100] pointer-events-none">
          <div className="flex flex-col items-end transition-opacity duration-500">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary font-mono drop-shadow-sm bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 backdrop-blur-[1px]">
              Build V02.4
            </span>
            <span className="text-[9px] font-bold text-primary/40 font-mono mt-1.5 pr-1 italic">
              Updated: 2026-04-23 04:10
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
