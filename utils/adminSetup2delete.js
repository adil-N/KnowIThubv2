// utils/adminSetup.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const createInitialAdmins = async () => {
    try {
        const superAdminExists = await User.findOne({ role: 'super' });
        
        if (!superAdminExists) {
            console.log('Creating initial super admin...');
            
            const defaultSuperAdmin = {
                email: process.env.SUPER_ADMIN_EMAIL || 'super@ddf.ae',
                password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin2024!',
                firstName: 'Super',
                lastName: 'Admin'
            };

            const hashedPassword = await bcrypt.hash(defaultSuperAdmin.password, 10);
            
            const superAdmin = new User({
                email: defaultSuperAdmin.email,
                password: hashedPassword,
                firstName: defaultSuperAdmin.firstName,
                lastName: defaultSuperAdmin.lastName,
                role: 'super',
                status: 'active',
                profileCompleted: true
            });

            await superAdmin.save();
            console.log('Super admin created successfully');
        }

        // Create default admin if no other admins exist
        const adminExists = await User.findOne({ role: 'admin' });
        
        if (!adminExists) {
            console.log('Creating initial admin...');
            
            const defaultAdmin = {
                email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@ddf.ae',
                password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin2024!',
                firstName: 'System',
                lastName: 'Admin'
            };

            const hashedPassword = await bcrypt.hash(defaultAdmin.password, 10);
            
            const admin = new User({
                email: defaultAdmin.email,
                password: hashedPassword,
                firstName: defaultAdmin.firstName,
                lastName: defaultAdmin.lastName,
                role: 'admin',
                status: 'active',
                profileCompleted: true
            });

            await admin.save();
            console.log('Default admin created successfully');
        }
    } catch (error) {
        console.error('Error creating initial admins:', error);
    }
};

module.exports = {
    createInitialAdmins
};