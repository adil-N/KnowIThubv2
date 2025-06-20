// controllers/bookmarkController.js
const User = require('../models/User');
const Article = require('../models/Article');

exports.getBookmarks = async (req, res) => {
    try {
        console.log('Fetching bookmarks for user:', req.user._id);
        
        const user = await User.findById(req.user._id)
            .populate({
                path: 'bookmarks',
                populate: [
                    { path: 'author', select: 'firstName lastName' },
                    { path: 'sections', select: 'name' }
                ]
            });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Ensure bookmarks exist and are an array
        const bookmarks = user.bookmarks || [];

        res.json({
            success: true,
            data: bookmarks,
            count: bookmarks.length
        });
    } catch (error) {
        console.error('Get bookmarks error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving bookmarks',
            error: error.message
        });
    }
};

exports.toggleBookmark = async (req, res) => {
    try {
        const { articleId } = req.body;
        
        if (!articleId) {
            return res.status(400).json({
                success: false,
                message: 'Article ID is required'
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Convert articleId to string for consistent comparison
        const articleIdStr = articleId.toString();
        const isCurrentlyBookmarked = user.bookmarks.some(
            bookmark => bookmark.toString() === articleIdStr
        );

        if (isCurrentlyBookmarked) {
            // Remove bookmark
            user.bookmarks = user.bookmarks.filter(
                bookmark => bookmark.toString() !== articleIdStr
            );
        } else {
            // Add bookmark
            user.bookmarks.push(articleId);
        }

        await user.save();

        // Return the new state after the toggle
        const newBookmarkState = !isCurrentlyBookmarked;

        res.json({
            success: true,
            isBookmarked: newBookmarkState,
            message: newBookmarkState ? 'Article bookmarked' : 'Article removed from bookmarks'
        });
    } catch (error) {
        console.error('Toggle bookmark error:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling bookmark',
            error: error.message
        });
    }
};


exports.removeBookmark = async (req, res) => {
    try {
        const { articleId } = req.params;
        console.log('Remove bookmark request:', {
            userId: req.user._id,
            articleId: articleId
        });

        if (!articleId) {
            return res.status(400).json({
                success: false,
                message: 'Article ID is required'
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Remove the bookmark
        const bookmarkIndex = user.bookmarks.findIndex(
            bookmark => bookmark.toString() === articleId
        );

        if (bookmarkIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Bookmark not found'
            });
        }

        // Remove the bookmark
        user.bookmarks.splice(bookmarkIndex, 1);
        await user.save();

        // Return updated bookmarks list
        const updatedUser = await User.findById(req.user._id)
            .populate({
                path: 'bookmarks',
                populate: [
                    { path: 'author', select: 'firstName lastName' },
                    { path: 'sections', select: 'name' }
                ]
            });

        res.json({
            success: true,
            message: 'Bookmark removed successfully',
            data: updatedUser.bookmarks
        });

    } catch (error) {
        console.error('Remove bookmark error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing bookmark',
            error: error.message
        });
    }
};