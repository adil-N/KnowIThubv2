// UPDATE your routes/sectionRoutes.js - Add the navigation endpoint:

const express = require('express');
const router = express.Router();
const sectionController = require('../controllers/sectionController');
const auth = require('../middleware/auth');
const { roleAuth, adminAuth, checkPermission } = require('../middleware/roleAuth');
const Section = require('../models/Section');

// Initialize General section
router.post('/init-general', 
    auth, 
    roleAuth(['admin', 'super']), 
    async (req, res) => {
        try {
            const generalSection = await Section.findOne({ slug: 'general' });
            
            if (generalSection) {
                return res.json({
                    success: true,
                    message: 'General section already exists',
                    data: generalSection
                });
            }

            const newGeneralSection = await Section.create({
                name: 'General',
                slug: 'general',
                description: 'Default section for uncategorized articles',
                order: 0,
                isDefault: true,
                createdBy: req.user._id
            });

            res.json({
                success: true,
                data: newGeneralSection
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// CRITICAL: Add this route BEFORE the general routes for navigation
router.get('/navigation', 
    auth, 
    checkPermission('read'), 
    sectionController.getActiveSectionsForNavigation
);

// Delete confirmation route (POST instead of DELETE for better body parsing)
router.post('/:id/delete-confirm', 
    auth, 
    checkPermission('content:manage'), 
    sectionController.deleteConfirmSection
);

// Regular routes
router.get('/', auth, checkPermission('read'), sectionController.getAllSections);
router.get('/tree', auth, checkPermission('read'), sectionController.getSectionTree);
router.get('/active', auth, checkPermission('read'), sectionController.getActiveSections);
router.get('/:id', auth, checkPermission('read'), sectionController.getSection);
router.get('/:id/articles', auth, checkPermission('read'), sectionController.getSectionArticles);

router.post('/', auth, checkPermission('content:manage'), sectionController.createSection);

router.put('/:id', auth, checkPermission('content:manage'), sectionController.updateSection);
router.put('/:id/reorder', auth, roleAuth(['admin', 'super']), sectionController.reorderSection);

router.delete('/:id', auth, checkPermission('content:manage'), sectionController.deleteSection);

module.exports = router;