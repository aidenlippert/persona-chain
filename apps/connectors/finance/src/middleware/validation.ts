import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateRequest = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req[property]);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    next();
  };
};

export const didValidation = Joi.string()
  .required()
  .pattern(/^did:persona:[a-zA-Z0-9-]+$/)
  .messages({
    'string.pattern.base': 'DID must follow the format: did:persona:identifier'
  });

export const validateDID = (req: Request, res: Response, next: NextFunction) => {
  const { did } = req.params.did ? req.params : req.query.did ? req.query : req.body;
  
  if (!did) {
    return res.status(400).json({
      success: false,
      error: 'DID parameter is required'
    });
  }
  
  const { error } = didValidation.validate(did);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid DID format',
      details: error.details[0].message
    });
  }
  
  next();
};