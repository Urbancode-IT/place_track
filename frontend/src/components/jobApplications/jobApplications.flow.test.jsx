/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import JobApplications from '@/pages/JobApplications';
import { todayLocalISO } from '@/utils/formatDate';
import { yesterdayLocalISO } from '@/utils/jobApplication';
import { jobApplicationApi } from '@/api/jobApplication.api';
import { studentApi } from '@/api/student.api';
import { useAuthStore } from '@/store/auth.store';

const { apiState, TRAINER, STUDENT, DIRECTORY } = vi.hoisted(() => ({
  apiState: {
    rows: [],
    spocs: [],
  },
  TRAINER: {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Trainer One',
    role: 'TRAINER',
  },
  STUDENT: {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Priya Nair',
    course: 'FSD',
  },
  DIRECTORY: [
    { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Alice Kumar', course: 'FSD' },
    { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'JA07 Sample', course: 'SDET' },
  ],
}));

vi.mock('@/store/auth.store', () => {
  const state = {
    user: TRAINER,
    accessToken: 'test-token',
    isAuthenticated: true,
  };
  const useAuthStore = (selector) => selector(state);
  useAuthStore.getState = () => state;
  useAuthStore.setState = (partial) => Object.assign(state, partial);
  return { useAuthStore };
});

function axiosBody(data, extra = {}) {
  return { data: { data, ...extra } };
}

function mapRow(row) {
  return {
    ...row,
    student: { id: STUDENT.id, name: STUDENT.name, course: STUDENT.course },
    spoc: { id: TRAINER.id, name: TRAINER.name, role: 'TRAINER' },
  };
}

vi.mock('@/api/student.api', () => ({
  studentApi: {
    list: vi.fn(async () => axiosBody(DIRECTORY, { pagination: { total: DIRECTORY.length } })),
    update: vi.fn(async (id, data) => {
      if (data?.course) STUDENT.course = data.course;
      return axiosBody({ id, ...STUDENT });
    }),
  },
}));

vi.mock('@/api/jobApplication.api', () => ({
  jobApplicationApi: {
    listSpocs: vi.fn(async () => axiosBody(apiState.spocs)),
    listPortals: vi.fn(async () => axiosBody(['Naukri', 'LinkedIn'])),
    listStudents: vi.fn(async () => {
      const seen = new Map();
      for (const row of apiState.rows) {
        seen.set(row.studentId, { id: STUDENT.id, name: STUDENT.name, course: STUDENT.course });
      }
      return axiosBody([...seen.values()]);
    }),
    getDaily: vi.fn(async ({ date, spocUserId }) => {
      const rows = apiState.rows
        .filter((row) => row.date === date && (!spocUserId || row.spocUserId === spocUserId))
        .map(mapRow);
      return axiosBody({
        date,
        spocUserId,
        spoc: { id: TRAINER.id, name: TRAINER.name, role: 'TRAINER' },
        rows,
        totals: {
          applicationCount: rows.reduce((n, r) => n + r.applicationCount, 0),
          callsReceived: rows.reduce((n, r) => n + r.callsReceived, 0),
          interviewsScheduled: rows.reduce((n, r) => n + r.interviewsScheduled, 0),
        },
      });
    }),
    list: vi.fn(async (params = {}) => {
      let rows = apiState.rows.map(mapRow);
      if (params.studentId) rows = rows.filter((row) => row.studentId === params.studentId);
      if (params.portal) {
        rows = rows.filter(
          (row) => row.portal.toLowerCase() === String(params.portal).toLowerCase()
        );
      }
      if (params.dateFrom) rows = rows.filter((row) => row.date >= params.dateFrom);
      if (params.dateTo) rows = rows.filter((row) => row.date <= params.dateTo);
      return axiosBody(rows, {
        pagination: { total: rows.length, page: 1, totalPages: 1 },
        totals: {
          applicationCount: rows.reduce((n, r) => n + r.applicationCount, 0),
          callsReceived: rows.reduce((n, r) => n + r.callsReceived, 0),
          interviewsScheduled: rows.reduce((n, r) => n + r.interviewsScheduled, 0),
        },
      });
    }),
    create: vi.fn(async (body) => {
      const payload = body?.data ?? body;
      if (payload.studentName) STUDENT.name = payload.studentName;
      const row = {
        id: '33333333-3333-3333-3333-333333333333',
        date: payload.date,
        spocUserId: TRAINER.id,
        studentId: payload.studentId || STUDENT.id,
        portal: payload.portal,
        applicationCount: payload.applicationCount,
        callsReceived: payload.callsReceived ?? 0,
        interviewsScheduled: payload.interviewsScheduled ?? 0,
        interviewSlots: payload.interviewSlots || [],
      };
      apiState.rows.push(row);
      return axiosBody(mapRow(row));
    }),
    update: vi.fn(async (id, body) => {
      const payload = body?.data ?? body;
      const idx = apiState.rows.findIndex((row) => row.id === id);
      if (idx < 0) throw new Error('missing');
      apiState.rows[idx] = { ...apiState.rows[idx], ...payload };
      return axiosBody(mapRow(apiState.rows[idx]));
    }),
    delete: vi.fn(async (id) => {
      apiState.rows = apiState.rows.filter((row) => row.id !== id);
      return axiosBody(null);
    }),
  },
}));

function renderPage(path) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/job-applications" element={<JobApplications />} />
          <Route path="/job-applications/history" element={<JobApplications />} />
          <Route path="/students/:id" element={<div>student profile</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Job Applications create → edit → delete and History filter refresh', () => {
  beforeEach(() => {
    apiState.rows = [];
    apiState.spocs = [{ id: TRAINER.id, name: TRAINER.name, role: 'TRAINER', allowed: true }];
    STUDENT.name = 'Priya Nair';
    STUDENT.course = 'FSD';
    useAuthStore.setState({
      user: TRAINER,
      accessToken: 'test-token',
      isAuthenticated: true,
    });
    studentApi.list.mockClear();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows an empty daily SPOC menu when nobody is allowed', async () => {
    useAuthStore.setState({
      user: {
        id: '99999999-9999-9999-9999-999999999999',
        name: 'Admin User',
        role: 'ADMIN',
      },
    });
    apiState.spocs = [];
    renderPage('/job-applications');
    expect(
      await screen.findByText('No admitted trainers yet. Add a trainer on the Trainers page.')
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /\+ Add entry/i }).disabled).toBe(true);
    expect(screen.queryByRole('option', { name: /Trainer One|Alice Kumar|JA07/i })).toBeNull();
  });

  it('saves, updates, and removes a daily row, then restores History filters from the URL', async () => {
    renderPage('/job-applications');

    await screen.findByRole('button', { name: /\+ Add entry/i });
    fireEvent.click(screen.getByRole('button', { name: /\+ Add entry/i }));

    const modal = await screen.findByText('Add application entry');
    const dialog = modal.closest('div')?.parentElement;
    expect(dialog).toBeTruthy();

    const studentInput = within(dialog).getByPlaceholderText(/type student name/i);
    fireEvent.focus(studentInput);
    expect(screen.queryByRole('option', { name: /Alice Kumar/i })).toBeNull();
    expect(screen.queryByRole('option', { name: /JA07/i })).toBeNull();
    expect(studentApi.list).not.toHaveBeenCalled();
    fireEvent.change(studentInput, { target: { value: 'Priya Nair' } });
    expect(studentInput.value).toBe('Priya Nair');
    expect(screen.queryByRole('option', { name: /Add "/ })).toBeNull();

    const addCourseInput = within(dialog).getByPlaceholderText(/select course/i);
    fireEvent.focus(addCourseInput);
    fireEvent.click(await screen.findByRole('option', { name: /FSD \(Full Stack Development\)/i }));

    const portalInput = within(dialog).getByPlaceholderText(/naukri/i);
    fireEvent.focus(portalInput);
    fireEvent.change(portalInput, { target: { value: 'Naukri' } });
    fireEvent.keyDown(portalInput, { key: 'Enter' });

    const counts = within(dialog).getAllByRole('spinbutton');
    fireEvent.change(counts[0], { target: { value: '4' } });

    fireEvent.click(within(dialog).getByRole('button', { name: /add entry/i }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Priya Nair' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /\+ Add entry/i }));
    const again = await screen.findByText('Add application entry');
    const againDialog = again.closest('div')?.parentElement;
    const againStudent = within(againDialog).getByPlaceholderText(/type student name/i);
    fireEvent.focus(againStudent);
    expect(await screen.findByRole('option', { name: /Priya Nair/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Alice Kumar/i })).toBeNull();
    expect(screen.queryByRole('option', { name: /JA07/i })).toBeNull();
    fireEvent.click(within(againDialog).getByRole('button', { name: '×' }));

    const createdRow = screen.getByRole('link', { name: 'Priya Nair' }).closest('tr');
    expect(within(createdRow).getByText('Naukri')).toBeTruthy();
    expect(within(createdRow).getByText('4')).toBeTruthy();

    fireEvent.click(within(createdRow).getByRole('button', { name: 'Edit' }));
    const editTitle = await screen.findByText('Edit application entry');
    const editDialog = editTitle.closest('div')?.parentElement;
    const editCounts = within(editDialog).getAllByRole('spinbutton');
    fireEvent.change(editCounts[0], { target: { value: '7' } });

    const courseInput = within(editDialog).getByDisplayValue('FSD (Full Stack Development)');
    fireEvent.focus(courseInput);
    fireEvent.click(await screen.findByRole('option', { name: /BI & Data Science/i }));

    fireEvent.click(within(editDialog).getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      const row = screen.getByRole('link', { name: 'Priya Nair' }).closest('tr');
      expect(within(row).getByText('7')).toBeTruthy();
      expect(within(row).getByText('BI_DS')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    await waitFor(() => {
      expect(screen.getByText('Range totals')).toBeTruthy();
    });
    const historyParams = jobApplicationApi.list.mock.calls.at(-1)?.[0];
    const today = todayLocalISO();
    expect(historyParams?.dateFrom <= today).toBe(true);
    expect(historyParams?.dateTo >= today).toBe(true);
    expect(await screen.findByRole('link', { name: 'Priya Nair' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Daily Entry', exact: true }));
    expect(await screen.findByRole('link', { name: 'Priya Nair' })).toBeTruthy();

    cleanup();
    const yesterday = yesterdayLocalISO();
    apiState.rows.push({
      id: '44444444-4444-4444-4444-444444444444',
      date: yesterday,
      spocUserId: TRAINER.id,
      studentId: STUDENT.id,
      portal: 'LinkedIn',
      applicationCount: 2,
      callsReceived: 0,
      interviewsScheduled: 0,
      interviewSlots: [],
    });
    renderPage(
      `/job-applications/history?preset=YESTERDAY&dateFrom=${yesterday}&dateTo=${yesterday}&studentId=${STUDENT.id}`
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Priya Nair' })).toBeTruthy();
    });
    expect(screen.getByDisplayValue(/Priya Nair/)).toBeTruthy();

    cleanup();
    renderPage(`/job-applications?date=${todayLocalISO()}`);
    await screen.findByRole('link', { name: 'Priya Nair' });
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Priya Nair' })).toBeNull();
    });
    expect(screen.getByText(/no entries for this date/i)).toBeTruthy();
  });

  it('scrolls a tall add-entry form, opens a calendar from Custom, and snaps the clock to 5 minutes', async () => {
    renderPage('/job-applications/history');
    await screen.findByText('Range totals');
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    const calendar = await screen.findByRole('dialog');
    expect(within(calendar).getByText(/pick a start date/i)).toBeTruthy();
    expect(within(calendar).getAllByRole('button', { name: /^\d{1,2}$/ }).length).toBeGreaterThan(27);

    cleanup();
    renderPage('/job-applications');
    await screen.findByRole('button', { name: /\+ Add entry/i });
    fireEvent.click(screen.getByRole('button', { name: /\+ Add entry/i }));
    const title = await screen.findByText('Add application entry');
    const modalRoot = title.closest('div.fixed');
    const scroller = modalRoot.querySelector('.overflow-y-auto');
    expect(scroller).toBeTruthy();
    expect(scroller.className).toMatch(/overflow-y-auto/);
    expect(modalRoot.querySelector('[class*="max-h-"]').className).toMatch(/max-h-/);

    const counts = within(modalRoot).getAllByRole('spinbutton');
    fireEvent.change(counts[2], { target: { value: '4' } });
    expect(await within(scroller).findByText('Interview 4 of 4')).toBeTruthy();

    fireEvent.click(within(scroller).getAllByRole('button', { name: 'Open clock' })[0]);
    const clock = await screen.findByRole('dialog');
    fireEvent.click(within(clock).getAllByRole('button')[1]);
    const labels = [...clock.querySelectorAll('svg text')].map((node) => node.textContent.trim());
    expect(labels).toEqual(['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']);
  });

  it('keeps a typed name, caps counts, and autosaves an interview', async () => {
    renderPage('/job-applications');
    fireEvent.click(await screen.findByRole('button', { name: /\+ Add entry/i }));
    const title = await screen.findByText('Add application entry');
    const dialog = title.closest('div.fixed');

    expect(within(dialog).queryByDisplayValue('All courses')).toBeNull();
    expect(within(dialog).getByText('Course')).toBeTruthy();
    expect(within(dialog).queryByText(/Alice Kumar|JA07 Sample/)).toBeNull();

    const studentInput = within(dialog).getByPlaceholderText(/type student name/i);
    fireEvent.focus(studentInput);
    fireEvent.change(studentInput, { target: { value: 'Priya' } });
    expect(studentInput.value).toBe('Priya');
    expect(screen.queryByRole('option', { name: /Priya Nair|Alice Kumar|JA07|Add "/i })).toBeNull();
    expect(await screen.findByText('Saved')).toBeTruthy();

    const counts = within(dialog).getAllByRole('spinbutton');
    expect(counts.map((input) => input.max)).toEqual(['50', '20', '10']);
    fireEvent.change(counts[0], { target: { value: '80' } });
    expect(counts[0].value).toBe('50');
    fireEvent.change(counts[2], { target: { value: '1' } });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Open clock' }));
    const clock = await screen.findByRole('dialog');
    fireEvent.click(within(clock).getByRole('button', { name: 'Done' }));
    fireEvent.change(await within(dialog).findByPlaceholderText(/infosys/i), {
      target: { value: 'Infosys' },
    });

    expect(await screen.findByRole('button', { name: 'Edit' }, { timeout: 2000 })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    });
  });

  it('saves each interview from the button beside Delete', async () => {
    renderPage('/job-applications');
    fireEvent.click(await screen.findByRole('button', { name: /\+ Add entry/i }));
    const title = await screen.findByText('Add application entry');
    const dialog = title.closest('div.fixed');

    const counts = within(dialog).getAllByRole('spinbutton');
    fireEvent.change(counts[2], { target: { value: '1' } });
    expect(await within(dialog).findByRole('button', { name: 'Save' })).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeTruthy();

    fireEvent.change(await within(dialog).findByPlaceholderText(/infosys/i), {
      target: { value: 'Infosys' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Open clock' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Done' }));
    await new Promise((resolve) => setTimeout(resolve, 800));
    expect(within(dialog).queryByRole('button', { name: 'Edit' })).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('Infosys')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Edit' }));
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeTruthy();

    fireEvent.change(within(dialog).getByPlaceholderText(/infosys/i), {
      target: { value: 'Tcs' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('Tcs')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(within(dialog).queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('allows calls and interviews that exceed today’s applications', async () => {
    renderPage('/job-applications');
    fireEvent.click(await screen.findByRole('button', { name: /\+ Add entry/i }));
    const title = await screen.findByText('Add application entry');
    const dialog = title.closest('div.fixed');
    const counts = within(dialog).getAllByRole('spinbutton');

    fireEvent.change(counts[0], { target: { value: '9' } });
    fireEvent.change(counts[1], { target: { value: '20' } });
    fireEvent.change(counts[2], { target: { value: '10' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /add entry/i }));

    expect(await within(dialog).findByText('Interview 10 of 10')).toBeTruthy();
    expect(within(dialog).getAllByRole('button', { name: 'Save' })).toHaveLength(10);
    expect(within(dialog).queryByText(/cannot exceed applications/i)).toBeNull();
  });
});
