// prisma/seed.ts - Comprehensive Database Seed Script
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Helper to create time objects
function createTime(hours: number, minutes: number = 0): Date {
  return new Date(
    `2000-01-01T${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00Z`,
  );
}

async function main() {
  console.log("🌱 Starting comprehensive database seed...\n");

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
    },
  });
  console.log("✅ Admin created\n");

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

  const courses = [];
  const allSessions: any[] = [];
  let studentCounter = 1;

  for (const courseInfo of courseData) {
    console.log(`\n🎓 ${courseInfo.name}`);
    console.log("─".repeat(60));

    // Create Head Teacher
    const headTeacher = await prisma.teacher.create({
      data: {
        email: courseInfo.email,
        password: await hashPassword("Teacher123!"),
        role: "HEAD",
      },
    });
    console.log(`✅ Head Teacher: ${headTeacher.email}`);

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

    // Create Additional Teachers (1-2 per course)
    const additionalTeachersCount = Math.floor(Math.random() * 2) + 1;
    for (let t = 1; t <= additionalTeachersCount; t++) {
      await prisma.teacher.create({
        data: {
          email: `teacher${t}.${courseInfo.name.toLowerCase().replace(/\s+/g, "")}@academy.com`,
          password: await hashPassword("Teacher123!"),
          courseId: course.id,
          role: "ADDITIONAL",
        },
      });
    }
    console.log(`✅ ${additionalTeachersCount} Additional Teacher(s) created`);

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
            startTime: createTime(saturdayTimes[s].start),
            endTime: createTime(saturdayTimes[s].end),
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
            startTime: createTime(sundayTimes[s].start),
            endTime: createTime(sundayTimes[s].end),
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

      // Create 2-3 students per class
      const studentsPerClass = Math.floor(Math.random() * 2) + 2;
      for (let st = 1; st <= studentsPerClass; st++) {
        const studentNumber = `STU${studentCounter.toString().padStart(3, "0")}`;

        // Get random Saturday and Sunday sessions for this class
        const classSessions = allSessions.filter(
          (s) => s.classId === classEntity.id,
        );
        const saturdaySessions = classSessions.filter(
          (s) => s.day === "SATURDAY",
        );
        const sundaySessions = classSessions.filter((s) => s.day === "SUNDAY");

        const randomSaturdaySession =
          saturdaySessions[Math.floor(Math.random() * saturdaySessions.length)];
        const randomSundaySession =
          sundaySessions[Math.floor(Math.random() * sundaySessions.length)];

        await prisma.student.create({
          data: {
            studentNumber,
            surname: `Surname${studentCounter}`,
            firstName: `Student${studentCounter}`,
            lastName: `Name${studentCounter}`,
            email: `student${studentCounter}@academy.com`,
            phoneNumber: `07${(10000000 + studentCounter).toString()}`,
            passwordHash: await hashPassword("Student123!"),
            classId: classEntity.id,
            saturdaySessionId: randomSaturdaySession.session.id,
            sundaySessionId: randomSundaySession.session.id,
          },
        });

        studentCounter++;
      }
      console.log(`  👥 ${studentsPerClass} Students enrolled`);
    }
  }

  // ============================================================================
  // 3. CREATE PENDING REGISTRATIONS (5-10 across different courses)
  // ============================================================================
  console.log("\n\n📌 Creating Pending Registrations...");

  const pendingCount = 7;
  for (let i = 1; i <= pendingCount; i++) {
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
        surname: `Pending${i}`,
        firstName: `Registration${i}`,
        lastName: `Test${i}`,
        email: `pending${i}@test.com`,
        phoneNumber: `072${(1000000 + i).toString()}`,
        courseId: courses[randomCourseIndex].id,
        saturdaySessionId: randomSaturday.session.id,
        sundaySessionId: randomSunday.session.id,
        passwordHash: await hashPassword("Pending123!"),
        paymentReceiptUrl: `https://example.com/receipts/pending${i}.jpg`,
        paymentReceiptNo: `RCT${(100000 + i).toString()}`,
        status: "PENDING",
      },
    });
  }
  console.log(`✅ ${pendingCount} Pending Registrations created\n`);

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

  console.log("\n3️⃣  SAMPLE STUDENT:");
  console.log("   Email: student1@academy.com");
  console.log("   Password: Student123!");
  console.log("   Student Number: STU001");

  console.log("\n4️⃣  ALL OTHER LOGINS:");
  console.log("   Teachers: teacher*.{course}@academy.com / Teacher123!");
  console.log("   Students: student*@academy.com / Student123!");
  console.log("   Pending: pending*@test.com (not yet approved)");

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
