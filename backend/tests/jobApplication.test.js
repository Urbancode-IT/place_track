import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app.js';
import { query } from '../src/config/db.js';
import { calendarDateInScheduleTz } from '../src/utils/date.utils.js';
import {
  normalizePortalName,
  normalizeMeetingLink,
  isValidHttpUrl,
  findDuplicateSlotTime,
  hydrateInterviewSlots,
  formatDateOnly,
  isValidDateOnly,
  likeContainsPattern,
  safeMeetingLink,
} from '../src/utils/jobApplication.utils.js';
import {
  createJobApplicationSchema,
  updateJobApplicationRequestSchema,
  historyQuerySchema,
} from '../src/validators/jobApplication.validator.js';

describe('Job application helpers', () => {
  it('normalizes portal casing to the canonical label', () => {
    expect(normalizePortalName('naukri')).toBe('Naukri');
    expect(normalizePortalName('NAUKRI')).toBe('Naukri');
    expect(normalizePortalName('  Naukri  ')).toBe('Naukri');
    expect(normalizePortalName('linkedin')).toBe('LinkedIn');
  });

  it('title-cases unknown all-lower portal names', () => {
    expect(normalizePortalName('company careers')).toBe('Company Careers');
  });

  it('accepts http(s) meeting links and prefixes a host', () => {
    expect(isValidHttpUrl('https://meet.google.com/abc-defg-hij')).toBe(true);
    expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
    expect(normalizeMeetingLink('meet.google.com/abc-defg-hij')).toBe(
      'https://meet.google.com/abc-defg-hij'
    );
    expect(isValidHttpUrl(normalizeMeetingLink('meet.google.com/abc-defg-hij'))).toBe(true);
  });

  it('requires interview slots with unique times on the same day', () => {
    const missing = createJobApplicationSchema.safeParse({
      date: '2026-09-21',
      studentId: '11111111-1111-1111-1111-111111111111',
      portal: 'Naukri',
      applicationCount: 1,
      interviewsScheduled: 1,
      companyName: 'Acme',
    });
    expect(missing.success).toBe(false);

    const dupTime = createJobApplicationSchema.safeParse({
      date: '2026-09-21',
      studentId: '11111111-1111-1111-1111-111111111111',
      portal: 'Naukri',
      applicationCount: 1,
      interviewsScheduled: 2,
      interviewSlots: [
        { companyName: 'Infosys', date: '2026-09-21', timeSlot: '10:00 AM' },
        { companyName: 'TCS', date: '2026-09-21', timeSlot: '10:00 AM' },
      ],
    });
    expect(dupTime.success).toBe(false);

    const ok = createJobApplicationSchema.safeParse({
      date: '2026-09-21',
      studentId: '11111111-1111-1111-1111-111111111111',
      portal: 'Naukri',
      applicationCount: 2,
      interviewsScheduled: 2,
      interviewSlots: [
        { companyName: 'Infosys', date: '2026-09-21', timeSlot: '10:00 AM' },
        { companyName: 'TCS', date: '2026-09-21', timeSlot: '3:00 PM' },
      ],
    });
    expect(ok.success).toBe(true);
    expect(ok.data.interviewSlots).toHaveLength(2);
    expect(findDuplicateSlotTime(ok.data.interviewSlots)).toBeNull();
    expect(hydrateInterviewSlots(ok.data.interviewSlots)).toHaveLength(2);
  });

  it('formats pg DATE local midnight without a UTC day shift', () => {
    const localMidnight = new Date(2099, 6, 1, 0, 0, 0, 0);
    expect(formatDateOnly(localMidnight)).toBe('2099-07-01');
    expect(formatDateOnly('2099-07-01')).toBe('2099-07-01');
    // ISO of that instant must not keep the UTC calendar prefix (JA-01).
    expect(formatDateOnly(localMidnight.toISOString())).toBe('2099-07-01');
  });

  it('rejects impossible calendar dates', () => {
    expect(isValidDateOnly('2026-13-40')).toBe(false);
    expect(isValidDateOnly('2026-02-30')).toBe(false);
    expect(isValidDateOnly('2026-09-21')).toBe(true);
    expect(createJobApplicationSchema.safeParse({
      date: '2026-02-30',
      studentId: '11111111-1111-1111-1111-111111111111',
      portal: 'Naukri',
      applicationCount: 1,
    }).success).toBe(false);
  });

  it('allows calls and interviews that came from earlier applications', () => {
    expect(
      createJobApplicationSchema.safeParse({
        date: '2026-09-21',
        studentId: '11111111-1111-1111-1111-111111111111',
        portal: 'Naukri',
        applicationCount: 1,
        callsReceived: 3,
      }).success
    ).toBe(true);
    expect(
      createJobApplicationSchema.safeParse({
        date: '2026-09-21',
        studentId: '11111111-1111-1111-1111-111111111111',
        portal: 'Naukri',
        applicationCount: 9,
        callsReceived: 20,
        interviewsScheduled: 2,
        interviewSlots: [
          { companyName: 'A', date: '2026-09-21', timeSlot: '10:00 AM' },
          { companyName: 'B', date: '2026-09-21', timeSlot: '11:00 AM' },
        ],
      }).success
    ).toBe(true);
    expect(
      updateJobApplicationRequestSchema.safeParse({
        id: '11111111-1111-1111-1111-111111111111',
        applicationCount: 1,
        callsReceived: 4,
      }).success
    ).toBe(true);
  });

  it('drops javascript meeting links and treats search wildcards as literals', () => {
    expect(safeMeetingLink('javascript:alert(1)')).toBeNull();
    expect(safeMeetingLink('https://meet.google.com/abc-defg-hij')).toBe(
      'https://meet.google.com/abc-defg-hij'
    );
    expect(hydrateInterviewSlots([
      { companyName: 'Acme', date: '2026-09-21', timeSlot: '10:00 AM', meetingLink: 'javascript:alert(1)' },
    ])[0].meetingLink).toBeNull();
    expect(likeContainsPattern('%')).toBe('%\\%%');
    expect(likeContainsPattern('naukri')).toBe('%naukri%');
  });

  it('clears interview slots when interviewsScheduled is 0 even if slots are sent', () => {
    const parsed = updateJobApplicationRequestSchema.safeParse({
      id: '11111111-1111-1111-1111-111111111111',
      interviewsScheduled: 0,
      interviewSlots: [
        { companyName: 'ShouldIgnore', date: '2026-09-21', timeSlot: '9:00 AM' },
      ],
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data.interviewsScheduled).toBe(0);
    expect(parsed.data.interviewSlots).toEqual([]);
  });

  it('caps applications at 50, calls at 20, and interviews at 10', () => {
    const base = {
      date: '2026-09-21',
      studentId: '11111111-1111-1111-1111-111111111111',
      portal: 'Naukri',
    };
    expect(createJobApplicationSchema.safeParse({ ...base, applicationCount: 50 }).success).toBe(
      true
    );
    expect(createJobApplicationSchema.safeParse({ ...base, applicationCount: 51 }).success).toBe(
      false
    );
    expect(
      createJobApplicationSchema.safeParse({
        ...base,
        applicationCount: 20,
        callsReceived: 20,
      }).success
    ).toBe(true);
    expect(
      createJobApplicationSchema.safeParse({
        ...base,
        applicationCount: 20,
        callsReceived: 21,
      }).success
    ).toBe(false);
    expect(
      createJobApplicationSchema.safeParse({
        ...base,
        applicationCount: 10,
        interviewsScheduled: 11,
      }).success
    ).toBe(false);
  });

  it('rejects inverted history date ranges', () => {
    const parsed = historyQuerySchema.safeParse({
      dateFrom: '2099-06-16',
      dateTo: '2099-06-15',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('Job Applications API — unauthorized', () => {
  it('GET /api/job-applications - unauthorized', async () => {
    const res = await request(app).get('/api/job-applications');
    expect(res.status).toBe(401);
  });

  it('GET /api/job-applications/daily - unauthorized', async () => {
    const res = await request(app).get('/api/job-applications/daily').query({ date: '2026-09-15' });
    expect(res.status).toBe(401);
  });

  it('GET /api/job-applications/spocs - unauthorized', async () => {
    const res = await request(app).get('/api/job-applications/spocs');
    expect(res.status).toBe(401);
  });

  it('GET /api/job-applications/students - unauthorized', async () => {
    const res = await request(app).get('/api/job-applications/students');
    expect(res.status).toBe(401);
  });

  it('POST /api/job-applications - unauthorized', async () => {
    const res = await request(app).post('/api/job-applications').send({});
    expect(res.status).toBe(401);
  });

  it('rejects an invalid bearer token', async () => {
    const res = await request(app)
      .get('/api/job-applications')
      .set({ Authorization: 'Bearer not-a-jwt' });
    expect(res.status).toBe(401);
  });

  it('forbids STUDENT role on job application routes', async () => {
    const { signAccessToken } = await import('../src/utils/jwt.utils.js');
    const token = signAccessToken({
      userId: '11111111-1111-1111-1111-111111111111',
      email: 'student@example.com',
      role: 'STUDENT',
    });
    const res = await request(app).get('/api/job-applications').set(auth(token));
    expect(res.status).toBe(401);
  });
});

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@kattraan.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'admin123';
const TRAINER1_EMAIL = process.env.TEST_TRAINER_EMAIL || 'trainer1@kattraan.com';
const TRAINER2_EMAIL = process.env.TEST_TRAINER2_EMAIL || 'trainer2@kattraan.com';
const TRAINER_PASSWORD = process.env.TEST_TRAINER_PASSWORD || 'trainer123';

const TEST_DATE = '2024-06-15';
const TEST_DATE_B = '2024-06-16';

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function login(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res;
}

describe('Job Applications API — create, uniqueness, isolation, totals, history', () => {
  let adminToken;
  let adminId;
  let trainer1Token;
  let trainer1Id;
  let trainer2Token;
  let trainer2Id;
  let studentId;
  let studentName;
  let unassignedStudentId;
  let unassignedStudentName;
  let assignmentInterviewId;
  let baselineId;
  let createdIds = [];

  beforeAll(async () => {
    const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (adminLogin.status !== 200) {
      throw new Error(
        `Admin login failed (${adminLogin.status}): ${adminLogin.body?.message || 'seed admin@kattraan.com / admin123'}`
      );
    }
    adminToken = adminLogin.body.data.accessToken;
    adminId = adminLogin.body.data.user.id;

    const listed = await request(app).get('/api/trainers').set(auth(adminToken));
    const trainerRows = listed.body.data || [];
    const t1row = trainerRows.find((t) => t.email === TRAINER1_EMAIL);
    const t2row = trainerRows.find((t) => t.email === TRAINER2_EMAIL);
    if (!t1row || !t2row) {
      throw new Error('Seed trainers trainer1@kattraan.com and trainer2@kattraan.com are required');
    }
    trainer1Id = t1row.id;
    trainer2Id = t2row.id;
    const allow1 = await request(app).post(`/api/trainers/${trainer1Id}/allow`).set(auth(adminToken));
    const allow2 = await request(app).post(`/api/trainers/${trainer2Id}/allow`).set(auth(adminToken));
    if (allow1.status !== 200 || allow2.status !== 200) {
      throw new Error('Could not allow seed trainers for job-application tests');
    }

    const t1 = await login(TRAINER1_EMAIL, TRAINER_PASSWORD);
    const t2 = await login(TRAINER2_EMAIL, TRAINER_PASSWORD);
    if (t1.status !== 200 || t2.status !== 200) {
      throw new Error('Allowed seed trainers could not sign in');
    }
    trainer1Token = t1.body.data.accessToken;
    trainer2Token = t2.body.data.accessToken;

    const stamp = Date.now();
    const studentRes = await request(app)
      .post('/api/students')
      .set(auth(adminToken))
      .send({
        name: `JA Test ${stamp}`,
        email: `ja-test-${stamp}@example.com`,
        course: 'FSD',
      });
    expect(studentRes.status).toBe(201);
    studentId = studentRes.body.data.id;
    studentName = studentRes.body.data.name;

    const otherStudent = await request(app)
      .post('/api/students')
      .set(auth(adminToken))
      .send({
        name: `JA Other ${stamp}`,
        email: `ja-other-${stamp}@example.com`,
        course: 'SDET',
      });
    expect(otherStudent.status).toBe(201);
    unassignedStudentId = otherStudent.body.data.id;
    unassignedStudentName = otherStudent.body.data.name;

    const baseline = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: '2098-01-01',
        spocUserId: trainer1Id,
        studentName,
        course: 'FSD',
        portal: 'JA Baseline',
        applicationCount: 0,
      });
    if (baseline.status !== 201) {
      throw new Error(
        `Baseline entry failed (${baseline.status}): ${baseline.body?.message || 'unknown'}`
      );
    }
    baselineId = baseline.body.data.id;

    if (trainer1Id) {
      const interviewRes = await query(
        `INSERT INTO "Interview" ("studentId", company, round, date, "timeSlot")
         VALUES ($1, $2, $3, $4::timestamptz, $5)
         RETURNING id`,
        [studentId, 'JA Assignment Co', 'Technical Round 1', `${TEST_DATE}T10:00:00.000Z`, '10:00 AM']
      );
      assignmentInterviewId = interviewRes.rows[0].id;
      await query(
        `INSERT INTO "InterviewTrainer" ("interviewId", "trainerId") VALUES ($1, $2)`,
        [assignmentInterviewId, trainer1Id]
      );
    }
  }, 30000);

  afterAll(async () => {
    if (!adminToken) return;
    for (const id of createdIds) {
      await request(app).delete(`/api/job-applications/${id}`).set(auth(adminToken));
    }
    if (baselineId) {
      await request(app).delete(`/api/job-applications/${baselineId}`).set(auth(adminToken));
    }
    if (assignmentInterviewId) {
      await query('DELETE FROM "Interview" WHERE id = $1', [assignmentInterviewId]);
    }
    if (studentId) {
      await request(app).delete(`/api/students/${studentId}`).set(auth(adminToken));
    }
    if (unassignedStudentId) {
      await request(app).delete(`/api/students/${unassignedStudentId}`).set(auth(adminToken));
    }
    if (trainer1Id) {
      await request(app).post(`/api/trainers/${trainer1Id}/revoke`).set(auth(adminToken));
    }
    if (trainer2Id) {
      await request(app).post(`/api/trainers/${trainer2Id}/revoke`).set(auth(adminToken));
    }
  }, 30000);

  it('creates an entry and stores the canonical portal name', async () => {
    const res = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: TEST_DATE,
        spocUserId: trainer1Id,
        studentId,
        portal: 'naukri',
        applicationCount: 4,
        callsReceived: 2,
        interviewsScheduled: 1,
        interviewSlots: [
          {
            companyName: 'Acme',
            date: TEST_DATE,
            timeSlot: '10:00 AM',
          },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.portal).toBe('Naukri');
    expect(res.body.data.interviewSlots).toHaveLength(1);
    expect(res.body.data.interviewSlots[0].companyName).toBe('Acme');
    expect(res.body.data.interviewSlots[0].linkStatus).toBe('pending');
    createdIds.push(res.body.data.id);
  });

  it('returns 409 on unique conflict including case variants', async () => {
    const res = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: TEST_DATE,
        spocUserId: trainer1Id,
        studentId,
        portal: 'NAUKRI',
        applicationCount: 9,
        callsReceived: 0,
      });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_ENTRY');
    expect(res.body.data?.id).toBe(createdIds[0]);
  });

  it('stores two same-day interview slots with distinct times', async () => {
    const res = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: TEST_DATE_B,
        spocUserId: trainer1Id,
        studentId,
        portal: 'LinkedIn',
        applicationCount: 2,
        interviewsScheduled: 2,
        interviewSlots: [
          { companyName: 'Infosys', date: TEST_DATE_B, timeSlot: '10:00 AM' },
          { companyName: 'TCS', date: TEST_DATE_B, timeSlot: '3:00 PM' },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.interviewsScheduled).toBe(2);
    expect(res.body.data.interviewSlots).toHaveLength(2);
    expect(res.body.data.interviewSlots.map((s) => s.companyName)).toEqual(['Infosys', 'TCS']);
    expect(res.body.data.interviewSlots.every((s) => s.linkStatus === 'pending')).toBe(true);
    createdIds.push(res.body.data.id);

    const sameTime = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: TEST_DATE_B,
        spocUserId: trainer1Id,
        studentId,
        portal: 'Indeed',
        applicationCount: 1,
        interviewsScheduled: 2,
        interviewSlots: [
          { companyName: 'Infosys', date: TEST_DATE_B, timeSlot: '10:00 AM' },
          { companyName: 'TCS', date: TEST_DATE_B, timeSlot: '10:00 AM' },
        ],
      });
    expect(sameTime.status).toBe(400);
  });

  it('returns daily totals for the loaded SPOC', async () => {
    const second = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: TEST_DATE,
        spocUserId: trainer1Id,
        studentId,
        portal: 'LinkedIn',
        applicationCount: 6,
        callsReceived: 1,
        interviewsScheduled: 0,
      });
    expect(second.status).toBe(201);
    createdIds.push(second.body.data.id);

    const daily = await request(app)
      .get('/api/job-applications/daily')
      .set(auth(adminToken))
      .query({ date: TEST_DATE, spocUserId: trainer1Id });
    expect(daily.status).toBe(200);
    expect(daily.body.data.spoc?.id).toBe(trainer1Id);
    expect(daily.body.data.totals).toEqual({
      applicationCount: 10,
      callsReceived: 3,
      interviewsScheduled: 1,
    });
    expect(daily.body.data.rows.length).toBeGreaterThanOrEqual(2);
  });

  it('filters history by date range and portal and returns range totals', async () => {
    const res = await request(app)
      .get('/api/job-applications')
      .set(auth(adminToken))
      .query({
        dateFrom: TEST_DATE,
        dateTo: TEST_DATE,
        portal: 'naukri',
        studentId,
      });
    expect(res.status).toBe(200);
    expect(res.body.data.every((row) => row.portal === 'Naukri')).toBe(true);
    expect(res.body.totals.applicationCount).toBe(4);
    expect(res.body.pagination.total).toBe(1);
  });

  it('keeps today’s rows on daily entry and out of history', async () => {
    const today = calendarDateInScheduleTz();
    const created = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: today,
        spocUserId: trainer1Id,
        studentId,
        portal: 'Shine',
        applicationCount: 3,
        callsReceived: 1,
      });
    expect(created.status).toBe(201);
    createdIds.push(created.body.data.id);

    const daily = await request(app)
      .get('/api/job-applications/daily')
      .set(auth(adminToken))
      .query({ date: today });
    expect(daily.status).toBe(200);
    expect(daily.body.data.spoc).toBeNull();
    expect(daily.body.data.rows.some((row) => row.id === created.body.data.id)).toBe(true);

    const history = await request(app)
      .get('/api/job-applications')
      .set(auth(adminToken))
      .query({ dateFrom: today, dateTo: today, studentId, portal: 'Shine' });
    expect(history.status).toBe(200);
    expect(history.body.data.some((row) => row.id === created.body.data.id)).toBe(false);
  });

  it('isolates trainer rows from other trainers', async () => {
    if (!trainer1Token || !trainer2Token) {
      throw new Error('Seed trainers trainer1@kattraan.com and trainer2@kattraan.com are required');
    }

    const created = await request(app)
      .post('/api/job-applications')
      .set(auth(trainer1Token))
      .send({
        date: TEST_DATE,
        studentId,
        portal: 'Indeed',
        applicationCount: 3,
        callsReceived: 0,
      });
    expect(created.status).toBe(201);
    createdIds.push(created.body.data.id);
    expect(created.body.data.spocUserId).toBe(trainer1Id);

    const otherDaily = await request(app)
      .get('/api/job-applications/daily')
      .set(auth(trainer2Token))
      .query({ date: TEST_DATE, spocUserId: trainer1Id });
    expect(otherDaily.status).toBe(200);
    expect(otherDaily.body.data.spocUserId).not.toBe(trainer1Id);
    expect(otherDaily.body.data.rows.some((row) => row.id === created.body.data.id)).toBe(false);

    const steal = await request(app)
      .put(`/api/job-applications/${created.body.data.id}`)
      .set(auth(trainer2Token))
      .send({ applicationCount: 40 });
    expect(steal.status).toBe(403);
    expect(steal.body.message).toBe('Access denied');

    const ownDaily = await request(app)
      .get('/api/job-applications/daily')
      .set(auth(trainer1Token))
      .query({ date: TEST_DATE });
    expect(ownDaily.status).toBe(200);
    expect(ownDaily.body.data.spocUserId).toBe(trainer1Id);
    expect(ownDaily.body.data.rows.some((row) => row.id === created.body.data.id)).toBe(true);

    const stealDelete = await request(app)
      .delete(`/api/job-applications/${created.body.data.id}`)
      .set(auth(trainer2Token));
    expect(stealDelete.status).toBe(403);
  });

  it('rejects trainer create/update for a student they are not assigned to', async () => {
    if (!trainer1Token || !unassignedStudentId) {
      throw new Error('Seed trainer1@kattraan.com and an unassigned student are required');
    }

    const createDenied = await request(app)
      .post('/api/job-applications')
      .set(auth(trainer1Token))
      .send({
        date: TEST_DATE,
        studentId: unassignedStudentId,
        portal: 'Shine',
        applicationCount: 1,
      });
    expect(createDenied.status).toBe(400);
    expect(createDenied.body.message).toBe('Enter a student name');

    const own = await request(app)
      .post('/api/job-applications')
      .set(auth(trainer1Token))
      .send({
        date: TEST_DATE_B,
        studentId,
        portal: 'Shine',
        applicationCount: 2,
      });
    expect(own.status).toBe(201);
    createdIds.push(own.body.data.id);

    const reassignDenied = await request(app)
      .put(`/api/job-applications/${own.body.data.id}`)
      .set(auth(trainer1Token))
      .send({ studentId: unassignedStudentId });
    expect(reassignDenied.status).toBe(400);
    expect(reassignDenied.body.message).toBe('Enter a student name');

    const owned = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: '2099-06-17',
        spocUserId: trainer1Id,
        studentName: unassignedStudentName,
        course: 'SDET',
        portal: 'Cutshort',
        applicationCount: 5,
        callsReceived: 1,
        interviewsScheduled: 0,
        interviewSlots: [],
      });
    expect(owned.status).toBe(201);
    createdIds.push(owned.body.data.id);

    const ownedUpdate = await request(app)
      .put(`/api/job-applications/${owned.body.data.id}`)
      .set(auth(trainer1Token))
      .send({
        date: '2099-06-17',
        studentId: unassignedStudentId,
        portal: 'Cutshort',
        applicationCount: 6,
        callsReceived: 1,
        interviewsScheduled: 0,
        interviewSlots: [],
      });
    expect(ownedUpdate.status).toBe(200);
    expect(ownedUpdate.body.data.applicationCount).toBe(6);
    expect(ownedUpdate.body.data.portal).toBe('Cutshort');
  });

  it('returns 400 for invalid dates, overflow, and student filters instead of 500', async () => {
    const cal = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: '2026-13-40',
        studentId,
        portal: 'Naukri',
        applicationCount: 1,
      });
    expect(cal.status).toBe(400);

    const feb = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: '2026-02-30',
        studentId,
        portal: 'Naukri',
        applicationCount: 1,
      });
    expect(feb.status).toBe(400);

    const overflow = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: TEST_DATE,
        studentId,
        portal: 'Shine',
        applicationCount: 2147483648,
      });
    expect(overflow.status).toBe(400);

    const students = await request(app)
      .get('/api/job-applications/students')
      .set(auth(adminToken))
      .query({ dateFrom: 'nope' });
    expect(students.status).toBe(400);

    const studentsOk = await request(app)
      .get('/api/job-applications/students')
      .set(auth(adminToken));
    expect(studentsOk.status).toBe(200);

    const inverted = await request(app)
      .get('/api/job-applications')
      .set(auth(adminToken))
      .query({ dateFrom: TEST_DATE_B, dateTo: TEST_DATE });
    expect(inverted.status).toBe(400);
  });

  it('round-trips the calendar date and blocks duplicate portal updates', async () => {
    const created = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: TEST_DATE,
        spocUserId: trainer1Id,
        studentId,
        portal: 'Monster India',
        applicationCount: 2,
      });
    expect(created.status).toBe(201);
    expect(created.body.data.date).toBe(TEST_DATE);
    createdIds.push(created.body.data.id);

    const daily = await request(app)
      .get('/api/job-applications/daily')
      .set(auth(adminToken))
      .query({ date: TEST_DATE, spocUserId: trainer1Id });
    expect(daily.status).toBe(200);
    expect(daily.body.data.date).toBe(TEST_DATE);
    const dailyRow = daily.body.data.rows.find((row) => row.id === created.body.data.id);
    expect(dailyRow?.date).toBe(TEST_DATE);

    const history = await request(app)
      .get('/api/job-applications')
      .set(auth(adminToken))
      .query({
        dateFrom: TEST_DATE,
        dateTo: TEST_DATE,
        portal: 'Monster India',
        studentId,
      });
    expect(history.status).toBe(200);
    expect(history.body.data.every((row) => row.date === TEST_DATE)).toBe(true);

    const second = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: TEST_DATE,
        spocUserId: trainer1Id,
        studentId,
        portal: 'foundit',
        applicationCount: 1,
      });
    expect(second.status).toBe(201);
    createdIds.push(second.body.data.id);

    const conflict = await request(app)
      .put(`/api/job-applications/${second.body.data.id}`)
      .set(auth(adminToken))
      .send({ portal: 'MONSTER INDIA' });
    expect(conflict.status).toBe(409);
    expect(conflict.body.code).toBe('DUPLICATE_ENTRY');
    expect(conflict.body.data?.id).toBe(created.body.data.id);

    const missing = await request(app)
      .put('/api/job-applications/11111111-1111-1111-1111-111111111111')
      .set(auth(adminToken))
      .send({ applicationCount: 1 });
    expect(missing.status).toBe(404);

    const del = await request(app)
      .delete(`/api/job-applications/${second.body.data.id}`)
      .set(auth(adminToken));
    expect(del.status).toBe(200);

    const delAgain = await request(app)
      .delete(`/api/job-applications/${second.body.data.id}`)
      .set(auth(adminToken));
    expect(delAgain.status).toBe(404);
  });

  it('returns 400 for missing required fields, empty/whitespace portal, and overlong values', async () => {
    const missing = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({ date: TEST_DATE, portal: 'Naukri', applicationCount: 1 });
    expect(missing.status).toBe(400);

    const emptyPortal = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({ date: TEST_DATE, studentId, portal: '', applicationCount: 1 });
    expect(emptyPortal.status).toBe(400);

    const whitespacePortal = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({ date: TEST_DATE, studentId, portal: '   ', applicationCount: 1 });
    expect(whitespacePortal.status).toBe(400);

    const tooLong = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: TEST_DATE,
        studentId,
        portal: 'X'.repeat(101),
        applicationCount: 1,
      });
    expect(tooLong.status).toBe(400);

    const badStudent = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: TEST_DATE,
        studentId: 'not-a-uuid',
        portal: 'Shine',
        applicationCount: 1,
      });
    expect(badStudent.status).toBe(400);

    const missingStudent = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: TEST_DATE,
        studentId: '11111111-1111-1111-1111-111111111111',
        spocUserId: trainer1Id,
        portal: 'Shine',
        applicationCount: 1,
      });
    expect(missingStudent.status).toBe(400);
    expect(missingStudent.body.message).toBe('Enter a student name');

    const negative = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: TEST_DATE,
        studentId,
        portal: 'Shine',
        applicationCount: -1,
      });
    expect(negative.status).toBe(400);

    const tooManyCalls = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: TEST_DATE,
        studentId,
        portal: 'Shine',
        applicationCount: 1,
        callsReceived: 4,
      });
    expect(tooManyCalls.status).toBe(400);

    const tooManyInterviews = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: TEST_DATE,
        studentId,
        portal: 'Shine',
        applicationCount: 1,
        interviewsScheduled: 2,
        interviewSlots: [
          { companyName: 'A', date: TEST_DATE, timeSlot: '10:00 AM' },
          { companyName: 'B', date: TEST_DATE, timeSlot: '11:00 AM' },
        ],
      });
    expect(tooManyInterviews.status).toBe(400);

    const created = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: TEST_DATE,
        spocUserId: trainer1Id,
        studentId,
        portal: 'Instahyre',
        applicationCount: 3,
        callsReceived: 1,
      });
    expect(created.status).toBe(201);
    createdIds.push(created.body.data.id);

    const mergedTooManyCalls = await request(app)
      .put(`/api/job-applications/${created.body.data.id}`)
      .set(auth(adminToken))
      .send({ callsReceived: 21 });
    expect(mergedTooManyCalls.status).toBe(400);
  });

  it('strips unexpected fields and does not store client-supplied meeting links', async () => {
    const res = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: TEST_DATE,
        spocUserId: trainer1Id,
        studentId,
        portal: 'Glassdoor',
        applicationCount: 1,
        interviewsScheduled: 1,
        hackerField: 'ignore-me',
        isAdmin: true,
        interviewSlots: [
          {
            companyName: 'Acme <script>alert(1)</script>',
            date: TEST_DATE,
            timeSlot: '11:00 AM',
            meetingLink: 'javascript:alert(1)',
            interviewId: '11111111-1111-1111-1111-111111111111',
          },
        ],
      });
    expect(res.status).toBe(201);
    createdIds.push(res.body.data.id);
    expect(res.body.data.hackerField).toBeUndefined();
    expect(res.body.data.isAdmin).toBeUndefined();
    expect(res.body.data.companyName).toContain('Acme');
    expect(res.body.data.interviewSlots[0].meetingLink).toBeNull();
    expect(res.body.data.interviewSlots[0].interviewId).toBeNull();
    expect(res.body.data.interviewSlots[0].linkStatus).toBe('pending');
  });

  it('treats whitespace portal variants as the same unique key', async () => {
    const first = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: TEST_DATE,
        spocUserId: trainer1Id,
        studentId,
        portal: 'TimesJobs',
        applicationCount: 1,
      });
    expect(first.status).toBe(201);
    createdIds.push(first.body.data.id);

    const spaced = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: TEST_DATE,
        spocUserId: trainer1Id,
        studentId,
        portal: '  timesjobs  ',
        applicationCount: 2,
      });
    expect(spaced.status).toBe(409);
  });

  it('updates a single field, rejects invalid ids, and clears interviews when count is 0', async () => {
    const created = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: TEST_DATE,
        spocUserId: trainer1Id,
        studentId,
        portal: 'Cutshort',
        applicationCount: 5,
        callsReceived: 1,
        interviewsScheduled: 1,
        interviewSlots: [
          { companyName: 'Infosys', date: TEST_DATE, timeSlot: '9:00 AM' },
        ],
      });
    expect(created.status).toBe(201);
    createdIds.push(created.body.data.id);

    const patched = await request(app)
      .put(`/api/job-applications/${created.body.data.id}`)
      .set(auth(adminToken))
      .send({ applicationCount: 8 });
    expect(patched.status).toBe(200);
    expect(patched.body.data.applicationCount).toBe(8);
    expect(patched.body.data.callsReceived).toBe(1);
    expect(patched.body.data.interviewsScheduled).toBe(1);
    expect(patched.body.data.portal).toBe('Cutshort');

    const cleared = await request(app)
      .put(`/api/job-applications/${created.body.data.id}`)
      .set(auth(adminToken))
      .send({
        interviewsScheduled: 0,
        interviewSlots: [
          { companyName: 'ShouldIgnore', date: TEST_DATE, timeSlot: '9:00 AM' },
        ],
      });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.interviewsScheduled).toBe(0);
    expect(cleared.body.data.interviewSlots).toEqual([]);

    const badId = await request(app)
      .delete('/api/job-applications/not-a-uuid')
      .set(auth(adminToken));
    expect(badId.status).toBe(400);

    const dailyMissingDate = await request(app)
      .get('/api/job-applications/daily')
      .set(auth(adminToken));
    expect(dailyMissingDate.status).toBe(400);

    const unknownSpoc = await request(app)
      .get('/api/job-applications/daily')
      .set(auth(adminToken))
      .query({ date: TEST_DATE, spocUserId: '11111111-1111-1111-1111-111111111111' });
    expect(unknownSpoc.status).toBe(400);
    expect(unknownSpoc.body.message).toBe('SPOC is not allowed');
  });

  it('keeps trainer history isolated and accepts a future calendar date', async () => {
    if (!trainer1Token || !trainer2Token) {
      throw new Error('Seed trainers trainer1@kattraan.com and trainer2@kattraan.com are required');
    }

    const created = await request(app)
      .post('/api/job-applications')
      .set(auth(trainer1Token))
      .send({
        date: '2099-12-01',
        studentId,
        portal: 'wellfound',
        applicationCount: 7,
      });
    expect(created.status).toBe(201);
    expect(created.body.data.date).toBe('2099-12-01');
    createdIds.push(created.body.data.id);

    const t2History = await request(app)
      .get('/api/job-applications')
      .set(auth(trainer2Token))
      .query({ dateFrom: '2099-12-01', dateTo: '2099-12-01', portal: 'wellfound' });
    expect(t2History.status).toBe(200);
    expect(t2History.body.data.some((row) => row.id === created.body.data.id)).toBe(false);

    const t1History = await request(app)
      .get('/api/job-applications')
      .set(auth(trainer1Token))
      .query({ dateFrom: '2099-12-01', dateTo: '2099-12-01', portal: 'wellfound' });
    expect(t1History.status).toBe(200);
    expect(t1History.body.data.some((row) => row.id === created.body.data.id)).toBe(false);

    const futureDaily = await request(app)
      .get('/api/job-applications/daily')
      .set(auth(trainer1Token))
      .query({ date: '2099-12-01' });
    expect(futureDaily.status).toBe(200);
    expect(futureDaily.body.data.rows.some((row) => row.id === created.body.data.id)).toBe(true);

    const studentPost = await request(app)
      .post('/api/job-applications')
      .set(
        auth(
          (
            await import('../src/utils/jwt.utils.js')
          ).signAccessToken({
            userId: '11111111-1111-1111-1111-111111111111',
            email: 'student@example.com',
            role: 'STUDENT',
          })
        )
      )
      .send({
        date: TEST_DATE,
        studentId,
        portal: 'Naukri',
        applicationCount: 1,
      });
    expect(studentPost.status).toBe(401);
  });

  it('treats % in search as a literal character, not an ILIKE wildcard', async () => {
    const res = await request(app)
      .get('/api/job-applications')
      .set(auth(adminToken))
      .query({
        dateFrom: TEST_DATE,
        dateTo: TEST_DATE,
        studentId,
        search: '%',
      });
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(0);
  });
});

describe('Trainer allowed gate, SPOC list, and typed students', () => {
  const NOT_ALLOWED = 'This trainer account is not admitted. An admin must admit it before you can sign in.';
  let adminToken;
  let trainerId;
  let trainerEmail;
  let trainerPassword;
  let createdStudentId;
  let createdEntryId;

  beforeAll(async () => {
    const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (adminLogin.status !== 200) {
      throw new Error(`Admin login failed (${adminLogin.status})`);
    }
    adminToken = adminLogin.body.data.accessToken;
    await query(
      `UPDATE "User" SET allowed = false WHERE email IN ($1, $2)`,
      [TRAINER1_EMAIL, TRAINER2_EMAIL]
    );
  }, 30000);

  afterAll(async () => {
    if (!adminToken) return;
    if (createdEntryId) {
      await request(app).delete(`/api/job-applications/${createdEntryId}`).set(auth(adminToken));
    }
    if (createdStudentId) {
      await request(app).delete(`/api/students/${createdStudentId}`).set(auth(adminToken));
    }
    if (trainerId) {
      await request(app).delete(`/api/trainers/${trainerId}`).set(auth(adminToken));
    }
    await query(
      `UPDATE "User" SET allowed = false WHERE email IN ($1, $2)`,
      [TRAINER1_EMAIL, TRAINER2_EMAIL]
    );
  }, 30000);

  it('admits a trainer when an admin registers them, then rejects the account', async () => {
    const stamp = Date.now();
    trainerEmail = `allowed-gate-${stamp}@example.com`;
    trainerPassword = 'trainer123';

    const selfRegister = await request(app).post('/api/auth/register').send({
      name: `Self Register ${stamp}`,
      email: `self-${stamp}@example.com`,
      password: trainerPassword,
    });
    expect(selfRegister.status).toBe(403);
    expect(selfRegister.body.message).toBe('Trainer accounts are created by an admin.');

    const created = await request(app)
      .post('/api/trainers')
      .set(auth(adminToken))
      .send({
        name: `Gate Trainer ${stamp}`,
        email: trainerEmail,
        password: trainerPassword,
        phone: '+919800000001',
      });
    expect(created.status).toBe(201);
    expect(created.body.data.allowed).toBe(true);
    trainerId = created.body.data.id;

    const wrong = await login(trainerEmail, 'not-the-password');
    expect(wrong.status).toBe(401);
    expect(wrong.body.data?.accessToken).toBeUndefined();

    const signedIn = await login(trainerEmail, trainerPassword);
    expect(signedIn.status).toBe(200);
    expect(signedIn.body.data.accessToken).toBeTruthy();
    const token = signedIn.body.data.accessToken;

    const me = await request(app).get('/api/auth/me').set(auth(token));
    expect(me.status).toBe(200);
    expect(me.body.data.allowed).toBe(true);

    const rejected = await request(app).post(`/api/trainers/${trainerId}/reject`).set(auth(adminToken));
    expect(rejected.status).toBe(200);
    expect(rejected.body.data).toEqual({ id: trainerId, allowed: false });

    const blocked = await login(trainerEmail, trainerPassword);
    expect(blocked.status).toBe(403);
    expect(blocked.body.message).toBe(NOT_ALLOWED);
    expect(blocked.body.data?.accessToken).toBeUndefined();

    const next = await request(app).get('/api/auth/me').set(auth(token));
    expect(next.status).toBe(403);
    expect(next.body.message).toBe(NOT_ALLOWED);
  });

  it('omits seed trainers and anyone who is not allowed from GET /spocs', async () => {
    await query(
      `UPDATE "User" SET allowed = false WHERE email IN ($1, $2) OR id = $3`,
      [TRAINER1_EMAIL, TRAINER2_EMAIL, trainerId]
    );
    const spocs = await request(app).get('/api/job-applications/spocs').set(auth(adminToken));
    expect(spocs.status).toBe(200);
    const emails = (spocs.body.data || []).map((row) => String(row.email || '').toLowerCase());
    const ids = (spocs.body.data || []).map((row) => row.id);
    expect(emails).not.toContain(TRAINER1_EMAIL);
    expect(emails).not.toContain(TRAINER2_EMAIL);
    expect(ids).not.toContain(trainerId);
    expect((spocs.body.data || []).every((row) => row.role === 'TRAINER')).toBe(true);
  });

  it('requires an allowed SPOC and accepts a new student name for that SPOC only', async () => {
    const missingSpoc = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: '2099-08-01',
        studentName: 'Brand New Applicant',
        course: 'FSD',
        portal: 'Naukri',
        applicationCount: 1,
      });
    expect(missingSpoc.status).toBe(400);
    expect(missingSpoc.body.message).toBe('Select an allowed SPOC');

    const allow = await request(app).post(`/api/trainers/${trainerId}/allow`).set(auth(adminToken));
    expect(allow.status).toBe(200);

    const typedName = `Typed Student ${Date.now()}`;
    const created = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: '2099-08-01',
        spocUserId: trainerId,
        studentName: typedName,
        course: 'JAVA',
        portal: 'LinkedIn',
        applicationCount: 2,
      });
    expect(created.status).toBe(201);
    createdEntryId = created.body.data.id;
    createdStudentId = created.body.data.studentId;
    expect(created.body.data.student.name).toBe(typedName);

    const students = await request(app)
      .get('/api/job-applications/students')
      .set(auth(adminToken))
      .query({ spocUserId: trainerId });
    expect(students.status).toBe(200);
    expect((students.body.data || []).some((row) => row.name === typedName)).toBe(true);

    const directory = await request(app)
      .post('/api/students')
      .set(auth(adminToken))
      .send({
        name: `Directory Only ${Date.now()}`,
        course: 'REACT',
      });
    expect(directory.status).toBe(201);
    const directoryId = directory.body.data.id;

    const rejected = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: '2099-08-02',
        spocUserId: trainerId,
        studentId: directoryId,
        portal: 'Indeed',
        applicationCount: 1,
      });
    expect(rejected.status).toBe(400);
    expect(rejected.body.message).toBe('Enter a student name');

    await request(app).delete(`/api/students/${directoryId}`).set(auth(adminToken));
  });
});

describe('Deleting a trainer keeps job application history', () => {
  let adminToken;
  let trainerId;
  let entryId;
  let studentId;

  beforeAll(async () => {
    const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (adminLogin.status !== 200) {
      throw new Error(`Admin login failed (${adminLogin.status})`);
    }
    adminToken = adminLogin.body.data.accessToken;
  }, 30000);

  afterAll(async () => {
    if (!adminToken) return;
    if (entryId) {
      await request(app).delete(`/api/job-applications/${entryId}`).set(auth(adminToken));
    }
    if (studentId) {
      await request(app).delete(`/api/students/${studentId}`).set(auth(adminToken));
    }
    if (trainerId) {
      await request(app).delete(`/api/trainers/${trainerId}`).set(auth(adminToken));
    }
  }, 30000);

  it('deletes the trainer and keeps the SPOC name on the daily row', async () => {
    const stamp = Date.now();
    const name = `Delete Me ${stamp}`;
    const created = await request(app)
      .post('/api/trainers')
      .set(auth(adminToken))
      .send({
        name,
        email: `delete-me-${stamp}@example.com`,
        password: 'trainer123',
        phone: '+919800000099',
      });
    expect(created.status).toBe(201);
    trainerId = created.body.data.id;
    if (created.body.data.allowed !== true) {
      const allow = await request(app).post(`/api/trainers/${trainerId}/allow`).set(auth(adminToken));
      expect(allow.status).toBe(200);
    }

    const entry = await request(app)
      .post('/api/job-applications')
      .set(auth(adminToken))
      .send({
        date: '2024-09-28',
        spocUserId: trainerId,
        studentName: `Kept Student ${stamp}`,
        course: 'FSD',
        portal: 'Naukri',
        applicationCount: 3,
      });
    expect(entry.status).toBe(201);
    entryId = entry.body.data.id;
    studentId = entry.body.data.studentId;

    const deleted = await request(app).delete(`/api/trainers/${trainerId}`).set(auth(adminToken));
    expect(deleted.status).toBe(200);
    trainerId = null;

    const history = await request(app)
      .get('/api/job-applications')
      .set(auth(adminToken))
      .query({ dateFrom: '2024-09-28', dateTo: '2024-09-28', studentId });
    expect(history.status).toBe(200);
    const row = (history.body.data || []).find((item) => item.id === entryId);
    expect(row?.spocUserId ?? null).toBeNull();
    expect(row?.spoc?.name).toBe(name);
  });
});
