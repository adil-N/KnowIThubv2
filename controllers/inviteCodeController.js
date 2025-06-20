// controllers/inviteCodeController.js
const ApiResponse = require('../frontend/src/js/utils/apiResponse');
const InviteCode = require('../models/InviteCode');
const crypto = require('crypto');

const inviteCodeController = {
    // Generate a new invite code
// controllers/inviteCodeController.js
generateInviteCode: async (req, res) => {
    try {
        console.log('Generating invite code, user:', req.user?._id);
        const { 
            expiresInDays = 10, 
            maxUses = 0,
            description = '' 
        } = req.body;

        // First, deactivate all existing active codes
        const deactivationResult = await InviteCode.updateMany(
            { isActive: true },
            { isActive: false }
        );

        console.log('Deactivation result:', deactivationResult);

        // Generate a random code with DDFIT prefix
        const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
        const code = `DDFIT-${randomPart}`;
        
        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));

        // Create new invite code
        const inviteCode = new InviteCode({
            code: code,  // This will be hashed by the pre-save middleware
            createdBy: req.user._id,
            expiresAt,
            isActive: true,
            maxUses: 0, // Force unlimited uses
            description
        });

        await inviteCode.save();
        
        console.log('New invite code generated:', {
            code: code,
            maxUses: 0,
            expiresAt: expiresAt,
            isActive: inviteCode.isActive
        });

        // Verify the code works immediately after creation
        const verificationTest = await InviteCode.verifyCode(code);
        console.log('Immediate verification test:', {
            success: !!verificationTest,
            codeDetails: verificationTest ? {
                isActive: verificationTest.isActive,
                expiresAt: verificationTest.expiresAt,
                maxUses: verificationTest.maxUses
            } : null
        });

        return ApiResponse.success(res, 'New invite code generated successfully', { 
            code,
            maxUses: 'Unlimited',
            expiresAt,
            message: 'Please save this code. For security reasons, it will not be shown again.'
        });
    } catch (error) {
        console.error('Error generating invite code:', error);
        return ApiResponse.serverError(res, error);
    }
},

    // List all invite codes
    listInviteCodes: async (req, res) => {
        try {
            console.log('Listing invite codes');
            const codes = await InviteCode.find()
                .populate('createdBy', 'email firstName lastName')
                .populate('usedBy', 'email firstName lastName')
                .sort('-createdAt')
                .lean();

            return ApiResponse.success(res, 'Invite codes retrieved successfully', { codes });
        } catch (error) {
            console.error('Error listing invite codes:', error);
            return ApiResponse.serverError(res, error);
        }
    },

    // Deactivate an invite code
    deactivateInviteCode: async (req, res) => {
        try {
            console.log('Deactivating invite code:', req.params.codeId);
            const { codeId } = req.params;
            
            const inviteCode = await InviteCode.findByIdAndUpdate(
                codeId,
                { isActive: false },
                { new: true }
            );

            if (!inviteCode) {
                return ApiResponse.notFound(res, 'Invite code not found');
            }

            return ApiResponse.success(res, 'Invite code deactivated successfully');
        } catch (error) {
            console.error('Error deactivating invite code:', error);
            return ApiResponse.serverError(res, error);
        }
    },

    // Activate an invite code
    activateInviteCode: async (req, res) => {
        try {
            console.log('Activating invite code:', req.params.codeId);
            const { codeId } = req.params;
            
            const inviteCode = await InviteCode.findByIdAndUpdate(
                codeId,
                { isActive: true },
                { new: true }
            );

            if (!inviteCode) {
                return ApiResponse.notFound(res, 'Invite code not found');
            }

            return ApiResponse.success(res, 'Invite code activated successfully');
        } catch (error) {
            console.error('Error activating invite code:', error);
            return ApiResponse.serverError(res, error);
        }
    },

    // Update invite code expiration
    updateInviteCodeExpiration: async (req, res) => {
        try {
            console.log('Updating invite code expiration:', {
                codeId: req.params.codeId,
                newDate: req.body.newExpiryDate
            });
            
            const { codeId } = req.params;
            const { newExpiryDate } = req.body;
            
            if (!newExpiryDate) {
                return ApiResponse.error(res, 'New expiration date is required', 400);
            }

            const inviteCode = await InviteCode.findByIdAndUpdate(
                codeId,
                { expiresAt: new Date(newExpiryDate) },
                { new: true }
            );

            if (!inviteCode) {
                return ApiResponse.notFound(res, 'Invite code not found');
            }

            return ApiResponse.success(res, 'Invite code expiration updated successfully');
        } catch (error) {
            console.error('Error updating invite code expiration:', error);
            return ApiResponse.serverError(res, error);
        }
    }
};

// Add debug logging for available methods
console.log('InviteCode Controller loaded with methods:', Object.keys(inviteCodeController));

module.exports = inviteCodeController;