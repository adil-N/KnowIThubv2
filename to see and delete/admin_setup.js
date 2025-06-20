// utils/adminSetup.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const createInitialAdmins = async () => {
    try {
        // Only create users if environment variables are present (first run)
        if (!process.env.SUPER_ADMIN_EMAIL) {
            console.log('No initial admin setup required (already completed)');
            return;
        }

        console.log('🔧 Creating initial admin accounts...');

        // Create default invite code first if specified
        if (process.env.DEFAULT_INVITE_CODE) {
            const InviteCode = require('../models/InviteCode');
            
            const existingCode = await InviteCode.findOne({ 
                code: process.env.DEFAULT_INVITE_CODE 
            });
            
            if (!existingCode) {
                console.log('Creating default invitation code...');
                const inviteCode = new InviteCode({
                    code: process.env.DEFAULT_INVITE_CODE,
                    createdBy: 'system',
                    maxUses: 100, // Allow multiple uses for initial setup
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
                    description: 'Default invitation code created during setup'
                });
                
                await inviteCode.save();
                console.log('✅ Default invitation code created');
            }
        }

        // Check if super admin already exists
        const superAdminExists = await User.findOne({ role: 'super' });
        
        if (!superAdminExists && process.env.SUPER_ADMIN_EMAIL) {
            console.log('Creating super administrator...');
            
            const hashedPassword = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD, 12);
            
            const superAdmin = new User({
                email: process.env.SUPER_ADMIN_EMAIL,
                password: hashedPassword,
                firstName: 'Super',
                lastName: 'Admin',
                role: 'super',
                status: 'active',
                profileCompleted: true,
                passwordResetRequired: false
            });

            await superAdmin.save();
            console.log('✅ Super administrator created successfully');
        }

        // Check if regular admin already exists
        const adminExists = await User.findOne({ role: 'admin' });
        
        if (!adminExists && process.env.ADMIN_EMAIL) {
            console.log('Creating administrator...');
            
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
            
            const admin = new User({
                email: process.env.ADMIN_EMAIL,
                password: hashedPassword,
                firstName: 'System',
                lastName: 'Admin',
                role: 'admin',
                status: 'active',
                profileCompleted: true,
                passwordResetRequired: false
            });

            await admin.save();
            console.log('✅ Administrator created successfully');
        }

        // Check if test user already exists
        const testUserExists = await User.findOne({ email: process.env.TEST_USER_EMAIL });
        
        if (!testUserExists && process.env.TEST_USER_EMAIL) {
            console.log('Creating test user...');
            
            const hashedPassword = await bcrypt.hash(process.env.TEST_USER_PASSWORD, 12);
            
            const testUser = new User({
                email: process.env.TEST_USER_EMAIL,
                password: hashedPassword,
                firstName: 'Test',
                lastName: 'User',
                role: 'user',
                status: 'active',
                profileCompleted: true,
                passwordResetRequired: false,
                inviteCode: process.env.DEFAULT_INVITE_CODE // Use the default invite code
            });

            await testUser.save();
            console.log('✅ Test user created successfully');
        }

        // After successful creation, warn about removing credentials
        if (process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL || process.env.TEST_USER_EMAIL) {
            console.log('\n🔴 SECURITY WARNING:');
            console.log('Admin accounts have been created successfully.');
            console.log('Please remove the following variables from your .env file:');
            console.log('- SUPER_ADMIN_EMAIL');
            console.log('- SUPER_ADMIN_PASSWORD');
            console.log('- ADMIN_EMAIL');
            console.log('- ADMIN_PASSWORD');
            console.log('- TEST_USER_EMAIL');
            console.log('- TEST_USER_PASSWORD');
            console.log('Also delete the SETUP_CREDENTIALS.txt file for security.\n');
        }

    } catch (error) {
        console.error('❌ Error creating initial admins:', error);
        
        // More specific error handling
        if (error.code === 11000) {
            console.log('⚠️  Some admin accounts already exist, skipping duplicates');
        } else {
            throw error; // Re-throw other errors
        }
    }
};

module.exports = {
    createInitialAdmins
};