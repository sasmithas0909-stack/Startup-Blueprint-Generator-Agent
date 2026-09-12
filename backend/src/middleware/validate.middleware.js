// backend/src/middleware/validate.middleware.js
// Input validation middleware using express-validator

import { validationResult } from 'express-validator';
import { ValidationError } from '../utils/errors.js';

export function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return next(new ValidationError('Validation failed', details));
  }
  next();
}
