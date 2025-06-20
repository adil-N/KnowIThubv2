// utils/adminSetup.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');

let adminUsersInitialized = false;

async function createInitialAdmins() {
    if (adminUsersInitialized) {
        console.log('Admin users already initialized, skipping...');
        return;
    }

    try {
        // Check for existing admin users first
        const existingAdmins = await User.find({ role: { $in: ['admin', 'super'] } });
        
        if (existingAdmins.length > 0) {
            console.log('Admin users already exist, skipping creation...');
            adminUsersInitialized = true;
            return;
        }

        const adminUsers = [
            {
                firstName: 'Super',
                lastName: 'Admin',
                email: 'super.admin@ddf.ae',
                password: 'SuperAdmin2024!',
                role: 'super',
                inviteCode: 'SPECIALINVITE2024',
                status: 'active'
            },
            {
                firstName: 'Admin',
                lastName: 'One',
                email: 'admin1@ddf.ae',
                password: 'Admin12024!',
                role: 'admin',
                inviteCode: 'SPECIALINVITE2024',
                status: 'active'
            }
        ];

        for (const adminUser of adminUsers) {
            const existingUser = await User.findOne({ email: adminUser.email });
            if (!existingUser) {
                const hashedPassword = await bcrypt.hash(adminUser.password, 10);
                const newAdmin = new User({
                    ...adminUser,
                    password: hashedPassword
                });
                await newAdmin.save();
                console.log(`Created ${adminUser.role} user: ${adminUser.email}`);
            }
        }
        
        adminUsersInitialized = true;
        console.log('Initial admin users setup completed successfully');
    } catch (error) {
        console.error('Error creating initial admin users:', error);
    }
}

module.exports = { createInitialAdmins };