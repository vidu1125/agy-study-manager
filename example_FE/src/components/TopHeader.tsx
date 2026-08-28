import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  HelpCircle, 
  Menu, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ExternalLink,
  User,
  Shield,
  BookMarked
} from 'lucide-react';
import { NotificationItem } from '../types';

interface TopHeaderProps {
  onToggleMobileMenu: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenPremium: () => void;
  onOpenHelp: () => void;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onToggleMobileMenu,
  searchQuery,
  setSearchQuery,
  onOpenPremium,
  onOpenHelp,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-black/40 backdrop-blur-xl text-[#d1d5db] border-b border-white/10 flex justify-between items-center w-full px-4 md:px-8 lg:px-10 h-16 z-30 shrink-0">
      <div className="flex items-center gap-4 md:gap-6">
        {/* Mobile Menu Button */}
        <button 
          id="mobile-menu-toggle"
          onClick={onToggleMobileMenu}
          className="md:hidden text-white/50 hover:text-cyan-400 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Brand & Telemetry Status */}
        <div className="flex items-center gap-3">
          <div className="text-lg font-light tracking-[0.2em] text-white uppercase flex items-center gap-2">
            <span>EduPulse</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/[0.04] border border-white/10 rounded-full">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-cyan-400">Live Uplink</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative hidden md:block ml-2 md:ml-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
          <input
            id="top-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses..."
            className="bg-black/50 border border-white/10 text-white text-xs rounded-full py-1.5 pl-10 pr-4 w-60 md:w-72 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/60 transition-all placeholder:text-white/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Go Premium Button */}
        <button
          id="btn-go-premium"
          onClick={onOpenPremium}
          className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 px-3.5 py-1.5 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.15)]"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono text-[11px] tracking-wide uppercase">Upgrade PRO</span>
        </button>

        {/* Notifications & Help Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              id="notifications-button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/60 hover:text-cyan-400 transition-colors cursor-pointer relative"
              title="Thông báo"
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#060913]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden text-left">
                <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white uppercase tracking-wider">Mission Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-cyan-400/20 text-cyan-400 font-mono font-bold">
                        {unreadCount} NEW
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button 
                      onClick={onMarkAllNotificationsRead}
                      className="text-xs text-cyan-400 hover:underline cursor-pointer font-mono"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-white/40">
                      Không có thông báo mới nào
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => onMarkNotificationRead(notif.id)}
                        className={`p-3.5 hover:bg-white/[0.04] transition-colors cursor-pointer flex gap-3 ${
                          !notif.read ? 'bg-cyan-500/[0.04]' : ''
                        }`}
                      >
                        <div className="mt-0.5">
                          {notif.type === 'deadline' ? (
                            <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                              <Clock className="w-3.5 h-3.5" />
                            </div>
                          ) : notif.type === 'streak' ? (
                            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-white truncate">{notif.title}</h4>
                            <span className="text-[10px] font-mono text-white/40">{notif.time}</span>
                          </div>
                          <p className="text-xs text-white/60 mt-0.5 line-clamp-2 leading-relaxed">
                            {notif.description}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Help Button */}
          <button
            id="help-header-button"
            onClick={onOpenHelp}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Trợ giúp & Hướng dẫn"
          >
            <HelpCircle className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* User Profile Avatar with dropdown */}
        <div className="relative ml-2 shrink-0" ref={profileRef}>
          <div
            id="user-profile-avatar-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-9 h-9 rounded-full border border-white/20 bg-gradient-to-b from-white/10 to-transparent flex items-center justify-center cursor-pointer hover:border-cyan-400 transition-all hover:scale-105 shadow-[0_0_10px_rgba(255,255,255,0.05)]"
            title="Tài khoản cá nhân"
          >
            <span className="text-xs font-bold text-white font-mono">VD</span>
          </div>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-[#060913]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 p-2 text-left">
              <div className="p-3 border-b border-white/10">
                <p className="text-sm font-bold text-white">Lê Trọng Việt Dũng</p>
                <p className="text-xs text-white/40 font-mono truncate">letrongvietdung014@gmail.com</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 text-[10px] font-mono border border-cyan-400/20">
                  <Shield className="w-3 h-3" /> COMMANDER // K66
                </div>
              </div>
              <div className="py-1 space-y-0.5 text-xs text-white/70">
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-white/40">Học kỳ hiện tại:</span>
                  <span className="text-cyan-400 font-semibold font-mono">HK1 2024-2025</span>
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-white/40">GPA Tích lũy:</span>
                  <span className="text-green-400 font-bold font-mono">3.68 / 4.0</span>
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-white/40">Chuỗi ngày học:</span>
                  <span className="text-orange-400 font-bold font-mono">🔥 21 Ngày</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
