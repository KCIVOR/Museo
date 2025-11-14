/**
 * 📝 Example of using validation utilities
 * This is a demonstration file showing how to use validation in your controllers and routes
 */

import express from 'express';
import { validateRequest, validateField, sanitize } from '../middleware/validation.js';
import validation from '../utils/validation.js';

const router = express.Router();

/**
 * Example 1: Simple route with validation middleware
 */
router.post('/user/register', validateRequest({
  body: {
    email: {
      type: 'email',
      required: true,
      message: 'Please provide a valid email address'
    },
    password: {
      type: 'string',
      required: true,
      min: 8,
      max: 100,
      validate: (value) => {
        const result = validation.validatePassword(value);
        return result.isValid ? true : result.message;
      }
    },
    firstName: {
      type: 'string',
      required: true,
      min: 2,
      max: 50
    },
    lastName: {
      type: 'string',
      required: true,
      min: 2,
      max: 50
    },
    age: {
      type: 'integer',
      required: true,
      min: 18,
      message: 'You must be at least 18 years old'
    }
  }
}), async (req, res) => {
  // If we reach here, validation passed
  const { email, password, firstName, lastName, age } = req.body;
  
  // Your controller logic here...
  
  res.json({
    success: true,
    message: 'User registered successfully'
  });
});

/**
 * Example 2: Using validateField for simpler routes
 */
router.post('/user/login', [
  validateField('email', { 
    type: 'email', 
    required: true,
    message: 'Please provide a valid email address'
  }),
  validateField('password', { 
    type: 'string', 
    required: true 
  })
], async (req, res) => {
  const { email, password } = req.body;
  
  // Your login logic here...
  
  res.json({
    success: true,
    message: 'Login successful',
    token: 'example-token'
  });
});

/**
 * Example 3: Using direct validation in the controller
 */
router.post('/marketplace/item', sanitize(['body']), async (req, res) => {
  const { title, price, quantity, description } = req.body;
  
  // Manual validation in the controller
  const errors = [];
  
  if (validation.isEmpty(title)) {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (title.length < 3 || title.length > 100) {
    errors.push({ field: 'title', message: 'Title must be between 3 and 100 characters' });
  }
  
  const priceValidation = validation.validateMoney(price, { 
    min: 0.01, 
    max: 1000000,
    field: 'Price'
  });
  
  if (!priceValidation.valid) {
    errors.push({ field: 'price', message: priceValidation.error });
  }
  
  if (!validation.isWithinRange(quantity, 1, 1000)) {
    errors.push({ field: 'quantity', message: 'Quantity must be between 1 and 1000' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }
  
  // If we reach here, validation passed
  // Store price in centavos to avoid floating point issues
  const priceCentavos = priceValidation.centavos;
  
  // Your item creation logic here...
  
  res.json({
    success: true,
    message: 'Item created successfully'
  });
});

/**
 * Example 4: Unified request table with JSONB validation
 */
router.post('/requests/artist-verification', [
  sanitize(['body']),
  validateRequest({
    body: {
      requestType: {
        type: 'string',
        required: true,
        validate: (value) => value === 'artist_verification' ? true : 'Invalid request type'
      },
      data: {
        type: 'object',
        required: true
      }
    }
  }),
  // Validate the JSONB data field
  (req, res, next) => {
    const { data } = req.body;
    
    const requiredFields = ['firstName', 'lastName', 'phone', 'address'];
    const validation = validation.validateJsonbData(data, requiredFields);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors.map(error => ({
          field: 'data',
          message: error
        }))
      });
    }
    
    // Validate phone number format
    if (!validation.validatePhilippinePhone(data.phone)) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: [{
          field: 'data.phone',
          message: 'Please provide a valid Philippine phone number (e.g., 09XXXXXXXXX or +639XXXXXXXXX)'
        }]
      });
    }
    
    next();
  }
], async (req, res) => {
  const { requestType, data } = req.body;
  
  // Your request creation logic here...
  
  res.json({
    success: true,
    message: 'Artist verification request submitted successfully'
  });
});

export default router;
