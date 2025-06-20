// models/User.js - 

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 30
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 30
    },
  email: {
    type: String,
    required: true,
    unique: true,  // Keep unique: true
    lowercase: true,
    // REMOVE: index: true,  <- Remove this line if it exists
    validate: {
        validator: function(email) {
            // Only validate format for new users, allow existing users to login
            if (this.isNew) {
                // For new users: Enforce full email format with dot: *.*.@ddf.ae
                return /^[a-zA-Z0-9]+\.[a-zA-Z0-9]+@ddf\.ae$/.test(email);
            } else {
                // For existing users: Allow any @ddf.ae format during login
                return email.endsWith('@ddf.ae');
            }
        },
        message: 'Email must be in the format user.name@ddf.ae'
    }
},
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'super'],
        default: 'user'
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'inactive', 'suspended'],
        default: 'pending'  // NEW: Changed default from 'active' to 'pending'
    },
    inviteCode: {
        type: String,
        required: true
    },
    passwordResetRequired: {
        type: Boolean,
        default: false
    },
    passwordResetAt: {
        type: Date
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,
    lastLogin: Date,
    profileCompleted: {
        type: Boolean,
        default: false
    },
    // Keep any other existing fields that might be in your current model
    refreshToken: String,
    emailVerified: {
        type: Boolean,
        default: false
    },
    preferences: {
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'light'
        },
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            browser: {
                type: Boolean,
                default: true
            }
        }
    },
    metadata: {
        lastPasswordChange: Date,
        accountCreationIP: String,
        lastLoginIP: String,
        failedLoginAttempts: [{
            ip: String,
            timestamp: Date,
            userAgent: String
        }]
    },
    
    // ADD THIS BOOKMARKS FIELD:
    bookmarks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article',
        default: []
    }],

}, {
    timestamps: true
});


// Add index for email queries
// userSchema.index({ email: 1 });
userSchema.index({ status: 1 }); // NEW: Add index for status
userSchema.index({ role: 1 });
userSchema.index({ lastLogin: 1 });
userSchema.index({ createdAt: 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        
        // Track password change
        if (this.isModified('password') && !this.isNew) {
            this.metadata = this.metadata || {};
            this.metadata.lastPasswordChange = new Date();
        }
        
        next();
    } catch (error) {
        next(error);
    }
});

// Pre-save middleware for email changes
userSchema.pre('save', function(next) {
    if (this.isModified('email') && !this.isNew) {
        this.emailVerified = false; // Reset verification if email changes
    }
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        console.error('Password comparison error:', error);
        return false;
    }
};

// Generate auth token
userSchema.methods.generateAuthToken = function() {
    return jwt.sign(
        { 
            userId: this._id, 
            email: this.email, 
            role: this.role,
            status: this.status  // NEW: Include status in token
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        { userId: this._id },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Login attempts management
userSchema.methods.incrementLoginAttempts = async function() {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };
    
    // If we're at max attempts and not locked, lock the account
    if (this.loginAttempts + 1 >= 5 && !this.lockUntil) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
    }
    
    return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 }
    });
};

// Update last login
userSchema.methods.updateLastLogin = function(ip = null, userAgent = null) {
    const updates = {
        lastLogin: new Date(),
        'metadata.lastLoginIP': ip
    };
    
    return this.updateOne(updates);
};

// Check if password needs to be reset
userSchema.methods.needsPasswordReset = function() {
    return this.passwordResetRequired === true;
};

// Mark email as verified
userSchema.methods.verifyEmail = function() {
    this.emailVerified = true;
    return this.save();
};

// Update user preferences
userSchema.methods.updatePreferences = function(newPreferences) {
    this.preferences = { ...this.preferences, ...newPreferences };
    return this.save();
};

// Check if user can login (considering status)
userSchema.methods.canLogin = function() {
    return this.status === 'active' && !this.isLocked;
};

// Get user's role permissions
userSchema.methods.hasPermission = function(permission) {
    const rolePermissions = {
        super: ['all'],
        admin: ['manage_users', 'manage_content', 'view_stats', 'manage_system'],
        user: ['create_content', 'edit_own_content', 'comment']
    };
    
    const userPermissions = rolePermissions[this.role] || [];
    return userPermissions.includes('all') || userPermissions.includes(permission);
};

// Bookmark management methods
userSchema.methods.addBookmark = async function(articleId) {
    if (!this.bookmarks.includes(articleId)) {
        this.bookmarks.push(articleId);
        return await this.save();
    }
    return this;
};

userSchema.methods.removeBookmark = async function(articleId) {
    this.bookmarks = this.bookmarks.filter(id => !id.equals(articleId));
    return await this.save();
};

userSchema.methods.isBookmarked = function(articleId) {
    return this.bookmarks.some(id => id.equals(articleId));
};

userSchema.methods.getBookmarkCount = function() {
    return this.bookmarks.length;
};
// Static method to find users by role
userSchema.statics.findByRole = function(role) {
    return this.find({ role });
};

// Static method to find active users
userSchema.statics.findActive = function() {
    return this.find({ status: 'active' });
};

// Static method to find pending users
userSchema.statics.findPending = function() {
    return this.find({ status: 'pending' });
};

// Static method to get user stats
userSchema.statics.getStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                activeUsers: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                pendingUsers: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                adminUsers: {
                    $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
                },
                superAdminUsers: {
                    $sum: { $cond: [{ $eq: ['$role', 'super'] }, 1, 0] }
                }
            }
        }
    ]);
    
    return stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        pendingUsers: 0,
        adminUsers: 0,
        superAdminUsers: 0
    };
};

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { 
    virtuals: true,
    transform: function(doc, ret) {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
    }
});

userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);