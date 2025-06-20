// frontend/src/js/utils/validators.js - Updated email validation

export const validators = {
    email(email) {
        // Enforce full email format: user.name@ddf.ae (must contain a dot)
        const emailRegex = /^[a-zA-Z0-9]+\.[a-zA-Z0-9]+@ddf\.ae$/;
        return {
            isValid: emailRegex.test(email),
            message: 'Email must be in the full format (e.g., user.name@ddf.ae)'
        };
    },

    password(password) {
        const hasMinLength = password.length >= 8;
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        
        const isValid = hasMinLength && hasLetter && hasNumber;
        
        return {
            isValid,
            message: isValid ? '' : 'Password must be at least 8 characters long and contain both letters and numbers'
        };
    },

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