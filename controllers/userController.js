// controllers/userController.js - Updated registration and login logic

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const ApiResponse = require('../utils/apiResponse');
const { validators } = require('../utils/validators');
const InviteCode = require('../models/InviteCode');

const userController = {
    // Updated register method with pending status
    register: async (req, res) => {
        try {
            const { firstName, lastName, email, password, inviteCode } = req.body;
            console.log('Registration request received:', {
                firstName,
                lastName,
                email,
                passwordLength: password?.length,
                hasInviteCode: !!inviteCode
            });

            // Validate all required fields
            if (!firstName || !lastName || !email || !password) {
                return ApiResponse.error(res, 'All fields are required', 400);
            }

            // Regular users need invite code
            if (!inviteCode) {
                return ApiResponse.error(res, 'Invite code is required', 400);
            }

            // Enhanced email validation for full format only
            if (!email.endsWith('@ddf.ae')) {
                return ApiResponse.error(res, 'Email must be from the ddf.ae domain', 400);
            }

            // Check for full email format (must contain a dot)
            if (!/^[a-zA-Z0-9]+\.[a-zA-Z0-9]+@ddf\.ae$/.test(email.toLowerCase())) {
                return ApiResponse.error(res, 'Email must be in the full format (e.g., user.name@ddf.ae)', 400);
            }

            // Check existing user first, before validating invite code
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return ApiResponse.error(res, 'An account with this email already exists', 400);
            }

            // Validate invite code
            const validInviteCode = await InviteCode.verifyCode(inviteCode);
            if (!validInviteCode) {
                return ApiResponse.error(res, 'Invalid or expired invite code', 400);
            }

            // Create new user with pending status
            const user = new User({
                firstName,
                lastName,
                email: email.toLowerCase(),
                password,
                inviteCode: inviteCode,
                status: 'pending',  // Set to pending by default
                loginAttempts: 0
            });

            await user.save();
            
            // Mark invite code as used
            await validInviteCode.markAsUsed(user._id);

            console.log('User registered successfully (pending approval):', {
                id: user._id,
                email: user.email,
                status: user.status
            });

            return ApiResponse.success(res, 'Registration successful! Your account is pending admin approval.', null, 201);
        } catch (error) {
            console.error('Error creating user:', error);
            
            // Handle duplicate key error specifically
            if (error.code === 11000) {
                return ApiResponse.error(res, 'An account with this email already exists', 400);
            }
            
            // Handle validation errors
            if (error.name === 'ValidationError') {
                const firstError = Object.values(error.errors)[0];
                return ApiResponse.error(res, firstError.message, 400);
            }
            
            return ApiResponse.serverError(res, 'Error creating user');
        }
    },

    // Updated login method to check status
    login: async (req, res) => {
        try {
            console.log('=== Login Request Started ===', {
                body: req.body,
                hasEmail: !!req.body.email,
                hasPassword: !!req.body.password,
                timestamp: new Date().toISOString()
            });

            const { email, password } = req.body;

            if (!email || !password) {
                console.log('Missing credentials in request');
                return ApiResponse.error(res, 'Email and password are required', 400);
            }

            const user = await User.findOne({ email: email.toLowerCase() });
            
            console.log('User lookup result:', {
                found: !!user,
                email: email.toLowerCase(),
                hasPasswordHash: user ? !!user.password : false,
                status: user ? user.status : null
            });

            if (!user) {
                console.log('User not found:', email.toLowerCase());
                return ApiResponse.error(res, 'Invalid credentials', 401);
            }

            // Check user status before allowing login
            if (user.status === 'pending') {
                console.log('User account pending approval:', user._id);
                return ApiResponse.error(res, 'Your account is pending admin approval. Please contact your administrator.', 401);
            }

            if (user.status === 'suspended' || user.status === 'inactive') {
                console.log('User account suspended/inactive:', user._id);
                return ApiResponse.error(res, 'Your account has been suspended. Please contact your administrator.', 401);
            }

            // Check if account is locked
            if (user.lockUntil && user.lockUntil > Date.now()) {
                console.log('Account is locked:', {
                    userId: user._id,
                    lockUntil: user.lockUntil
                });
                return ApiResponse.error(res, 'Account is temporarily locked. Please try again later.', 401);
            }

            // Log password comparison attempt
            console.log('Attempting password verification:', {
                userId: user._id,
                hasPassword: !!password,
                hasStoredHash: !!user.password
            });

            const isMatch = await user.comparePassword(password);
            console.log('Password verification result:', { 
                isMatch,
                userId: user._id
            });

            if (!isMatch) {
                console.log('Password verification failed for user:', user._id);
                await user.incrementLoginAttempts();
                return ApiResponse.error(res, 'Invalid credentials', 401);
            }

            // Generate token and prepare response
            const token = user.generateAuthToken();
            
            const responseData = {
                token,
                user: {
                    _id: user._id,
                    email: user.email,
                    role: user.role,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    status: user.status,
                    passwordResetRequired: Boolean(user.passwordResetRequired)
                }
            };

            // Reset login attempts and update last login
            await user.resetLoginAttempts();
            user.lastLogin = new Date();
            await user.save();

            console.log('Login successful:', {
                userId: user._id,
                email: user.email,
                status: user.status,
                hasToken: !!token
            });

            return ApiResponse.success(res, 'Login successful', responseData);

        } catch (error) {
            console.error('Login error details:', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            return ApiResponse.serverError(res, 'Login failed');
        }
    },

    // Change password (existing method - unchanged)
    changePassword: async (req, res) => {
        try {
            console.log('Password change request received:', {
                userId: req.user?._id,
                hasCurrentPassword: !!req.body.currentPassword,
                hasNewPassword: !!req.body.newPassword
            });

            const { currentPassword, newPassword } = req.body;
            const user = await User.findById(req.user._id);

            if (!user) {
                console.log('User not found for password change');
                return ApiResponse.notFound(res, 'User not found');
            }

            // Verify current password
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                console.log('Current password verification failed');
                return ApiResponse.error(res, 'Current password is incorrect', 401);
            }

            // Validate new password using the imported validator
            const passwordValidation = validators.password(newPassword);
            if (!passwordValidation.isValid) {
                return ApiResponse.error(res, passwordValidation.message, 400);
            }

            // Hash and save new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            user.passwordResetRequired = false;
            await user.save();

            // Generate new token
            const token = user.generateAuthToken();

            console.log('Password changed successfully for user:', user.email);

            return ApiResponse.success(res, 'Password changed successfully', {
                token,
                user: {
                    _id: user._id,
                    email: user.email,
                    role: user.role,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    status: user.status,
                    passwordResetRequired: false
                }
            });
        } catch (error) {
            console.error('Error changing password:', error);
            return ApiResponse.serverError(res, 'Error changing password');
        }
    },

    // Force change password (existing method - unchanged)
    forceChangePassword: async (req, res) => {
        try {
            const { currentPassword, newPassword, email } = req.body;
            console.log('Force change password request received:', {
                email,
                hasCurrentPassword: !!currentPassword,
                hasNewPassword: !!newPassword
            });

            if (!email || !currentPassword || !newPassword) {
                return ApiResponse.error(res, 'All fields are required', 400);
            }

            // Find user by email
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                return ApiResponse.error(res, 'User not found', 404);
            }

            // Verify current (temporary) password
            const isMatch = await user.comparePassword(currentPassword);
            if (!isMatch) {
                return ApiResponse.error(res, 'Current password is incorrect', 401);
            }

            // Validate new password
            const passwordValidation = validators.password(newPassword);
            if (!passwordValidation.isValid) {
                return ApiResponse.error(res, passwordValidation.message, 400);
            }

            // Update user document - let the pre-save middleware handle hashing
            user.password = newPassword; // The pre-save middleware will hash this
            user.passwordResetRequired = false;
            user.loginAttempts = 0;
            user.lockUntil = undefined;

            await user.save();

            console.log('Password successfully changed:', {
                userId: user._id,
                passwordResetRequired: false
            });

            // Generate new token
            const token = user.generateAuthToken();

            return ApiResponse.success(res, 'Password changed successfully', {
                token,
                user: {
                    _id: user._id,
                    email: user.email,
                    role: user.role,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    status: user.status,
                    passwordResetRequired: false
                }
            });
        } catch (error) {
            console.error('Force change password error:', error);
            return ApiResponse.serverError(res, 'Error changing password');
        }
    },

    // Get user status (existing method - unchanged)
    getUserStatus: async (req, res) => {
        try {
            const user = await User.findOne({ email: req.params.email })
                .select('email status role firstName lastName')
                .lean();
            
            if (!user) {
                return ApiResponse.notFound(res, 'User not found');
            }
            
            return ApiResponse.success(res, 'User status retrieved', {
                email: user.email,
                status: user.status,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName
            });
        } catch (error) {
            console.error('Error checking user status:', error);
            return ApiResponse.serverError(res, 'Error checking user status');
        }
    },

    // Get user profile (existing method - unchanged)
    getProfile: async (req, res) => {
        try {
            const user = await User.findById(req.user._id)
                .select('-password -loginAttempts -lockUntil')
                .lean();
    
            if (!user) {
                return ApiResponse.notFound(res, 'User not found');
            }
    
            // Get user statistics
            const [articlesCount, commentsCount] = await Promise.all([
                Article.countDocuments({ author: user._id }),
                Comment.countDocuments({ author: user._id })
            ]);
    
            // Combine user data with statistics
            const userData = {
                ...user,
                stats: {
                    totalArticles: articlesCount,
                    totalComments: commentsCount
                }
            };
    
            return ApiResponse.success(res, 'Profile retrieved successfully', userData);
        } catch (error) {
            console.error('Error fetching profile:', error);
            return ApiResponse.serverError(res, 'Error fetching user profile');
        }
    },

    // Update user profile (existing method - with updated validation)
    updateProfile: async (req, res) => {
        try {
            const { firstName, lastName, email } = req.body;

            // Validate email domain and format if email is being updated
            if (email) {
                if (!email.endsWith('@ddf.ae')) {
                    return ApiResponse.error(res, 'Email must be from the ddf.ae domain', 400);
                }
                
                // Check for full email format
                if (!/^[a-zA-Z0-9]+\.[a-zA-Z0-9]+@ddf\.ae$/.test(email.toLowerCase())) {
                    return ApiResponse.error(res, 'Email must be in the full format (e.g., user.name@ddf.ae)', 400);
                }
            }

            const user = await User.findById(req.user._id);
            if (!user) {
                return ApiResponse.notFound(res, 'User not found');
            }

            // Update fields if provided
            if (firstName) user.firstName = firstName;
            if (lastName) user.lastName = lastName;
            if (email) user.email = email;

            user.profileCompleted = true;
            await user.save();

            return ApiResponse.success(res, 'Profile updated successfully', {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                status: user.status,
                profileCompleted: user.profileCompleted
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            return ApiResponse.serverError(res, 'Error updating user profile');
        }
    }
};

module.exports = userController;