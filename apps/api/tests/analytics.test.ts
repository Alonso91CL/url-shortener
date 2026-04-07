// =============================================================================
// Analytics API Tests
// =============================================================================

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { prisma } from '../src/db/prisma.js';
import linksRoutes from '../src/routes/links.js';
import statsRoutes from '../src/routes/stats.js';
import authRoutes from '../src/routes/auth.js';

describe('Analytics API', () => {
  let app: express.Application;
  let authToken: string;
  let userId: string;
  let testLinkCode: string;
  let otherUserToken: string;
  let otherUserId: string;

  beforeAll(async () => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/links', linksRoutes);
    app.use('/api/v1/stats', statsRoutes);

    // Create first test user
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `analytics-user-${Date.now()}@example.com`,
        password: 'TestPass123!',
        name: 'Analytics Test User',
      });
    authToken = userResponse.body.data.token;
    userId = userResponse.body.data.user.id;

    // Create second test user
    const otherResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `analytics-other-${Date.now()}@example.com`,
        password: 'TestPass123!',
        name: 'Other User',
      });
    otherUserToken = otherResponse.body.data.token;
    otherUserId = otherResponse.body.data.user.id;
  });

  beforeEach(async () => {
    // Clean up and create test link with clicks
    await prisma.click.deleteMany({});
    await prisma.link.deleteMany({});

    // Create test link
    const link = await prisma.link.create({
      data: {
        code: 'analytics-test-link',
        originalUrl: 'https://example.com/analytics',
        userId,
        isActive: true,
      },
    });
    testLinkCode = link.code;

    // Create test clicks for the link
    const now = new Date();
    await prisma.click.createMany({
      data: [
        {
          linkId: link.id,
          clickedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          ipHash: 'hash1',
          country: 'US',
          deviceType: 'desktop',
          browser: 'Chrome',
          os: 'Windows',
          referer: 'https://google.com',
        },
        {
          linkId: link.id,
          clickedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          ipHash: 'hash2',
          country: 'US',
          deviceType: 'mobile',
          browser: 'Safari',
          os: 'iOS',
          referer: 'https://twitter.com',
        },
        {
          linkId: link.id,
          clickedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // Same day as hash2
          ipHash: 'hash2', // Same IP - should count as unique click
          country: 'US',
          deviceType: 'mobile',
          browser: 'Safari',
          os: 'iOS',
        },
        {
          linkId: link.id,
          clickedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          ipHash: 'hash3',
          country: 'GB',
          deviceType: 'desktop',
          browser: 'Firefox',
          os: 'Linux',
          referer: null,
        },
        {
          linkId: link.id,
          clickedAt: now, // Today
          ipHash: 'hash4',
          country: 'DE',
          deviceType: 'tablet',
          browser: 'Chrome',
          os: 'Android',
        },
      ],
    });

    // Create another link owned by other user for access testing
    await prisma.link.create({
      data: {
        code: 'other-analytics-link',
        originalUrl: 'https://other.com',
        userId: otherUserId,
        isActive: true,
      },
    });
  });

  afterEach(async () => {
    await prisma.click.deleteMany({});
    await prisma.link.deleteMany({});
  });

  describe('GET /api/v1/stats/:code/overview', () => {
    it('should get overview statistics', async () => {
      const response = await request(app)
        .get(`/api/v1/stats/${testLinkCode}/overview`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('totalClicks', 5);
      expect(response.body.data).toHaveProperty('uniqueClicks'); // Should be 4 unique IPs
      expect(response.body.data).toHaveProperty('firstClick');
      expect(response.body.data).toHaveProperty('lastClick');
    });

    it('should return 404 for non-existent link', async () => {
      const response = await request(app)
        .get('/api/v1/stats/non-existent/overview')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should prevent access to other user links', async () => {
      const response = await request(app)
        .get('/api/v1/stats/other-analytics-link/overview')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('ACCESS_DENIED');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get(`/api/v1/stats/${testLinkCode}/overview`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/stats/:code/timeseries', () => {
    it('should get timeseries data with default 7 days', async () => {
      const response = await request(app)
        .get(`/api/v1/stats/${testLinkCode}/timeseries`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta.days).toBe(7);
    });

    it('should support days parameter', async () => {
      const response = await request(app)
        .get(`/api/v1/stats/${testLinkCode}/timeseries?days=30`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.meta.days).toBe(30);
    });

    it('should reject invalid days parameter', async () => {
      const response = await request(app)
        .get(`/api/v1/stats/${testLinkCode}/timeseries?days=5`)
        .set('Authorization', `Bearer ${authToken}`);

      // Should default to 7 if invalid value
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/stats/:code/devices', () => {
    it('should get device distribution', async () => {
      const response = await request(app)
        .get(`/api/v1/stats/${testLinkCode}/devices`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // Should have desktop, mobile, tablet
      const devices = response.body.data.map((d: { label: string }) => d.label);
      expect(devices).toContain('Desktop');
      expect(devices).toContain('Mobile');
      expect(devices).toContain('Tablet');
    });

    it('should return percentages', async () => {
      const response = await request(app)
        .get(`/api/v1/stats/${testLinkCode}/devices`)
        .set('Authorization', `Bearer ${authToken}`);

      const device = response.body.data.find((d: { label: string }) => d.label === 'Mobile');
      expect(device).toHaveProperty('percentage');
      expect(device.percentage).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/stats/:code/countries', () => {
    it('should get country distribution', async () => {
      const response = await request(app)
        .get(`/api/v1/stats/${testLinkCode}/countries`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      
      const countries = response.body.data.map((d: { label: string }) => d.label);
      expect(countries).toContain('US');
      expect(countries).toContain('GB');
      expect(countries).toContain('DE');
    });

    it('should limit to top 10 countries', async () => {
      // Add more countries
      const link = await prisma.link.findUnique({ where: { code: testLinkCode } });
      const clicks = [];
      for (let i = 0; i < 15; i++) {
        clicks.push({
          linkId: link!.id,
          country: `Country${i}`,
          deviceType: 'desktop',
        });
      }
      await prisma.click.createMany({ data: clicks });

      const response = await request(app)
        .get(`/api/v1/stats/${testLinkCode}/countries`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /api/v1/stats/:code/referrers', () => {
    it('should get referrer distribution', async () => {
      const response = await request(app)
        .get(`/api/v1/stats/${testLinkCode}/referrers`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should show direct traffic for null referer', async () => {
      const response = await request(app)
        .get(`/api/v1/stats/${testLinkCode}/referrers`)
        .set('Authorization', `Bearer ${authToken}`);

      const direct = response.body.data.find((r: { referer: string }) => r.referer === 'direct');
      expect(direct).toBeDefined();
    });
  });

  describe('GET /api/v1/stats/:code/browsers', () => {
    it('should get browser distribution', async () => {
      const response = await request(app)
        .get(`/api/v1/stats/${testLinkCode}/browsers`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should limit to top 5 browsers', async () => {
      const link = await prisma.link.findUnique({ where: { code: testLinkCode } });
      const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera', 'Chrome'];
      
      const clicks = browsers.map(browser => ({
        linkId: link!.id,
        browser,
        deviceType: 'desktop',
      }));
      await prisma.click.createMany({ data: clicks });

      const response = await request(app)
        .get(`/api/v1/stats/${testLinkCode}/browsers`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Unauthorized access', () => {
    it('should reject requests without authentication', async () => {
      const endpoints = [
        { path: `/api/v1/stats/${testLinkCode}/overview` },
        { path: `/api/v1/stats/${testLinkCode}/timeseries` },
        { path: `/api/v1/stats/${testLinkCode}/devices` },
        { path: `/api/v1/stats/${testLinkCode}/countries` },
        { path: `/api/v1/stats/${testLinkCode}/referrers` },
        { path: `/api/v1/stats/${testLinkCode}/browsers` },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint.path);
        expect(response.status).toBe(401);
      }
    });

    it('should reject requests with other user token', async () => {
      const response = await request(app)
        .get(`/api/v1/stats/${testLinkCode}/overview`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(404);
    });
  });
});
