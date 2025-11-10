/**
 * Validation utilities for Museo backend
 * Provides consistent validation and error handling across all controllers
 */

/**
 * Validate authentication - checks if user is authenticated
 * @param {Object} req - Express request object
 * @returns {Object} - { valid: boolean, userId?: string, error?: string }
 */
export const validateAuth = (req) => {
  if (!req.user || !req.user.id) {
    return { valid: false, error: "User not authenticated" };
  }
  return { valid: true, userId: req.user.id };
};

/**
 * Validate required fields in request data
 * @param {Object} data - Data object to validate
 * @param {Array} fields - Array of required field names
 * @returns {Object} - { valid: boolean, error?: string }
 */
export const validateRequiredFields = (data, fields) => {
  if (!data) {
    return { valid: false, error: "No data provided" };
  }
  
  for (const field of fields) {
    if (!data[field]) {
      return { valid: false, error: `${field} is required` };
    }
    if (typeof data[field] === 'string' && !data[field].trim()) {
      return { valid: false, error: `${field} cannot be empty` };
    }
  }
  return { valid: true };
};

/**
 * Validate text length
 * @param {string} text - Text to validate
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @param {string} fieldName - Name of field for error messages
 * @returns {Object} - { valid: boolean, error?: string }
 */
export const validateTextLength = (text, min, max, fieldName) => {
  if (!text) {
    return { valid: false, error: `${fieldName} is required` };
  }
  if (typeof text !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  const trimmed = text.trim();
  if (trimmed.length < min) {
    return { valid: false, error: `${fieldName} must be at least ${min} characters` };
  }
  if (trimmed.length > max) {
    return { valid: false, error: `${fieldName} must not exceed ${max} characters` };
  }
  return { valid: true };
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {Object} - { valid: boolean, error?: string }
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return { valid: false, error: "Email is required" };
  }
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }
  return { valid: true };
};

/**
 * Validate positive number
 * @param {number} value - Value to validate
 * @param {string} fieldName - Name of field for error messages
 * @returns {Object} - { valid: boolean, error?: string }
 */
export const validatePositiveNumber = (value, fieldName) => {
  const num = Number(value);
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }
  if (num <= 0) {
    return { valid: false, error: `${fieldName} must be positive` };
  }
  return { valid: true };
};

/**
 * Validate pagination parameters
 * @param {string|number} page - Page number
 * @param {string|number} limit - Items per page
 * @returns {Object} - { valid: boolean, page?: number, limit?: number, error?: string }
 */
export const validatePagination = (page, limit) => {
  const pageNum = parseInt(page || '1', 10);
  const limitNum = parseInt(limit || '20', 10);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return { valid: false, error: "Invalid page number" };
  }
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return { valid: false, error: "Invalid limit (must be 1-100)" };
  }
  
  return { valid: true, page: pageNum, limit: limitNum };
};

/**
 * Sanitize input to prevent XSS attacks
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Basic HTML entity encoding
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
};

/**
 * Format validation response
 * @param {boolean} success - Whether validation succeeded
 * @param {string} message - Response message
 * @returns {Object} - Formatted response object
 */
export const formatValidationResponse = (success, message) => {
  return {
    success,
    message
  };
};

/**
 * Validate date format
 * @param {string} date - Date string to validate
 * @param {string} fieldName - Name of field for error messages
 * @returns {Object} - { valid: boolean, error?: string }
 */
export const validateDate = (date, fieldName) => {
  if (!date) {
    return { valid: false, error: `${fieldName} is required` };
  }
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return { valid: false, error: `${fieldName} must be a valid date` };
  }
  return { valid: true };
};

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @param {string} fieldName - Name of field for error messages
 * @returns {Object} - { valid: boolean, error?: string }
 */
export const validateUUID = (uuid, fieldName) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid) {
    return { valid: false, error: `${fieldName} is required` };
  }
  if (!uuidRegex.test(uuid)) {
    return { valid: false, error: `${fieldName} must be a valid UUID` };
  }
  return { valid: true };
};

/**
 * Validate array
 * @param {Array} arr - Array to validate
 * @param {string} fieldName - Name of field for error messages
 * @param {number} minLength - Minimum array length (optional)
 * @returns {Object} - { valid: boolean, error?: string }
 */
export const validateArray = (arr, fieldName, minLength = 0) => {
  if (!Array.isArray(arr)) {
    return { valid: false, error: `${fieldName} must be an array` };
  }
  if (arr.length < minLength) {
    return { valid: false, error: `${fieldName} must contain at least ${minLength} items` };
  }
  return { valid: true };
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {Object} - { valid: boolean, error?: string }
 */
export const validatePhone = (phone) => {
  // Basic phone validation - can be made more strict if needed
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  if (!phone) {
    return { valid: false, error: "Phone number is required" };
  }
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: "Invalid phone number format" };
  }
  return { valid: true };
};

/**
 * Validate price/amount
 * @param {number} amount - Amount to validate
 * @param {string} fieldName - Name of field for error messages
 * @param {number} min - Minimum amount (optional)
 * @returns {Object} - { valid: boolean, error?: string }
 */
export const validateAmount = (amount, fieldName, min = 0) => {
  const num = Number(amount);
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }
  if (num < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }
  return { valid: true };
};
