// =============================================================================
// Authentication Service
// =============================================================================

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '12', 10);

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface UserUpdateInput {
  name?: string;
  password?: string;
}

/**
 * Register a new user
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (existingUser) {
    throw new AuthError('Email already registered', 'EMAIL_EXISTS');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name || null,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  // Generate JWT
  const token = generateToken(user.id, user.email);

  logger.info('User registered', { userId: user.id, email: user.email });

  return { token, user };
}

/**
 * Login user
 */
export async function login(input: LoginInput): Promise<AuthResult> {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Verify password
  const isValid = await bcrypt.compare(input.password, user.passwordHash);
  
  if (!isValid) {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Generate JWT
  const token = generateToken(user.id, user.email);

  logger.info('User logged in', { userId: user.id });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AuthError('User not found', 'USER_NOT_FOUND');
  }

  return user;
}

/**
 * Verify JWT token and return user ID
 */
export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  try {
    const decoded = jwt.verify(token, secret) as { id: string; email: string };

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true },
    });

    if (!user) {
      return null;
    }

    return { userId: user.id };
  } catch {
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateUser(userId: string, input: UserUpdateInput) {
  const updateData: { name?: string; passwordHash?: string } = {};

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  if (input.password) {
    updateData.passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  logger.info('User updated', { userId: user.id });

  return user;
}

/**
 * Generate JWT token
 */
function generateToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(
    { id: userId, email },
    secret,
    { expiresIn: '24h' }
  );
}

/**
 * Custom error class for auth errors
 */
export class AuthError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}
