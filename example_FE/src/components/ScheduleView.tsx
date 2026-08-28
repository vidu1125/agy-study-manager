import React, { useState } from 'react';
import { Course, ScheduleEvent } from '../types';
import { 
  CalendarDays, 
  Plus, 
  Clock, 
  MapPin, 
  GraduationCap, 
  BookOpen, 
  X, 
  CheckCircle2,
  Calendar,
  Filter
} from 'lucide-react';

interface ScheduleViewProps {
  schedule: ScheduleEvent[];
  courses: Course[];
  onAddScheduleEvent: (event: ScheduleEvent) => void;
  onDeleteScheduleEvent: (id: string) => void;
  onSelectCourse: (course: Course) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  schedule,
  courses,
  onAddScheduleEvent,
  onDeleteScheduleEvent,
  onSelectCourse,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'university' | 'self-study'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Event Form State
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
  const [dayOfWeek, setDayOfWeek] = useState<number>(2);
  const [startTime, setStartTime] = useState('07:30');
  const [endTime, setEndTime] = useState('09:30');
  const [location, setLocation] = useState('Phòng B204');

  const days = [
    { num: 2, label: 'Thứ Hai', short: 'T2' },
    { num: 3, label: 'Thứ Ba', short: 'T3' },
    { num: 4, label: 'Thứ Tư', short: 'T4' },
    { num: 5, label: 'Thứ Năm', short: 'T5' },
    { num: 6, label: 'Thứ Sáu', short: 'T6' },
    { num: 7, label: 'Thứ Bảy', short: 'T7' },
    { num: 8, label: 'Chủ Nhật', short: 'CN' },
  ];

  const filteredSchedule = schedule.filter(
    (item) => filterType === 'all' || item.type === filterType
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const course = courses.find((c) => c.id === selectedCourseId);
    if (!course) return;

    const newEvent: ScheduleEvent = {
      id: `sch-${Date.now()}`,
      courseId: course.id,
      courseCode: course.code,
      courseName: course.name,
      dayOfWeek,
      startTime,
      endTime,
      location: location.trim() || 'Online / Phòng học',
      type: course.type,
      color: course.type === 'university' ? '#8083ff' : '#ffb95f',
    };

    onAddScheduleEvent(newEvent);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 text-left font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-light text-white uppercase tracking-[0.15em] flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-cyan-400" />
            <span>THỜI KHÓA BIỂU & LỊCH TỰ HỌC</span>
          </h2>
          <p className="text-xs text-white/50 font-mono mt-1">
            Lịch học tuần kết hợp lịch giảng đường đại học và khung giờ tự học cá nhân.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Thêm Khung giờ học</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.03] backdrop-blur-xl p-3.5 rounded-2xl border border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono uppercase text-white/40 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" /> Lọc:
          </span>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-bold shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'bg-white/5 text-white/50 hover:text-white'
            }`}
          >
            Tất cả ({schedule.length})
          </button>
          <button
            onClick={() => setFilterType('university')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
              filterType === 'university'
                ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-bold shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'bg-white/5 text-white/50 hover:text-white'
            }`}
          >
            🏛️ Trường ({schedule.filter(s => s.type === 'university').length})
          </button>
          <button
            onClick={() => setFilterType('self-study')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
              filterType === 'self-study'
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold shadow-[0_0_10px_rgba(251,146,60,0.2)]'
                : 'bg-white/5 text-white/50 hover:text-white'
            }`}
          >
            💡 Tự học ({schedule.filter(s => s.type === 'self-study').length})
          </button>
        </div>

        <div className="text-xs font-mono text-cyan-400/60 hidden sm:block">
          SEMESTER 1 • WEEK 12
        </div>
      </div>

      {/* Weekly Grid (7 Days Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {days.map((day) => {
          const dayEvents = filteredSchedule
            .filter((item) => item.dayOfWeek === day.num)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          return (
            <div
              key={day.num}
              className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden flex flex-col min-h-[350px] backdrop-blur-xl"
            >
              {/* Day Column Header */}
              <div className="p-3 bg-white/[0.04] border-b border-white/10 text-center">
                <span className="text-xs font-bold text-white font-mono">{day.label}</span>
                <span className="block text-[10px] text-white/40 font-mono mt-0.5">{day.short}</span>
              </div>

              {/* Day Events Slot */}
              <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                {dayEvents.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[11px] text-white/20 p-4 text-center font-mono">
                    Trống lịch
                  </div>
                ) : (
                  dayEvents.map((event) => {
                    const linkedCourse = courses.find((c) => c.id === event.courseId);

                    return (
                      <div
                        key={event.id}
                        onClick={() => linkedCourse && onSelectCourse(linkedCourse)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all hover:scale-[1.02] shadow-md group ${
                          event.type === 'university'
                            ? 'bg-cyan-950/20 border-cyan-400/30 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                            : 'bg-amber-950/20 border-amber-400/30 hover:border-amber-400 hover:shadow-[0_0_15px_rgba(251,146,60,0.2)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-mono font-bold ${event.type === 'university' ? 'text-cyan-300' : 'text-amber-300'}`}>
                            {event.courseCode}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteScheduleEvent(event.id);
                            }}
                            className="text-white/30 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                            title="Xóa khung giờ"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        <h5 className="text-xs font-bold text-white mt-1 line-clamp-2 leading-tight">
                          {event.courseName}
                        </h5>

                        <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1 text-[11px]">
                          <div className="flex items-center gap-1 font-mono text-cyan-300">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            <span>{event.startTime} - {event.endTime}</span>
                          </div>
                          <div className="flex items-center gap-1 truncate text-[10px] text-white/50">
                            <MapPin className="w-3 h-3 text-white/40" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Schedule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#060913]/95 backdrop-blur-2xl border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 text-left">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>Thêm khung giờ vào Thời khóa biểu</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">
                  Chọn môn học
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/60"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#060913] text-white">
                      [{c.code}] {c.name} ({c.type === 'university' ? 'Trường' : 'Tự học'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">
                  Thứ trong tuần
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/60 font-mono"
                >
                  {days.map((d) => (
                    <option key={d.num} value={d.num} className="bg-[#060913] text-white">
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">
                    Bắt đầu
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/60 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">
                    Kết thúc
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/60 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-1">
                  Địa điểm / Phòng học
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="VD: Phòng B204 / Zoom / Notion"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/60"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] cursor-pointer active:scale-95"
                >
                  Lưu vào lịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
