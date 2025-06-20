// middleware/validate.js
const { validationResult } = require('express-validator');

const validate = (validations) => {
    return async (req, res, next) => {
        try {
            await Promise.all(validations.map(validation => validation.run(req)));

            const errors = validationResult(req);
            if (errors.isEmpty()) {
                return next();
            }

            // Format errors in a more user-friendly way
            const formattedErrors = errors.array().reduce((acc, error) => {
                if (!acc[error.path]) {
                    acc[error.path] = [];
                }
                acc[error.path].push(error.msg);
                return acc;
            }, {});

            res.status(400).json({ 
                error: 'Validation failed',
                details: formattedErrors
            });
        } catch (error) {
            res.status(500).json({ 
                error: 'Validation middleware error',
                message: error.message 
            });
        }
    };
};

// Common validation rules
const commonValidations = {
    email: {
        isEmail: true,
        custom: {
            options: (value) => {
                return value.endsWith('@ddf.ae');
            },
            errorMessage: 'Email must be a valid @ddf.ae address'
        }
    },
    password: {
        isLength: {
            options: { min: 8 },
            errorMessage: 'Password must be at least 8 characters'
        },
        matches: {
            options: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
            errorMessage: 'Password must contain at least one letter and one number'
        }
    },
    username: {
        isLength: {
            options: { min: 3, max: 30 },
            errorMessage: 'Username must be between 3 and 30 characters'
        },
        matches: {
            options: /^[a-zA-Z0-9_-]+$/,
            errorMessage: 'Username can only contain letters, numbers, underscores and hyphens'
        }
    }
};

module.exports = { validate, commonValidations };