import React from 'react';
import { Sparkles, CheckCircle2, Zap, Shield, BookOpen, Clock, X } from 'lucide-react';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const features = [
    'AI Trợ lý học tập thông minh: Tóm tắt slide & giải bài tập nhanh',
    'Tự động lên kế hoạch ôn thi & lộ trình cá nhân hóa',
    'Đồng bộ Thời khóa biểu 2 chiều với Google Calendar',
    'Xuất báo cáo tiến độ học tập & Bảng điểm đẹp mắt dạng PDF',
    'Không giới hạn số lượng môn học & tài liệu đính kèm',
    'Huy hiệu PRO vinh danh trên Bảng xếp hạng',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-gradient-to-b from-[#0a1128] via-[#060913] to-[#04060c] border border-cyan-400/40 rounded-2xl w-full max-w-lg shadow-[0_0_40px_rgba(34,211,238,0.2)] p-6 text-left relative overflow-hidden font-sans">
        {/* Glow decoration */}
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">EduPulse Premium</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 font-mono font-bold border border-cyan-400/30">
                  PRO VIP
                </span>
              </div>
              <p className="text-xs text-white/50 font-mono">Nâng tầm hiệu suất học tập với AI & công cụ chuyên sâu</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4 relative z-10">
          <div className="p-5 bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-cyan-400/30 text-center shadow-[0_0_20px_rgba(34,211,238,0.1)]">
            <div className="text-xs text-cyan-400 font-mono uppercase tracking-widest font-bold">Gói Sinh Viên & Tự Học</div>
            <div className="mt-2 flex items-baseline justify-center gap-1">
              <span className="text-3xl font-black text-white font-mono">49.000đ</span>
              <span className="text-xs text-white/50 font-mono">/ tháng</span>
            </div>
            <p className="text-[11px] text-cyan-300 mt-1.5 font-mono">✨ Dùng thử 7 ngày miễn phí không giới hạn</p>
          </div>

          <div className="space-y-2.5 pt-2">
            {features.map((feat, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-white/80">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-3 relative z-10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono text-white/40 hover:text-white transition-colors cursor-pointer"
          >
            Để sau
          </button>
          <button
            onClick={() => {
              alert('🎉 Chúc mừng bạn đã kích hoạt dùng thử 7 ngày EduPulse Premium!');
              onClose();
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all active:scale-95 cursor-pointer"
          >
            Kích hoạt trải nghiệm ngay
          </button>
        </div>
      </div>
    </div>
  );
};
