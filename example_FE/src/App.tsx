import React, { useState, useEffect } from 'react';
import { Course, ScheduleEvent, LeaderboardUser, NotificationItem, ActiveTab } from './types';
import { INITIAL_COURSES, INITIAL_SCHEDULE, INITIAL_LEADERBOARD, INITIAL_NOTIFICATIONS } from './data/mockData';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { CourseList } from './components/CourseList';
import { CourseModal } from './components/CourseModal';
import { CourseDetailDrawer } from './components/CourseDetailDrawer';
import { DashboardView } from './components/DashboardView';
import { ScheduleView } from './components/ScheduleView';
import { LeaderboardView } from './components/LeaderboardView';
import { SettingsView } from './components/SettingsView';
import { HelpCenterModal } from './components/HelpCenterModal';
import { PremiumModal } from './components/PremiumModal';

export default function App() {
  // State initialization with localStorage persistence fallback
  const [activeTab, setActiveTab] = useState<ActiveTab>('courses');
  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem('edupulse_courses');
    return saved ? JSON.parse(saved) : INITIAL_COURSES;
  });

  const [schedule, setSchedule] = useState<ScheduleEvent[]>(() => {
    const saved = localStorage.getItem('edupulse_schedule');
    return saved ? JSON.parse(saved) : INITIAL_SCHEDULE;
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>(() => {
    const saved = localStorage.getItem('edupulse_leaderboard');
    return saved ? JSON.parse(saved) : INITIAL_LEADERBOARD;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Drawers state
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('edupulse_courses', JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem('edupulse_schedule', JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem('edupulse_leaderboard', JSON.stringify(leaderboard));
  }, [leaderboard]);

  // Course handlers
  const handleOpenNewCourse = () => {
    setEditingCourse(null);
    setIsCourseModalOpen(true);
  };

  const handleOpenEditCourse = (course: Course) => {
    setEditingCourse(course);
    setIsCourseModalOpen(true);
  };

  const handleSaveCourse = (courseData: Partial<Course>) => {
    if (editingCourse) {
      // Update existing course
      const updatedList = courses.map((c) =>
        c.id === editingCourse.id ? ({ ...c, ...courseData } as Course) : c
      );
      setCourses(updatedList);
      if (selectedCourse && selectedCourse.id === editingCourse.id) {
        setSelectedCourse({ ...selectedCourse, ...courseData } as Course);
      }
    } else {
      // Create new course
      const newCourse: Course = {
        id: `course-${Date.now()}`,
        code: courseData.code || 'COURSE-NEW',
        name: courseData.name || 'Môn học mới',
        type: courseData.type || 'university',
        instructorOrSource: courseData.instructorOrSource || 'Chưa cập nhật',
        credits: courseData.credits ?? (courseData.type === 'university' ? 3 : null),
        priority: courseData.priority || 'medium',
        status: courseData.status || 'in_progress',
        progress: 0,
        roomOrPlatform: courseData.roomOrPlatform || '',
        scheduleTime: courseData.scheduleTime || '',
        notes: courseData.notes || '',
        targetGrade: courseData.targetGrade || '',
        totalHoursStudied: 0,
        tasks: [],
        materials: [],
        createdAt: new Date().toISOString().split('T')[0],
      };
      setCourses([newCourse, ...courses]);
    }
  };

  const handleDeleteCourse = (id: string) => {
    setCourses(courses.filter((c) => c.id !== id));
    setSchedule(schedule.filter((s) => s.courseId !== id));
    if (selectedCourse?.id === id) {
      setSelectedCourse(null);
    }
  };

  const handleToggleCourseStatus = (id: string) => {
    setCourses(
      courses.map((c) => {
        if (c.id === id) {
          const newStatus = c.status === 'completed' ? 'in_progress' : 'completed';
          const newProgress = newStatus === 'completed' ? 100 : c.progress;
          return { ...c, status: newStatus, progress: newProgress };
        }
        return c;
      })
    );
  };

  const handleUpdateCourse = (updated: Course) => {
    setCourses(courses.map((c) => (c.id === updated.id ? updated : c)));
    setSelectedCourse(updated);
  };

  // Schedule handlers
  const handleAddScheduleEvent = (event: ScheduleEvent) => {
    setSchedule([...schedule, event]);
  };

  const handleDeleteScheduleEvent = (id: string) => {
    setSchedule(schedule.filter((s) => s.id !== id));
  };

  // Leaderboard study log
  const handleLogStudyHours = (hours: number, note: string) => {
    setLeaderboard(
      leaderboard.map((user) => {
        if (user.isCurrentUser) {
          const updatedHours = Number((user.studyHoursThisWeek + hours).toFixed(1));
          return {
            ...user,
            studyHoursThisWeek: updatedHours,
            streakDays: user.streakDays + 1,
          };
        }
        return user;
      })
    );

    // Add notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: `Đã cộng ${hours}h tự học`,
      description: `Ghi nhận thành công: "${note}" vào bảng xếp hạng.`,
      time: 'Vừa xong',
      read: false,
      type: 'streak',
    };
    setNotifications([newNotif, ...notifications]);
  };

  // Notifications
  const handleMarkNotificationRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  // Backup & Reset
  const handleExportData = () => {
    const dataStr = JSON.stringify({ courses, schedule, leaderboard }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edupulse_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleResetData = () => {
    localStorage.removeItem('edupulse_courses');
    localStorage.removeItem('edupulse_schedule');
    localStorage.removeItem('edupulse_leaderboard');
    setCourses(INITIAL_COURSES);
    setSchedule(INITIAL_SCHEDULE);
    setLeaderboard(INITIAL_LEADERBOARD);
    alert('Đã khôi phục dữ liệu mẫu thành công!');
  };

  return (
    <div className="bg-[#020205] text-[#d1d5db] h-screen flex overflow-hidden font-sans selection:bg-cyan-400 selection:text-black relative">
      {/* Immersive Ambient Glow Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-900/10 blur-[150px]" />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] rounded-full bg-cyan-900/10 blur-[130px]" />
      </div>

      {/* SideNavBar (Left Docked) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewCourse={handleOpenNewCourse}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-transparent z-10">
        {/* TopNavBar */}
        <TopHeader
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenPremium={() => setIsPremiumModalOpen(true)}
          onOpenHelp={() => setIsHelpModalOpen(true)}
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        />

        {/* Page Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
          <div className="max-w-[1400px] mx-auto">
            {activeTab === 'courses' && (
              <CourseList
                courses={courses}
                searchQuery={searchQuery}
                onOpenNewCourse={handleOpenNewCourse}
                onSelectCourse={(course) => setSelectedCourse(course)}
                onEditCourse={handleOpenEditCourse}
                onDeleteCourse={handleDeleteCourse}
                onToggleCourseStatus={handleToggleCourseStatus}
              />
            )}

            {activeTab === 'dashboard' && (
              <DashboardView
                courses={courses}
                schedule={schedule}
                onSelectCourse={(course) => setSelectedCourse(course)}
                onOpenNewCourse={handleOpenNewCourse}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'schedule' && (
              <ScheduleView
                schedule={schedule}
                courses={courses}
                onAddScheduleEvent={handleAddScheduleEvent}
                onDeleteScheduleEvent={handleDeleteScheduleEvent}
                onSelectCourse={(course) => setSelectedCourse(course)}
              />
            )}

            {activeTab === 'leaderboard' && (
              <LeaderboardView
                leaderboard={leaderboard}
                onLogStudyHours={handleLogStudyHours}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                onExportData={handleExportData}
                onResetData={handleResetData}
              />
            )}

            {activeTab === 'help' && (
              <div className="text-left space-y-6">
                <HelpCenterModal isOpen={true} onClose={() => setActiveTab('courses')} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Course Create / Edit Modal */}
      <CourseModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        onSave={handleSaveCourse}
        initialCourse={editingCourse}
      />

      {/* Course Detail Drawer with Pomodoro Focus & Tasks */}
      <CourseDetailDrawer
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
        onEdit={handleOpenEditCourse}
        onDelete={handleDeleteCourse}
        onUpdateCourse={handleUpdateCourse}
      />

      {/* Help Modal */}
      <HelpCenterModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* Premium Upgrade Modal */}
      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
      />
    </div>
  );
}
