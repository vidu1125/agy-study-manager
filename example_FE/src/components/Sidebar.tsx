import React from 'react';
import { ActiveTab } from '../types';
import { 
  GraduationCap, 
  Plus, 
  LayoutDashboard, 
  BookOpen, 
  CalendarDays, 
  Trophy, 
  Settings, 
  HelpCircle, 
  LogOut,
  X
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewCourse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewCourse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'courses', label: 'My Courses', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'schedule', label: 'Schedule', icon: <CalendarDays className="w-5 h-5" /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static top-0 left-0 h-full w-[260px] bg-black/60 backdrop-blur-xl border-r border-white/10 flex flex-col py-6 z-50 shrink-0 transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand & Logo */}
        <div className="px-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] text-white">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight leading-tight uppercase">EduPulse</h1>
                <p className="text-[10px] font-mono text-cyan-400/70 tracking-widest uppercase">Learning Hub // v2.6</p>
              </div>
            </div>
            {isMobileOpen && (
              <button 
                onClick={onCloseMobile}
                className="md:hidden text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* New Course Action Button */}
          <button
            id="sidebar-new-course-btn"
            onClick={() => {
              onOpenNewCourse();
              if (onCloseMobile) onCloseMobile();
            }}
            className="mt-6 w-full py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 text-black rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.4)] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="tracking-wide">New Course</span>
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 space-y-1.5">
          <div className="px-3 py-1 text-[10px] font-mono font-bold text-white/30 uppercase tracking-[0.2em]">
            Navigation
          </div>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs rounded-xl transition-all duration-150 ease-in-out cursor-pointer ${
                  isActive
                    ? 'text-cyan-400 bg-cyan-400/10 border-l-2 border-cyan-400 rounded-r-xl font-bold shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                    : 'text-white/40 hover:text-cyan-400 hover:bg-white/[0.04] font-medium'
                }`}
              >
                <span className={`${isActive ? 'text-cyan-400' : 'text-white/40 group-hover:text-cyan-400'}`}>
                  {item.icon}
                </span>
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Telemetry status badge & Footer */}
        <div className="px-4 mt-auto pt-4 border-t border-white/10 space-y-2">
          <div className="px-3 py-2 bg-white/[0.03] border border-white/5 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/50">Live Sync</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">99.8%</span>
          </div>

          <button
            id="nav-help-center"
            onClick={() => {
              setActiveTab('help');
              if (onCloseMobile) onCloseMobile();
            }}
            className={`w-full flex items-center gap-3 px-4 py-2 text-xs rounded-lg transition-all duration-150 cursor-pointer ${
              activeTab === 'help'
                ? 'text-cyan-400 bg-cyan-400/10 font-bold'
                : 'text-white/40 hover:bg-white/5 hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help Center</span>
          </button>
          
          <button
            id="nav-logout"
            onClick={() => {
              if (window.confirm('Bạn có muốn đăng xuất khỏi Learning Hub không?')) {
                alert('Đã đăng xuất an toàn khỏi phiên làm việc.');
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-xs text-white/40 hover:bg-rose-500/10 hover:text-rose-400 rounded-lg transition-all duration-150 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};
