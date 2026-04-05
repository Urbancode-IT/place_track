import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const existingStudent = await prisma.student.findFirst({ where: { name: 'Alice Kumar' } });
  if (existingStudent) {
    console.log('Seed already applied.');
    return;
  }

  const hashed = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kattraan.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@kattraan.com',
      password: hashed,
      role: 'ADMIN',
      phone: '+919876543210',
    },
  });

  const trainerPass = await bcrypt.hash('trainer123', 10);
  const t1 = await prisma.user.upsert({
    where: { email: 'trainer1@kattraan.com' },
    update: {},
    create: {
      name: 'Trainer One',
      email: 'trainer1@kattraan.com',
      password: trainerPass,
      role: 'TRAINER',
      phone: '+919876543211',
    },
  });

  const t2 = await prisma.user.upsert({
    where: { email: 'trainer2@kattraan.com' },
    update: {},
    create: {
      name: 'Trainer Two',
      email: 'trainer2@kattraan.com',
      password: trainerPass,
      role: 'TRAINER',
      phone: '+919876543212',
    },
  });

  const s1 = await prisma.student.create({
    data: {
      name: 'Alice Kumar',
      email: 'alice@example.com',
      phone: '+919876543220',
      course: 'FSD',
      batchId: 'BATCH-2024-01',
      selfIntro: 'Full stack developer with React and Node experience.',
    },
  });

  const s2 = await prisma.student.create({
    data: {
      name: 'Bob Singh',
      email: 'bob@example.com',
      phone: '+919876543221',
      course: 'SDET',
      batchId: 'BATCH-2024-01',
    },
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const i1 = await prisma.interview.create({
    data: {
      studentId: s1.id,
      company: 'Tech Corp',
      round: 'Technical Round 1',
      date: tomorrow,
      timeSlot: '10:00 AM - 11:00 AM',
      hrNumber: '+919999999991',
      room: 'Room A',
      status: 'SCHEDULED',
      trainers: {
        create: [
          { trainerId: t1.id, notifiedAt: new Date() },
          { trainerId: t2.id, notifiedAt: new Date() },
        ],
      },
    },
  });

  await prisma.qaEntry.create({
    data: {
      studentId: s1.id,
      question: 'Tell me about yourself',
      answer: 'I am a full stack developer...',
      category: 'HR',
      status: 'PREPARED',
    },
  });

  console.log('Seeded:', { admin: admin.email, trainers: [t1.email, t2.email], students: 2, interviews: 1 });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
