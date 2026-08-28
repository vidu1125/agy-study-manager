import React, { useState, useEffect } from 'react';
import { Course, CourseTask, CourseMaterial } from '../types';
import { 
  X, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  Circle, 
  Plus, 
  BookOpen, 
  Clock, 
  MapPin, 
  User, 
  Target, 
  FileText, 
  ExternalLink,
  Flame,
  Award
} from 'lucide-react';

interface CourseDetailDrawerProps {
  course: Course | null;
  onClose: () => void;
  onEdit: (course: Course) => void;
  onDelete: (id: string) => void;
  onUpdateCourse: (updated: Course) => void;
}

export const CourseDetailDrawer: React.FC<CourseDetailDrawerProps> = ({
  course,
  onClose,
  onEdit,
  onDelete,
  onUpdateCourse,
}) => {
  if (!course) return null;

  // Task state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');

  // Pomodoro Focus Timer State
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'pomodoro' | 'short_break'>('pomodoro');

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      // Auto log 25 mins to course study hours
      if (timerMode === 'pomodoro') {
        const addedHours = 0.42; // ~25 mins
        const updated = {
          ...course,
          totalHoursStudied: Number(((course.totalHoursStudied || 0) + addedHours).toFixed(1)),
        };
        onUpdateCourse(updated);
        alert(`🎉 Chúc mừng bạn đã hoàn thành phiên tập trung 25 phút cho môn "${course.name}"! Đã cộng vào tổng giờ học.`);
      }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds, timerMode, course]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Toggle task
  const handleToggleTask = (taskId: string) => {
    const updatedTasks = (course.tasks || []).map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    const completedCount = updatedTasks.filter((t) => t.completed).length;
    const progress = updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : course.progress;

    onUpdateCourse({
      ...course,
      tasks: updatedTasks,
      progress,
    });
  };

  // Add task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: CourseTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      dueDate: newTaskDue || new Date().toISOString().split('T')[0],
      completed: false,
    };

    const updatedTasks = [...(course.tasks || []), newTask];
    onUpdateCourse({
      ...course,
      tasks: updatedTasks,
    });
    setNewTaskTitle('');
    setNewTaskDue('');
  };

  // Delete task
  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = (course.tasks || []).filter((t) => t.id !== taskId);
    onUpdateCourse({
      ...course,
      tasks: updatedTasks,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md">
      <div className="bg-[#060913]/95 backdrop-blur-2xl border-l border-white/10 w-full max-w-xl h-full shadow-2xl flex flex-col text-left font-sans animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 bg-white/[0.02] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 shadow-[0_0_10px_rgba(34,211,238,0.15)]">
              {course.code}
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white truncate font-mono">{course.name}</h3>
              <p className="text-xs text-white/40 font-mono">
                {course.type === 'university' ? 'PROGRAM: UNIVERSITY COURSE' : 'PLAN: INDEPENDENT STUDY'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(course)}
              className="p-2 rounded-xl text-white/40 hover:text-cyan-400 hover:bg-white/10 transition-colors cursor-pointer"
              title="Chỉnh sửa môn học"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Xóa môn ${course.name}?`)) {
                  onDelete(course.id);
                  onClose();
                }
              }}
              className="p-2 rounded-xl text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Xóa môn học"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white/[0.03] backdrop-blur-xl p-3.5 rounded-2xl border border-white/10">
              <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Số tín chỉ</div>
              <div className="text-sm font-bold text-white font-mono mt-1">
                {course.credits ? `${course.credits} Tín chỉ` : 'Tự do'}
              </div>
            </div>

            <div className="bg-white/[0.03] backdrop-blur-xl p-3.5 rounded-2xl border border-white/10">
              <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Mức ưu tiên</div>
              <div className="text-sm font-bold font-mono mt-1">
                {course.priority === 'high' ? (
                  <span className="text-rose-400">🔴 Cao</span>
                ) : course.priority === 'medium' ? (
                  <span className="text-amber-400">🟡 Trung bình</span>
                ) : (
                  <span className="text-emerald-400">🟢 Thấp</span>
                )}
              </div>
            </div>

            <div className="bg-white/[0.03] backdrop-blur-xl p-3.5 rounded-2xl border border-white/10">
              <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Tổng giờ học</div>
              <div className="text-sm font-bold text-emerald-400 font-mono mt-1">
                🔥 {course.totalHoursStudied || 0} giờ
              </div>
            </div>
          </div>

          {/* Details list */}
          <div className="bg-white/[0.03] backdrop-blur-xl p-4 rounded-2xl border border-white/10 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-white">
              <User className="w-4 h-4 text-white/40 shrink-0" />
              <span className="text-white/40">Phụ trách/Nguồn:</span>
              <span className="font-semibold">{course.instructorOrSource}</span>
            </div>

            {course.roomOrPlatform && (
              <div className="flex items-center gap-2 text-white">
                <MapPin className="w-4 h-4 text-white/40 shrink-0" />
                <span className="text-white/40">Địa điểm / Nền tảng:</span>
                <span className="font-semibold">{course.roomOrPlatform}</span>
              </div>
            )}

            {course.scheduleTime && (
              <div className="flex items-center gap-2 text-white">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-white/40">Lịch học:</span>
                <span className="font-semibold text-cyan-300 font-mono">{course.scheduleTime}</span>
              </div>
            )}

            {course.targetGrade && (
              <div className="flex items-center gap-2 text-white">
                <Target className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-white/40">Mục tiêu điểm số:</span>
                <span className="font-bold text-amber-400 font-mono">{course.targetGrade}</span>
              </div>
            )}
          </div>

          {/* Pomodoro Focus Timer Widget */}
          <div className="bg-gradient-to-br from-blue-950/30 to-purple-950/20 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 font-mono uppercase tracking-wider">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Đồng hồ Pomodoro học tập</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerMode('pomodoro');
                    setTimerSeconds(25 * 60);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    timerMode === 'pomodoro' ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30' : 'bg-white/5 text-white/40 hover:text-white'
                  }`}
                >
                  25p Focus
                </button>
                <button
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerMode('short_break');
                    setTimerSeconds(5 * 60);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    timerMode === 'short_break' ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30' : 'bg-white/5 text-white/40 hover:text-white'
                  }`}
                >
                  5p Nghỉ
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/10">
              <div className="font-mono text-3xl font-light text-white tracking-widest">
                {formatTimer(timerSeconds)}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 ${
                    isTimerRunning
                      ? 'bg-amber-500 hover:bg-amber-400 text-black'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                  }`}
                >
                  {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isTimerRunning ? 'Tạm dừng' : 'Bắt đầu học'}</span>
                </button>
                <button
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSeconds(timerMode === 'pomodoro' ? 25 * 60 : 5 * 60);
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer border border-white/5"
                  title="Đặt lại đồng hồ"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Tasks / Assignments Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono uppercase tracking-wider text-white/60 flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Nhiệm vụ & Bài tập ({course.tasks?.filter((t) => t.completed).length || 0}/{(course.tasks?.length || 0)})</span>
              </h4>
            </div>

            {/* Add Task Form */}
            <form onSubmit={handleAddTask} className="flex gap-2">
              <input
                type="text"
                placeholder="Thêm bài tập / deadline mới..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/60"
              />
              <input
                type="date"
                value={newTaskDue}
                onChange={(e) => setNewTaskDue(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white/60 focus:outline-none focus:border-cyan-400/60 font-mono"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-[0_0_10px_rgba(37,99,235,0.3)] active:scale-95"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            {/* Tasks list */}
            <div className="space-y-2">
              {(!course.tasks || course.tasks.length === 0) ? (
                <div className="text-center py-6 text-xs text-white/40 bg-white/[0.02] rounded-2xl border border-white/5 font-mono">
                  Chưa có nhiệm vụ hoặc bài tập nào cho môn này.
                </div>
              ) : (
                course.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      task.completed
                        ? 'bg-white/[0.01] border-white/5 opacity-60'
                        : 'bg-white/[0.03] border-white/10 hover:border-cyan-400/40 shadow-sm'
                    }`}
                  >
                    <div
                      onClick={() => handleToggleTask(task.id)}
                      className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-white/40 hover:text-cyan-400 shrink-0 transition-colors" />
                      )}
                      <span
                        className={`text-xs truncate ${
                          task.completed ? 'line-through text-white/40' : 'text-white font-medium'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] text-white/40 font-mono">
                        {task.dueDate}
                      </span>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-white/30 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notes & Study Focus */}
          {course.notes && (
            <div className="bg-white/[0.03] backdrop-blur-xl p-4 rounded-2xl border border-white/10 space-y-2">
              <div className="text-xs font-mono uppercase tracking-wider font-bold text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Ghi chú trọng tâm</span>
              </div>
              <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">
                {course.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
