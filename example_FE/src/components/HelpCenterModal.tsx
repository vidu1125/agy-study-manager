import React from 'react';
import { HelpCircle, BookOpen, Calendar, Trophy, Sparkles, CheckCircle2, MessageSquare, X } from 'lucide-react';

interface HelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpCenterModal: React.FC<HelpCenterModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const faqs = [
    {
      q: 'Làm thế nào để thêm một môn học mới?',
      a: 'Bạn có thể nhấn nút "+ New Course" ở thanh bên trái hoặc nút "+ Thêm Môn học mới" tại màn hình Danh sách môn học. Chọn loại môn "Trường" hoặc "Tự học" và điền các thông tin cần thiết.',
    },
    {
      q: 'Làm sao để đánh dấu một môn đã kết thúc / hoàn thành?',
      a: 'Trên danh sách môn học, rê chuột vào dòng của môn học đó và bấm nút "Kết thúc" ở cột Thao tác. Trạng thái sẽ được chuyển sang "Đã xong". Bạn có thể bấm "Học lại" để mở lại bất cứ lúc nào.',
    },
    {
      q: 'Tính năng Pomodoro Focus hoạt động như thế nào?',
      a: 'Khi nhấn vào một môn học, ngăn thông tin chi tiết sẽ hiển thị đồng hồ Pomodoro 25 phút. Sau khi hoàn thành phiên tập trung, số giờ học sẽ tự động được cộng vào tổng số giờ học của môn đó và bảng xếp hạng.',
    },
    {
      q: 'Thời khóa biểu có tự động đồng bộ từ môn học không?',
      a: 'Bạn có thể thêm trực tiếp các khung giờ vào Thời khóa biểu cho từng môn học và phân biệt rõ ràng giữa tiết học trên giảng đường và buổi tự học.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#060913]/95 backdrop-blur-2xl border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl p-6 text-left max-h-[85vh] overflow-y-auto font-sans">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-400/10 text-cyan-300 flex items-center justify-center border border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">Trung tâm Trợ giúp EduPulse</h3>
              <p className="text-xs text-white/50 font-mono">Hướng dẫn sử dụng và giải đáp các câu hỏi thường gặp</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
            Câu hỏi thường gặp (FAQ)
          </h4>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white/[0.03] backdrop-blur-xl p-4 rounded-xl border border-white/10 space-y-1.5 hover:border-white/20 transition-all">
                <h5 className="text-xs font-bold text-white font-mono">{faq.q}</h5>
                <p className="text-xs text-white/60 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all cursor-pointer active:scale-95"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
