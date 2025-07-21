import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateRequest = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
    }
    
    next();
  };
};

// Custom validation for ZK-specific inputs
export const zkValidation = {
  // Validate that a value can be represented in a field
  fieldElement: Joi.string().custom((value, helpers) => {
    try {
      const num = BigInt(value);
      // BN254 field modulus (approximately)
      const fieldModulus = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
      
      if (num >= fieldModulus) {
        return helpers.error('custom.field-overflow');
      }
      
      return value;
    } catch {
      return helpers.error('custom.invalid-field');
    }
  }, 'Field element validation').messages({
    'custom.field-overflow': 'Value exceeds field modulus',
    'custom.invalid-field': 'Invalid field element format'
  }),
  
  // Validate Merkle proof structure
  merkleProof: Joi.array().items(
    Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).messages({
      'string.pattern.base': 'Merkle proof element must be a 32-byte hex string'
    })
  ).length(20).messages({
    'array.length': 'Merkle proof must have exactly 20 elements'
  }),
  
  // Validate Merkle proof indices
  merkleIndices: Joi.array().items(
    Joi.number().integer().min(0).max(1).messages({
      'number.min': 'Merkle proof index must be 0 or 1',
      'number.max': 'Merkle proof index must be 0 or 1'
    })
  ).length(20).messages({
    'array.length': 'Merkle proof indices must have exactly 20 elements'
  }),
  
  // Validate commitment hash
  commitment: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).messages({
    'string.pattern.base': 'Commitment must be a 32-byte hex string'
  }),
  
  // Validate GPA value
  gpa: Joi.number().min(0).max(4.0).precision(2).messages({
    'number.min': 'GPA must be at least 0.0',
    'number.max': 'GPA must be at most 4.0',
    'number.precision': 'GPA must have at most 2 decimal places'
  }),
  
  // Validate income value
  income: Joi.number().integer().min(0).max(100000000).messages({
    'number.min': 'Income must be non-negative',
    'number.max': 'Income must be less than $100M',
    'number.integer': 'Income must be a whole number'
  }),
  
  // Validate date in YYYYMMDD format
  dateYYYYMMDD: Joi.number().integer().min(19700101).max(20991231).custom((value, helpers) => {
    const str = value.toString();
    if (str.length !== 8) {
      return helpers.error('custom.invalid-date-format');
    }
    
    const year = parseInt(str.substring(0, 4));
    const month = parseInt(str.substring(4, 6));
    const day = parseInt(str.substring(6, 8));
    
    if (month < 1 || month > 12) {
      return helpers.error('custom.invalid-month');
    }
    
    if (day < 1 || day > 31) {
      return helpers.error('custom.invalid-day');
    }
    
    // Additional validation for month/day combinations could be added
    return value;
  }).messages({
    'custom.invalid-date-format': 'Date must be in YYYYMMDD format',
    'custom.invalid-month': 'Month must be between 01 and 12',
    'custom.invalid-day': 'Day must be between 01 and 31'
  }),
  
  // Validate vaccine CVX codes
  vaccineCodes: Joi.array().items(
    Joi.number().integer().min(1).max(300).messages({
      'number.min': 'Vaccine code must be at least 1',
      'number.max': 'Vaccine code must be at most 300',
      'number.integer': 'Vaccine code must be an integer'
    })
  ).min(1).max(10).messages({
    'array.min': 'At least one vaccine code is required',
    'array.max': 'At most 10 vaccine codes are allowed'
  }),
  
  // Validate bitmask
  bitmask: Joi.number().integer().min(0).max(0xFFFFFFFF).messages({
    'number.min': 'Bitmask must be non-negative',
    'number.max': 'Bitmask must fit in 32 bits',
    'number.integer': 'Bitmask must be an integer'
  }),
  
  // Validate timestamp
  timestamp: Joi.number().integer().min(0).max(2147483647).messages({
    'number.min': 'Timestamp must be non-negative',
    'number.max': 'Timestamp must be a valid Unix timestamp',
    'number.integer': 'Timestamp must be an integer'
  }),
  
  // Validate institution ID
  institutionId: Joi.number().integer().min(1).max(999999).messages({
    'number.min': 'Institution ID must be at least 1',
    'number.max': 'Institution ID must be at most 999999',
    'number.integer': 'Institution ID must be an integer'
  }),
  
  // Validate graduation year
  graduationYear: Joi.number().integer().min(1950).max(2030).messages({
    'number.min': 'Graduation year must be at least 1950',
    'number.max': 'Graduation year must be at most 2030',
    'number.integer': 'Graduation year must be an integer'
  }),
  
  // Validate verification method
  verificationMethod: Joi.number().integer().min(1).max(4).messages({
    'number.min': 'Verification method must be between 1 and 4',
    'number.max': 'Verification method must be between 1 and 4',
    'number.integer': 'Verification method must be an integer'
  }),
  
  // Validate tax year
  taxYear: Joi.number().integer().min(2020).max(2025).messages({
    'number.min': 'Tax year must be at least 2020',
    'number.max': 'Tax year must be at most 2025',
    'number.integer': 'Tax year must be an integer'
  }),
  
  // Validate proof object structure
  groth16Proof: Joi.object({
    pi_a: Joi.array().items(Joi.string()).length(3).required(),
    pi_b: Joi.array().items(Joi.array().items(Joi.string()).length(2)).length(3).required(),
    pi_c: Joi.array().items(Joi.string()).length(3).required(),
    protocol: Joi.string().valid('groth16').required(),
    curve: Joi.string().valid('bn128').required()
  }).messages({
    'object.unknown': 'Invalid proof structure',
    'any.required': 'Missing required proof field'
  }),
  
  // Validate public signals
  publicSignals: Joi.array().items(
    Joi.string().pattern(/^[0-9]+$/).messages({
      'string.pattern.base': 'Public signal must be a decimal number string'
    })
  ).min(1).max(100).messages({
    'array.min': 'At least one public signal is required',
    'array.max': 'At most 100 public signals are allowed'
  })
};

// Middleware to validate proof generation rate limits per user
export const validateProvingRateLimit = (maxProofsPerHour: number = 5) => {
  const userProofCounts = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers['x-user-id'] as string || req.ip;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    const userStats = userProofCounts.get(userId);
    
    if (!userStats || now > userStats.resetTime) {
      // Reset or initialize counter
      userProofCounts.set(userId, { count: 1, resetTime: now + oneHour });
      next();
    } else if (userStats.count < maxProofsPerHour) {
      // Increment counter
      userStats.count++;
      next();
    } else {
      // Rate limit exceeded
      res.status(429).json({
        success: false,
        error: 'Proof generation rate limit exceeded',
        details: `Maximum ${maxProofsPerHour} proofs per hour allowed`,
        resetTime: new Date(userStats.resetTime).toISOString()
      });
    }
  };
};

// Middleware to validate circuit inputs are within expected ranges
export const validateCircuitInputs = (circuitType: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { body } = req;
    
    try {
      switch (circuitType) {
        case 'academic':
          // Validate GPA is scalable to integer without overflow
          if (body.gpa && (body.gpa * 100) > 65535) {
            throw new Error('GPA value too large for circuit constraints');
          }
          break;
          
        case 'financial':
          // Validate income fits in 32-bit integer when converted to cents
          if (body.income && (body.income * 100) > 2147483647) {
            throw new Error('Income value too large for circuit constraints');
          }
          break;
          
        case 'health':
          // Validate vaccine arrays don't exceed circuit limits
          if (body.vaccine_codes && body.vaccine_codes.length > 10) {
            throw new Error('Too many vaccine codes for circuit constraints');
          }
          break;
          
        case 'universal':
          // Validate domain arrays don't exceed circuit limits
          if (body.domain_proofs && body.domain_proofs.length > 8) {
            throw new Error('Too many domains for circuit constraints');
          }
          break;
      }
      
      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Circuit input validation failed',
        details: error.message
      });
    }
  };
};