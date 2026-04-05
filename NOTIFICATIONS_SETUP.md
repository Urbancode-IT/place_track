# PlaceTrack Notifications Setup

This project supports trainer notifications via:

1. Email (SMTP / Nodemailer)
2. Push (Firebase Cloud Messaging)

## 1) Backend setup

### Install dependencies

```bash
cd backend
npm install
```

### Configure backend env

Create `backend/.env` from `backend/.env.example` and set:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `FIREBASE_SERVICE_ACCOUNT_PATH` **or** `FIREBASE_SERVICE_ACCOUNT_JSON`

Notes:

- For Gmail, use app password in `SMTP_PASS`.
- `FIREBASE_SERVICE_ACCOUNT_PATH` should be absolute path on your machine.

### Create device token table

Run:

```sql
\i scripts/add_user_device.sql
```

Or copy/paste SQL from `backend/scripts/add_user_device.sql` in pgAdmin.

## 2) Frontend setup

### Install dependencies

```bash
cd frontend
npm install
```

### Configure frontend env

Create `frontend/.env` from `frontend/.env.example` and set:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_VAPID_KEY`

You can get these from Firebase Console:

- Project Settings -> General -> Your apps (web config)
- Project Settings -> Cloud Messaging -> Web Push certificates (VAPID key)

Also update `frontend/public/firebase-messaging-sw.js` with the same Firebase web config values.

## 3) How notifications are triggered

- Interview assignment already triggers:
  - Email to trainers
  - Push notification to trainer devices (if token exists)
- Daily reminder cron triggers:
  - Email summary
  - Push reminder for tomorrow tasks

## 4) Manual trigger API

Authenticated endpoint:

- `POST /api/notifications/trigger`

Sample body:

```json
{
  "userIds": ["trainer-user-id-1", "trainer-user-id-2"],
  "title": "New Task Assigned",
  "message": "You have a new mock interview task.",
  "taskTitle": "Mock Interview - Java",
  "deadline": "2026-03-20 18:00",
  "type": "TASK_ASSIGNED",
  "isDeadlineReminder": false,
  "link": "http://localhost:5173/notifications"
}
```

## 5) Registering device token from UI

- Go to Notifications page.
- Click "Enable push on this device".
- Browser permission prompt appears.
- If accepted, token is saved through:
  - `POST /api/push/register-token`

