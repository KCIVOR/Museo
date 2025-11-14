/**
 * 🔒 Museo Validation Middleware
 * Request validation middleware for Express routes
 */

import validator from '../utils/validation.js';

// Toggle debug logs with environment variable
const VALIDATION_DEBUG = String(process.env.VALIDATION_DEBUG).toLowerCase() === 'true';

// Safe logger to avoid crashing on circular structures
const dbg = (...args) => {
  if (!VALIDATION_DEBUG) return;
  try {
    console.log('[VALIDATION]', ...args);
  } catch (_) {
    // noop
  }
};

/**
 * Middleware factory for validating request data
 * @param {Object} schema - Schema definition with required fields and types
 * @param {Object} options - Options for validation
 * @returns {Function} - Express middleware
 */
export const validateRequest = (schema, options = {}) => {
  const {
    sanitize = true,
    abortOnFirstError = false,
    allowUnknown = true,
    source = 'body', // 'body', 'query', 'params', or array of these
    stripUnknown = false,
    coerce = false,
    trimStrings = true
  } = options;
  
  return (req, res, next) => {
    const errors = [];
    const sources = Array.isArray(source) ? source : [source];
    dbg(`${req.method} ${req.originalUrl} -> validateRequest`, { sources });
    
    for (const src of sources) {
      if (!req[src]) continue;
      
      const data = req[src];
      
      // Apply sanitization if enabled
      if (sanitize && typeof data === 'object') {
        const sanitizedData = validator.sanitizeObject(data);
        // Do NOT reassign req.query/req.params because some routers define them via getters
        if (src === 'query' || src === 'params') {
          // Merge sanitized values into existing object
          for (const key of Object.keys(sanitizedData)) {
            data[key] = sanitizedData[key];
          }
          dbg(`${req.method} ${req.originalUrl} sanitized ${src}:`, sanitizedData);
        } else {
          // Safe to replace for body
          req[src] = sanitizedData;
          dbg(`${req.method} ${req.originalUrl} sanitized ${src}:`, sanitizedData);
        }
      }
      
      // Validate against schema
      if (schema[src]) {
        // Unknown field handling
        if (!allowUnknown && typeof data === 'object' && data) {
          const allowed = new Set(Object.keys(schema[src]));
          for (const key of Object.keys(data)) {
            if (!allowed.has(key)) {
              if (stripUnknown) {
                try { delete data[key]; } catch (_) {}
              } else {
                errors.push({ field: key, source: src, message: `Unknown field: ${key}` });
              }
            }
          }
        }

        for (const [field, rules] of Object.entries(schema[src])) {
          let value = data[field];

          // Apply defaults when missing
          if ((value === undefined || value === null) && Object.prototype.hasOwnProperty.call(rules, 'default')) {
            const def = typeof rules.default === 'function' ? rules.default(req) : rules.default;
            data[field] = def;
            value = data[field];
          }

          // Optional string trim
          if (trimStrings && typeof value === 'string' && rules.trim !== false) {
            data[field] = value.trim();
            value = data[field];
          }

          // Type coercion (query/body often carry strings)
          if (coerce && value !== undefined && value !== null) {
            try {
              switch (rules.type) {
                case 'integer': {
                  if (typeof value === 'string' && value.trim() !== '') {
                    const n = Number(value);
                    if (!Number.isNaN(n)) {
                      data[field] = parseInt(value, 10);
                      value = data[field];
                    }
                  }
                  break;
                }
                case 'number': {
                  if (typeof value === 'string' && value.trim() !== '') {
                    const n = Number(value);
                    if (!Number.isNaN(n)) {
                      data[field] = n;
                      value = data[field];
                    }
                  }
                  break;
                }
                case 'boolean': {
                  if (typeof value === 'string') {
                    const v = value.toLowerCase();
                    if (['true', '1', 'yes', 'y', 'on'].includes(v)) { data[field] = true; value = true; }
                    else if (['false', '0', 'no', 'n', 'off'].includes(v)) { data[field] = false; value = false; }
                  }
                  break;
                }
                default:
                  break;
              }
            } catch (_) {}
          }
          
          // Check required fields
          if (rules.required && validator.isEmpty(value)) {
            errors.push({
              field,
              source: src,
              message: rules.message || `${field} is required`
            });
            
            if (abortOnFirstError) break;
            continue;
          }
          
          // Skip validation if field is not required and empty
          if (!rules.required && validator.isEmpty(value)) {
            continue;
          }
          
          // Validate field type
          if (rules.type && !validator.validateField(rules.type, value)) {
            errors.push({
              field,
              source: src,
              message: rules.message || `${field} must be a valid ${rules.type}`
            });
            
            if (abortOnFirstError) break;
            continue;
          }

          // Enum allowlist
          if (Array.isArray(rules.enum)) {
            if (!rules.enum.includes(value)) {
              errors.push({
                field,
                source: src,
                message: rules.message || `${field} must be one of: ${rules.enum.join(', ')}`
              });
              if (abortOnFirstError) break;
              continue;
            }
          }
          
          // Validate min/max for strings, arrays, numbers
          if (rules.min !== undefined || rules.max !== undefined) {
            let isValid = true;
            let value_to_check = value;
            
            if (rules.type === 'string') {
              value_to_check = String(value).length;
            } else if (rules.type === 'array' && Array.isArray(value)) {
              value_to_check = value.length;
            } else if (['number', 'integer'].includes(rules.type)) {
              value_to_check = Number(value);
            }
            
            if (rules.min !== undefined && value_to_check < rules.min) {
              isValid = false;
            }
            
            if (rules.max !== undefined && value_to_check > rules.max) {
              isValid = false;
            }
            
            if (!isValid) {
              let message = rules.message;
              
              if (!message) {
                if (rules.type === 'string') {
                  message = rules.min && rules.max 
                    ? `${field} must be between ${rules.min} and ${rules.max} characters` 
                    : rules.min 
                      ? `${field} must be at least ${rules.min} characters` 
                      : `${field} cannot exceed ${rules.max} characters`;
                } else if (rules.type === 'array') {
                  message = rules.min && rules.max 
                    ? `${field} must have between ${rules.min} and ${rules.max} items` 
                    : rules.min 
                      ? `${field} must have at least ${rules.min} items` 
                      : `${field} cannot have more than ${rules.max} items`;
                } else {
                  message = rules.min && rules.max 
                    ? `${field} must be between ${rules.min} and ${rules.max}` 
                    : rules.min 
                      ? `${field} must be at least ${rules.min}` 
                      : `${field} cannot exceed ${rules.max}`;
                }
              }
              
              errors.push({
                field,
                source: src,
                message
              });
              
              if (abortOnFirstError) break;
            }
          }
          
          // Custom validation function
          if (rules.validate && typeof rules.validate === 'function') {
            try {
              const validationResult = rules.validate(value, data);
              
              if (validationResult !== true) {
                errors.push({
                  field,
                  source: src,
                  message: validationResult || `${field} failed validation`
                });
                
                if (abortOnFirstError) break;
              }
            } catch (err) {
              console.error('Validation error:', err);
              
              errors.push({
                field,
                source: src,
                message: `${field} validation error: ${err.message}`
              });
              
              if (abortOnFirstError) break;
            }
          }
          
          // Pattern validation
          if (rules.pattern && !rules.pattern.test(value)) {
            errors.push({
              field,
              source: src,
              message: rules.message || `${field} format is invalid`
            });
            
            if (abortOnFirstError) break;
          }

          // Array items validation
          if (rules.type === 'array' && Array.isArray(value) && rules.items) {
            const itemsRules = rules.items;
            for (let i = 0; i < value.length; i++) {
              let iv = value[i];
              // Coerce item types if requested
              if (coerce && iv !== undefined && iv !== null) {
                try {
                  switch (itemsRules.type) {
                    case 'integer': {
                      if (typeof iv === 'string' && iv.trim() !== '') {
                        const n = Number(iv);
                        if (!Number.isNaN(n)) { iv = parseInt(iv, 10); value[i] = iv; }
                      }
                      break;
                    }
                    case 'number': {
                      if (typeof iv === 'string' && iv.trim() !== '') {
                        const n = Number(iv);
                        if (!Number.isNaN(n)) { iv = n; value[i] = iv; }
                      }
                      break;
                    }
                    case 'boolean': {
                      if (typeof iv === 'string') {
                        const v = iv.toLowerCase();
                        if (['true','1','yes','y','on'].includes(v)) { iv = true; value[i] = iv; }
                        else if (['false','0','no','n','off'].includes(v)) { iv = false; value[i] = iv; }
                      }
                      break;
                    }
                    default:
                      break;
                  }
                } catch (_) {}
              }

              const itemPath = `${field}[${i}]`;
              if (itemsRules.type && !validator.validateField(itemsRules.type, iv)) {
                errors.push({ field: itemPath, source: src, message: `${itemPath} must be a valid ${itemsRules.type}` });
                if (abortOnFirstError) break;
                continue;
              }
              if (Array.isArray(itemsRules.enum) && !itemsRules.enum.includes(iv)) {
                errors.push({ field: itemPath, source: src, message: `${itemPath} must be one of: ${itemsRules.enum.join(', ')}` });
                if (abortOnFirstError) break;
                continue;
              }
              if (itemsRules.pattern && typeof iv === 'string' && !itemsRules.pattern.test(iv)) {
                errors.push({ field: itemPath, source: src, message: `${itemPath} format is invalid` });
                if (abortOnFirstError) break;
                continue;
              }
              if (itemsRules.min !== undefined || itemsRules.max !== undefined) {
                let ok = true;
                let checkVal = iv;
                if (itemsRules.type === 'string') checkVal = String(iv).length;
                else if (['number','integer'].includes(itemsRules.type)) checkVal = Number(iv);
                if (itemsRules.min !== undefined && checkVal < itemsRules.min) ok = false;
                if (itemsRules.max !== undefined && checkVal > itemsRules.max) ok = false;
                if (!ok) {
                  errors.push({ field: itemPath, source: src, message: `${itemPath} must satisfy bounds` });
                  if (abortOnFirstError) break;
                }
              }
            }
          }
        }
      }
      
      // Break after first source with errors if aborting on first error
      if (abortOnFirstError && errors.length > 0) break;
    }
    
    // Handle validation errors
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    
    // Validation passed
    next();
  };
};

/**
 * Validate a specific field using our validation rules
 * @param {string} field - Field name 
 * @param {Object} rules - Validation rules
 * @returns {Function} - Express middleware
 */
export const validateField = (field, rules, source = 'body') => {
  return validateRequest({
    [source]: { [field]: rules }
  }, { source });
};

/**
 * Sanitize request data without validation
 * @param {Array|string} sources - Request properties to sanitize
 * @returns {Function} - Express middleware
 */
export const sanitize = (sources = ['body']) => {
  const sourcesToSanitize = Array.isArray(sources) ? sources : [sources];
  
  return (req, res, next) => {
    for (const src of sourcesToSanitize) {
      if (req[src] && typeof req[src] === 'object') {
        const sanitizedData = validator.sanitizeObject(req[src]);
        if (src === 'query' || src === 'params') {
          for (const key of Object.keys(sanitizedData)) {
            req[src][key] = sanitizedData[key];
          }
        } else {
          req[src] = sanitizedData;
        }
      }
    }
    next();
  };
};

/**
 * Validate JSONB data in request
 * Useful for the unified request table pattern
 * @param {string} field - Field containing JSONB data
 * @param {Array} requiredFields - Required fields in JSONB
 * @param {string} source - Request source (body, query, params)
 * @returns {Function} - Express middleware
 */
export const validateJsonb = (field, requiredFields = [], source = 'body') => {
  return (req, res, next) => {
    const data = req[source]?.[field];
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: [{
          field,
          source,
          message: `${field} must be a valid JSON object`
        }]
      });
    }
    
    const validation = validator.validateJsonbData(data, requiredFields);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors.map(error => ({
          field: `${field}`,
          source,
          message: error
        }))
      });
    }
    
    next();
  };
};

export default {
  validateRequest,
  validateField,
  validateJsonb,
  sanitize
};
