// lib/permissions.ts

import type {AuthUser, UserRole} from '@/types'

/**
 * Type-safe permission definitions
 * Add new permissions here as the system grows
 */
export enum Permission {
    // ============================================================================
    // ADMIN PERMISSIONS
    // ============================================================================
    CREATE_COURSE = 'create_course',
    MANAGE_SYSTEM = 'manage_system',
    REMOVE_HEAD_TEACHER = 'remove_head_teacher',
    VIEW_ALL_COURSES = 'view_all_courses',
    MANAGE_TEACHERS = 'manage_teachers',
    VIEW_SYSTEM_STATS = 'view_system_stats',
    RESET_TEACHER_PASSWORDS = 'reset_teacher_passwords',
    DEACTIVATE_TEACHERS = 'deactivate_teachers',

    // ============================================================================
    // HEAD TEACHER PERMISSIONS (teacher with role: HEAD)
    // ============================================================================
    ADD_TEACHER = 'add_teacher',
    REMOVE_TEACHER = 'remove_teacher',
    CREATE_CLASS = 'create_class',
    MANAGE_COURSE = 'manage_course',
    MANAGE_ALL_COURSE_DATA = 'manage_all_course_data',

    // ============================================================================
    // ALL TEACHER PERMISSIONS (HEAD + ADDITIONAL)
    // ============================================================================
    IMPORT_STUDENTS = 'import_students',
    SCAN_ATTENDANCE = 'scan_attendance',
    CREATE_SESSION = 'create_session',
    APPROVE_REASSIGNMENT = 'approve_reassignment',
    MARK_ATTENDANCE = 'mark_attendance',
    VIEW_STUDENTS = 'view_students',
    MANAGE_SESSIONS = 'manage_sessions',
    VIEW_ATTENDANCE_REPORTS = 'view_attendance_reports',
    BULK_MARK_ATTENDANCE = 'bulk_mark_attendance',
    VIEW_REGISTRATIONS = 'view_registrations',
    APPROVE_REGISTRATION = 'approve_registration',

    // ============================================================================
    // STUDENT PERMISSIONS
    // ============================================================================
    GENERATE_QR = 'generate_qr',
    VIEW_OWN_ATTENDANCE = 'view_own_attendance',
    REQUEST_REASSIGNMENT = 'request_reassignment',
    VIEW_SCHEDULE = 'view_schedule',
    VIEW_OWN_PROFILE = 'view_own_profile',
}

/**
 * Permission checker - determines if user has a specific permission
 */
export function checkPermission(user: AuthUser | null, permission: Permission): boolean {
    if (!user || !user.role) return false

    const {role, teacherRole} = user

    // Map permissions to roles
    const permissionMap: Record<Permission, (user: AuthUser) => boolean> = {
        // Admin permissions
        [Permission.CREATE_COURSE]: () => role === 'admin',
        [Permission.MANAGE_SYSTEM]: () => role === 'admin',
        [Permission.REMOVE_HEAD_TEACHER]: () => role === 'admin',
        [Permission.VIEW_ALL_COURSES]: () => role === 'admin',
        [Permission.MANAGE_TEACHERS]: () => role === 'admin',
        [Permission.VIEW_SYSTEM_STATS]: () => role === 'admin',
        [Permission.RESET_TEACHER_PASSWORDS]: () => role === 'admin',
        [Permission.DEACTIVATE_TEACHERS]: () => role === 'admin',

        // Head teacher permissions
        [Permission.ADD_TEACHER]: () => role === 'teacher' && teacherRole === 'HEAD',
        [Permission.REMOVE_TEACHER]: () => role === 'teacher' && teacherRole === 'HEAD',
        [Permission.CREATE_CLASS]: () => role === 'teacher' && teacherRole === 'HEAD',
        [Permission.MANAGE_COURSE]: () => role === 'teacher' && teacherRole === 'HEAD',
        [Permission.MANAGE_ALL_COURSE_DATA]: () => role === 'teacher' && teacherRole === 'HEAD',

        // All teacher permissions
        [Permission.IMPORT_STUDENTS]: () => role === 'teacher',
        [Permission.SCAN_ATTENDANCE]: () => role === 'teacher',
        [Permission.CREATE_SESSION]: () => role === 'teacher',
        [Permission.APPROVE_REASSIGNMENT]: () => role === 'teacher',
        [Permission.MARK_ATTENDANCE]: () => role === 'teacher',
        [Permission.VIEW_STUDENTS]: () => role === 'teacher',
        [Permission.MANAGE_SESSIONS]: () => role === 'teacher',
        [Permission.VIEW_ATTENDANCE_REPORTS]: () => role === 'teacher',
        [Permission.BULK_MARK_ATTENDANCE]: () => role === 'teacher',
        [Permission.VIEW_REGISTRATIONS]: () => role === 'teacher',
        [Permission.APPROVE_REGISTRATION]: () => role === 'teacher',

        // Student permissions
        [Permission.GENERATE_QR]: () => role === 'student',
        [Permission.VIEW_OWN_ATTENDANCE]: () => role === 'student',
        [Permission.REQUEST_REASSIGNMENT]: () => role === 'student',
        [Permission.VIEW_SCHEDULE]: () => role === 'student',
        [Permission.VIEW_OWN_PROFILE]: () => role === 'student',
    }

    const checker = permissionMap[permission]
    return checker ? checker(user) : false
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: AuthUser | null, roles: UserRole | UserRole[]): boolean {
    if (!user?.role) return false
    const allowedRoles = Array.isArray(roles) ? roles : [roles]
    return allowedRoles.includes(user.role)
}
