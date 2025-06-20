// controllers/sectionController.js - COMPLETE FIXED VERSION
const Section = require('../models/Section');
const Article = require('../models/Article');

exports.createSection = async (req, res) => {
    try {
        const { name, description, parentSection, icon, order } = req.body;
        
        const section = new Section({
            name,
            description,
            parentSection: parentSection || null,
            icon: icon || 'folder',
            order: order || 0,
            createdBy: req.user._id
        });

        await section.save();
        res.status(201).json({
            success: true,
            data: section
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// CRITICAL FIX 2: Backend - Update Section Controller to properly filter sections

// UPDATE your sectionController.js - Replace the getAllSections method:

exports.getAllSections = async (req, res) => {
    try {
        console.log('📊 getAllSections called by:', {
            userRole: req.user?.role,
            requestPath: req.path,
            query: req.query
        });

        // CRITICAL: Check if this is an admin request or regular navigation
        const isAdminRequest = req.path.includes('/admin') || 
                              req.query.admin === 'true' || 
                              req.headers['x-admin-request'] === 'true';

        let query;
        
        if (isAdminRequest && ['admin', 'super'].includes(req.user?.role)) {
            // Admin panel: Show ALL sections (active and inactive)
            query = {};
            console.log('🔧 Admin request: showing all sections');
        } else {
            // Regular navigation: Show ONLY active sections
            query = { isActive: true };
            console.log('👤 Regular request: showing only active sections');
        }
            
        const sections = await Section.find(query)
            .populate('parentSection', 'name slug')
            .sort('order name');
            
        console.log(`📊 Returning ${sections.length} sections:`, 
            sections.map(s => ({ name: s.name, isActive: s.isActive }))
        );
            
        res.json({
            success: true,
            data: sections
        });
    } catch (error) {
        console.error('Error fetching sections:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ADD this new method to sectionController.js for navigation specifically:

exports.getActiveSectionsForNavigation = async (req, res) => {
    try {
        console.log('🧭 Getting active sections for navigation');
        
        const sections = await Section.find({ isActive: true })
            .populate('parentSection', 'name slug')
            .sort('order name');
            
        console.log(`🧭 Navigation sections found: ${sections.length}`, 
            sections.map(s => s.name)
        );
            
        res.json({
            success: true,
            data: sections
        });
    } catch (error) {
        console.error('Error fetching navigation sections:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching navigation sections',
            error: error.message
        });
    }
};

exports.getSectionTree = async (req, res) => {
    try {
        const tree = await Section.getTree();
        res.json({
            success: true,
            data: tree
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ENHANCED updateSection with detailed logging
exports.updateSection = async (req, res) => {
    try {
        const { name, description, parentSection, icon, order, isActive } = req.body;
        
        console.log('🔄 Section update request:', {
            sectionId: req.params.id,
            updateData: { name, description, parentSection, icon, order, isActive },
            userId: req.user._id,
            userEmail: req.user.email
        });
        
        const section = await Section.findById(req.params.id);

        if (!section) {
            console.log('❌ Section not found:', req.params.id);
            return res.status(404).json({
                success: false,
                message: 'Section not found'
            });
        }

        // Update fields
        if (name) section.name = name;
        if (description !== undefined) section.description = description;
        if (parentSection !== undefined) section.parentSection = parentSection || null;
        if (icon) section.icon = icon;
        if (order !== undefined) section.order = order;
        if (isActive !== undefined) {
            console.log(`🎯 Updating section status: ${section.isActive} → ${isActive}`);
            section.isActive = isActive;
        }

        await section.save();
        
        console.log('✅ Section updated successfully:', {
            sectionId: section._id,
            name: section.name,
            isActive: section.isActive
        });
        
        res.json({
            success: true,
            data: section
        });
    } catch (error) {
        console.error('❌ Error updating section:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// ENHANCED deleteSection with proper cleanup and email confirmation
exports.deleteSection = async (req, res) => {
    try {
        const { confirmEmail } = req.body;
        
        console.log('🗑️ Section deletion request:', {
            sectionId: req.params.id,
            confirmEmail: confirmEmail ? '[PROVIDED]' : '[MISSING]',
            userId: req.user._id,
            userEmail: req.user.email
        });
        
        // Email confirmation check
        if (!confirmEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email confirmation is required for this dangerous operation'
            });
        }

        if (confirmEmail.toLowerCase().trim() !== req.user.email.toLowerCase().trim()) {
            console.log('❌ Email confirmation failed:', {
                provided: confirmEmail,
                expected: req.user.email
            });
            
            return res.status(400).json({
                success: false,
                message: 'Email confirmation does not match your account email'
            });
        }

        const section = await Section.findById(req.params.id);
        
        if (!section) {
            return res.status(404).json({
                success: false,
                message: 'Section not found'
            });
        }

        // Check if section can be deleted
        const canDelete = await section.canDelete();
        if (!canDelete) {
            const articleCount = await Article.countDocuments({
                sections: section._id
            });
            const childCount = await Section.countDocuments({
                parentSection: section._id
            });
            
            console.log('❌ Cannot delete section - has dependencies:', {
                sectionId: section._id,
                articleCount,
                childCount
            });
            
            return res.status(400).json({
                success: false,
                message: `Cannot delete section "${section.name}". It contains ${articleCount} article(s) and ${childCount} child section(s). Please move or delete them first.`
            });
        }

        console.log('🗑️ Proceeding with section deletion:', {
            sectionId: section._id,
            sectionName: section.name,
            slug: section.slug
        });

        // CRITICAL: Clean up article references before deleting
        const articlesUpdated = await Article.updateMany(
            { sections: section._id },
            { $pull: { sections: section._id } }
        );

        console.log('🧹 Cleaned up article references:', {
            modifiedCount: articlesUpdated.modifiedCount
        });

        // Delete the section (this will automatically clean up the slug)
        await Section.findByIdAndDelete(section._id);
        
        console.log('✅ Section successfully deleted:', {
            sectionId: section._id,
            sectionName: section.name,
            deletedBy: req.user.email,
            timestamp: new Date().toISOString()
        });
        
        res.json({
            success: true,
            message: `Section "${section.name}" deleted successfully`
        });
    } catch (error) {
        console.error('❌ Error deleting section:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting section: ' + error.message
        });
    }
};
// FIXED: Delete section with email confirmation using POST
exports.deleteConfirmSection = async (req, res) => {
    try {
        const { confirmEmail } = req.body;
        
        console.log('🗑️ Section deletion confirmation request:', {
            sectionId: req.params.id,
            confirmEmail: confirmEmail ? '[PROVIDED]' : '[MISSING]',
            userId: req.user._id,
            userEmail: req.user.email,
            bodyReceived: req.body
        });
        
        // Email confirmation check
        if (!confirmEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email confirmation is required for this dangerous operation'
            });
        }

        if (confirmEmail.toLowerCase().trim() !== req.user.email.toLowerCase().trim()) {
            console.log('❌ Email confirmation failed:', {
                provided: confirmEmail,
                expected: req.user.email
            });
            
            return res.status(400).json({
                success: false,
                message: 'Email confirmation does not match your account email'
            });
        }

        const section = await Section.findById(req.params.id);
        
        if (!section) {
            return res.status(404).json({
                success: false,
                message: 'Section not found'
            });
        }

        // Check if section can be deleted
        const canDelete = await section.canDelete();
        if (!canDelete) {
            const articleCount = await Article.countDocuments({
                sections: section._id
            });
            const childCount = await Section.countDocuments({
                parentSection: section._id
            });
            
            console.log('❌ Cannot delete section - has dependencies:', {
                sectionId: section._id,
                articleCount,
                childCount
            });
            
            return res.status(400).json({
                success: false,
                message: `Cannot delete section "${section.name}". It contains ${articleCount} article(s) and ${childCount} child section(s). Please move or delete them first.`
            });
        }

        console.log('🗑️ Proceeding with section deletion:', {
            sectionId: section._id,
            sectionName: section.name,
            slug: section.slug
        });

        // CRITICAL: Clean up article references before deleting
        const articlesUpdated = await Article.updateMany(
            { sections: section._id },
            { $pull: { sections: section._id } }
        );

        console.log('🧹 Cleaned up article references:', {
            modifiedCount: articlesUpdated.modifiedCount
        });

        // Delete the section (this will automatically clean up the slug)
        await Section.findByIdAndDelete(section._id);
        
        console.log('✅ Section successfully deleted:', {
            sectionId: section._id,
            sectionName: section.name,
            deletedBy: req.user.email,
            timestamp: new Date().toISOString()
        });
        
        res.json({
            success: true,
            message: `Section "${section.name}" deleted successfully`
        });
    } catch (error) {
        console.error('❌ Error deleting section:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting section: ' + error.message
        });
    }
};

exports.getSectionArticles = async (req, res) => {
    try {
        const { page = 1, limit = 15 } = req.query;
        const articles = await Article.findBySection(req.params.id, page, limit);
        
        res.json({
            success: true,
            data: articles
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Add this to sectionController.js
exports.reorderSection = async (req, res) => {
    try {
        const { id } = req.params;
        const { direction } = req.body;

        const section = await Section.findById(id);
        if (!section) {
            return res.status(404).json({
                success: false,
                message: 'Section not found'
            });
        }

        // Get all sections ordered by current order
        const sections = await Section.find({
            parentSection: section.parentSection
        }).sort('order');

        const currentIndex = sections.findIndex(s => s._id.equals(section._id));
        let newIndex;

        if (direction === 'up' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        } else if (direction === 'down' && currentIndex < sections.length - 1) {
            newIndex = currentIndex + 1;
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid move direction'
            });
        }

        // Swap orders
        const otherSection = sections[newIndex];
        const tempOrder = section.order;
        section.order = otherSection.order;
        otherSection.order = tempOrder;

        // Save both sections
        await Promise.all([
            section.save(),
            otherSection.save()
        ]);

        res.json({
            success: true,
            message: 'Section reordered successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Add as a separate export
exports.getSection = async (req, res) => {
    try {
        const section = await Section.findById(req.params.id)
            .populate('parentSection', 'name slug');

        if (!section) {
            return res.status(404).json({
                success: false,
                message: 'Section not found'
            });
        }
        
        res.json({
            success: true,
            data: section
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}; 

// Add as a separate export
exports.getActiveSections = async (req, res) => {
    try {
        const sections = await Section.find({ isActive: true })
            .sort({ order: 1, name: 1 })
            .select('name order');
            
        res.json({
            success: true,
            data: sections
        });
    } catch (error) {
        console.error('Error fetching active sections:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching active sections',
            error: error.message
        });
    }
};

// ADD this new method for debugging section status
exports.debugSectionStatus = async (req, res) => {
    try {
        const sections = await Section.find({})
            .select('name slug isActive')
            .sort('name');
            
        console.log('🐛 Current section status debug:', sections.map(s => ({
            name: s.name,
            slug: s.slug,
            isActive: s.isActive
        })));
        
        res.json({
            success: true,
            message: 'Debug info logged to console',
            data: sections
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};