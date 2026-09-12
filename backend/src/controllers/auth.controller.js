// backend/src/controllers/auth.controller.js
// Authentication — signup, login, logout, me

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import prisma from '../db/prismaClient.js';
import { AppError, AuthError, NotFoundError } from '../utils/errors.js';
import logger from '../utils/logger.js';

// -------------------------------------------------------
// Validation rules
// -------------------------------------------------------
export const signupValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// -------------------------------------------------------
// Generate JWT
// -------------------------------------------------------
function generateToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// -------------------------------------------------------
// POST /api/auth/signup
// -------------------------------------------------------
export async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return next(new AppError('Email already registered', 409, 'EMAIL_EXISTS'));
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const token = generateToken(user);
    logger.info(`New user registered: ${email}`);

    res.status(201).json({ success: true, token, user });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------
// POST /api/auth/login
// -------------------------------------------------------
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return next(new AuthError('Invalid email or password'));

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return next(new AuthError('Invalid email or password'));

    const token = generateToken(user);
    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------
// GET /api/auth/me
// -------------------------------------------------------
export async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!user) return next(new NotFoundError('User'));
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}
