export type CourseType = 'university' | 'self-study';
export type Priority = 'high' | 'medium' | 'low';
export type CourseStatus = 'in_progress' | 'completed' | 'paused';

export interface CourseTask {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

export interface CourseMaterial {
  id: string;
  title: string;
  url: string;
  type: 'pdf' | 'video' | 'doc' | 'link';
}

export interface Course {
  id: string;
  code: string;
  name: string;
  type: CourseType;
  instructorOrSource: string;
  credits: number | null;
  priority: Priority;
  status: CourseStatus;
  progress: number;
  semester?: string;
  roomOrPlatform?: string;
  scheduleTime?: string;
  dayOfWeek?: number[]; // 1 = Monday, 2 = Tuesday, etc.
  notes?: string;
  tasks?: CourseTask[];
  materials?: CourseMaterial[];
  targetGrade?: string;
  currentScore?: number;
  totalHoursStudied?: number;
  createdAt: string;
}

export interface ScheduleEvent {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  dayOfWeek: number; // 2: Thứ 2, 3: Thứ 3, ..., 8: CN
  startTime: string; // "07:30"
  endTime: string; // "09:30"
  location: string;
  type: CourseType;
  color: string;
}

export interface LeaderboardUser {
  rank: number;
  id: string;
  name: string;
  avatar: string;
  schoolOrMajor: string;
  studyHoursThisWeek: number;
  completedCourses: number;
  streakDays: number;
  badges: string[];
  isCurrentUser?: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: 'deadline' | 'course' | 'streak' | 'system';
}

export type ActiveTab = 'dashboard' | 'courses' | 'schedule' | 'leaderboard' | 'settings' | 'help';
