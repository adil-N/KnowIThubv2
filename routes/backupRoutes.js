// routes/backupRoutes.js
const express = require('express');
const router = express.Router();
const BackupService = require('../services/backupService');
const auth = require('../middleware/auth');
const { adminAuth } = require('../middleware/roleAuth');

// Initialize backup service with custom configuration if needed
const backupService = new BackupService({
    backupDir: process.env.BACKUP_DIR || './backups',
    maxBackups: 10,
    backupPaths: [
        './data',
        './uploads',
        './config'
    ],
    excludePatterns: [
        '**/.git',
        '**/.env',
        '**/node_modules',
        '**/*.log'
    ]
});

// Middleware to check admin role
const checkAdminRole = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super')) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
    next();
};

// List backups route
router.get('/backups', [auth, checkAdminRole], async (req, res) => {
    try {
        const backups = await backupService.listBackups();

        res.json({
            success: true,
            data: backups,
            message: `Found ${backups.length} backups`
        });
    } catch (error) {
        console.error('Error in list backups route:', error);
        res.status(500).json({
            success: false,
            message: `Failed to list backups: ${error.message}`
        });
    }
});

// Create backup route
router.post('/backups', [auth, checkAdminRole], async (req, res) => {
    try {
        const backup = await backupService.createBackup();

        res.json({
            success: true,
            data: backup,
            message: 'Backup created successfully'
        });
    } catch (error) {
        console.error('Error in create backup route:', error);
        res.status(500).json({
            success: false,
            message: `Failed to create backup: ${error.message}`
        });
    }
});

// Restore backup route
router.post('/backups/:filename/restore', [auth, checkAdminRole], async (req, res) => {
    try {
        const { filename } = req.params;
        const result = await backupService.restoreBackup(filename);

        res.json({
            success: true,
            data: result,
            message: 'Backup restored successfully'
        });
    } catch (error) {
        console.error('Error in restore backup route:', error);
        res.status(500).json({
            success: false,
            message: `Failed to restore backup: ${error.message}`
        });
    }
});

// Delete backup route
router.delete('/backups/:filename', [auth, checkAdminRole], async (req, res) => {
    try {
        const { filename } = req.params;
        const result = await backupService.deleteBackup(filename);

        res.json({
            success: true,
            data: result,
            message: 'Backup deleted successfully'
        });
    } catch (error) {
        console.error('Error in delete backup route:', error);
        res.status(500).json({
            success: false,
            message: `Failed to delete backup: ${error.message}`
        });
    }
});

module.exports = router;