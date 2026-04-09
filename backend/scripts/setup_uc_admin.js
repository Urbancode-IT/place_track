import bcrypt from 'bcryptjs';
import { query } from '../src/config/db.js';

async function setupAdmin() {
  const name = 'UC';
  const email = 'Uc@gmail.com';
  const password = 'UCadmin123';
  const role = 'ADMIN';

  console.log(`Setting up Admin: ${name} (${email})...`);

  try {
    const hashed = await bcrypt.hash(password, 10);
    const existing = await query('SELECT id FROM "User" WHERE email = $1', [email]);

    if (existing.rows.length > 0) {
      await query(
        'UPDATE "User" SET name = $1, password = $2, role = $3 WHERE email = $4',
        [name, hashed, role, email]
      );
      console.log('Admin user updated successfully.');
    } else {
      await query(
        'INSERT INTO "User" (name, email, password, role) VALUES ($1, $2, $3, $4)',
        [name, email, hashed, role]
      );
      console.log('Admin user created successfully.');
    }
  } catch (err) {
    console.error('Error setting up admin:', err.message);
  } finally {
    process.exit();
  }
}

setupAdmin();
