// utils/settingsSeeder.js
const Settings = require('../models/Settings');

async function seedSettings() {
    try {
        const settingsExist = await Settings.findOne();
        if (!settingsExist) {
            const defaultSettings = new Settings({
                defaultUserStatus: 'active',
                emailDomain: '@ddf.ae',
                maxLoginAttempts: 5,
                lockDuration: 15,
                passwordRequirements: {
                    requireNumbers: true,
                    requireSpecialChars: true,
                    minLength: 8
                },
                systemMaintenanceMode: false
            });

            await defaultSettings.save();
            console.log('Default settings seeded successfully');
        }
    } catch (error) {
        console.error('Error seeding settings:', error);
    }
}

module.exports = { seedSettings };