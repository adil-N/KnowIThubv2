// utils/inviteCodeManager.js
const InviteCode = require('../models/InviteCode');
const crypto = require('crypto');

const inviteCodeManager = {
    generateNewCode: async (userId, expiresInDays = 30) => {
        try {
            // Generate a random code
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            
            // Calculate expiration date
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);

            // Create new invite code
            const inviteCode = new InviteCode({
                code,
                createdBy: userId,
                expiresAt,
                isActive: true
            });

            await inviteCode.save();
            return code; // Return the unhashed code
        } catch (error) {
            console.error('Error generating invite code:', error);
            throw error;
        }
    },

    listAllCodes: async () => {
        try {
            return await InviteCode.find()
                .populate('createdBy', 'email firstName lastName')
                .populate('usedBy', 'email firstName lastName')
                .sort('-createdAt')
                .lean();
        } catch (error) {
            console.error('Error listing invite codes:', error);
            throw error;
        }
    },

    deactivateCode: async (codeId) => {
        try {
            const inviteCode = await InviteCode.findByIdAndUpdate(
                codeId,
                { isActive: false },
                { new: true }
            );
            return inviteCode;
        } catch (error) {
            console.error('Error deactivating invite code:', error);
            throw error;
        }
    },

    activateCode: async (codeId) => {
        try {
            const inviteCode = await InviteCode.findByIdAndUpdate(
                codeId,
                { isActive: true },
                { new: true }
            );
            return inviteCode;
        } catch (error) {
            console.error('Error activating invite code:', error);
            throw error;
        }
    },

    updateExpiration: async (codeId, newExpiryDate) => {
        try {
            const inviteCode = await InviteCode.findByIdAndUpdate(
                codeId,
                { expiresAt: newExpiryDate },
                { new: true }
            );
            return inviteCode;
        } catch (error) {
            console.error('Error updating invite code expiration:', error);
            throw error;
        }
    }
};

module.exports = inviteCodeManager;