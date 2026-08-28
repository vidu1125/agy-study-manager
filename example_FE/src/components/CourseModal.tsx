import React, { useState, useEffect } from 'react';
import { Course, CourseType, CourseStatus, Priority } from '../types';
import { X, Plus, Save, BookOpen, User, Hash, Clock, MapPin, Target, FileText } from 'lucide-react';

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (courseData: Partial<Course>) => void;
  initialCourse?: Course | null;
}

export const CourseModal: React.FC<CourseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCourse,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<CourseType>('university');
  const [instructorOrSource, setInstructorOrSource] = useState('');
  const [credits, setCredits] = useState<string>('3');
  const [priority, setPriority] = useState<Priority>('high');
  const [status, setStatus] = useState<CourseStatus>('in_progress');
  const [roomOrPlatform, setRoomOrPlatform] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [targetGrade, setTargetGrade] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialCourse) {
      setCode(initialCourse.code);
      setName(initialCourse.name);
      setType(initialCourse.type);
      setInstructorOrSource(initialCourse.instructorOrSource);
      setCredits(initialCourse.credits !== null && initialCourse.credits !== undefined ? String(initialCourse.credits) : '');
      setPriority(initialCourse.priority);
      setStatus(initialCourse.status);
      setRoomOrPlatform(initialCourse.roomOrPlatform || '');
      setScheduleTime(initialCourse.scheduleTime || '');
      setTargetGrade(initialCourse.targetGrade || '');
      setNotes(initialCourse.notes || '');
    } else {
      // Default reset for new subject
      setCode('');
      setName('');
      setType('university');
      setInstructorOrSource('');
      setCredits('3');
      setPriority('high');
      setStatus('in_progress');
      setRoomOrPlatform('');
      setScheduleTime('');
      setTargetGrade('');
      setNotes('');
    }
  }, [initialCourse, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      alert('Vui lòng nhập Mã môn học và Tên môn học!');
      return;
    }

    const courseData: Partial<Course> = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      type,
      instructorOrSource: instructorOrSource.trim() || (type === 'university' ? 'Chưa cập nhật' : 'Tự học'),
      credits: type === 'university' && credits ? Number(credits) : null,
      priority,
      status,
      roomOrPlatform: roomOrPlatform.trim(),
      scheduleTime: scheduleTime.trim(),
      targetGrade: targetGrade.trim(),
      notes: notes.trim(),
    };

    onSave(courseData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#060913]/95 backdrop-blur-2xl border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-left my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white/[0.02] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center border border-cyan-400/20 shadow-[0_0_12px_rgba(34,211,238,0.15)]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                {initialCourse ? 'Chỉnh sửa Môn học' : 'Thêm Môn học mới'}
              </h3>
              <p className="text-xs text-white/40 font-mono">
                {type === 'university' ? 'PROGRAM: UNIVERSITY ACCREDITATION' : 'PLAN: SELF-STUDY & INDEPENDENT LEARNING'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-sans">
          {/* Loại môn tabs */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1.5">
              Loại môn học <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setType('university');
                  if (!credits) setCredits('3');
                }}
                className={`py-2.5 px-4 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  type === 'university'
                    ? 'bg-cyan-400/15 border border-cyan-400/40 text-cyan-300 font-bold shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                    : 'bg-white/[0.03] border border-white/10 text-white/40 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <span>🏛️ Môn học ở Trường</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('self-study');
                  setCredits('');
                }}
                className={`py-2.5 px-4 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  type === 'self-study'
                    ? 'bg-amber-400/15 border border-amber-400/40 text-amber-300 font-bold shadow-[0_0_12px_rgba(251,146,60,0.2)]'
                    : 'bg-white/[0.03] border border-white/10 text-white/40 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <span>💡 Tự học / Khóa học ngoài</span>
              </button>
            </div>
          </div>

          {/* Row: Mã môn & Tên môn */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">
                Mã môn <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="VD: TOA101, IELTS..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/60 font-mono uppercase"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">
                Tên môn học <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <BookOpen className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Toán Cao Cấp 1, Luyện thi IELTS 7.0+..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/60"
                />
              </div>
            </div>
          </div>

          {/* Row: Giảng viên/Nguồn & Tín chỉ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">
                {type === 'university' ? 'Giảng viên phụ trách' : 'Nguồn học / Nền tảng'}
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={instructorOrSource}
                  onChange={(e) => setInstructorOrSource(e.target.value)}
                  placeholder={type === 'university' ? 'VD: PGS.TS Nguyễn Văn A' : 'VD: Coursera / YouTube / Sách'}
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">
                Số tín chỉ {type === 'self-study' && <span className="text-white/40 font-normal">(Tùy chọn)</span>}
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                placeholder={type === 'university' ? '3' : '-'}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/60 font-mono"
              />
            </div>
          </div>

          {/* Row: Ưu tiên & Trạng thái */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">
                Mức ưu tiên
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/60"
              >
                <option value="high" className="bg-[#060913] text-white">🔴 Cao (Cần chú trọng đặc biệt)</option>
                <option value="medium" className="bg-[#060913] text-white">🟡 Trung bình (Duy trì đều)</option>
                <option value="low" className="bg-[#060913] text-white">🟢 Thấp (Thời gian linh hoạt)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">
                Trạng thái hiện tại
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CourseStatus)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/60"
              >
                <option value="in_progress" className="bg-[#060913] text-white">🟢 Đang học</option>
                <option value="completed" className="bg-[#060913] text-white">⚪ Đã xong (Hoàn thành)</option>
                <option value="paused" className="bg-[#060913] text-white">🟡 Tạm dừng</option>
              </select>
            </div>
          </div>

          {/* Row: Phòng học / Địa điểm & Lịch học */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">
                Phòng học / Địa điểm
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={roomOrPlatform}
                  onChange={(e) => setRoomOrPlatform(e.target.value)}
                  placeholder="VD: Phòng B204 / Zoom / Thư viện"
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">
                Lịch học trong tuần
              </label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  placeholder="VD: Thứ 2 (07:30 - 10:00), Thứ 4..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/60"
                />
              </div>
            </div>
          </div>

          {/* Row: Mục tiêu điểm */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">
              Mục tiêu kết quả (Grade / Band / Output)
            </label>
            <div className="relative">
              <Target className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
                placeholder="VD: Điểm A (8.5+), IELTS 7.5, Hoàn thành 1 mini-app..."
                className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/60"
              />
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">
              Ghi chú trọng tâm & Lưu ý
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú kiến thức trọng tâm, tài liệu ôn thi hoặc checklist..."
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-400/60 resize-none"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{initialCourse ? 'Lưu thay đổi' : 'Tạo môn học'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
