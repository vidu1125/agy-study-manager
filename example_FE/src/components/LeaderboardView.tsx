import React, { useState } from 'react';
import { LeaderboardUser } from '../types';
import { 
  Trophy, 
  Flame, 
  Clock, 
  Award, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  TrendingUp, 
  Medal,
  Star
} from 'lucide-react';

interface LeaderboardViewProps {
  leaderboard: LeaderboardUser[];
  onLogStudyHours: (hours: number, note: string) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  leaderboard,
  onLogStudyHours,
}) => {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'semester'>('week');
  const [showLogModal, setShowLogModal] = useState(false);
  const [logHours, setLogHours] = useState('2.5');
  const [logNote, setLogNote] = useState('Luyện đề IELTS Listening & Code React Component');

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hours = parseFloat(logHours);
    if (isNaN(hours) || hours <= 0) return;
    onLogStudyHours(hours, logNote);
    setShowLogModal(false);
    alert(`🎉 Đã ghi nhận thành công ${hours} giờ tự học vào bảng xếp hạng tuần!`);
  };

  return (
    <div className="space-y-6 text-left font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-light text-white uppercase tracking-[0.15em] flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>BẢNG XẾP HẠNG & THỬ THÁCH HỌC TẬP</span>
          </h2>
          <p className="text-xs text-white/50 font-mono mt-1">
            Thi đua số giờ tự học hiệu quả, duy trì chuỗi streak và kích hoạt huy hiệu học thuật.
          </p>
        </div>

        <button
          onClick={() => setShowLogModal(true)}
          className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Ghi nhận giờ tự học (+Giờ)</span>
        </button>
      </div>

      {/* Podium for Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        {/* Top 2 */}
        {top2 && (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-center flex flex-col items-center justify-between order-2 md:order-1 relative shadow-xl hover:border-white/20 transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-slate-300 text-black text-[10px] font-mono font-bold rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Medal className="w-3.5 h-3.5" /> Hạng 2
            </div>
            <div className="mt-2 w-16 h-16 rounded-full overflow-hidden border-2 border-slate-400 p-0.5 mb-2">
              <img src={top2.avatar} alt={top2.name} className="w-full h-full object-cover rounded-full" />
            </div>
            <h4 className="text-sm font-bold text-white">{top2.name}</h4>
            <p className="text-[11px] text-white/40 font-mono mt-0.5">{top2.schoolOrMajor}</p>
            <div className="mt-3 flex items-center gap-3 text-xs bg-black/40 px-4 py-2 rounded-xl border border-white/10 w-full justify-center font-mono">
              <span className="text-cyan-400 font-bold">⚡ {top2.studyHoursThisWeek}h</span>
              <span className="text-amber-400 font-bold">🔥 {top2.streakDays} ngày</span>
            </div>
          </div>
        )}

        {/* Top 1 (Center & Elevated) */}
        {top1 && (
          <div className="bg-gradient-to-b from-blue-950/40 via-cyan-950/20 to-purple-950/30 backdrop-blur-xl border-2 border-cyan-400/50 rounded-2xl p-6 text-center flex flex-col items-center justify-between order-1 md:order-2 relative shadow-[0_0_30px_rgba(34,211,238,0.2)] transform md:-translate-y-2">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-400 to-amber-500 text-black text-xs font-mono font-bold rounded-full uppercase tracking-wider flex items-center gap-1 shadow-md">
              <Trophy className="w-4 h-4" /> Quán Quân Top 1
            </div>
            <div className="mt-2 w-20 h-20 rounded-full overflow-hidden border-2 border-cyan-400 p-1 mb-2 shadow-[0_0_20px_rgba(34,211,238,0.4)]">
              <img src={top1.avatar} alt={top1.name} className="w-full h-full object-cover rounded-full" />
            </div>
            <h4 className="text-base font-bold text-white font-mono">{top1.name}</h4>
            <p className="text-xs text-cyan-300 mt-0.5 font-mono">{top1.schoolOrMajor}</p>
            <div className="mt-4 flex items-center gap-4 text-sm bg-black/50 px-5 py-2.5 rounded-xl border border-cyan-400/30 w-full justify-center font-mono">
              <span className="text-cyan-400 font-black">⚡ {top1.studyHoursThisWeek} giờ</span>
              <span className="text-amber-400 font-black">🔥 {top1.streakDays} ngày</span>
            </div>
          </div>
        )}

        {/* Top 3 */}
        {top3 && (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-center flex flex-col items-center justify-between order-3 relative shadow-xl hover:border-white/20 transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-amber-700 text-white text-[10px] font-mono font-bold rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Medal className="w-3.5 h-3.5" /> Hạng 3
            </div>
            <div className="mt-2 w-16 h-16 rounded-full overflow-hidden border-2 border-amber-600 p-0.5 mb-2">
              <img src={top3.avatar} alt={top3.name} className="w-full h-full object-cover rounded-full" />
            </div>
            <h4 className="text-sm font-bold text-white">{top3.name}</h4>
            <p className="text-[11px] text-white/40 font-mono mt-0.5">{top3.schoolOrMajor}</p>
            <div className="mt-3 flex items-center gap-3 text-xs bg-black/40 px-4 py-2 rounded-xl border border-white/10 w-full justify-center font-mono">
              <span className="text-cyan-400 font-bold">⚡ {top3.studyHoursThisWeek}h</span>
              <span className="text-amber-400 font-bold">🔥 {top3.streakDays} ngày</span>
            </div>
          </div>
        )}
      </div>

      {/* Full Leaderboard Table */}
      <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="p-4 bg-white/[0.02] border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Bảng Xếp Hạng Toàn Trường & Tự Học</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setTimeframe('week')}
              className={`px-3 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                timeframe === 'week' ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-bold' : 'bg-white/5 text-white/40 hover:text-white'
              }`}
            >
              Tuần này
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-3 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                timeframe === 'month' ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-bold' : 'bg-white/5 text-white/40 hover:text-white'
              }`}
            >
              Tháng này
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-black/40 text-white/40 text-[10px] font-mono font-medium uppercase tracking-wider">
                <th className="px-6 py-3.5 text-center">HẠNG</th>
                <th className="px-6 py-3.5">HỌC VIÊN / SINH VIÊN</th>
                <th className="px-6 py-3.5 text-center">GIỜ HỌC TUẦN NÀY</th>
                <th className="px-6 py-3.5 text-center">CHUỖI STREAK</th>
                <th className="px-6 py-3.5 text-center">MÔN HOÀN THÀNH</th>
                <th className="px-6 py-3.5 text-right">HUY HIỆU ĐẠT ĐƯỢC</th>
              </tr>
            </thead>
            <tbody className="text-xs text-white divide-y divide-white/5 font-sans">
              {leaderboard.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-white/[0.04] transition-colors ${
                    user.isCurrentUser ? 'bg-cyan-400/10 border-l-2 border-cyan-400' : ''
                  }`}
                >
                  <td className="px-6 py-4 text-center font-bold">
                    {user.rank === 1 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-black font-black text-xs font-mono">1</span>
                    ) : user.rank === 2 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-black font-black text-xs font-mono">2</span>
                    ) : user.rank === 3 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs font-mono">3</span>
                    ) : (
                      <span className="text-white/40 font-mono">#{user.rank}</span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{user.name}</span>
                          {user.isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-cyan-400/20 text-cyan-300 font-mono font-bold">Bạn</span>
                          )}
                        </div>
                        <div className="text-[11px] text-white/40 font-mono">{user.schoolOrMajor}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center font-bold font-mono text-sm text-cyan-400">
                    {user.studyHoursThisWeek}h
                  </td>

                  <td className="px-6 py-4 text-center font-bold text-amber-400 font-mono">
                    🔥 {user.streakDays} ngày
                  </td>

                  <td className="px-6 py-4 text-center font-mono text-white/60">
                    {user.completedCourses} môn
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {user.badges.map((b, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-cyan-400/10 text-cyan-300 border border-cyan-400/20"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Hours Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#060913]/95 backdrop-blur-2xl border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 text-left">
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2 pb-3 border-b border-white/10">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Ghi nhận giờ tự học hôm nay</span>
            </h3>

            <form onSubmit={handleLogSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">
                  Số giờ đã học (giờ)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="16"
                  required
                  value={logHours}
                  onChange={(e) => setLogHours(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-400/60"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">
                  Nội dung môn học / Kế hoạch tự học
                </label>
                <input
                  type="text"
                  required
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/60"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] cursor-pointer active:scale-95"
                >
                  Xác nhận cộng giờ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
