import React, { useState } from 'react';
import { Settings, User, Bell, Database, Shield, BookOpen, Save, Download, Upload, Check } from 'lucide-react';

interface SettingsViewProps {
  onExportData: () => void;
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onExportData,
  onResetData,
}) => {
  const [userName, setUserName] = useState('Lê Trọng Việt Dũng');
  const [email, setEmail] = useState('letrongvietdung014@gmail.com');
  const [major, setMajor] = useState('Kỹ thuật Phần mềm - K66');
  const [currentSemester, setCurrentSemester] = useState('Học kỳ 1 (2024 - 2025)');
  const [targetGpa, setTargetGpa] = useState('3.80');
  const [dailyGoalHours, setDailyGoalHours] = useState('4.0');
  const [enableReminders, setEnableReminders] = useState(true);
  const [enableStreakAlerts, setEnableStreakAlerts] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-light text-white uppercase tracking-[0.15em] flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-cyan-400" />
            <span>CÀI ĐẶT HỆ THỐNG & HỒ SƠ</span>
          </h2>
          <p className="text-xs text-white/50 font-mono mt-1">
            Cấu hình thông tin sinh viên, mục tiêu GPA, kỳ học và quản lý đồng bộ dữ liệu.
          </p>
        </div>

        {savedSuccess && (
          <div className="px-4 py-2 bg-cyan-400/20 text-cyan-300 rounded-xl text-xs font-mono font-semibold flex items-center gap-2 border border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            <Check className="w-4 h-4 text-cyan-400" />
            <span>Đã lưu cài đặt thành công!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Settings */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <User className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Thông tin Học viên & Sinh viên</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">Họ và tên</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">Email đăng ký</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400/60 font-mono transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">Chuyên ngành / Khoa</label>
              <input
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">Học kỳ hiện tại</label>
              <select
                value={currentSemester}
                onChange={(e) => setCurrentSemester(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400/60 font-mono transition-colors"
              >
                <option className="bg-[#060913]">Học kỳ 1 (2024 - 2025)</option>
                <option className="bg-[#060913]">Học kỳ 2 (2024 - 2025)</option>
                <option className="bg-[#060913]">Học kỳ Hè (2025)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Academic Goals */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Mục tiêu Học thuật & Tự học</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">Mục tiêu GPA tích lũy kỳ này</label>
              <input
                type="number"
                step="0.05"
                min="2.0"
                max="4.0"
                value={targetGpa}
                onChange={(e) => setTargetGpa(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">Mục tiêu tự học mỗi ngày (giờ)</label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="12"
                value={dailyGoalHours}
                onChange={(e) => setDailyGoalHours(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400/60 transition-colors"
              />
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-3.5 bg-black/40 border border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-all">
              <span className="text-xs font-mono text-white/80">Nhận thông báo nhắc nhở hạn nộp bài tập và lịch học</span>
              <input
                type="checkbox"
                checked={enableReminders}
                onChange={(e) => setEnableReminders(e.target.checked)}
                className="w-4 h-4 text-cyan-400 accent-cyan-400 rounded cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between p-3.5 bg-black/40 border border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-all">
              <span className="text-xs font-mono text-white/80">Theo dõi chuỗi Streak và thông báo khi sắp mất chuỗi</span>
              <input
                type="checkbox"
                checked={enableStreakAlerts}
                onChange={(e) => setEnableStreakAlerts(e.target.checked)}
                className="w-4 h-4 text-cyan-400 accent-cyan-400 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Data Backup & Reset */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <Database className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Sao lưu & Dữ liệu</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onExportData}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 rounded-xl text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Xuất dữ liệu dự phòng (JSON)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Khôi phục lại dữ liệu môn học mẫu ban đầu?')) {
                  onResetData();
                }
              }}
              className="px-4 py-2.5 bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-white/50 hover:text-rose-300 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer"
            >
              Khôi phục dữ liệu mặc định
            </button>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Lưu tất cả cài đặt</span>
          </button>
        </div>
      </form>
    </div>
  );
};
