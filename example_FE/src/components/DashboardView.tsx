import React from 'react';
import { Course, ScheduleEvent } from '../types';
import { 
  BookOpen, 
  GraduationCap, 
  Clock, 
  Flame, 
  CalendarDays, 
  CheckCircle2, 
  ArrowUpRight, 
  Sparkles, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface DashboardViewProps {
  courses: Course[];
  schedule: ScheduleEvent[];
  onSelectCourse: (course: Course) => void;
  onOpenNewCourse: () => void;
  onNavigateTab: (tab: 'courses' | 'schedule' | 'leaderboard') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  courses,
  schedule,
  onSelectCourse,
  onOpenNewCourse,
  onNavigateTab,
}) => {
  const inProgressCourses = courses.filter((c) => c.status === 'in_progress');
  const completedCourses = courses.filter((c) => c.status === 'completed');
  const universityCredits = courses
    .filter((c) => c.type === 'university' && c.credits)
    .reduce((sum, c) => sum + (c.credits || 0), 0);
  const totalHours = courses.reduce((sum, c) => sum + (c.totalHoursStudied || 0), 0);

  // Urgent pending tasks
  const allTasks = courses.flatMap((c) => 
    (c.tasks || []).map((t) => ({ ...t, courseName: c.name, courseCode: c.code, courseId: c.id }))
  );
  const pendingTasks = allTasks.filter((t) => !t.completed).slice(0, 5);

  return (
    <div className="space-y-6 text-left">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-950/40 via-cyan-950/20 to-purple-950/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 text-cyan-300 text-[10px] font-mono font-bold mb-4 border border-cyan-400/20 shadow-[0_0_12px_rgba(34,211,238,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="tracking-widest uppercase">Semester 1 • Academic Year 2024-2025</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-light text-white uppercase tracking-[0.15em]">
            Chào mừng trở lại, Việt Dũng!
          </h2>
          <p className="text-xs sm:text-sm text-white/60 mt-2 font-mono leading-relaxed">
            Hôm nay bạn có 2 buổi học trên lớp và 1 mục tiêu tự học IELTS Writing. Chuỗi nhiệm vụ đang kích hoạt 21 ngày liên tiếp.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigateTab('courses')}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95"
            >
              <BookOpen className="w-4 h-4" />
              <span className="tracking-wide">Xem tất cả môn học</span>
            </button>
            <button
              onClick={() => onNavigateTab('schedule')}
              className="bg-white/5 hover:bg-white/10 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border border-white/10 cursor-pointer"
            >
              <CalendarDays className="w-4 h-4 text-cyan-400" />
              <span>Xem Thời khóa biểu</span>
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl hover:border-cyan-500/30 transition-all">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Môn đang học</p>
            <h3 className="text-2xl font-bold text-white font-mono mt-1">{inProgressCourses.length} môn</h3>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
              <TrendingUp className="w-3 h-3" /> Đang theo đúng tiến độ
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center border border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl hover:border-amber-500/30 transition-all">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Tín chỉ Trường HK1</p>
            <h3 className="text-2xl font-bold text-amber-400 font-mono mt-1">{universityCredits} TC</h3>
            <p className="text-[11px] font-mono text-white/40 mt-1">
              Đã xong: {completedCourses.length} môn
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center border border-amber-400/20 shadow-[0_0_15px_rgba(251,146,60,0.15)]">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl hover:border-emerald-500/30 transition-all">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Giờ học tích lũy</p>
            <h3 className="text-2xl font-bold text-emerald-400 font-mono mt-1">{totalHours} giờ</h3>
            <p className="text-[11px] font-mono text-emerald-400/70 mt-1">
              Tuần này: 34.5 giờ
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center border border-emerald-400/20 shadow-[0_0_15px_rgba(74,222,128,0.15)]">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl hover:border-rose-500/30 transition-all">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Chuỗi học tập</p>
            <h3 className="text-2xl font-bold text-rose-400 font-mono mt-1">21 Ngày 🔥</h3>
            <p className="text-[11px] font-mono text-white/40 mt-1">
              Hạng #3 Bảng xếp hạng
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
            <Flame className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Active Courses & Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Subjects with Fast Progress */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Tiến độ các môn đang học</span>
            </h3>
            <button
              onClick={() => onNavigateTab('courses')}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-mono"
            >
              <span>Xem tất cả</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inProgressCourses.map((course) => (
              <div
                key={course.id}
                onClick={() => onSelectCourse(course)}
                className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-cyan-400/40 rounded-2xl p-5 transition-all cursor-pointer shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
                      {course.code}
                    </span>
                    {course.type === 'university' ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white/5 text-white/50 border border-white/10">
                        Trường ({course.credits} TC)
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20">
                        Tự học
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white truncate">{course.name}</h4>
                  <p className="text-xs text-white/40 mt-1 truncate">{course.instructorOrSource}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                    <span className="text-white/40">Tiến độ học</span>
                    <span className="font-bold text-cyan-400">{course.progress}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Deadlines / Upcoming Tasks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Nhiệm vụ & Deadline sắp tới</span>
            </h3>
          </div>

          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
            {pendingTasks.length === 0 ? (
              <div className="text-center py-8 text-xs text-white/40 font-mono">
                Tuyệt vời! Không còn bài tập hoặc deadline nào tồn đọng.
              </div>
            ) : (
              pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl border border-white/5 flex items-start justify-between gap-3 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 mb-1">
                      <span>[{task.courseCode}]</span>
                      <span className="text-white/40 truncate">{task.courseName}</span>
                    </div>
                    <p className="text-xs font-medium text-white line-clamp-2">{task.title}</p>
                  </div>
                  <span className="text-[10px] text-rose-400 font-mono bg-rose-500/10 px-2 py-0.5 rounded-lg shrink-0 border border-rose-500/20">
                    {task.dueDate}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
