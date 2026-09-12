// backend/src/controllers/user.controller.js
// User profile + blueprint listing

import prisma from '../db/prismaClient.js';
import { NotFoundError } from '../utils/errors.js';

// -------------------------------------------------------
// GET /api/user/me  (profile + stats)
// -------------------------------------------------------
export async function getProfile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!user) return next(new NotFoundError('User'));

    const totalBlueprints = await prisma.blueprint.count({
      where: { userId: req.user.id },
    });
    const completedBlueprints = await prisma.blueprint.count({
      where: { userId: req.user.id, status: 'completed' },
    });

    res.json({ success: true, user: { ...user, totalBlueprints, completedBlueprints } });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------
// GET /api/user/blueprints — paginated list
// -------------------------------------------------------
export async function getUserBlueprints(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [blueprints, total] = await Promise.all([
      prisma.blueprint.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          startupIdea: {
            select: { startupName: true, industry: true, stage: true, idea: true },
          },
        },
      }),
      prisma.blueprint.count({ where: { userId: req.user.id } }),
    ]);

    res.json({
      success: true,
      blueprints,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}
