import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(backendRoot, '.env') });

const { Pool } = pg;

const dbConfig = {
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'admin@123',
  database: 'Placement_Tracking',
  max: 10,
  idleTimeoutMillis: 30000,
};

console.log('DB CONFIG =>', dbConfig);

const pool = new Pool(dbConfig);

try {
  const test = await pool.query('SELECT current_user, current_database()');
  console.log('DB CONNECTED =>', test.rows);
} catch (err) {
  console.error('DB CONNECTION TEST FAILED =>', err);
}

export async function query(text, params) {
  return await pool.query(text, params);
}

export default pool;