// types/database.ts
import type {
  CourseStatus,
  WeekDay,
  AttendanceStatus,
  RequestStatus,
  RegistrationStatus,
} from "./enums";
import type { TeacherRole } from "./enums";

// Base entity interfaces matching Prisma schema exactly
export interface Admin {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
}

export interface Course {
  id: string;
  name: string;
  headTeacherId: string;
  endDate?: Date;
  status: CourseStatus;
  createdAt: Date;

  // Relations
  headTeacher?: Teacher;
  teachers?: Teacher[];
  classes?: Class[];
  registrations?: StudentRegistration[];
}

export interface Teacher {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  courseId?: string;
  role: TeacherRole;
  createdAt: Date;

  // Relations
  course?: Course;
  headCourse?: Course;
  attendanceRecords?: Attendance[];
  approvedRequests?: ReassignmentRequest[];
  reviewedRegistrations?: StudentRegistration[];
}

export interface Class {
  id: string;
  name: string;
  capacity: number;
  courseId: string;
  createdAt: Date;

  // Relations
  course?: Course;
  sessions?: Session[];
  students?: Student[];
}

export interface Session {
  id: string;
  classId: string;
  day: WeekDay;
  startTime: string; // Format: "HH:MM:SS" (24-hour)
  endTime: string; // Format: "HH:MM:SS" (24-hour)
  capacity: number;
  createdAt: Date;

  // Relations
  class?: Class;
  saturdayStudents?: Student[];
  sundayStudents?: Student[];
  pendingSaturdayRegs?: StudentRegistration[];
  pendingSundayRegs?: StudentRegistration[];
  attendances?: Attendance[];
  fromRequests?: ReassignmentRequest[];
  toRequests?: ReassignmentRequest[];
}

export interface Student {
  id: string;
  uuid: string;
  studentNumber: string;
  surname: string;
  firstName: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  password: string;
  classId: string;
  saturdaySessionId?: string;
  sundaySessionId?: string;
  createdAt: Date;

  // Relations
  class?: Class;
  saturdaySession?: Session;
  sundaySession?: Session;
  attendances?: Attendance[];
  reassignmentRequests?: ReassignmentRequest[];
}

export interface StudentRegistration {
  id: string;
  surname: string;
  firstName: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  courseId: string;
  saturdaySessionId: string;
  sundaySessionId: string;
  password: string;
  paymentReceiptUrl: string;
  paymentReceiptNo: string;
  status: RegistrationStatus;
  reviewedById?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  course?: Course;
  saturdaySession?: Session;
  sundaySession?: Session;
  reviewedBy?: Teacher;
}

export interface Attendance {
  id: string;
  studentId: string;
  sessionId: string;
  date: Date;
  status: AttendanceStatus;
  scanTime?: Date;
  teacherId?: string;

  // Relations
  student?: Student;
  session?: Session;
  markedBy?: Teacher;
}

export interface ReassignmentRequest {
  id: string;
  studentId: string;
  fromSessionId: string;
  toSessionId: string;
  status: RequestStatus;
  requestedAt: Date;
  teacherId?: string;

  // Relations
  student?: Student;
  fromSession?: Session;
  toSession?: Session;
  approvedBy?: Teacher;
}
