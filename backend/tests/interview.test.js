import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Interviews API', () => {
  it('GET /api/interviews - unauthorized', async () => {
    const res = await request(app).get('/api/interviews');
    expect(res.status).toBe(401);
  });
});
