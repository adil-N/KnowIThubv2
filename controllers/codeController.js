// controllers/codeController.js
const CodeSnippet = require('../models/CodeSnippet');

// controllers/codeController.js - Update the createSnippet method with detailed error logging
// controllers/codeController.js - Update createSnippet method
exports.createSnippet = async (req, res) => {
    try {
        console.log('Create snippet request body:', req.body);
        console.log('User from auth middleware:', req.user);

        const { title, description, code, tags } = req.body;

        // Validate required fields
        if (!title || !code) {
            return res.status(400).json({
                success: false,
                message: 'Title and code are required fields'
            });
        }

        // Generate snippetId first
        const snippetId = await CodeSnippet.generateNextSnippetId();
        console.log('Generated snippetId:', snippetId);

        // Create new snippet with explicit snippetId
        const snippet = new CodeSnippet({
            snippetId,
            title,
            description,
            code,
            tags: Array.isArray(tags) ? tags : [],
            author: req.user._id
        });

        // Log the created snippet object
        console.log('Created snippet object (pre-save):', {
            snippetId: snippet.snippetId,
            title: snippet.title,
            authorId: snippet.author
        });

        // Save with error catching
        const savedSnippet = await snippet.save().catch(err => {
            console.error('Mongoose save error:', {
                error: err,
                stack: err.stack,
                code: err.code,
                name: err.name
            });
            throw err;
        });

        console.log('Snippet saved successfully:', {
            id: savedSnippet._id,
            snippetId: savedSnippet.snippetId
        });

        res.status(201).json({
            success: true,
            data: savedSnippet,
            message: 'Code snippet created successfully'
        });
    } catch (error) {
        console.error('Detailed error in createSnippet:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code
        });

        // Send more detailed error information in development
        const errorResponse = {
            success: false,
            message: 'Error creating code snippet',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        };

        res.status(500).json(errorResponse);
    }
};

exports.getAllSnippets = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        
        const snippets = await CodeSnippet.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('author', 'firstName lastName');

        const total = await CodeSnippet.countDocuments();

        res.json({
            success: true,
            data: snippets,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching snippets:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching snippets'
        });
    }
};

exports.getSnippet = async (req, res) => {
    try {
        const snippet = await CodeSnippet.findOne({ snippetId: req.params.snippetId })
            .populate('author', 'firstName lastName');

        if (!snippet) {
            return res.status(404).json({
                success: false,
                message: 'Code snippet not found'
            });
        }

        res.json({
            success: true,
            data: snippet
        });
    } catch (error) {
        console.error('Error fetching code snippet:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching code snippet'
        });
    }
};



exports.updateSnippet = async (req, res) => {
    try {
        const { title, code, description, category, tags } = req.body;
        const snippet = await CodeSnippet.findOne({ snippetId: req.params.snippetId });

        if (!snippet) {
            return res.status(404).json({
                success: false,
                message: 'Code snippet not found'
            });
        }

        // Check ownership
        if (snippet.author.toString() !== req.user._id.toString() && 
            !['admin', 'super'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this snippet'
            });
        }

        Object.assign(snippet, {
            title,
            code,
            description,
            category,
            tags,
            lastUpdated: new Date()
        });

        await snippet.save();

        res.json({
            success: true,
            data: snippet,
            message: 'Code snippet updated successfully'
        });
    } catch (error) {
        console.error('Error updating code snippet:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating code snippet'
        });
    }
};


exports.deleteSnippet = async (req, res) => {
    try {
        console.log('Attempting to delete snippet:', req.params.snippetId);
        
        // First try to find the snippet
        const snippet = await CodeSnippet.findOne({ snippetId: req.params.snippetId });
        
        if (!snippet) {
            console.log('Snippet not found:', req.params.snippetId);
            return res.status(404).json({
                success: false,
                message: 'Code snippet not found'
            });
        }

        console.log('Found snippet to delete:', {
            snippetId: snippet.snippetId,
            _id: snippet._id,
            author: snippet.author
        });

        // Check ownership
        if (snippet.author.toString() !== req.user._id.toString() && 
            !['admin', 'super'].includes(req.user.role)) {
            console.log('Authorization failed for delete');
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this snippet'
            });
        }

        // Perform the deletion with error handling
        const deleteResult = await CodeSnippet.deleteOne({ _id: snippet._id });
        console.log('Delete result:', deleteResult);

        if (deleteResult.deletedCount === 0) {
            throw new Error('Delete operation failed - no documents deleted');
        }

        // Verify the deletion
        const verifyDelete = await CodeSnippet.findById(snippet._id);
        if (verifyDelete) {
            throw new Error('Deletion verification failed - document still exists');
        }

        console.log('Snippet successfully deleted');
        return res.json({
            success: true,
            message: 'Code snippet deleted successfully'
        });

    } catch (error) {
        console.error('Delete operation failed:', {
            error: error.message,
            stack: error.stack,
            snippetId: req.params.snippetId
        });
        
        return res.status(500).json({
            success: false,
            message: 'Error deleting code snippet',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.updateSnippetDate = async (req, res) => {
    try {
        const { originalDate, newDate } = req.body;
        const snippet = await CodeSnippet.findOne({ snippetId: req.params.snippetId });

        if (!snippet) {
            return res.status(404).json({
                success: false,
                message: 'Code snippet not found'
            });
        }

        const updated = snippet.updateDate(originalDate, newDate);
        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'Date not found in snippet'
            });
        }

        await snippet.save();

        res.json({
            success: true,
            data: snippet,
            message: 'Date updated successfully'
        });
    } catch (error) {
        console.error('Error updating snippet date:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating snippet date'
        });
    }
};

// controllers/codeController.js
exports.getSnippet = async (req, res) => {
    try {
        const snippet = await CodeSnippet.findOne({ snippetId: req.params.snippetId })
            .populate('author', 'firstName lastName');

        if (!snippet) {
            return res.status(404).json({
                success: false,
                message: 'Code snippet not found'
            });
        }

        res.json({
            success: true,
            data: snippet
        });
    } catch (error) {
        console.error('Error fetching snippet:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching snippet'
        });
    }
};
