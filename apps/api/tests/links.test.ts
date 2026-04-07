// =============================================================================
// Links API Tests
// =============================================================================

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../src/db/prisma.js';
import linksRoutes from '../src/routes/links.js';
import authRoutes from '../src/routes/auth.js';

describe('Links API', () => {
  let app: express.Application;
  let authToken: string;
  let userId: string;
  let otherUserToken: string;
  let otherUserId: string;

  beforeAll(async () => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/links', linksRoutes);

    // Create first test user
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `links-user-${Date.now()}@example.com`,
        password: 'TestPass123!',
        name: 'Links Test User',
      });
    authToken = userResponse.body.data.token;
    userId = userResponse.body.data.user.id;

    // Create second test user
    const otherResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `other-user-${Date.now()}@example.com`,
        password: 'TestPass123!',
        name: 'Other User',
      });
    otherUserToken = otherResponse.body.data.token;
    otherUserId = otherResponse.body.data.user.id;
  });

  beforeEach(async () => {
    // Clean up links before each test
    await prisma.link.deleteMany({});
  });

  describe('POST /api/v1/links', () => {
    it('should create a link successfully', async () => {
      const response = await request(app)
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originalUrl: 'https://example.com',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('code');
      expect(response.body.data.originalUrl).toBe('https://example.com');
      expect(response.body.data.isActive).toBe(true);
      expect(response.body.data.redirectType).toBe(302);
    });

    it('should reject invalid URL', async () => {
      const response = await request(app)
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originalUrl: 'not-a-valid-url',
        });

      expect(response.status).toBe(400);
    });

    it('should create link with custom alias', async () => {
      const response = await request(app)
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originalUrl: 'https://example.com',
          alias: 'my-custom-alias',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.code).toBe('my-custom-alias');
    });

    it('should reject duplicate alias', async () => {
      // Create first link with alias
      await request(app)
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originalUrl: 'https://example.com',
          alias: 'unique-alias-1',
        });

      // Try to create another link with same alias
      const response = await request(app)
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originalUrl: 'https://different.com',
          alias: 'unique-alias-1',
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('ALIAS_TAKEN');
    });

    it('should reject alias with invalid characters', async () => {
      const response = await request(app)
        .post('/api/v1/links')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originalUrl: 'https://example.com',
          alias: 'invalid alias!',
        });

      expect(response.status).toBe(400);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/links')
        .send({
          originalUrl: 'https://example.com',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/links', () => {
    beforeEach(async () => {
      // Create test links
      await prisma.link.createMany({
        data: [
          {
            code: 'test-link-1',
            originalUrl: 'https://example.com/1',
            userId,
            isActive: true,
          },
          {
            code: 'test-link-2',
            originalUrl: 'https://example.com/2',
            userId,
            isActive: false,
          },
          {
            code: 'other-link',
            originalUrl: 'https://other.com',
            userId: otherUserId,
            isActive: true,
          },
        ],
      });
    });

    it('should list user links with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/links')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toHaveProperty('total', 2);
      expect(response.body.meta).toHaveProperty('page', 1);
      expect(response.body.meta).toHaveProperty('limit', 20);
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/links?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta.total).toBe(2);
      expect(response.body.meta.totalPages).toBe(2);
    });

    it('should filter by isActive', async () => {
      const response = await request(app)
        .get('/api/v1/links?isActive=true')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].isActive).toBe(true);
    });
  });

  describe('GET /api/v1/links/:code', () => {
    let testLinkCode: string;

    beforeEach(async () => {
      const link = await prisma.link.create({
        data: {
          code: 'get-test-link',
          originalUrl: 'https://example.com/test',
          userId,
          isActive: true,
          redirectType: 301,
        },
      });
      testLinkCode = link.code;
    });

    it('should get link by code', async () => {
      const response = await request(app)
        .get(`/api/v1/links/${testLinkCode}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.code).toBe(testLinkCode);
      expect(response.body.data.originalUrl).toBe('https://example.com/test');
    });

    it('should return 404 for non-existent link', async () => {
      const response = await request(app)
        .get('/api/v1/links/non-existent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should prevent access to other user links', async () => {
      const response = await request(app)
        .get('/api/v1/links/other-link')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/links/:code', () => {
    let testLinkCode: string;

    beforeEach(async () => {
      const link = await prisma.link.create({
        data: {
          code: 'update-test-link',
          originalUrl: 'https://example.com/update',
          userId,
          isActive: true,
        },
      });
      testLinkCode = link.code;
    });

    it('should update link successfully', async () => {
      const response = await request(app)
        .patch(`/api/v1/links/${testLinkCode}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          isActive: false,
          redirectType: 301,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.isActive).toBe(false);
      expect(response.body.data.redirectType).toBe(301);
    });

    it('should update expiresAt to null', async () => {
      // First set an expiration
      await prisma.link.update({
        where: { code: testLinkCode },
        data: { expiresAt: new Date(Date.now() + 86400000) },
      });

      // Then remove it
      const response = await request(app)
        .patch(`/api/v1/links/${testLinkCode}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          expiresAt: null,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.expiresAt).toBeNull();
    });

    it('should return 404 for non-existent link', async () => {
      const response = await request(app)
        .patch('/api/v1/links/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          isActive: false,
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/links/:code', () => {
    let testLinkCode: string;

    beforeEach(async () => {
      const link = await prisma.link.create({
        data: {
          code: 'delete-test-link',
          originalUrl: 'https://example.com/delete',
          userId,
          isActive: true,
        },
      });
      testLinkCode = link.code;
    });

    it('should delete link successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/links/${testLinkCode}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      // Verify link was deleted
      const link = await prisma.link.findUnique({
        where: { code: testLinkCode },
      });
      expect(link).toBeNull();
    });

    it('should return 404 for non-existent link', async () => {
      const response = await request(app)
        .delete('/api/v1/links/non-existent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should prevent deletion of other user links', async () => {
      // Create link owned by other user
      await prisma.link.create({
        data: {
          code: 'other-user-link',
          originalUrl: 'https://other.com',
          userId: otherUserId,
        },
      });

      const response = await request(app)
        .delete('/api/v1/links/other-user-link')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Unauthorized access', () => {
    it('should reject requests without authentication', async () => {
      const endpoints = [
        { method: 'get', path: '/api/v1/links' },
        { method: 'post', path: '/api/v1/links' },
        { method: 'get', path: '/api/v1/links/test' },
        { method: 'patch', path: '/api/v1/links/test' },
        { method: 'delete', path: '/api/v1/links/test' },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
      }
    });
  });
});
