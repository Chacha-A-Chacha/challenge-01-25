// prisma/seed.ts - Database Seed Script
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Hash password using bcryptjs
 */
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Main seed function
 */
async function main() {
  console.log("🌱 Starting database seed...");

  // ============================================================================
  // 1. CREATE ADMIN
  // ============================================================================
  console.log("\n📌 Creating Admin...");

  const admin = await prisma.admin.upsert({
    where: { email: "admin@weekend.academy" },
    update: {},
    create: {
      email: "admin@weekend.academy",
      password: await hashPassword("Admin123!"),
    },
  });
  console.log("✅ Admin created:", admin.email);

  // ============================================================================
  // 2. CREATE HEAD TEACHER (without courseId first)
  // ============================================================================
  console.log("\n📌 Creating Head Teacher...");

  const headTeacher = await prisma.teacher.upsert({
    where: { email: "head.teacher@math.academy" },
    update: {},
    create: {
      email: "head.teacher@math.academy",
      password: await hashPassword("HeadTeacher123!"),
      role: "HEAD",
      // courseId will be set after course creation
    },
  });
  console.log("✅ Head Teacher created:", headTeacher.email);

  // ============================================================================
  // 3. CREATE COURSE (linked to head teacher)
  // ============================================================================
  console.log("\n📌 Creating Course...");

  const course = await prisma.course.upsert({
    where: { headTeacherId: headTeacher.id },
    update: {},
    create: {
      name: "Mathematics Weekend Program",
      headTeacherId: headTeacher.id,
      status: "ACTIVE",
    },
  });
  console.log("✅ Course created:", course.name);

  // ============================================================================
  // 4. UPDATE HEAD TEACHER with courseId (optional backlink)
  // ============================================================================
  console.log("\n📌 Linking Head Teacher to Course...");

  await prisma.teacher.update({
    where: { id: headTeacher.id },
    data: { courseId: course.id },
  });
  console.log("✅ Head Teacher linked to course");

  // ============================================================================
  // 5. CREATE ADDITIONAL TEACHER
  // ============================================================================
  console.log("\n📌 Creating Additional Teacher...");

  const additionalTeacher = await prisma.teacher.upsert({
    where: { email: "teacher@math.academy" },
    update: {},
    create: {
      email: "teacher@math.academy",
      password: await hashPassword("Teacher123!"),
      courseId: course.id,
      role: "ADDITIONAL",
    },
  });
  console.log("✅ Additional Teacher created:", additionalTeacher.email);

  // ============================================================================
  // 6. CREATE CLASS
  // ============================================================================
  console.log("\n📌 Creating Class...");

  const mathClass = await prisma.class.upsert({
    where: {
      // Use composite unique if exists, otherwise use findFirst + create pattern
      id:
        (
          await prisma.class.findFirst({
            where: {
              name: "Math - Class A",
              courseId: course.id,
            },
          })
        )?.id || "new",
    },
    update: {},
    create: {
      name: "Math - Class A",
      capacity: 30,
      courseId: course.id,
    },
  });
  console.log("✅ Class created:", mathClass.name);

  // ============================================================================
  // 7. CREATE SATURDAY SESSION
  // ============================================================================
  console.log("\n📌 Creating Saturday Session...");

  // Create a date for times (Prisma DateTime field)
  const saturdayStartTime = new Date("2000-01-01T09:00:00Z");
  const saturdayEndTime = new Date("2000-01-01T11:00:00Z");

  const saturdaySession = await prisma.session.create({
    data: {
      classId: mathClass.id,
      day: "SATURDAY",
      startTime: saturdayStartTime,
      endTime: saturdayEndTime,
      capacity: 15,
    },
  });
  console.log(
    "✅ Saturday Session created:",
    `${saturdayStartTime.toISOString().slice(11, 16)} - ${saturdayEndTime.toISOString().slice(11, 16)}`,
  );

  // ============================================================================
  // 8. CREATE SUNDAY SESSION
  // ============================================================================
  console.log("\n📌 Creating Sunday Session...");

  const sundayStartTime = new Date("2000-01-01T14:00:00Z");
  const sundayEndTime = new Date("2000-01-01T16:00:00Z");

  const sundaySession = await prisma.session.create({
    data: {
      classId: mathClass.id,
      day: "SUNDAY",
      startTime: sundayStartTime,
      endTime: sundayEndTime,
      capacity: 15,
    },
  });
  console.log(
    "✅ Sunday Session created:",
    `${sundayStartTime.toISOString().slice(11, 16)} - ${sundayEndTime.toISOString().slice(11, 16)}`,
  );

  // ============================================================================
  // 9. CREATE STUDENT
  // ============================================================================
  console.log("\n📌 Creating Student...");

  const student = await prisma.student.upsert({
    where: {
      // Use composite unique constraint
      studentNumber_classId: {
        studentNumber: "STU001",
        classId: mathClass.id,
      },
    },
    update: {},
    create: {
      studentNumber: "STU001",
      surname: "Alfha",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@student.com",
      phoneNumber: "0712345678",
      passwordHash: await hashPassword("Student123!"),
      classId: mathClass.id,
      // Assign to both sessions
      saturdaySessionId: saturdaySession.id,
      sundaySessionId: sundaySession.id,
    },
  });
  console.log(
    "✅ Student created:",
    `${student.firstName} ${student.lastName} (${student.studentNumber})`,
  );
  console.log("   UUID:", student.uuid);
  console.log("   Saturday Session assigned");
  console.log("   Sunday Session assigned");

  // ============================================================================
  // 10. CREATE SAMPLE STUDENT REGISTRATION (PENDING)
  // ============================================================================
  console.log("\n📌 Creating Sample Student Registration...");

  const pendingRegistration = await prisma.studentRegistration.upsert({
    where: { email: "jane.smith@student.com" },
    update: {},
    create: {
      surname: "Smith",
      firstName: "Jane",
      lastName: "Marie",
      email: "jane.smith@student.com",
      phoneNumber: "0723456789",
      courseId: course.id,
      saturdaySessionId: saturdaySession.id,
      sundaySessionId: sundaySession.id,
      passwordHash: await hashPassword("Jane123!"),
      paymentReceiptUrl: "https://example.com/receipts/jane-smith-payment.jpg",
      paymentReceiptNo: "123456789",
      status: "PENDING",
    },
  });
  console.log(
    "✅ Pending Registration created:",
    `${pendingRegistration.firstName} ${pendingRegistration.lastName}`,
  );
  console.log("   Email:", pendingRegistration.email);
  console.log("   Status:", pendingRegistration.status);
  console.log("   Payment Receipt #:", pendingRegistration.paymentReceiptNo);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Database seeded successfully!");
  console.log("=".repeat(60));
  console.log("\n📊 SEED SUMMARY:");
  console.log("├─ 1 Admin");
  console.log("├─ 1 Course");
  console.log("├─ 1 Head Teacher");
  console.log("├─ 1 Additional Teacher");
  console.log("├─ 1 Class");
  console.log("├─ 2 Sessions (Saturday & Sunday)");
  console.log("├─ 1 Student (assigned to both sessions)");
  console.log("└─ 1 Pending Student Registration");

  console.log("\n🔐 LOGIN CREDENTIALS:");
  console.log("\n1️⃣  ADMIN LOGIN:");
  console.log("   URL: http://localhost:3000/staff-login");
  console.log("   Email: admin@weekend.academy");
  console.log("   Password: Admin123!");

  console.log("\n2️⃣  HEAD TEACHER LOGIN:");
  console.log("   URL: http://localhost:3000/staff-login");
  console.log("   Email: head.teacher@math.academy");
  console.log("   Password: HeadTeacher123!");

  console.log("\n3️⃣  ADDITIONAL TEACHER LOGIN:");
  console.log("   URL: http://localhost:3000/staff-login");
  console.log("   Email: teacher@math.academy");
  console.log("   Password: Teacher123!");

  console.log("\n4️⃣  STUDENT LOGIN:");
  console.log("   URL: http://localhost:3000/login");
  console.log("   Email: john.doe@student.com");
  console.log("   Password: Student123!");
  console.log("   Student Number: STU001");
  console.log("   UUID:", student.uuid);

  console.log("\n5️⃣  PENDING REGISTRATION (For Testing Approval):");
  console.log(
    "   Name:",
    pendingRegistration.firstName,
    pendingRegistration.lastName,
  );
  console.log("   Email:", pendingRegistration.email);
  console.log("   Status:", pendingRegistration.status);
  console.log("   Payment Receipt #:", pendingRegistration.paymentReceiptNo);

  console.log("\n" + "=".repeat(60));
}

/**
 * Execute seed and handle errors
 */
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

// ============================================================================
// PACKAGE.JSON SCRIPT
// ============================================================================
/*
Add this to your package.json:

{
  "scripts": {
    "db:seed": "tsx prisma/seed.ts"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}

Then run:
  npm run db:seed

Or automatically after migrations:
  npx prisma db push
  npx prisma migrate dev
*/

// ============================================================================
// RESET DATABASE (if needed)
// ============================================================================
/*
To reset and reseed:

npx prisma migrate reset
// This will:
// 1. Drop the database
// 2. Create a new database
// 3. Run all migrations
// 4. Run the seed script automatically

Or manually:
npx prisma db push --force-reset
npm run db:seed
*/
