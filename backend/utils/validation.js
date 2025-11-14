/**
 * 🔒 Museo Validation Utilities
 * Comprehensive validation, sanitization and security helpers
 */

import validator from 'validator';
import xss from 'xss';
import crypto from 'crypto';

/**
 * ===========================
 * 🧹 SANITIZATION FUNCTIONS
 * ===========================
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} text - Input text
 * @returns {string} - Sanitized text
 */
export const sanitizeHTML = (text) => {
  if (typeof text !== 'string') return text;
  return xss(text, {
    whiteList: {}, // No tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script'] // Strip script tag contents
  });
};

/**
 * Sanitize a string for safe display
 * @param {string} text - Input text
 * @returns {string} - Sanitized text
 */
export const sanitizeString = (text) => {
  if (typeof text !== 'string') return text;
  return validator.escape(text.trim());
};

/**
 * Sanitize SQL identifier to prevent SQL injection in dynamic column names
 * @param {string} identifier - SQL identifier
 * @returns {string} - Sanitized identifier
 */
export const sanitizeSqlIdentifier = (identifier) => {
  if (typeof identifier !== 'string') return identifier;
  // Allow only alphanumeric and underscore
  return identifier.replace(/[^a-zA-Z0-9_]/g, '');
};

/**
 * Recursively sanitize all string values in an object
 * @param {Object|Array} data - Input data
 * @returns {Object|Array} - Sanitized data
 */
export const sanitizeObject = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHTML(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeHTML(item) : sanitizeObject(item)
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * ===========================
 * 🔍 VALIDATION FUNCTIONS
 * ===========================
 */

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} - Is email valid
 */
export const validateEmail = (email) => {
  if (typeof email !== 'string') return false;
  return validator.isEmail(email);
};

/**
 * Validate Philippine phone number
 * Format: +639XXXXXXXX or 09XXXXXXXX
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - Is phone valid
 */
export const validatePhilippinePhone = (phone) => {
  if (typeof phone !== 'string') return false;
  return /^(\+63|0)?9\d{9}$/.test(phone);
};

/**
 * Validate if a string is a valid URL
 * @param {string} url - URL to validate
 * @returns {boolean} - Is URL valid
 */
export const validateURL = (url) => {
  if (typeof url !== 'string') return false;
  return validator.isURL(url, {
    require_protocol: true,
    require_valid_protocol: true,
    protocols: ['http', 'https'],
    allow_underscores: true
  });
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result with details
 */
export const validatePassword = (password) => {
  if (typeof password !== 'string') {
    return { isValid: false, message: 'Password must be a string' };
  }
  
  const result = {
    isValid: true,
    message: 'Password is valid',
    details: {
      hasMinLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
    }
  };
  
  // Check if all requirements are met
  if (!result.details.hasMinLength) {
    result.isValid = false;
    result.message = 'Password must be at least 8 characters long';
  } else if (!result.details.hasUppercase) {
    result.isValid = false;
    result.message = 'Password must contain at least one uppercase letter';
  } else if (!result.details.hasLowercase) {
    result.isValid = false;
    result.message = 'Password must contain at least one lowercase letter';
  } else if (!result.details.hasNumbers) {
    result.isValid = false;
    result.message = 'Password must contain at least one number';
  } else if (!result.details.hasSpecialChars) {
    result.isValid = false;
    result.message = 'Password must contain at least one special character';
  }
  
  return result;
};

/**
 * Validate money amount (₱) and convert to centavos for storage
 * @param {number|string} amount - Amount in pesos
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result with centavos
 */
export const validateMoney = (amount, options = {}) => {
  const { 
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
    field = 'Amount'
  } = options;
  
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return { 
      valid: false, 
      error: `${field} must be a valid number` 
    };
  }
  
  // Convert to centavos (integer) to avoid floating point issues
  const centavos = Math.round(numAmount * 100);
  const minCentavos = Math.round(min * 100);
  const maxCentavos = Math.round(max * 100);
  
  if (centavos < minCentavos) {
    return { 
      valid: false, 
      error: `${field} must be at least ₱${min}` 
    };
  }
  
  if (centavos > maxCentavos) {
    return { 
      valid: false, 
      error: `${field} cannot exceed ₱${max}` 
    };
  }
  
  return { 
    valid: true, 
    centavos,
    pesos: numAmount
  };
};

/**
 * Validate JSONB data against expected schema
 * For use with the unified request table
 * @param {Object} data - JSONB data object
 * @param {Array} requiredFields - List of required field names
 * @returns {Object} - Validation result with errors if any
 */
export const validateJsonbData = (data, requiredFields = []) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { 
      valid: false, 
      errors: ['Invalid JSONB data format'] 
    };
  }
  
  const errors = [];
  
  // Check for required fields
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`Field '${field}' is required`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length ? errors : []
  };
};

/**
 * ===========================
 * 🔒 SECURITY FUNCTIONS
 * ===========================
 */

/**
 * Generate a secure random token
 * @param {number} bytes - Number of bytes (default: 32)
 * @returns {string} - Hex token
 */
export const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Generate SHA-256 hash for idempotency keys
 * @param {Object} data - Data to hash
 * @returns {string} - SHA-256 hash
 */
export const generateIdempotencyKey = (data) => {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
};

/**
 * Normalize and sanitize phone number
 * @param {string} phone - Phone number
 * @returns {string} - Normalized phone
 */
export const normalizePhone = (phone) => {
  if (typeof phone !== 'string') return phone;
  // Remove non-digit characters except +
  return phone.replace(/[^\d+]/g, '');
};

/**
 * Convert pesos to centavos (for money calculations)
 * @param {number|string} pesos - Amount in pesos
 * @returns {number} - Amount in centavos (integer)
 */
export const toCentavos = (pesos) => {
  return Math.round(parseFloat(pesos) * 100);
};

/**
 * Convert centavos to pesos (for display)
 * @param {number|string} centavos - Amount in centavos
 * @returns {string} - Formatted pesos with 2 decimal places
 */
export const toPesos = (centavos) => {
  return (parseInt(centavos, 10) / 100).toFixed(2);
};

/**
 * ===========================
 * 🧪 VALIDATION HELPERS
 * ===========================
 */

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {any} value - Value to check
 * @returns {boolean} - Is empty
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) {
    return true;
  }
  
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  
  return false;
};

/**
 * Validate that a value is within min and max (inclusive)
 * @param {number} value - Value to check
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} - Is within range
 */
export const isWithinRange = (value, min, max) => {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
};

/**
 * Validate specific field types
 * @param {string} type - Field type
 * @param {any} value - Value to validate
 * @returns {boolean} - Is valid
 */
export const validateField = (type, value) => {
  switch (type) {
    case 'email':
      return validateEmail(value);
    
    case 'phone':
      return validatePhilippinePhone(value);
    
    case 'url':
      return validateURL(value);
    
    case 'date':
      return !isEmpty(value) && !isNaN(Date.parse(value));
    
    case 'number':
      return !isNaN(Number(value));
    
    case 'integer':
      return Number.isInteger(Number(value));
    
    case 'boolean':
      return typeof value === 'boolean' || value === 'true' || value === 'false';
    
    case 'uuid':
      return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    
    case 'array':
      return Array.isArray(value);
    
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    
    default:
      return !isEmpty(value);
  }
};

// Default export with all validation functions
export default {
  // Sanitization
  sanitizeHTML,
  sanitizeString,
  sanitizeSqlIdentifier,
  sanitizeObject,
  
  // Validation
  validateEmail,
  validatePhilippinePhone,
  validateURL,
  validatePassword,
  validateMoney,
  validateJsonbData,
  validateField,
  
  // Security
  generateSecureToken,
  generateIdempotencyKey,
  normalizePhone,
  toCentavos,
  toPesos,
  
  // Helpers
  isEmpty,
  isWithinRange
};
