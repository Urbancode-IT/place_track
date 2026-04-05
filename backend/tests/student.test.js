import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Students API', () => {
  it('GET /api/students - unauthorized', async () => {
    const res = await request(app).get('/api/students');
    expect(res.status).toBe(401);
  });
});
