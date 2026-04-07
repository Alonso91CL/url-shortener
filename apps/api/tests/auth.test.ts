// =============================================================================
// Authentication Tests
// =============================================================================

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../src/db/prisma.js';
import authRoutes from '../src/routes/auth.js';
import { authenticate } from '../src/middleware/auth.js';

describe('Auth API', () => {
  let app: express.Application;
  let testUser: { id: string; email: string; passwordHash: string };
  const testEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

  beforeAll(async () => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: 'SecurePass123!',
          name: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(testEmail.toLowerCase());
    });

    it('should reject duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: 'SecurePass123!',
        });

      // Duplicate registration
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('EMAIL_EXISTS');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(400);
    });

    it('should reject short password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'another-test@example.com',
          password: 'short',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeAll(async () => {
      // Create a test user directly in the database
      const passwordHash = await bcrypt.hash('TestPassword123!', 4);
      testUser = await prisma.user.create({
        data: {
          email: `login-test-${Date.now()}@example.com`,
          passwordHash,
          name: 'Login Test User',
        },
        select: {
          id: true,
          email: true,
          passwordHash: true,
        },
      });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.id).toBe(testUser.id);
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword!',
        });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let authToken: string;
    let userEmail: string;

    beforeAll(async () => {
      // Register and get token
      userEmail = `me-test-${Date.now()}@example.com`;
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: userEmail,
          password: 'TestPass123!',
          name: 'Me Test User',
        });

      authToken = registerResponse.body.data.token;
    });

    it('should return user data when authenticated', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe(userEmail.toLowerCase());
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('createdAt');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_TOKEN');
    });
  });
});
