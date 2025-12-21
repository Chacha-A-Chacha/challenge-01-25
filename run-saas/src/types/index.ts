// types/index.ts

// Enums and constants
export {
  USER_ROLES,
  TEACHER_ROLES,
  COURSE_STATUS,
  WEEK_DAYS,
  ATTENDANCE_STATUS,
  REQUEST_STATUS,
  REGISTRATION_STATUS,
  NOTIFICATION_TYPES,
} from "./enums";

export type {
  UserRole,
  TeacherRole,
  CourseStatus,
  WeekDay,
  AttendanceStatus,
  RequestStatus,
  RegistrationStatus,
  NotificationType,
} from "./enums";

// Auth types
export type {
  AuthUser,
  LoginCredentials,
  SessionData,
  UserType,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
} from "./auth";

// Database types
export type {
  Admin,
  Course,
  Teacher,
  Class,
  Session,
  Student,
  StudentRegistration,
  Attendance,
  ReassignmentRequest,
} from "./database";

// API types
export type {
  ApiResponse,
  SuccessResponse,
  ErrorResponse,
  PaginatedResponse,
  ApiRequest,
  CourseCreateRequest,
  CourseUpdateRequest,
  TeacherCreateRequest,
  ClassCreateRequest,
  SessionCreateRequest,
  StudentImportRequest,
  AttendanceMarkRequest,
  BulkAttendanceRequest,
  ReassignmentCreateRequest,
  ReassignmentUpdateRequest,
  CoursePublic,
  ClassPublic,
  ClassesResponse,
  SessionWithAvailability,
  CourseSessionsResponse,
  StudentRegistrationRequest,
  StudentRegistrationResponse,
  RegistrationDetail,
  RejectRegistrationRequest,
  BulkApprovalRequest,
  BulkApprovalResponse,
} from "./api";

// Component types
export type {
  QRGeneratorProps,
  QRScannerProps,
  StudentImportProps,
  AttendanceTableProps,
  SessionScheduleProps,
  ReassignmentFormProps,
  StudentCardProps,
  SessionCardProps,
  CourseCardProps,
  AttendanceStatsProps,
} from "./components";

// Form types
export type {
  FormFieldConfig,
  FieldProps,
  FormState,
  SelectOption,
  ValidationError,
  StudentImportData,
  StudentImportResult,
  ImportError,
} from "./forms";

// Business logic types
export type {
  QRCodeData,
  QRScanResult,
  QRValidationResult,
  SessionConflictCheck,
  CapacityValidation,
  AutoAssignmentResult,
  AttendanceWindow,
  AttendanceStats,
  SessionStats,
  StudentSchedule,
  ReassignmentOption,
  AttendanceRecord,
  SessionWithAttendance,
  StudentAttendanceHistory,
  AttendanceReport,
} from "./business";

// Hook types
export type {
  UseAttendanceReturn,
  UseQRScannerReturn,
  UseStudentImportReturn,
  UseFormReturn,
  UsePermissionsReturn,
  UseNotificationsReturn,
} from "./hooks";

// UI types
export type {
  Notification,
  NotificationAction,
  Modal,
  LoadingState,
  ToastConfig,
  ThemeConfig,
  BreakpointValues,
  ResponsiveState,
  SidebarState,
} from "./ui";

// Utility types
export type {
  DeepPartial,
  DeepRequired,
  WithTimestamps,
  WithOptionalId,
  CreateInput,
  UpdateInput,
  EntityWithRelations,
  EntityId,
  Timestamp,
  JSONValue,
  SafeAny,
  StudentWithSessions,
  SessionWithStudents,
  TeacherWithCourse,
  CourseWithDetails,
  ClassWithSessions,
  QueryOptions,
  MutationOptions,
  InfiniteQueryData,
  PaginationConfig,
} from "./utils";

// Error types
export type {
  AppError,
  ValidationErrorDetail,
  QRScanError,
  DatabaseError,
  ImportValidationError,
  FileUploadError,
  NetworkError,
  AuthenticationError,
} from "./errors";

// Store types
export type {
  BaseStoreState,
  EntityStoreState,
  OfflineAttendance,
  SyncStatus,
  OptimisticUpdate,
  OptimisticState,
} from "./store";

// Mobile types
export type {
  CameraPermission,
  DeviceInfo,
  PWAInstallPrompt,
  NotificationPermission,
  GeolocationData,
  NetworkStatus,
} from "./mobile";
