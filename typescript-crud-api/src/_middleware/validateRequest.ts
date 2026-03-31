import type { Request, NextFunction } from 'express';
import Joi from 'joi';

export function validateRequest(
  req: Request,
  next: NextFunction,
  schema: Joi.ObjectSchema  
) : void {
  const options = {
    abortEarly: false,     // Include all errors
    allowUnknown: true,    // Allow unknown keys not in schema
    stripUnknown: false,   // Do not strip unknown keys (prevents Joi.ref() resolution issues)
  };

  const {error, value } = schema.validate(req.body, options);

  if (error) {
    next(`Validation error: ${error.details.map((d)=> d.message).join(', ')}`);
  } else {
    req.body = value;
    next();
  }
}