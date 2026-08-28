import React, { useState, useMemo } from 'react';
import { Course, CourseType, CourseStatus, Priority } from '../types';
import { 
  Plus, 
  Search, 
  Filter, 
  BookOpen, 
  GraduationCap, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  Check, 
  RotateCcw,
  ArrowUpDown,
  BookMarked,
  Layers
} from 'lucide-react';

interface CourseListProps {
  courses: Course[];
  searchQuery: string;
  onOpenNewCourse: () => void;
  onSelectCourse: (course: Course) => void;
  onEditCourse: (course: Course) => void;
  onDeleteCourse: (id: string) => void;
  onToggleCourseStatus: (id: string) => void;
}

export const CourseList: React.FC<CourseListProps> = ({
  courses,
  searchQuery,
  onOpenNewCourse,
  onSelectCourse,
  onEditCourse,
  onDeleteCourse,
  onToggleCourseStatus,
}) => {
  const [typeFilter, setTypeFilter] = useState<'all' | CourseType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | CourseStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [sortField, setSortField] = useState<'code' | 'name' | 'credits' | 'priority'>('code');
  const [sortAsc, setSortAsc] = useState(true);

  // Filter and sort logic
  const filteredCourses = useMemo(() => {
    return courses
      .filter((course) => {
        // Global search query
        const matchesSearch = 
          !searchQuery ||
          course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.instructorOrSource.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (course.notes && course.notes.toLowerCase().includes(searchQuery.toLowerCase()));

        // Type filter
        const matchesType = typeFilter === 'all' || course.type === typeFilter;

        // Status filter
        const matchesStatus = statusFilter === 'all' || course.status === statusFilter;

        // Priority filter
        const matchesPriority = priorityFilter === 'all' || course.priority === priorityFilter;

        return matchesSearch && matchesType && matchesStatus && matchesPriority;
      })
      .sort((a, b) => {
        if (sortField === 'code') {
          return sortAsc ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code);
        }
        if (sortField === 'name') {
          return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        }
        if (sortField === 'credits') {
          const credA = a.credits ?? 0;
          const credB = b.credits ?? 0;
          return sortAsc ? credA - credB : credB - credA;
        }
        if (sortField === 'priority') {
          const pOrder: Record<Priority, number> = { high: 3, medium: 2, low: 1 };
          return sortAsc ? pOrder[a.priority] - pOrder[b.priority] : pOrder[b.priority] - pOrder[a.priority];
        }
        return 0;
      });
  }, [courses, searchQuery, typeFilter, statusFilter, priorityFilter, sortField, sortAsc]);

  // Statistics calculation
  const totalCourses = courses.length;
  const inProgressCourses = courses.filter((c) => c.status === 'in_progress').length;
  const completedCourses = courses.filter((c) => c.status === 'completed').length;
  const universityCredits = courses
    .filter((c) => c.type === 'university' && c.credits)
    .reduce((sum, c) => sum + (c.credits || 0), 0);
  const totalStudyHours = courses.reduce((sum, c) => sum + (c.totalHoursStudied || 0), 0);

  const handleSort = (field: 'code' | 'name' | 'credits' | 'priority') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-[0.2em]">Module Registry</span>
          </div>
          <h2 className="text-xl md:text-2xl font-light text-white uppercase tracking-[0.15em]">
            Danh Sách Môn Học (Trường & Tự Học)
          </h2>
          <p className="text-xs text-white/40 tracking-wider mt-1 font-mono">
            SYSTEM STATUS: SYNCHRONIZED // ACTIVE COURSE MATRIX
          </p>
        </div>

        <button
          id="btn-add-new-subject"
          onClick={onOpenNewCourse}
          className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-cyan-400/30 shrink-0 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span className="tracking-wide">Thêm Môn học mới</span>
        </button>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 hover:border-cyan-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center border border-cyan-400/20 shadow-[0_0_12px_rgba(34,211,238,0.15)]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Tổng môn học</div>
            <div className="text-xl font-bold text-white font-mono mt-0.5">{totalCourses} <span className="text-xs font-normal text-white/40">môn</span></div>
          </div>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 hover:border-emerald-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center border border-emerald-400/20 shadow-[0_0_12px_rgba(74,222,128,0.15)]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Đang theo học</div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{inProgressCourses} <span className="text-xs font-normal text-white/40">môn</span></div>
          </div>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 hover:border-amber-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center border border-amber-400/20 shadow-[0_0_12px_rgba(251,146,60,0.15)]">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Tín chỉ Trường</div>
            <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">{universityCredits} <span className="text-xs font-normal text-white/40">TC</span></div>
          </div>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 hover:border-cyan-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/10 text-cyan-300 flex items-center justify-center border border-cyan-400/20 shadow-[0_0_12px_rgba(34,211,238,0.15)]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Đã hoàn thành</div>
            <div className="text-xl font-bold text-white font-mono mt-0.5">{completedCourses} <span className="text-xs font-normal text-white/40">môn</span></div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-black/40 backdrop-blur-xl p-3 rounded-2xl border border-white/10">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-white/40 mr-2 font-mono flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" /> FILTER:
          </span>
          
          <button
            onClick={() => { setTypeFilter('all'); setStatusFilter('all'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
              typeFilter === 'all' && statusFilter === 'all'
                ? 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/40 font-bold shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            Tất cả ({courses.length})
          </button>

          <button
            onClick={() => setTypeFilter(typeFilter === 'university' ? 'all' : 'university')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
              typeFilter === 'university'
                ? 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/40 font-bold shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            Môn Trường ({courses.filter(c => c.type === 'university').length})
          </button>

          <button
            onClick={() => setTypeFilter(typeFilter === 'self-study' ? 'all' : 'self-study')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
              typeFilter === 'self-study'
                ? 'bg-amber-400/15 text-amber-300 border border-amber-400/40 font-bold shadow-[0_0_10px_rgba(251,146,60,0.2)]'
                : 'bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            Tự học ({courses.filter(c => c.type === 'self-study').length})
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
              statusFilter === 'in_progress'
                ? 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/40 font-bold shadow-[0_0_10px_rgba(74,222,128,0.2)]'
                : 'bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            Đang học ({courses.filter(c => c.status === 'in_progress').length})
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
              statusFilter === 'completed'
                ? 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/40 font-bold shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            Đã xong ({courses.filter(c => c.status === 'completed').length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Priority selector */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'all' | Priority)}
            className="bg-black/50 border border-white/10 text-xs text-white/80 font-mono rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-400/60"
          >
            <option value="all">Tất cả ưu tiên</option>
            <option value="high">Ưu tiên: Cao</option>
            <option value="medium">Ưu tiên: Trung bình</option>
            <option value="low">Ưu tiên: Thấp</option>
          </select>
        </div>
      </div>

      {/* Table Container - Exact Match to Design System & HTML Mockup */}
      <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-white/40 text-[10px] font-mono tracking-widest uppercase select-none">
                <th 
                  onClick={() => handleSort('code')}
                  className="px-6 py-4 cursor-pointer hover:text-cyan-400 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>MÃ MÔN</span>
                    <ArrowUpDown className="w-3 h-3 text-cyan-400/60" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('name')}
                  className="px-6 py-4 cursor-pointer hover:text-cyan-400 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>TÊN MÔN</span>
                    <ArrowUpDown className="w-3 h-3 text-cyan-400/60" />
                  </div>
                </th>
                <th className="px-6 py-4">LOẠI MÔN</th>
                <th className="px-6 py-4">GIẢNG VIÊN / NGUỒN HỌC</th>
                <th 
                  onClick={() => handleSort('credits')}
                  className="px-6 py-4 text-center cursor-pointer hover:text-cyan-400 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>SỐ TÍN CHỈ</span>
                    <ArrowUpDown className="w-3 h-3 text-cyan-400/60" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('priority')}
                  className="px-6 py-4 text-center cursor-pointer hover:text-cyan-400 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>MỨC ƯU TIÊN</span>
                    <ArrowUpDown className="w-3 h-3 text-cyan-400/60" />
                  </div>
                </th>
                <th className="px-6 py-4 text-center">TRẠNG THÁI</th>
                <th className="px-6 py-4 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="text-xs text-[#d1d5db] divide-y divide-white/5 font-sans">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-white/40">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-cyan-400 border border-white/10">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-white">Không tìm thấy môn học nào</p>
                      <p className="text-xs text-white/40">Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.</p>
                      <button
                        onClick={() => {
                          setTypeFilter('all');
                          setStatusFilter('all');
                          setPriorityFilter('all');
                        }}
                        className="mt-2 px-4 py-1.5 bg-cyan-400/10 text-cyan-300 border border-cyan-400/30 rounded-xl text-xs font-mono hover:bg-cyan-400/20 transition-colors"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course) => {
                  const isCompleted = course.status === 'completed';

                  return (
                    <tr
                      key={course.id}
                      className="hover:bg-white/[0.04] transition-colors group cursor-pointer"
                      onClick={(e) => {
                        // Prevent click when clicking action buttons
                        if ((e.target as HTMLElement).closest('button')) return;
                        onSelectCourse(course);
                      }}
                    >
                      {/* Mã môn */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-mono bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 tracking-wider">
                          {course.code}
                        </span>
                      </td>

                      {/* Tên môn */}
                      <td className="px-6 py-4 font-medium text-white">
                        <div className="flex flex-col">
                          <span className="group-hover:text-cyan-300 transition-colors font-semibold">{course.name}</span>
                          {course.roomOrPlatform && (
                            <span className="text-[11px] font-mono text-white/40 mt-0.5 flex items-center gap-1">
                              📍 {course.roomOrPlatform}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Loại môn */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {course.type === 'university' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-white/[0.05] text-white/70 border border-white/10">
                            Trường
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-amber-400/10 text-amber-400 border border-amber-400/20 shadow-[0_0_8px_rgba(251,146,60,0.15)]">
                            Tự học
                          </span>
                        )}
                      </td>

                      {/* Giảng viên / Nguồn học */}
                      <td className="px-6 py-4 text-white/50 text-xs">
                        {course.instructorOrSource}
                      </td>

                      {/* Số tín chỉ */}
                      <td className="px-6 py-4 text-center font-mono text-xs">
                        {course.credits !== null && course.credits !== undefined ? (
                          <span className="font-bold text-white">{course.credits}</span>
                        ) : (
                          <span className="text-white/30">-</span>
                        )}
                      </td>

                      {/* Mức ưu tiên */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {course.priority === 'high' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.15)]">
                            High
                          </span>
                        ) : course.priority === 'medium' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Medium
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-white/5 text-white/50 border border-white/10">
                            Low
                          </span>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {course.status === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono bg-emerald-400/10 text-emerald-400 border border-emerald-400/30 shadow-[0_0_10px_rgba(74,222,128,0.2)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.8)]"></span>
                            ACTIVE
                          </span>
                        ) : course.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono bg-white/[0.04] text-white/50 border border-white/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
                            COMPLETED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono bg-amber-400/10 text-amber-400 border border-amber-400/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            PAUSED
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Main End / Complete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleCourseStatus(course.id);
                            }}
                            className={`text-[10px] font-mono transition-all px-3 py-1 rounded-lg cursor-pointer border ${
                              isCompleted
                                ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30 hover:bg-cyan-400/20 opacity-0 group-hover:opacity-100'
                                : 'text-white/60 hover:text-rose-400 bg-white/5 border-white/10 hover:border-rose-500/30 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100'
                            }`}
                            title={isCompleted ? 'Học lại môn này' : 'Đánh dấu đã hoàn thành'}
                          >
                            {isCompleted ? 'HỌC LẠI' : 'KẾT THÚC'}
                          </button>

                          {/* Detail button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCourse(course);
                            }}
                            className="p-1.5 rounded-lg text-white/40 hover:text-cyan-400 hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditCourse(course);
                            }}
                            className="p-1.5 rounded-lg text-white/40 hover:text-cyan-400 hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Chỉnh sửa môn học"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Bạn có chắc chắn muốn xóa môn học "${course.name}" (${course.code}) không?`)) {
                                onDeleteCourse(course.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Xóa môn học"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
