// routes/linkRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Link = require('../models/Link'); 


// Update the GET route
router.get('/', auth, async (req, res) => {
    try {
        const links = await Link.find({ isActive: true })
            .sort({ name: 1 }); // Removed the populate call

        res.json({
            success: true,
            data: links
        });
    } catch (error) {
        console.error('Error in GET /links:', error); // Add logging
        res.status(500).json({
            success: false,
            message: 'Error fetching links',
            error: error.message
        });
    }
});
// Put this BEFORE any routes with :id parameter
router.get('/categories', auth, async (req, res) => {
    try {
        const categories = await Link.distinct('category', { isActive: true });
        const filteredCategories = categories.filter(category => category && category.trim());
        
        // Ensure General is always included
        if (!filteredCategories.includes('General')) {
            filteredCategories.unshift('General');
        }

        res.json({
            success: true,
            data: filteredCategories.sort()
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching categories'
        });
    }
});
// Add this route in linkRoutes.js after the other routes
router.get('/:id', auth, async (req, res) => {
    try {
        const link = await Link.findById(req.params.id);
        
        if (!link) {
            return res.status(404).json({
                success: false,
                message: 'Link not found'
            });
        }

        res.json({
            success: true,
            data: link
        });
    } catch (error) {
        console.error('Error fetching single link:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching link details',
            error: error.message
        });
    }
});
// Update the POST route

router.post('/', auth, async (req, res) => {
    try {
        const { name, url, description, category } = req.body;
        
        const link = new Link({
            name,
            url,
            description,
            category: category || 'General',
            author: req.user._id
        });

        await link.save();
        
        res.json({
            success: true,
            data: link
        });
    } catch (error) {
        console.error('Error creating link:', error);
        res.status(400).json({
            success: false,
            message: 'Error creating link',
            error: error.message
        });
    }
});

// Update the PUT route
router.put('/:id', auth, async (req, res) => {
    try {
        const link = await Link.findById(req.params.id);
        
        if (!link) {
            return res.status(404).json({
                success: false,
                message: 'Link not found'
            });
        }

        // Check if user is author or admin
        if (link.author.toString() !== req.user._id.toString() && 
            !['admin', 'super'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to edit this link'
            });
        }

        // Ensure category is handled correctly
        const updateData = {
            name: req.body.name,
            url: req.body.url,
            description: req.body.description,
            category: req.body.category || 'General' // Set default to 'General' if not provided
        };

        const updatedLink = await Link.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        // Populate author field if needed
        await updatedLink.populate('author', 'firstName lastName');

        res.json({
            success: true,
            data: updatedLink
        });
    } catch (error) {
        console.error('Error updating link:', error);
        res.status(400).json({
            success: false,
            message: 'Error updating link',
            error: error.message
        });
    }
});

// Update the DELETE route
router.delete('/:id', auth, async (req, res) => {
    try {
        const link = await Link.findById(req.params.id);
        
        if (!link) {
            return res.status(404).json({
                success: false,
                message: 'Link not found'
            });
        }

        // Only admins can delete any link
        if (!['admin', 'super'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this link'
            });
        }

        await Link.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Link deleted successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error deleting link',
            error: error.message
        });
    }
});

// routes/linkRoutes.js - Add this new route
// routes/linkRoutes.js - Update the categories POST route
router.post('/categories', auth, async (req, res) => {
    try {
        const { category } = req.body;
        
        if (!category || !category.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        const trimmedCategory = category.trim();

        // Check if category already exists
        const existingCategories = await Link.distinct('category');
        if (existingCategories.includes(trimmedCategory)) {
            return res.json({
                success: true,
                message: 'Category already exists',
                data: trimmedCategory
            });
        }

        // Create a placeholder link with the new category
        const placeholderLink = new Link({
            name: `${trimmedCategory} Category`,
            url: '#',
            category: trimmedCategory,
            author: req.user._id, // Add the author field
            isActive: false // This is a placeholder link
        });

        await placeholderLink.save();

        res.json({
            success: true,
            message: 'Category added successfully',
            data: trimmedCategory
        });

    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding category',
            error: error.message
        });
    }
});

module.exports = router;