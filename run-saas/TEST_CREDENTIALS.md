# 🔐 Test Credentials - Weekend Academy Management System

## System Access Information

Welcome to the Weekend Academy Management System demo! Use the credentials below to test different user roles and functionalities.

---

## 🌐 Access URLs

- **Application**: http://localhost:3000
- **Staff Login**: http://localhost:3000/staff-login
- **Student Login**: http://localhost:3000/login
- **Student Registration**: http://localhost:3000/register

---

## 👤 User Accounts for Testing

### 1️⃣ Administrator Account

**Full system access with all administrative privileges**

```
Email:    admin@weekend.academy
Password: Admin123!
```

**Capabilities:**
- View and manage all courses
- Manage teachers (head and additional)
- Manage classes and sessions
- View attendance reports across all courses
- System-wide analytics and reporting

---

### 2️⃣ Head Teacher Account

**Course leader with full course management**

```
Email:    head.programming@academy.com
Password: Teacher123!
```

**Capabilities:**
- Manage classes within assigned course (Programming)
- Create and manage sessions
- Approve/reject student registrations
- Approve/deny student reassignment requests
- Mark attendance for course sessions
- View course-wide attendance reports and analytics
- Manage students and teachers within course

**Other Head Teacher Accounts:**
- `head.paramedics@academy.com`
- `head.computer@academy.com`
- `head.fashion@academy.com`
- `head.electrical@academy.com`
- `head.camera@academy.com`
- `head.video@academy.com`
- `head.graphics@academy.com`
- `head.automotive@academy.com`

All use password: `Teacher123!`

---

### 3️⃣ Additional Teacher Account

**Teaching assistant with limited permissions**

```
Email:    teacher1.programming@academy.com
Password: Teacher123!
```

**Capabilities:**
- View classes and sessions (read-only)
- View students in assigned course
- Mark attendance for sessions
- View attendance reports

**Pattern for other teachers:**
- Format: `teacher{1-2}.{coursename}@academy.com`
- Password: `Teacher123!`

---

### 4️⃣ Student Account

**Student with enrolled status**

```
Email:    {email-from-csv}
Password: Student123!
```

**Note:** Student emails are populated from the CSV data file. After running the seed script, check the console output for a sample student email, or use any email from the `sample_random_data.csv` file.

**Capabilities:**
- View personal dashboard with QR code
- View assigned class and session information
- Request session reassignments (max 3 requests)
- View personal attendance history
- Track attendance statistics
- Change password

---

### 5️⃣ Pending Registration

**Awaiting approval from head teacher**

```
Email:    {pending-email-from-csv}
Password: Not yet assigned (account not created)
```

**Note:** Pending registrations can be viewed and approved by head teachers in their registration management section.

---

## 🧪 Testing Scenarios

### Scenario 1: Admin Workflow
1. Login as **Admin**
2. Navigate to Courses → View all courses
3. Navigate to Teachers → Add/manage teachers
4. Check attendance reports across all courses
5. View system-wide analytics

### Scenario 2: Head Teacher Workflow
1. Login as **Head Teacher** (Programming course)
2. Navigate to Classes → Create new class
3. Navigate to Sessions → Add session times
4. Navigate to Registrations → Approve pending students
5. Navigate to Reassignments → Handle student requests
6. Navigate to Attendance → Mark attendance for session
7. Navigate to Reports → View course analytics

### Scenario 3: Additional Teacher Workflow
1. Login as **Additional Teacher**
2. Navigate to Classes → View assigned classes
3. Navigate to Students → View student list
4. Navigate to Attendance → Mark session attendance
5. Navigate to Reports → View attendance analytics

### Scenario 4: Student Workflow
1. Login as **Student**
2. View Dashboard → Personal QR code for attendance
3. View Sessions → Saturday and Sunday schedules
4. Request Reassignment → Change session time (if needed)
5. View Attendance → Personal attendance history

### Scenario 5: Registration & Approval
1. Navigate to **Registration page** (public)
2. Fill registration form with student details
3. Login as **Head Teacher**
4. Navigate to Registrations → Review new registration
5. Approve or reject the registration
6. Student can now login with credentials

---

## 📱 Mobile Testing

All pages are optimized for mobile devices with responsive design:

- **Breakpoint**: 768px (tablets and above show tables, mobile shows cards)
- **Test on**: Chrome DevTools → Toggle Device Toolbar
- **Recommended devices to test**:
  - iPhone 12 Pro (390 x 844)
  - iPad Air (820 x 1180)
  - Samsung Galaxy S20 (360 x 800)
  - Desktop (1920 x 1080)

---

## 🎨 Design Features to Showcase

### Mobile-First UX
- Auto-switch between table and card views
- Responsive navigation and filters
- Touch-friendly buttons and interactions
- Optimized form layouts for mobile

### Emerald Theme (Staff Areas)
- Consistent emerald green accent color (#059669)
- Applied across admin and teacher dashboards
- Primary action buttons use emerald theme
- Icons and stats use emerald accents

### Key Features
- QR code generation for attendance
- Real-time attendance marking
- Session reassignment workflow
- Registration approval system
- Comprehensive reporting and analytics

---

## 🔄 Database Reset

If you need to reset the database and reseed:

```bash
# Reset database
npx prisma migrate reset

# Or manually seed
npx prisma db seed
```

---

## 📞 Support

For any issues during testing or questions about functionality:
- Check the main `README.md` for development guidelines
- Review the Git workflow documentation for branching strategy
- Check console logs for detailed seed output

---

**Version:** 1.0.0  
**Last Updated:** January 2025  
**Status:** ✅ Production Ready

---

*Happy Testing! 🚀*