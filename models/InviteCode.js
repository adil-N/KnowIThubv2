// models/InviteCode.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// models/InviteCode.js
const inviteCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    maxUses: {
        type: Number,
        default: 0  // 0 means unlimited uses
    },
    usedBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        usedAt: {
            type: Date,
            default: Date.now
        }
    }],
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(+new Date() + 10*24*60*60*1000) // Changed to 10 days from creation
    },
    description: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Hash the code before saving
inviteCodeSchema.pre('save', async function(next) {
    if (this.isModified('code')) {
        try {
            this.code = await bcrypt.hash(this.code, 10);
        } catch (error) {
            next(error);
        }
    }
    next();
});

// Method to verify invite code
// models/InviteCode.js - update the verifyCode method
inviteCodeSchema.statics.verifyCode = async function(code) {
    try {
        console.log('Verifying invite code:', code);
        
        // Find active codes that haven't expired
        const activeCodes = await this.find({
            isActive: true,
            expiresAt: { $gt: new Date() }
        });

        console.log('Found active codes:', {
            count: activeCodes.length,
            codes: activeCodes.map(c => ({
                id: c._id,
                isActive: c.isActive,
                expiresAt: c.expiresAt,
                maxUses: c.maxUses,
                currentUses: c.usedBy.length
            }))
        });

        for (const inviteCode of activeCodes) {
            const isMatch = await bcrypt.compare(code, inviteCode.code);
            console.log('Code comparison result:', {
                attempted: code,
                isMatch,
                maxUses: inviteCode.maxUses,
                currentUses: inviteCode.usedBy.length,
                expiresAt: inviteCode.expiresAt
            });

            if (isMatch) {
                // For unlimited use codes (maxUses === 0), always return valid
                if (inviteCode.maxUses === 0) {
                    console.log('Valid unlimited use code found');
                    return inviteCode;
                }
                
                // For limited use codes, check if maximum uses reached
                if (inviteCode.maxUses > 0 && inviteCode.usedBy.length >= inviteCode.maxUses) {
                    console.log('Code has reached maximum uses');
                    return null;
                }
                console.log('Valid limited use code found');
                return inviteCode;
            }
        }
        console.log('No matching invite code found');
        return null;
    } catch (error) {
        console.error('Error verifying invite code:', error);
        throw error;
    }
};

// Method to mark code as used by a user
inviteCodeSchema.methods.markAsUsed = async function(userId) {
    try {
        // Check if user has already used this code
        if (!this.usedBy.some(usage => usage.user.toString() === userId.toString())) {
            this.usedBy.push({
                user: userId,
                usedAt: new Date()
            });

            // Only deactivate if it's not an unlimited use code and has reached max uses
            if (this.maxUses > 0 && this.usedBy.length >= this.maxUses) {
                this.isActive = false;
                console.log('Deactivating code due to maximum uses reached');
            }

            await this.save();
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error marking code as used:', error);
        throw error;
    }
};

// Method to check if code is still valid
inviteCodeSchema.methods.isValid = function() {
    const isExpired = this.expiresAt < new Date();
    const hasReachedMaxUses = this.maxUses > 0 && this.usedBy.length >= this.maxUses;
    
    return this.isActive && !isExpired && !hasReachedMaxUses;
};

// Virtual for number of times used
inviteCodeSchema.virtual('usageCount').get(function() {
    return this.usedBy.length;
});

// Virtual for remaining uses
inviteCodeSchema.virtual('remainingUses').get(function() {
    if (this.maxUses === 0) return 'Unlimited';
    return Math.max(0, this.maxUses - this.usedBy.length);
});

const InviteCode = mongoose.model('InviteCode', inviteCodeSchema);
module.exports = InviteCode;