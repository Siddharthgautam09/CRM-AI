import request from 'supertest';

import { app } from '../../app';

describe('Auth endpoints', () => {
  it('should login and return token pair', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@example.com',
      password: 'Admin@12345',
    });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
  });

  it('should refresh token pair', async () => {
    const loginResponse = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@example.com',
      password: 'Admin@12345',
    });

    const refreshResponse = await request(app).post('/api/v1/auth/refresh-token').send({
      refreshToken: loginResponse.body.data.refreshToken,
    });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.data.accessToken).toBeDefined();
  });
});
