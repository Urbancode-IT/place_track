import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173';
const EMAIL = process.env.E2E_EMAIL || 'admin@kattraan.com';
const PASSWORD = process.env.E2E_PASSWORD || 'admin123';
const stamp = Date.now();
const studentName = `JA07 Browser ${stamp}`;
const portalName = `JA07Portal${stamp}`;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(20000);
page.on('dialog', (d) => d.accept());

let token;
let studentId;

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('#login-password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });

  const tokenFromPage = await page.evaluate(() => {
    const raw = localStorage.getItem('placetrack-auth');
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.state?.accessToken || parsed?.accessToken || null;
  });
  token = tokenFromPage;
  assert(token, 'Did not find access token after login');

  const createdStudent = await page.request.post(`${BASE}/api/students`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: {
      name: studentName,
      email: `ja07-browser-${stamp}@example.com`,
      course: 'FSD',
    },
  });
  assert(createdStudent.ok(), `Create student failed: ${createdStudent.status()}`);
  const studentJson = await createdStudent.json();
  studentId = studentJson?.data?.id;
  assert(studentId, 'Create student returned no id');

  await page.goto(`${BASE}/job-applications`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '+ Add entry' }).click();
  const addModal = page.locator('div.fixed.inset-0').filter({ hasText: 'Add application entry' });
  await addModal.getByText('Add application entry').waitFor();

  const studentInput = addModal.getByPlaceholder(/select student|search student by name/i);
  await studentInput.click();
  await studentInput.fill(studentName);
  await addModal.getByRole('option', { name: new RegExp(studentName) }).click();

  const portalInput = addModal.getByPlaceholder(/naukri|search or type portal/i);
  await portalInput.click();
  await portalInput.fill(portalName);
  await portalInput.press('Enter');

  const counts = addModal.getByRole('spinbutton');
  await counts.nth(0).fill('3');
  await addModal.getByRole('button', { name: 'Add entry' }).click();
  await page.getByRole('link', { name: studentName }).waitFor();
  assert(await page.getByText(portalName).count(), 'Created portal not visible on Daily Entry');

  const row = page.getByRole('link', { name: studentName }).locator('xpath=ancestor::tr[1]');
  await row.getByRole('button', { name: 'Edit' }).click();
  const editModal = page.locator('div.fixed.inset-0').filter({ hasText: 'Edit application entry' });
  await editModal.getByText('Edit application entry').waitFor();
  await editModal.getByRole('spinbutton').nth(0).fill('8');
  await editModal.getByRole('button', { name: 'Save changes' }).click();
  await page.getByText('Entry updated').waitFor();
  assert(
    (await row.getByText('8').count()) > 0,
    'Edited application count 8 not visible'
  );

  await page.getByRole('button', { name: 'History' }).click();
  await page.getByText('Range totals').waitFor();
  assert(
    (await page.getByRole('link', { name: studentName }).count()) > 0,
    'Today’s Daily Entry should appear in History'
  );

  await page.getByRole('button', { name: 'Daily Entry', exact: true }).click();
  await page.getByRole('link', { name: studentName }).waitFor();
  const dailyRow = page.getByRole('link', { name: studentName }).locator('xpath=ancestor::tr[1]');
  await dailyRow.getByRole('button', { name: 'Delete' }).click();
  await page.getByText('Entry deleted').waitFor();
  await page.getByRole('link', { name: studentName }).waitFor({ state: 'detached' });

  console.log('JA-07 browser pass OK: create → edit → today is stored in History → delete');
} finally {
  if (token && studentId) {
    await page.request.delete(`${BASE}/api/students/${studentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  await browser.close();
}
