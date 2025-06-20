// controllers/linkController.js
const Link = require('../models/Link');
const AdminLog = require('../models/AdminLog');

const linkController = {
    // Create a new link
    createLink: async (req, res) => {
        try {
            const { name, url, description, category } = req.body;
            
            // Add validation
            if (!name || !url) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and URL are required fields'
                });
            }
    
            const link = new Link({
                name,
                url,
                description,
                category: category || 'General',
                author: req.user._id
            });
    
            await link.save();
            await link.populate('author', 'email firstName lastName');
    
            res.status(201).json({
                success: true,
                message: 'Link created successfully',
                data: link
            });
        } catch (error) {
            console.error('Error creating link:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error creating link'
            });
        }
    },

    // Get all links
    getAllLinks: async (req, res) => {
        try {
            const links = await Link.find({ isActive: true })
                .populate('author', 'firstName lastName')
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                data: links
            });
        } catch (error) {
            console.error('Error fetching links:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching links',
                error: error.message
            });
        }
    },

    // Update a link
    updateLink: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, url, description, category } = req.body;

            const link = await Link.findById(id);

            if (!link) {
                return res.status(404).json({
                    success: false,
                    message: 'Link not found'
                });
            }

            // Check if user is authorized to update
            if (link.author.toString() !== req.user._id.toString() && 
                !['admin', 'super'].includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this link'
                });
            }

            link.name = name;
            link.url = url;
            link.description = description;
            link.category = category;

            await link.save();
            await link.populate('author', 'firstName lastName');

            res.json({
                success: true,
                message: 'Link updated successfully',
                data: link
            });
        } catch (error) {
            console.error('Error updating link:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating link',
                error: error.message
            });
        }
    },

    // Delete a link
    deleteLink: async (req, res) => {
        try {
            const { id } = req.params;
            const link = await Link.findById(id);

            if (!link) {
                return res.status(404).json({
                    success: false,
                    message: 'Link not found'
                });
            }

            // Check if user is authorized to delete
            if (link.author.toString() !== req.user._id.toString() && 
                !['admin', 'super'].includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to delete this link'
                });
            }

            await link.deleteOne();

            res.json({
                success: true,
                message: 'Link deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting link:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting link',
                error: error.message
            });
        }
    }
};

module.exports = linkController;