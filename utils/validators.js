// backend validators 
// utils/validators.js (backend)

const validators = {
    email(email) {
        const emailRegex = /^[a-zA-Z0-9._-]+@ddf\.ae$/;
        return {
            isValid: emailRegex.test(email),
            message: 'Email must be a valid @ddf.ae address'
        };
    },

    password(password) {
        const hasMinLength = password.length >= 8;
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        if (!hasMinLength) {
            return {
                isValid: false,
                message: 'Password must be at least 8 characters long'
            };
        }

        if (!hasLetter || !hasNumber) {
            return {
                isValid: false,
                message: 'Password must contain both letters and numbers'
            };
        }

        if (!hasUppercase) {
            return {
                isValid: false,
                message: 'Password must contain at least one uppercase letter'
            };
        }

        if (!hasSpecialChar) {
            return {
                isValid: false,
                message: 'Password must contain at least one special character'
            };
        }

        return { isValid: true, message: '' };
    },

    // Backend-specific validators
    inviteCode(code) {
        return {
            isValid: code === process.env.INVITE_CODE,
            message: 'Invalid invite code'
        };
    },

    // Reuse frontend validators for consistency
    title(title) {
        return {
            isValid: title.length >= 3 && title.length <= 200,
            message: 'Title must be between 3 and 200 characters'
        };
    },

    content(content) {
        return {
            isValid: content.length >= 10,
            message: 'Content must be at least 10 characters long'
        };
    },

    files(files) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 
                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        
        for (let file of files) {
            if (file.size > maxSize) {
                return {
                    isValid: false,
                    message: `File ${file.name} is too large. Maximum size is 5MB`
                };
            }
            if (!allowedTypes.includes(file.type)) {
                return {
                    isValid: false,
                    message: `File ${file.name} has an invalid type. Allowed types are: JPG, PNG, PDF, DOC, DOCX`
                };
            }
        }
        
        return {
            isValid: true,
            message: ''
        };
    }
};

module.exports = { validators };