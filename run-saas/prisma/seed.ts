// prisma/seed.ts - Comprehensive Database Seed Script
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Generate random 4-digit student number
function generateStudentNumber(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Helper to create time string in HH:MM:SS format
function createTimeString(hours: number, minutes: number = 0): string {
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
}

// Parse CSV and extract valid entries
interface PersonData {
  lastName: string;
  firstName: string;
  email: string;
}

function parseCSV(): PersonData[] {
  const csvPath = path.join(__dirname, "sample_random_data.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n");

  const people: PersonData[] = [];

  // Skip first 3 rows (header, date, points)
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split(",");
    const lastName = columns[0]?.trim() || "";
    const firstName = columns[1]?.trim() || "";
    const email = columns[2]?.trim() || "";

    // Only include entries with valid email and at least one name
    if (email && email.includes("@") && (firstName || lastName)) {
      people.push({
        lastName: lastName || firstName, // Use firstName as lastName if missing
        firstName: firstName || lastName, // Use lastName as firstName if missing
        email,
      });
    }
  }

  return people;
}

// Capitalize first letter of each word
function capitalize(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function main() {
  console.log("🌱 Starting comprehensive database seed...\n");

  // Parse CSV data
  console.log("📂 Parsing CSV data...");
  const allPeople = parseCSV();
  console.log(`✅ Found ${allPeople.length} valid entries in CSV\n`);

  // Shuffle the array to randomize distribution
  const shuffled = [...allPeople].sort(() => Math.random() - 0.5);

  // Split into teachers (first 25) and students (rest)
  const teacherPool = shuffled.slice(0, 25);
  const studentPool = shuffled.slice(25);
  const pendingPool = studentPool.splice(-10); // Last 10 for pending registrations

  console.log(`📊 Distribution:`);
  console.log(`   - Teachers pool: ${teacherPool.length}`);
  console.log(`   - Students pool: ${studentPool.length}`);
  console.log(`   - Pending registrations: ${pendingPool.length}\n`);

  // Track used student numbers to ensure uniqueness
  const usedStudentNumbers = new Set<string>();

  function getUniqueStudentNumber(): string {
    let num: string;
    do {
      num = generateStudentNumber();
    } while (usedStudentNumbers.has(num));
    usedStudentNumbers.add(num);
    return num;
  }

  // ============================================================================
  // 1. CREATE ADMIN
  // ============================================================================
  console.log("📌 Creating Admin...");
  const admin = await prisma.admin.upsert({
    where: { email: "admin@weekend.academy" },
    update: {},
    create: {
      email: "admin@weekend.academy",
      password: await hashPassword("Admin123!"),
      firstName: "System",
      lastName: "Administrator",
    },
  });
  console.log(`✅ Admin created: ${admin.firstName} ${admin.lastName}\n`);

  // ============================================================================
  // 2. COURSES WITH HEAD TEACHERS
  // ============================================================================
  const courseData = [
    {
      name: "Paramedics",
      email: "head.paramedics@academy.com",
      classes: 2,
      hasMultipleSessions: true,
    },
    {
      name: "Computer Packages",
      email: "head.computer@academy.com",
      classes: 3,
      hasMultipleSessions: true,
    },
    {
      name: "Fashion & Design",
      email: "head.fashion@academy.com",
      classes: 1,
      hasMultipleSessions: false,
    },
    {
      name: "Electrical Installation",
      email: "head.electrical@academy.com",
      classes: 2,
      hasMultipleSessions: true,
    },
    {
      name: "Camera Operation",
      email: "head.camera@academy.com",
      classes: 1,
      hasMultipleSessions: false,
    },
    {
      name: "Video Editing",
      email: "head.video@academy.com",
      classes: 2,
      hasMultipleSessions: true,
    },
    {
      name: "Graphics & Design",
      email: "head.graphics@academy.com",
      classes: 2,
      hasMultipleSessions: false,
    },
    {
      name: "Automotive Repair",
      email: "head.automotive@academy.com",
      classes: 2,
      hasMultipleSessions: true,
    },
    {
      name: "Programming",
      email: "head.programming@academy.com",
      classes: 3,
      hasMultipleSessions: true,
    },
  ];

  console.log("📌 Creating Courses, Teachers, Classes & Sessions...\n");

  const courses: { id: string; name: string }[] = [];
  const allSessions: {
    session: { id: string };
    courseId: string;
    classId: string;
    day: string;
  }[] = [];
  const allClasses: { id: string; courseId: string; name: string }[] = [];

  let teacherIndex = 0;

  for (const courseInfo of courseData) {
    console.log(`\n🎓 ${courseInfo.name}`);
    console.log("─".repeat(60));

    // Get head teacher data from CSV pool
    const headTeacherData = teacherPool[teacherIndex++];

    // Create Head Teacher with real name from CSV
    const headTeacher = await prisma.teacher.create({
      data: {
        email: courseInfo.email,
        password: await hashPassword("Teacher123!"),
        firstName: capitalize(headTeacherData.firstName),
        lastName: capitalize(headTeacherData.lastName),
        role: "HEAD",
      },
    });
    console.log(
      `✅ Head Teacher: ${headTeacher.firstName} ${headTeacher.lastName} (${headTeacher.email})`,
    );

    // Create Course
    const course = await prisma.course.create({
      data: {
        name: courseInfo.name,
        headTeacherId: headTeacher.id,
        status: "ACTIVE",
      },
    });

    // Link head teacher to course
    await prisma.teacher.update({
      where: { id: headTeacher.id },
      data: { courseId: course.id },
    });

    courses.push(course);

    // Create Additional Teachers (1-2 per course) with real names
    const additionalTeachersCount = Math.floor(Math.random() * 2) + 1;
    for (let t = 1; t <= additionalTeachersCount; t++) {
      const additionalTeacherData = teacherPool[teacherIndex++];
      if (!additionalTeacherData) break;

      const additionalTeacher = await prisma.teacher.create({
        data: {
          email: `teacher${t}.${courseInfo.name.toLowerCase().replace(/\s+/g, "").replace(/&/g, "")}@academy.com`,
          password: await hashPassword("Teacher123!"),
          firstName: capitalize(additionalTeacherData.firstName),
          lastName: capitalize(additionalTeacherData.lastName),
          courseId: course.id,
          role: "ADDITIONAL",
        },
      });
      console.log(
        `   ➕ Additional: ${additionalTeacher.firstName} ${additionalTeacher.lastName}`,
      );
    }

    // Create Classes and Sessions
    for (let c = 1; c <= courseInfo.classes; c++) {
      const className =
        courseInfo.classes === 1
          ? courseInfo.name
          : `${courseInfo.name} - Class ${String.fromCharCode(64 + c)}`;

      const classEntity = await prisma.class.create({
        data: {
          name: className,
          capacity: 30,
          courseId: course.id,
        },
      });

      allClasses.push({
        id: classEntity.id,
        courseId: course.id,
        name: className,
      });

      console.log(`  📚 Class: ${className}`);

      // Saturday Sessions
      const saturdaySessionsCount = courseInfo.hasMultipleSessions ? 2 : 1;
      const saturdayTimes = [
        { start: 8, end: 10 },
        { start: 10, end: 12 },
      ];

      for (let s = 0; s < saturdaySessionsCount; s++) {
        const session = await prisma.session.create({
          data: {
            classId: classEntity.id,
            day: "SATURDAY",
            startTime: createTimeString(saturdayTimes[s].start),
            endTime: createTimeString(saturdayTimes[s].end),
            capacity: 15,
          },
        });
        console.log(
          `    ⏰ Saturday ${saturdayTimes[s].start}:00 - ${saturdayTimes[s].end}:00 (15 spots)`,
        );
        allSessions.push({
          session,
          courseId: course.id,
          classId: classEntity.id,
          day: "SATURDAY",
        });
      }

      // Sunday Sessions
      const sundaySessionsCount = courseInfo.hasMultipleSessions ? 2 : 1;
      const sundayTimes = [
        { start: 14, end: 16 },
        { start: 16, end: 18 },
      ];

      for (let s = 0; s < sundaySessionsCount; s++) {
        const session = await prisma.session.create({
          data: {
            classId: classEntity.id,
            day: "SUNDAY",
            startTime: createTimeString(sundayTimes[s].start),
            endTime: createTimeString(sundayTimes[s].end),
            capacity: 15,
          },
        });
        console.log(
          `    ⏰ Sunday ${sundayTimes[s].start}:00 - ${sundayTimes[s].end}:00 (15 spots)`,
        );
        allSessions.push({
          session,
          courseId: course.id,
          classId: classEntity.id,
          day: "SUNDAY",
        });
      }
    }
  }

  // ============================================================================
  // 3. CREATE STUDENTS FROM CSV DATA
  // ============================================================================
  console.log("\n\n📌 Creating Students from CSV data...");

  let studentIndex = 0;
  const studentsPerClass = Math.ceil(studentPool.length / allClasses.length);

  for (const classInfo of allClasses) {
    const classSessions = allSessions.filter((s) => s.classId === classInfo.id);
    const saturdaySessions = classSessions.filter((s) => s.day === "SATURDAY");
    const sundaySessions = classSessions.filter((s) => s.day === "SUNDAY");

    if (saturdaySessions.length === 0 || sundaySessions.length === 0) continue;

    let studentsInClass = 0;

    while (
      studentIndex < studentPool.length &&
      studentsInClass < studentsPerClass
    ) {
      const studentData = studentPool[studentIndex++];
      const studentNumber = getUniqueStudentNumber();

      // Randomly assign to a session
      const randomSaturdaySession =
        saturdaySessions[Math.floor(Math.random() * saturdaySessions.length)];
      const randomSundaySession =
        sundaySessions[Math.floor(Math.random() * sundaySessions.length)];

      await prisma.student.create({
        data: {
          studentNumber,
          surname: capitalize(studentData.lastName),
          firstName: capitalize(studentData.firstName),
          email: studentData.email.toLowerCase(),
          phoneNumber: `07${Math.floor(10000000 + Math.random() * 90000000)}`,
          password: await hashPassword("Student123!"),
          classId: classInfo.id,
          saturdaySessionId: randomSaturdaySession.session.id,
          sundaySessionId: randomSundaySession.session.id,
        },
      });

      studentsInClass++;
    }

    console.log(`  👥 ${classInfo.name}: ${studentsInClass} students`);
  }

  // ============================================================================
  // 4. CREATE PENDING REGISTRATIONS
  // ============================================================================
  console.log("\n📌 Creating Pending Registrations...");

  for (let i = 0; i < pendingPool.length; i++) {
    const pendingData = pendingPool[i];

    // Pick random course and sessions
    const randomCourseIndex = Math.floor(Math.random() * courses.length);
    const courseSessions = allSessions.filter(
      (s) => s.courseId === courses[randomCourseIndex].id,
    );

    const saturdaySessions = courseSessions.filter((s) => s.day === "SATURDAY");
    const sundaySessions = courseSessions.filter((s) => s.day === "SUNDAY");

    if (saturdaySessions.length === 0 || sundaySessions.length === 0) continue;

    const randomSaturday =
      saturdaySessions[Math.floor(Math.random() * saturdaySessions.length)];
    const randomSunday =
      sundaySessions[Math.floor(Math.random() * sundaySessions.length)];

    await prisma.studentRegistration.create({
      data: {
        surname: capitalize(pendingData.lastName),
        firstName: capitalize(pendingData.firstName),
        email: pendingData.email.toLowerCase(),
        phoneNumber: `07${Math.floor(10000000 + Math.random() * 90000000)}`,
        courseId: courses[randomCourseIndex].id,
        saturdaySessionId: randomSaturday.session.id,
        sundaySessionId: randomSunday.session.id,
        password: await hashPassword("Pending123!"),
        paymentReceiptUrl: `https://storage.example.com/receipts/${Date.now()}-${i}.jpg`,
        paymentReceiptNo: `RCT${Math.floor(100000 + Math.random() * 900000)}`,
        status: "PENDING",
      },
    });
  }
  console.log(`✅ ${pendingPool.length} Pending Registrations created\n`);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  const totalCourses = await prisma.course.count();
  const totalTeachers = await prisma.teacher.count();
  const totalClasses = await prisma.class.count();
  const totalSessions = await prisma.session.count();
  const totalStudents = await prisma.student.count();
  const totalPending = await prisma.studentRegistration.count({
    where: { status: "PENDING" },
  });

  console.log("\n" + "=".repeat(70));
  console.log("🎉 DATABASE SEEDED SUCCESSFULLY!");
  console.log("=".repeat(70));
  console.log("\n📊 SUMMARY:");
  console.log(`├─ ${totalCourses} Courses`);
  console.log(`├─ ${totalTeachers} Teachers (including Head Teachers)`);
  console.log(`├─ ${totalClasses} Classes`);
  console.log(`├─ ${totalSessions} Sessions`);
  console.log(`├─ ${totalStudents} Active Students`);
  console.log(`├─ ${totalPending} Pending Registrations`);
  console.log(`└─ 1 Admin\n`);

  console.log("🔐 LOGIN CREDENTIALS:");
  console.log("\n1️⃣  ADMIN:");
  console.log("   Email: admin@weekend.academy");
  console.log("   Password: Admin123!");

  console.log("\n2️⃣  SAMPLE HEAD TEACHER:");
  console.log("   Email: head.programming@academy.com");
  console.log("   Password: Teacher123!");

  console.log("\n3️⃣  SAMPLE STUDENT (from CSV):");
  if (studentPool.length > 0) {
    console.log(`   Email: ${studentPool[0].email.toLowerCase()}`);
    console.log("   Password: Student123!");
  }

  console.log("\n4️⃣  ALL OTHER LOGINS:");
  console.log("   Teachers: head.{course}@academy.com / Teacher123!");
  console.log("   Teachers: teacher*.{course}@academy.com / Teacher123!");
  console.log("   Students: {csv-email} / Student123!");
  console.log("   Pending: {csv-email} (not yet approved)");

  console.log("\n" + "=".repeat(70));
  console.log("\n🌐 Access the app at: http://localhost:3000");
  console.log("   Staff Login: /staff-login");
  console.log("   Student Login: /login");
  console.log("   Registration: /register\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
