// backend/src/controllers/blueprint.controller.js
// Blueprint generation, retrieval, section management, deletion

import { body, param } from 'express-validator';
import prisma from '../db/prismaClient.js';
import { orchestrateBlueprint, regenerateSection } from '../agents/index.js';
import { NotFoundError, AppError, ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';

// -------------------------------------------------------
// Validation rules
// -------------------------------------------------------
export const createBlueprintValidation = [
  body('startupName').trim().notEmpty().withMessage('Startup name is required').isLength({ max: 200 }),
  body('idea').trim().notEmpty().withMessage('Startup idea is required').isLength({ min: 20, max: 5000 }),
  body('industry').trim().notEmpty().withMessage('Industry is required'),
  body('targetLocation').trim().notEmpty().withMessage('Target location is required'),
  body('targetCustomer').trim().notEmpty().withMessage('Target customer is required'),
  body('initialBudget').trim().notEmpty().withMessage('Initial budget is required'),
  body('teamSize').isInt({ min: 1, max: 1000 }).withMessage('Team size must be a number between 1 and 1000'),
  body('stage')
    .isIn(['ideation', 'validation', 'mvp', 'growth', 'scaling'])
    .withMessage('Stage must be one of: ideation, validation, mvp, growth, scaling'),
];

// -------------------------------------------------------
// POST /api/blueprint/generate
// Creates StartupIdea + Blueprint, then triggers orchestration
// -------------------------------------------------------
export async function generateBlueprint(req, res, next) {
  try {
    const {
      startupName, idea, industry, targetLocation,
      targetCustomer, initialBudget, teamSize, stage, additionalNotes,
    } = req.body;

    // Create StartupIdea record
    const startupIdea = await prisma.startupIdea.create({
      data: {
        userId: req.user.id,
        startupName,
        idea,
        industry,
        targetLocation,
        targetCustomer,
        initialBudget,
        teamSize: parseInt(teamSize),
        stage,
        additionalNotes: additionalNotes || null,
      },
    });

    // Create Blueprint record
    const blueprint = await prisma.blueprint.create({
      data: {
        userId: req.user.id,
        startupIdeaId: startupIdea.id,
        status: 'pending',
      },
    });

    logger.info(`Blueprint ${blueprint.id} created for user ${req.user.id}`);

    // Respond immediately — generation runs in background
    res.status(202).json({
      success: true,
      message: 'Blueprint generation started',
      blueprintId: blueprint.id,
      startupIdeaId: startupIdea.id,
    });

    // Run agent orchestration asynchronously (non-blocking)
    orchestrateBlueprint(blueprint.id, startupIdea).catch((err) => {
      logger.error(`Background orchestration failed for ${blueprint.id}`, { error: err.message });
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------
// GET /api/blueprint/:id
// Returns full blueprint with all sections and sources
// -------------------------------------------------------
export async function getBlueprint(req, res, next) {
  try {
    const { id } = req.params;

    const blueprint = await prisma.blueprint.findUnique({
      where: { id },
      include: {
        startupIdea: true,
        sections: { orderBy: { generatedAt: 'asc' } },
        sources: { orderBy: { retrievedAt: 'asc' } },
      },
    });

    if (!blueprint) return next(new NotFoundError('Blueprint'));

    // Security: ensure blueprint belongs to requesting user
    if (blueprint.userId !== req.user.id) {
      return next(new AppError('Access denied', 403, 'FORBIDDEN'));
    }

    // Parse section content from JSON strings
    const sections = {};
    blueprint.sections.forEach((section) => {
      sections[section.sectionKey] = {
        title: section.title,
        content: JSON.parse(section.content || '{}'),
        generatedAt: section.generatedAt,
      };
    });

    let stepProgress = [];
    if (blueprint.stepProgress) {
      try {
        stepProgress = JSON.parse(blueprint.stepProgress);
      } catch (e) {
        logger.warn('Failed to parse stepProgress JSON', { error: e.message });
      }
    }

    res.json({
      success: true,
      blueprint: {
        id: blueprint.id,
        status: blueprint.status,
        errorMessage: blueprint.errorMessage,
        stepProgress,
        createdAt: blueprint.createdAt,
        updatedAt: blueprint.updatedAt,
        startupIdea: blueprint.startupIdea,
        sections,
        executive_summary: sections.executive_summary?.content || null,
        problem: sections.problem?.content || null,
        solution: sections.problem?.content?.solution || sections.problem?.content || null,
        usp: sections.problem?.content?.usp || null,
        target_customers: sections.customers?.content || null,
        market_analysis: sections.market?.content || null,
        competitors: sections.competitors?.content || null,
        business_model_canvas: sections.bmc?.content || null,
        revenue_model: sections.revenue?.content || null,
        budget: sections.budget?.content || null,
        gtm_strategy: sections.gtm?.content || null,
        government_schemes: sections.schemes?.content || null,
        funding_opportunities: sections.funding?.content || null,
        legal_requirements: sections.legal?.content || null,
        sources: blueprint.sources,
      },
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------
// GET /api/blueprint/:id/status
// Lightweight polling endpoint
// -------------------------------------------------------
export async function getBlueprintStatus(req, res, next) {
  try {
    const { id } = req.params;

    const blueprint = await prisma.blueprint.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        stepProgress: true,
        errorMessage: true,
        userId: true,
        updatedAt: true,
        _count: { select: { sections: true } },
      },
    });

    if (!blueprint) return next(new NotFoundError('Blueprint'));
    if (blueprint.userId !== req.user.id) {
      return next(new AppError('Access denied', 403, 'FORBIDDEN'));
    }

    let stepProgress = [];
    if (blueprint.stepProgress) {
      try {
        stepProgress = JSON.parse(blueprint.stepProgress);
      } catch (e) {
        logger.warn('Failed to parse stepProgress JSON in status endpoint', { error: e.message });
      }
    }

    const TOTAL_STEPS = 11;
    const completedStepsCount = stepProgress.filter((s) => s.status === 'completed').length;
    const progress = stepProgress.length > 0 
      ? Math.min(Math.round((completedStepsCount / TOTAL_STEPS) * 100), 100)
      : Math.round((blueprint._count.sections / 12) * 100);

    res.json({
      success: true,
      status: blueprint.status,
      progress,
      stepProgress,
      sectionsCompleted: blueprint._count.sections,
      totalSections: 12,
      errorMessage: blueprint.errorMessage,
      updatedAt: blueprint.updatedAt,
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------
// POST /api/blueprint/:id/section/:key/regenerate
// Regenerates a single blueprint section
// -------------------------------------------------------
export async function regenerateSectionHandler(req, res, next) {
  try {
    const { id, key } = req.params;

    const VALID_KEYS = [
      'problem', 'customers', 'market', 'competitors', 'bmc',
      'revenue', 'budget', 'gtm', 'schemes', 'funding', 'legal', 'executive_summary',
    ];

    if (!VALID_KEYS.includes(key)) {
      return next(new ValidationError(`Invalid section key: ${key}`));
    }

    const blueprint = await prisma.blueprint.findUnique({
      where: { id },
      include: { startupIdea: true },
    });

    if (!blueprint) return next(new NotFoundError('Blueprint'));
    if (blueprint.userId !== req.user.id) {
      return next(new AppError('Access denied', 403, 'FORBIDDEN'));
    }

    logger.info(`Regenerating section ${key} for blueprint ${id}`);

    const newContent = await regenerateSection(id, key, blueprint.startupIdea);

    res.json({ success: true, sectionKey: key, content: newContent });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------
// DELETE /api/blueprint/:id
// -------------------------------------------------------
export async function deleteBlueprint(req, res, next) {
  try {
    const { id } = req.params;

    const blueprint = await prisma.blueprint.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!blueprint) return next(new NotFoundError('Blueprint'));
    if (blueprint.userId !== req.user.id) {
      return next(new AppError('Access denied', 403, 'FORBIDDEN'));
    }

    await prisma.blueprint.delete({ where: { id } });
    logger.info(`Blueprint ${id} deleted by user ${req.user.id}`);

    res.json({ success: true, message: 'Blueprint deleted' });
  } catch (err) {
    next(err);
  }
}
