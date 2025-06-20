// routes/bookmarkRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Article = require('../models/Article'); // Add this import
const auth = require('../middleware/auth');

// routes/bookmarkRoutes.js
router.get('/', auth, async (req, res) => {
    try {
        console.log('Fetching bookmarks for user:', req.user._id);

        const user = await User.findById(req.user._id)
            .populate({
                path: 'bookmarks',
                select: '_id articleId title content createdAt sections author hidden files comments',
                populate: [
                    { path: 'author', select: 'firstName lastName email' },
                    { path: 'sections', select: 'name' }
                ]
            });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Transform the populated bookmarks to ensure required fields
        const transformedBookmarks = user.bookmarks.map(bookmark => {
            const bookmarkObj = bookmark.toObject();
            return {
                _id: bookmarkObj._id.toString(),
                articleId: bookmarkObj.articleId || bookmarkObj._id.toString(),
                title: bookmarkObj.title || 'Untitled',
                content: bookmarkObj.content || '',
                createdAt: bookmarkObj.createdAt,
                sections: bookmarkObj.sections || [],
                author: bookmarkObj.author || { firstName: '', lastName: '', email: '' },
                hidden: bookmarkObj.hidden || false,
                files: bookmarkObj.files || []
            };
        });

        console.log('Transformed bookmarks:', {
            count: transformedBookmarks.length,
            sample: transformedBookmarks[0]
        });

        res.json({
            success: true,
            data: transformedBookmarks
        });
    } catch (error) {
        console.error('Get bookmarks error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving bookmarks'
        });
    }
});

router.delete('/:articleId', auth, async (req, res) => {
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

        const result = await User.findByIdAndUpdate(
            req.user._id,
            { $pull: { bookmarks: articleId } },
            { new: true }
        ).populate({
            path: 'bookmarks',
            populate: [
                { path: 'author', select: 'firstName lastName email' },
                { path: 'sections', select: 'name' }
            ]
        });

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Failed to remove bookmark'
            });
        }

        res.json({
            success: true,
            message: 'Bookmark removed successfully',
            data: result.bookmarks
        });
    } catch (error) {
        console.error('Remove bookmark error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing bookmark',
            error: error.message
        });
    }
});
// Add this route to bookmarkRoutes.js
router.post('/toggle', auth, async (req, res) => {
    try {
        const { articleId } = req.body;
        
        console.log('Bookmark Toggle Request:', {
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

        // Convert articleId to string for consistent comparison
        const articleIdStr = articleId.toString();

        // Check if the article is already bookmarked
        const bookmarkIndex = user.bookmarks.findIndex(
            bookmark => bookmark.toString() === articleIdStr
        );

        // Explicitly define isCurrentlyBookmarked
        const isCurrentlyBookmarked = bookmarkIndex !== -1;

        console.log('Bookmark State Before Toggle:', {
            isCurrentlyBookmarked,
            bookmarkIndex,
            currentBookmarks: user.bookmarks.map(b => b.toString())
        });

        if (isCurrentlyBookmarked) {
            // Remove bookmark
            user.bookmarks.splice(bookmarkIndex, 1);
        } else {
            // Add bookmark
            user.bookmarks.push(articleId);
        }

        await user.save();

        const newBookmarkState = !isCurrentlyBookmarked;

        console.log('Bookmark State After Toggle:', {
            newBookmarkState,
            bookmarksAfter: user.bookmarks.map(b => b.toString())
        });

        res.json({
            success: true,
            isBookmarked: newBookmarkState,
            message: newBookmarkState 
                ? 'Article added to bookmarks' 
                : 'Article removed from bookmarks'
        });
    } catch (error) {
        console.error('Toggle bookmark error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        res.status(500).json({
            success: false,
            message: 'Error toggling bookmark',
            error: error.message
        });
    }
});

module.exports = router;