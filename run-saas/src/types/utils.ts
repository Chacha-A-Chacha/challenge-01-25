// types/utils.ts
import type {
  Student,
  Session,
  Attendance,
  Class,
  Course,
  Teacher,
} from "./database";

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

export type WithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

export type WithOptionalId<T> = Omit<T, "id"> & {
  id?: string;
};

export type CreateInput<T> = Omit<T, "id" | "createdAt" | "updatedAt">;

export type UpdateInput<T> = Partial<CreateInput<T>>;

export type EntityWithRelations<T, R extends Record<string, unknown>> = T & R;

export type EntityId = string;

export type Timestamp = Date | string;

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

export type SafeAny = unknown;

// Specific entity helpers
export type StudentWithSessions = EntityWithRelations<
  Student,
  {
    sessions: Session[];
    class: Class & { course?: Course; sessions?: Session[] };
    saturdaySession?: Session | null;
    sundaySession?: Session | null;
    attendances?: Array<Attendance & { session?: Session | null }>;
  }
>;

export type SessionWithStudents = EntityWithRelations<
  Session,
  {
    students: Student[];
    attendances: Attendance[];
    class: Class;
    _count: { students: number };
  }
>;

export type TeacherWithCourse = EntityWithRelations<
  Teacher,
  {
    course?: Course;
    headCourse?: Course;
  }
>;

export type CourseWithDetails = EntityWithRelations<
  Course,
  {
    headTeacher: Teacher;
    teachers: Teacher[];
    classes: Class[];
    _count: {
      teachers: number;
      classes: number;
      students: number;
    };
  }
>;

export type ClassWithSessions = EntityWithRelations<
  Class,
  {
    sessions: Session[];
    students: Student[];
    course: Course;
    _count: {
      sessions: number;
      students: number;
    };
  }
>;

// Query and mutation helpers
export interface QueryOptions<T> {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  retry?: number;
  retryDelay?: number;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

export interface MutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: string, variables: TVariables) => void;
  onSettled?: (
    data: TData | null,
    error: string | null,
    variables: TVariables,
  ) => void;
  showSuccessNotification?: boolean;
  showErrorNotification?: boolean;
}

export interface InfiniteQueryData<T> {
  pages: T[][];
  pageParams: unknown[];
}

export interface PaginationConfig {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  hasPrevious: boolean;
}
