// utils/directorySetup.js
const fs = require('fs');
const path = require('path');

const setupDirectories = () => {
    const directories = [
        'uploads',
        'controllers',
        'middleware',
        'models',
        'routes',
        'utils',
        'frontend/src'
    ];

    directories.forEach(dir => {
        const dirPath = path.join(__dirname, '..', dir);
        if (!fs.existsSync(dirPath)) {
            console.log(`Creating directory: ${dir}`);
            fs.mkdirSync(dirPath, { recursive: true });
        }
    });
};

module.exports = { setupDirectories };