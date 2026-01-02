# Student Portal Implementation Guide - Additional Specifications

## Schema-Driven Additions

Based on the Prisma schema analysis, here are critical additions to the implementation guide:

---

## Extended Student Profile Features

### Profile Photo Management

**Schema Fields:**
```typescript
interface StudentPhoto {
  photoUrl: string | null      // Public URL to access photo
  photoKey: string | null       // Storage key/identifier
  photoProvider: string | null  // 'cloudinary' | 's3' | 'local'
  photoUploadedAt: Date | null  // Timestamp of last upload
}
```

**Profile Photo Component:**
```
Photo Upload Section
├── Current Photo Display
│   ├── Avatar (if exists)
│   └── Placeholder with initials (if null)
├── Upload Button
│   └── File input (hidden)
├── Change Photo Button
├── Remove Photo Button (if exists)
└── Upload Status/Progress
```

**Upload Constraints:**
- Max file size: 2MB
- Allowed types: JPEG, PNG, WebP
- Recommended dimensions: 400x400px
- Auto-crop to square on upload
- Image optimization before storage

**UI Pattern:**
```
┌─────────────────────────────┐
│  ┌──────────┐               │
│  │   📷     │  [Change Photo]│
│  │  Photo   │  [Remove Photo]│
│  │  (Click) │               │
│  └──────────┘               │
│  John Doe                   │
│  Uploaded: 2 days ago       │
└─────────────────────────────┘
```

**Implementation Notes:**
- Use client-side preview before upload
- Show upload progress indicator
- Optimize image on client before sending (optional)
- Handle upload failures gracefully
- Provide cropping interface (optional enhancement)

---

## Password Management

### Student Password Change Feature

**Schema Support:**
```typescript
interface Student {
  password: string              // Hashed password
  resetToken: string | null     // Password reset token
  resetTokenExpiry: Date | null // Token expiration
}
```

**Change Password Component:**
```
Settings/Security Section
├── Current Password Field
├── New Password Field
├── Confirm New Password Field
├── Password Strength Indicator
└── Submit Button
```

**Validation Rules (from schema context):**
- Minimum 8 characters
- Must contain: uppercase, lowercase, number
- Cannot be same as current password
- Confirm password must match

**UI Location Options:**
1. **Settings Page** (Recommended):
   ```
   Student Portal → Settings → Security → Change Password
   ```

2. **Profile Dropdown Menu**:
   ```
   Profile Icon → Settings → Change Password
   ```

**Modal Pattern:**
```
┌──────────────────────────────────────┐
│  🔒 Change Password          [✕]    │
├──────────────────────────────────────┤
│                                      │
│  Current Password:                   │
│  [························]          │
│                                      │
│  New Password:                       │
│  [························]          │
│  ├─ Strength: ████░░░░ Medium       │
│                                      │
│  Confirm New Password:               │
│  [························]          │
│                                      │
│  ℹ️  Password must:                 │
│     • Be at least 8 characters      │
│     • Include uppercase & lowercase │
│     • Include at least one number   │
│                                      │
│         [Cancel]    [Update Password]│
└──────────────────────────────────────┘
```

---

## Settings/Profile Management Page

### New Page Structure: Page 3 - Settings

**Navigation:**
```
Student Portal Pages:
├── Dashboard (/)
├── Attendance (/attendance)
└── Settings (/settings)  ← NEW
```

**Settings Page Layout:**

**Desktop:**
```
┌─────────────────────────────────────────────────────┐
│  SETTINGS                              [Logout] [⚙️] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  NAVIGATION  │  │  CONTENT AREA            │   │
│  ├──────────────┤  ├──────────────────────────┤   │
│  │ Profile ✓    │  │  Profile Information      │   │
│  │ Photo        │  │  ┌─────────────────────┐ │   │
│  │ Security     │  │  │ Edit Profile Form   │ │   │
│  │ Preferences  │  │  │                     │ │   │
│  └──────────────┘  │  │ • Surname           │ │   │
│                    │  │ • First Name         │ │   │
│                    │  │ • Last Name          │ │   │
│                    │  │ • Email              │ │   │
│                    │  │ • Phone Number       │ │   │
│                    │  │                     │ │   │
│                    │  │ [Save Changes]       │ │   │
│                    │  └─────────────────────┘ │   │
│                    └──────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Mobile:**
```
┌─────────────────────────┐
│ SETTINGS           [≡] │
├─────────────────────────┤
│ [Profile]               │
│ [Photo]                 │
│ [Security]              │
│ [Preferences]           │
└─────────────────────────┘
    ↓ Tap to expand
┌─────────────────────────┐
│ ← Profile Information   │
├─────────────────────────┤
│ Surname:                │
│ [John]                  │
│                         │
│ First Name:             │
│ [Doe]                   │
│                         │
│ ... (rest of form)      │
│                         │
│ [Save Changes]          │
└─────────────────────────┘
```

**Settings Sections:**

1. **Profile Information**
   - Surname (required)
   - First Name (required)
   - Last Name (optional)
   - Email (required, unique validation)
   - Phone Number (optional, format validation)

2. **Profile Photo**
   - Current photo display
   - Upload new photo
   - Remove photo
   - Photo guidelines

3. **Security**
   - Change password
   - View login activity (future)
   - Two-factor authentication (future)

4. **Preferences**
   - Notification settings (future)
   - Display preferences (future)

---

## Time Format Handling

### Schema Time Format: "HH:MM:SS" (24-hour)

**Conversion Utilities Needed:**

```typescript
// lib/time-utils.ts

/**
 * Convert database time (HH:MM:SS) to display format (12-hour)
 * @param time - Time string in "HH:MM:SS" format
 * @returns Formatted time like "9:00 AM"
 */
export function formatTimeFromDB(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`
}

/**
 * Convert input time (HH:MM) to database format (HH:MM:SS)
 * @param time - Time string in "HH:MM" format
 * @returns Time in "HH:MM:SS" format
 */
export function formatTimeForDB(time: string): string {
  return `${time}:00`
}

/**
 * Format session time range for display
 * @param startTime - Start time in "HH:MM:SS"
 * @param endTime - End time in "HH:MM:SS"
 * @returns Formatted range like "9:00 AM - 11:00 AM"
 */
export function formatSessionTimeRange(startTime: string, endTime: string): string {
  return `${formatTimeFromDB(startTime)} - ${formatTimeFromDB(endTime)}`
}
```

**Usage in Components:**
```typescript
// When displaying session times
const displayTime = formatTimeFromDB(session.startTime) // "09:00:00" → "9:00 AM"
const timeRange = formatSessionTimeRange(session.startTime, session.endTime)
```

---

## Student Name Handling

### Schema Name Fields: surname, firstName, lastName (optional)

**Full Name Display Utility:**

```typescript
// lib/name-utils.ts

/**
 * Format full student name from schema fields
 * @param surname - Family name (required)
 * @param firstName - Given name (required)
 * @param lastName - Middle/additional name (optional)
 * @returns Full formatted name
 */
export function formatStudentFullName(
  surname: string,
  firstName: string,
  lastName?: string | null
): string {
  if (lastName) {
    return `${surname} ${firstName} ${lastName}`
  }
  return `${surname} ${firstName}`
}

/**
 * Get student initials for avatar placeholder
 * @param surname - Family name
 * @param firstName - Given name
 * @returns Two-letter initials (e.g., "JD")
 */
export function getStudentInitials(surname: string, firstName: string): string {
  return `${surname.charAt(0)}${firstName.charAt(0)}`.toUpperCase()
}

/**
 * Format name for formal display (Surname, Firstname Lastname)
 * @param surname - Family name
 * @param firstName - Given name
 * @param lastName - Middle/additional name (optional)
 * @returns Formatted name like "Doe, John Michael"
 */
export function formatStudentFormalName(
  surname: string,
  firstName: string,
  lastName?: string | null
): string {
  const firstPart = lastName ? `${firstName} ${lastName}` : firstName
  return `${surname}, ${firstPart}`
}
```

**Component Usage:**
```typescript
// Profile display
const fullName = formatStudentFullName(student.surname, student.firstName, student.lastName)
const initials = getStudentInitials(student.surname, student.firstName) // For avatar
```

---

## Soft Delete Handling

### Schema Fields: isDeleted, deletedAt

**Filtering in Queries:**
```typescript
// Always filter out soft-deleted records in student portal queries
const activeStudent = await prisma.student.findUnique({
  where: { id: studentId, isDeleted: false }
})

// Use index: @@index([isDeleted, classId])
const classStudents = await prisma.student.findMany({
  where: { classId, isDeleted: false }
})
```

**UI Considerations:**
- Soft-deleted students should never appear in student portal
- No need to expose soft delete in student UI
- Handle 404/unauthorized if student tries to access deleted account

**Error Handling:**
```typescript
if (!student || student.isDeleted) {
  return NextResponse.json(
    { success: false, error: 'Account not found or deactivated' },
    { status: 404 }
  )
}
```

---

## Registration to Student Conversion

### StudentRegistration → Student Creation Flow

**Schema Differences:**
```typescript
// StudentRegistration (temporary)
{
  surname, firstName, lastName, email, phoneNumber,
  password, // Plain or hashed during registration
  courseId, saturdaySessionId, sundaySessionId,
  paymentReceiptUrl, paymentReceiptNo
}

// Student (permanent)
{
  surname, firstName, lastName, email, phoneNumber,
  password, // Must be hashed
  studentNumber, // Generated during approval
  uuid, // Auto-generated
  classId, // Derived from session
  saturdaySessionId, sundaySessionId
}
```

**Student Number Generation:**
```typescript
/**
 * Generate unique student number
 * Format: STU-{YEAR}{SEQUENCE}
 * Example: STU-202400123
 */
async function generateStudentNumber(): Promise<string> {
  const year = new Date().getFullYear()
  
  // Get last student number for current year
  const lastStudent = await prisma.student.findFirst({
    where: {
      studentNumber: { startsWith: `STU-${year}` }
    },
    orderBy: { studentNumber: 'desc' }
  })
  
  let sequence = 1
  if (lastStudent) {
    const lastSequence = parseInt(lastStudent.studentNumber.split('-')[1].slice(4))
    sequence = lastSequence + 1
  }
  
  return `STU-${year}${sequence.toString().padStart(5, '0')}`
}
```

**Approval Process Data Mapping:**
```typescript
// When approving registration
const studentNumber = await generateStudentNumber()
const classId = registration.saturdaySession.classId // Both sessions must be same class

const newStudent = await prisma.student.create({
  data: {
    studentNumber,
    surname: registration.surname,
    firstName: registration.firstName,
    lastName: registration.lastName,
    email: registration.email,
    phoneNumber: registration.phoneNumber,
    password: registration.password, // Already hashed during registration
    classId,
    saturdaySessionId: registration.saturdaySessionId,
    sundaySessionId: registration.sundaySessionId
  }
})
```

---

## Enhanced Data Types

### Extended Type Definitions

**Add to types/database.ts:**
```typescript
// Student with photo metadata
export interface StudentWithPhoto extends Student {
  photoUrl: string | null
  photoKey: string | null
  photoProvider: 'cloudinary' | 's3' | 'local' | null
  photoUploadedAt: Date | null
}

// Student profile update
export interface StudentProfileUpdate {
  surname?: string
  firstName?: string
  lastName?: string | null
  email?: string
  phoneNumber?: string | null
}

// Photo upload request
export interface PhotoUploadRequest {
  file: File
  provider?: 'cloudinary' | 's3'
}

// Photo upload response
export interface PhotoUploadResponse {
  photoUrl: string
  photoKey: string
  photoProvider: string
}
```

**Add to types/api.ts:**
```typescript
// Profile update request
export interface StudentProfileUpdateRequest {
  surname?: string
  firstName?: string
  lastName?: string | null
  email?: string
  phoneNumber?: string | null
}

// Photo upload response
export interface StudentPhotoUploadResponse {
  photoUrl: string
  photoKey: string
  photoProvider: string
  uploadedAt: string
}

// Password change request
export interface StudentPasswordChangeRequest {
  currentPassword: string
  newPassword: string
}
```

---

## Additional API Endpoints

### Student Portal Specific Endpoints

```typescript
// Profile Management
GET    /api/student/profile              // Get full profile
PUT    /api/student/profile              // Update profile info
POST   /api/student/profile/photo        // Upload profile photo
DELETE /api/student/profile/photo        // Remove profile photo

// Security
POST   /api/student/security/change-password  // Change password
POST   /api/student/security/request-reset    // Request password reset

// Settings
GET    /api/student/settings             // Get user preferences
PUT    /api/student/settings             // Update preferences
```

**Update API_ROUTES constant:**
```typescript
export const API_ROUTES = {
  // ... existing routes ...
  
  STUDENT: {
    SCHEDULE: '/api/student/schedule',
    ATTENDANCE: '/api/student/attendance',
    QR_GENERATE: '/api/student/qr-generate',
    REASSIGNMENT_REQUESTS: '/api/student/reassignment-requests',
    
    // NEW: Profile Management
    PROFILE: '/api/student/profile',
    UPLOAD_PHOTO: '/api/student/profile/photo',
    DELETE_PHOTO: '/api/student/profile/photo',
    
    // NEW: Security
    CHANGE_PASSWORD: '/api/student/security/change-password',
    
    // NEW: Settings
    SETTINGS: '/api/student/settings'
  }
}
```

---

## Photo Upload Implementation

### File Upload Configuration

**Storage Provider Options:**

1. **Cloudinary (Recommended for student photos):**
   - Automatic image optimization
   - Face detection & smart cropping
   - CDN delivery
   - Transformation API

2. **AWS S3:**
   - Direct upload to S3
   - CloudFront CDN
   - More control over storage

3. **Local Storage (Development only):**
   - Store in public/uploads
   - Not recommended for production

**Upload Flow:**
```
Client Upload Flow:
1. User selects image → Client-side validation (size, type)
2. Optional: Client-side crop/preview
3. Upload to API endpoint → Server validation
4. API uploads to provider (Cloudinary/S3)
5. Provider returns public URL
6. Save URL + metadata to database
7. Return success response to client
8. Update UI with new photo
```

**Client-Side Validation:**
```typescript
const validatePhotoUpload = (file: File): { valid: boolean; error?: string } => {
  const MAX_SIZE = 2 * 1024 * 1024 // 2MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' }
  }
  
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'Image size must be less than 2MB' }
  }
  
  return { valid: true }
}
```

**Upload Component State:**
```typescript
interface PhotoUploadState {
  file: File | null
  preview: string | null
  isUploading: boolean
  uploadProgress: number
  error: string | null
}
```

---

## Session Assignment Validation

### Both Weekend Sessions Required

**Schema Constraint:**
```typescript
// Student must have both sessions assigned
interface Student {
  saturdaySessionId: string | null  // Both should never be null
  sundaySessionId: string | null    // if student is active
}
```

**Validation Rules:**
1. Both Saturday and Sunday sessions must be from the same class
2. Both sessions must exist before student creation
3. Reassignment must maintain class consistency

**Validation Function:**
```typescript
async function validateSessionAssignment(
  saturdaySessionId: string,
  sundaySessionId: string
): Promise<{ valid: boolean; error?: string }> {
  const [satSession, sunSession] = await Promise.all([
    prisma.session.findUnique({
      where: { id: saturdaySessionId },
      select: { classId: true, day: true }
    }),
    prisma.session.findUnique({
      where: { id: sundaySessionId },
      select: { classId: true, day: true }
    })
  ])
  
  if (!satSession || !sunSession) {
    return { valid: false, error: 'One or both sessions not found' }
  }
  
  if (satSession.day !== 'SATURDAY') {
    return { valid: false, error: 'Invalid Saturday session' }
  }
  
  if (sunSession.day !== 'SUNDAY') {
    return { valid: false, error: 'Invalid Sunday session' }
  }
  
  if (satSession.classId !== sunSession.classId) {
    return { valid: false, error: 'Both sessions must be from the same class' }
  }
  
  return { valid: true }
}
```

---

## Reassignment Business Logic Enhancement

### Reassignment Constraints from Schema

**Rules:**
1. Cannot reassign if student already has 3 approved/pending requests
2. Can only reassign within same class
3. Must keep one weekend session while requesting change for the other
4. Target session must have capacity

**Enhanced Reassignment Validation:**
```typescript
interface ReassignmentValidation {
  canRequest: boolean
  reason?: string
  remainingRequests: number
}

async function validateReassignmentRequest(
  studentId: string,
  fromSessionId: string,
  toSessionId: string
): Promise<ReassignmentValidation> {
  // Count existing requests
  const requestCount = await prisma.reassignmentRequest.count({
    where: {
      studentId,
      status: { in: ['PENDING', 'APPROVED'] }
    }
  })
  
  if (requestCount >= 3) {
    return {
      canRequest: false,
      reason: 'Maximum reassignment requests (3) reached',
      remainingRequests: 0
    }
  }
  
  // Get student and session details
  const [student, fromSession, toSession] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: { classId: true, saturdaySessionId: true, sundaySessionId: true }
    }),
    prisma.session.findUnique({
      where: { id: fromSessionId },
      select: { day: true, classId: true }
    }),
    prisma.session.findUnique({
      where: { id: toSessionId },
      include: {
        saturdayStudents: { select: { id: true } },
        sundayStudents: { select: { id: true } }
      }
    })
  ])
  
  if (!student || !fromSession || !toSession) {
    return {
      canRequest: false,
      reason: 'Invalid student or session',
      remainingRequests: 3 - requestCount
    }
  }
  
  // Must be same class
  if (fromSession.classId !== toSession.classId) {
    return {
      canRequest: false,
      reason: 'Can only reassign within the same class',
      remainingRequests: 3 - requestCount
    }
  }
  
  // Must be same day
  if (fromSession.day !== toSession.day) {
    return {
      canRequest: false,
      reason: 'Can only reassign to same day sessions',
      remainingRequests: 3 - requestCount
    }
  }
  
  // Check capacity
  const currentCount = toSession.day === 'SATURDAY' 
    ? toSession.saturdayStudents.length 
    : toSession.sundayStudents.length
    
  if (currentCount >= toSession.capacity) {
    return {
      canRequest: false,
      reason: 'Target session is at full capacity',
      remainingRequests: 3 - requestCount
    }
  }
  
  return {
    canRequest: true,
    remainingRequests: 3 - requestCount
  }
}
```

---

## Payment Receipt Handling

### Schema Fields for Receipt Storage

```typescript
interface StudentRegistration {
  paymentReceiptUrl: string              // Public URL to view
  paymentReceiptKey: string | null       // Storage key/path
  paymentReceiptProvider: string | null  // 'cloudinary' | 's3' | 'local'
  paymentReceiptNo: string              // User-provided receipt number
}
```

**Receipt Validation:**
- Must be image format (JPEG, PNG, WebP)
- Max size: 5MB
- Receipt number must be unique per registration

**Storage Best Practices:**
- Store in separate folder: `/receipts/{registrationId}/`
- Use secure, non-guessable keys
- Implement access control (teachers only)
- Set expiration policy for rejected registrations

---

## Enhanced Store Structures

### Student Profile Store

```typescript
interface StudentProfileStore {
  // Profile data
  profile: {
    id: string
    surname: string
    firstName: string
    lastName: string | null
    email: string
    phoneNumber: string | null
    studentNumber: string
    photoUrl: string | null
    classId: string
    className: string
    courseName: string
  } | null
  
  // Photo upload state
  photoUpload: {
    isUploading: boolean
    progress: number
    error: string | null
  }
  
  // Profile update state
  isUpdating: boolean
  updateError: string | null
  
  // Actions
  loadProfile: () => Promise<void>
  updateProfile: (data: StudentProfileUpdate) => Promise<boolean>
  uploadPhoto: (file: File) => Promise<boolean>
  deletePhoto: () => Promise<boolean>
}
```

### Security Store

```typescript
interface SecurityStore {
  // Password change state
  passwordChange: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
    isChanging: boolean
    error: string | null
    success: boolean
  }
  
  // Actions
  setPasswordField: (field: string, value: string) => void
  changePassword: () => Promise<boolean>
  resetPasswordForm: () => void
}
```

---

## Navigation Structure Update

### Three-Page Navigation

**Header Navigation:**
```typescript
const studentNavigation = [
  { name: 'Dashboard', href: '/student', icon: HomeIcon, current: true },
  { name: 'Attendance', href: '/student/attendance', icon: CalendarIcon, current: false },
  { name: 'Settings', href: '/student/settings', icon: CogIcon, current: false }
]
```

**Mobile Navigation:**
```
Bottom Tab Bar (Mobile):
┌───────────────────────────────────────┐
│ [🏠 Home] [📅 Attendance] [⚙️ Settings]│
└───────────────────────────────────────┘
```

**Desktop Navigation:**
```
Sidebar or Top Nav:
Dashboard | Attendance | Settings | [Profile] [Logout]
```

---

## Error Handling Patterns

### Profile Update Errors

```typescript
// Email already exists
if (emailConflict) {
  return { success: false, error: 'Email already in use by another student' }
}

// Invalid phone format
if (invalidPhone) {
  return { success: false, error: 'Invalid phone number format' }
}

// Photo upload failed
if (uploadFailed) {
  return { success: false, error: 'Failed to upload photo. Please try again.' }
}
```

### Password Change Errors

```typescript
// Current password incorrect
if (!passwordMatch) {
  return { success: false, error: 'Current password is incorrect' }
}

// New password same as old
if (samePassword) {
  return { success: false, error: 'New password must be different from current password' }
}

// Password too weak
if (weakPassword) {
  return { success: false, error: 'Password does not meet security requirements' }
}
```

---

## Security Enhancements

### Photo Upload Security

1. **Server-Side Validation:**
   - Re-validate file type and size on server
   - Scan for malicious content
   - Strip EXIF data
   - Generate unique, secure filenames

2. **Access Control:**
   - Only student can update their own photo
   - Implement rate limiting on uploads
   - Track upload attempts

3. **Storage Security:**
   - Use signed URLs for temporary access (S3)
   - Set appropriate CORS policies
   - Implement CDN caching with purge capability

### Password Security

1. **Hashing:**
   - Use bcrypt with saltRounds: 12
   - Never log or expose passwords
   - Secure password reset flow

2. **Validation:**
   - Enforce minimum complexity
   - Check against common password lists
   - Implement password history (optional)

---

## Testing Considerations

### Component Testing Checklist

**Profile Components:**
- [ ] Profile display with complete data
- [ ] Profile display with missing optional fields
- [ ] Photo upload success flow
- [ ] Photo upload error handling
- [ ] Photo deletion
- [ ] Profile update success
- [ ] Profile update validation errors

**Password Change:**
- [ ] Successful password change
- [ ] Incorrect current password
- [ ] Password mismatch
- [ ] Weak password rejection
- [ ] Same password rejection

**Settings Page:**
- [ ] Navigation between sections
- [ ] Form persistence on navigation
- [ ] Unsaved changes warning

---

## Performance Optimizations

### Image Optimization

**Cloudinary Transformations:**
```typescript
// Generate optimized avatar URL
const avatarUrl = cloudinary.url(photoKey, {
  width: 400,
  height: 400,
  crop: 'fill',
  gravity: 'face',
  quality: 'auto',
  fetch_format: 'auto'
})

// Thumbnail for lists
const thumbnailUrl = cloudinary.url(photoKey, {
  width: 80,
  height: 80,
  crop: 'fill',
  gravity: 'face',
  quality: 'auto:low'
})
```

### Caching Strategy

**Client-Side:**
- Cache profile data in Zustand store
- Persist photo URL to avoid re-fetching
- Invalidate cache on profile update

**Server-Side:**
- Set appropriate Cache-Control headers for photos
- Use CDN for photo delivery
- Implement ETag for conditional requests

---

## Accessibility Additions

### Photo Upload Accessibility

```tsx
<label htmlFor="photo-upload" className="sr-only">
  Upload profile photo
</label>
<input
  id="photo-upload"
  type="file"
  accept="image/jpeg,image/png,image/webp"
  aria-describedby="photo-requirements"
  onChange={handlePhotoUpload}
/>
<p id="photo-requirements" className="sr-only">
  Maximum file size 2MB. Accepted formats: JPEG, PNG, WebP
</p>
```

### Password Fields

```tsx
<input
  type="password"
  aria-label="Current password"
  aria-describedby="current-password-error"
  aria-invalid={!!errors.currentPassword}
/>
{errors.currentPassword && (
  <p id="current-password-error" role="alert" className="text-red-600">
    {errors.currentPassword}
  </p>
)}
```

---

This extended documentation covers all schema-driven features and fills the gaps identified in the original implementation guide. The additions ensure complete feature parity with the database structure and provide implementation details for student profile management, photo uploads, password security, and enhanced data handling.
