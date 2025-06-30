import { body, validationResult } from 'express-validator';

// Format validation errors
const formatValidationErrors = (errors) => {
  return errors.array().map(err => ({
    field: err.path,
    message: err.msg,
    value: err.value
  }));
};

// Validation middleware for admin login
export const validateAdminLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .trim()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  handleValidation
];

// Validation middleware for admin registration
export const validateAdminRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .trim()
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
  handleValidation
];

// Validation middleware for password reset request
export const validatePasswordResetRequest = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  handleValidation
];

// Validation middleware for password reset completion
export const validatePasswordResetCompletion = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .trim()
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
  handleValidation
];

// Validation middleware for password change
export const validatePasswordChange = [
  body('currentPassword')
    .trim()
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .trim()
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
  handleValidation
];

// Handle validation results
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors),
      statusCode: 400
    });
  }
  next();
} 