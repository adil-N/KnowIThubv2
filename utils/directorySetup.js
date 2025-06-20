// utils/directorySetup.js
const fs = require('fs');
const path = require('path');

const setupDirectories = () => {
    const directories = [
        'uploads',
        'uploads/images',
        'uploads/files',
        'logs',
        'data/db',
        'backups'  // Add the backups directory
    ];

    directories.forEach(dir => {
        const fullPath = path.join(__dirname, '..', dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`Created directory: ${fullPath}`);
        }
    });
};

module.exports = {
    setupDirectories
};