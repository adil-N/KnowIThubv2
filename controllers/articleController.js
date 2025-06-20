// controllers/articleController.js
const Article = require('../models/Article');
const activityLogger = require('../utils/activityLogger');
const Comment = require('../models/Comment');
const fs = require('fs');
const path = require('path');
const AdminLog = require('../models/AdminLog');
const { fileHandler } = require('../middleware/fileHandler');
const fileManagement = require('../middleware/fileManagement');
const TagProcessor = require('../utils/TagProcessor');
const tagProcessor = new TagProcessor();
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const User = require('../models/User');


// Update comment method
const updateComment = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const { content } = req.body;

        // Find article and comment
        const article = await Article.findById(id);
        const comment = await Comment.findById(commentId);

        if (!article || !comment) {
            return res.status(404).json({
                success: false,
                message: 'Article or comment not found'
            });
        }

        // Check permissions
        const isAuthor = comment.author.toString() === req.user._id.toString();
        const isAdmin = ['admin', 'super'].includes(req.user.role);

        if (!isAuthor && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to edit this comment'
            });
        }

        // Update the comment
        comment.content = content;
        comment.updated = true;
        await comment.save();

        // Populate author information
        await comment.populate('author', 'email firstName lastName');

        return res.json({
            success: true,
            message: 'Comment updated successfully',
            data: comment
        });
    } catch (error) {
        console.error('Error updating comment:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating comment',
            error: error.message
        });
    }
};

// Like comment method

const likeComment = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        
        // Find article and comment
        const article = await Article.findById(id);
        const comment = await Comment.findById(commentId);

        if (!article || !comment) {
            return res.status(404).json({
                success: false,
                message: 'Article or comment not found'
            });
        }

        const userId = req.user._id.toString();
        const hasLiked = comment.likes.some(like => like.toString() === userId);

        if (hasLiked) {
            // Unlike
            comment.likes = comment.likes.filter(like => like.toString() !== userId);
        } else {
            // Like
            comment.likes.push(userId);
        }

        await comment.save();

        return res.json({
            success: true,
            message: `Comment ${hasLiked ? 'unliked' : 'liked'} successfully`,
            data: {
                liked: !hasLiked,
                likeCount: comment.likes.length
            }
        });
    } catch (error) {
        console.error('Error toggling comment like:', error);
        return res.status(500).json({
            success: false,
            message: 'Error toggling like status',
            error: error.message
        });
    }
};
const checkArticlePermissions = (article, userId, userRole) => {
    // Debug logging
    console.log('Checking Article Permissions:', {
        articleId: article._id,
        articleAuthorId: article.author,
        userId: userId,
        userRole: userRole
    });
    const isAuthor = article.author.toString() === userId.toString();
    const isAdmin = ['admin', 'super'].includes(userRole);
    
    console.log('Permission Results:', {
        isAuthor,
        isAdmin,
        canEdit: isAuthor || isAdmin,
        canDelete: isAuthor || isAdmin
    });

    return {
        canEdit: isAuthor || isAdmin,
        canDelete: isAuthor || isAdmin,
        canView: true
    };
};
const validateFiles = (files) => {
    const maxSize = 15 * 1024 * 1024; // 15MB
    const allowedTypes = [
        // Images
        'image/jpeg',
        'image/png',
        'image/gif',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        // Excel files
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/x-excel',
        'application/excel',
        // PowerPoint files
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/powerpoint',
        'application/x-powerpoint'
    ];

    // Also check file extensions as fallback
    const allowedExtensions = [
        'jpg', 'jpeg', 'png', 'gif',
        'pdf', 'doc', 'docx', 'txt',
        'xls', 'xlsx', 'ppt', 'pptx'
    ];

    if (files.length > 7) {
        throw new Error('Maximum 7 files allowed');
    }

    files.forEach(file => {
        if (file.size > maxSize) {
            throw new Error(`File ${file.originalname} exceeds 15MB limit`);
        }
        
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(file.mimetype) && !allowedExtensions.includes(fileExtension)) {
            throw new Error(`File ${file.originalname} has an unsupported format. Allowed files: images, PDFs, Word, Excel, PowerPoint, and text files.`);
        }
    });
};
const articleController = {

    // Get all articles 
    async getAllArticles(req, res) {
        try {
            console.log('Getting articles with query params:', req.query);
            let query = { $and: [] }; 
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 15;
            const skip = (page - 1) * limit;
    
            // Base query for non-admin users
            if (!req.user || !['admin', 'super'].includes(req.user.role)) {
                query.$and.push({ hidden: { $ne: true } });
            }

            // Handle section filter - IMPROVED
        if (req.query.sectionId && req.query.sectionId !== 'all') {
            console.log('Adding section filter:', req.query.sectionId);
            
            // Handle multiple section IDs passed as comma-separated string
            const sectionIds = req.query.sectionId.split(',').map(id => new mongoose.Types.ObjectId(id.trim()));
            
            query.$and.push({ 
                sections: { $in: sectionIds }
            });
        }
    
            // Handle filter parameter
            if (req.query.filter) {
                switch (req.query.filter) {
                    case 'unread':
                        if (req.user) {
                            query.$and.push({
                                viewedBy: {
                                    $not: {
                                        $elemMatch: {
                                            user: req.user._id
                                        }
                                    }
                                }
                            });
                        }
                        break;
                        case 'updated':
    if (req.user) {
        query.$and.push({
            $and: [
                // Must have been viewed by this user
                { 'viewedBy.user': req.user._id },
                // Must have lastContentUpdate
                { lastContentUpdate: { $exists: true } },
                // Last update must be after user's last view
                {
                    $expr: {
                        $gt: [
                            '$lastContentUpdate',
                            {
                                $let: {
                                    vars: {
                                        userView: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: '$viewedBy',
                                                        cond: { 
                                                            $eq: ['$$this.user', req.user._id] 
                                                        }
                                                    }
                                                },
                                                -1  // Get the latest view
                                            ]
                                        }
                                    },
                                    in: '$$userView.timestamp'
                                }
                            }
                        ]
                    }
                }
            ]
        });
    }
    break;
                }
            }
    
            // Handle date range filtering
            if (req.query.dateRange) {
                const now = new Date();
                let startDate;
                
                switch (req.query.dateRange) {
                    case 'today':
                        startDate = new Date(now.setHours(0, 0, 0, 0));
                        break;
                    case 'week':
                        startDate = new Date(now.setDate(now.getDate() - 7));
                        break;
                    case 'month':
                        startDate = new Date(now.setMonth(now.getMonth() - 1));
                        break;
                    case 'quarter':
                        startDate = new Date(now.setMonth(now.getMonth() - 3));
                        break;
                }
    
                if (startDate) {
                    query.$and.push({
                        createdAt: { $gte: startDate, $lte: new Date() }
                    });
                }
            }
    
            // Handle author filter
            if (req.query.author && req.query.author !== 'all') {
                try {
                    if (mongoose.isValidObjectId(req.query.author)) {
                        query.$and.push({ 
                            author: req.query.author 
                        });
                    }
                } catch (error) {
                    console.error('Invalid author ID:', error);
                }
            }
    
            // Handle section filter - FIXED
            if (req.query.sectionId && req.query.sectionId !== 'all') {
                console.log('Adding section filter:', req.query.sectionId);
                query.$and.push({ 
                    sections: new mongoose.Types.ObjectId(req.query.sectionId)
                });
            }
    //  NEW CONDITION HERE - right after the section filter
            if (req.query.excludeViewed === 'true' && req.user) {
                query.$and.push({
                    'viewedBy.user': { $ne: req.user._id }
                });
            }
            // Handle sort parameter
            let sort = { createdAt: -1 }; // Default sort
            if (req.query.sort) {
                switch (req.query.sort) {
                    case 'expiring':
                        query.$and.push({
                            isTemporary: true,
                            expiresAt: { $gt: new Date() }
                        });
                        sort = { expiresAt: 1 };
                        break;
                    case 'oldest':
                        sort = { createdAt: 1 };
                        break;
                    case 'updated':
                        sort = { lastContentUpdate: -1 };
                        break;
                    case 'title':
                        sort = { title: 1 };
                        break;
                }
            }
    
            // Remove empty $and array if no conditions
            if (query.$and.length === 0) {
                delete query.$and;
            }
    
            console.log('Final query:', JSON.stringify(query, null, 2));
            console.log('Sort:', sort);
    // Execute query with pagination
    const [articles, totalItems] = await Promise.all([
        Article.find(query)
            .collation({ locale: 'en', strength: 2 })
            .populate('author', 'email firstName lastName role')
            .populate('sections', 'name')
            .populate({
                path: 'comments',
                populate: {
                    path: 'author',
                    select: 'email firstName lastName'
                }
            })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean(),
        Article.countDocuments(query)  // Get total count for pagination
    ]);

    // Log pagination data being sent
    console.log('Sending pagination data:', {
        currentPage: page,
        totalItems: totalItems,
        totalPages: Math.ceil(totalItems / limit),
        itemsPerPage: limit
    });

    // Send response with pagination info
    return res.json({
        success: true,
        data: articles,
        pagination: {
            totalItems: totalItems,
            currentPage: page,
            totalPages: Math.ceil(totalItems / limit),
            itemsPerPage: limit,
            hasNextPage: (page * limit) < totalItems,
            hasPrevPage: page > 1
        }
    });

} catch (error) {
    console.error('Error in getAllArticles:', error);
    return res.status(500).json({
        success: false,
        message: 'Error fetching articles',
        error: error.message
    });
}
},


    getAuthors: async (req, res) => {
        try {
            // Get distinct authors who have written articles
            const authors = await Article.aggregate([
                { $match: { hidden: false } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'author',
                        foreignField: '_id',
                        as: 'authorDetails'
                    }
                },
                { $unwind: '$authorDetails' },
                {
                    $group: {
                        _id: '$authorDetails._id',
                        firstName: { $first: '$authorDetails.firstName' },
                        lastName: { $first: '$authorDetails.lastName' },
                        email: { $first: '$authorDetails.email' },
                        articleCount: { $sum: 1 }
                    }
                },
                { $sort: { lastName: 1, firstName: 1 } }
            ]);

            res.json({
                success: true,
                data: authors
            });
        } catch (error) {
            console.error('Error fetching authors:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching authors',
                error: error.message
            });
        }
    },
    
    //createArticle
    createArticle: async (req, res) => {
        try {
            console.log('Creating article with detailed data:', {
                title: req.body.title,
                titleLength: req.body.title?.length,
                contentLength: req.body.content?.length,
                sectionId: req.body.sectionId,
                hasTags: !!req.body.tags,
                filesCount: req.files?.length,
                fileDetails: req.files?.map(file => ({
                    originalname: file.originalname,
                    size: file.size,
                    mimetype: file.mimetype
                })),
                totalRequestSize: req.headers['content-length']
            });
    
            // Create the complete article data object first
            const articleData = {
                title: req.body.title,
                content: req.body.content,
                author: req.user._id
            };



            // Handle date range filtering
            if (req.query.dateRange) {
                const now = new Date();
                let dateFilter = {};
                
                switch (req.query.dateRange) {
                    case 'today':
                        const startOfDay = new Date(now.setHours(0,0,0,0));
                        dateFilter = { createdAt: { $gte: startOfDay } };
                        break;
                    case 'week':
                        const lastWeek = new Date(now.setDate(now.getDate() - 7));
                        dateFilter = { createdAt: { $gte: lastWeek } };
                        break;
                    case 'month':
                        const lastMonth = new Date(now.setMonth(now.getMonth() - 1));
                        dateFilter = { createdAt: { $gte: lastMonth } };
                        break;
                    case 'quarter':
                        const lastQuarter = new Date(now.setMonth(now.getMonth() - 3));
                        dateFilter = { createdAt: { $gte: lastQuarter } };
                        break;
                }
            
                if (Object.keys(dateFilter).length > 0) {
                    query.$and.push(dateFilter);
                }
            }

            // Handle author filter
            if (req.query.author && req.query.author !== 'all') {
                query.$and.push({ author: req.query.author });
            }


            // Handle sections
            if (req.body.sectionId) {
                let sectionIds = Array.isArray(req.body.sectionId) 
                    ? req.body.sectionId 
                    : [req.body.sectionId];
                articleData.sections = sectionIds;
            }
    
            // Handle tags
            if (req.body.tags) {
                try {
                    const tags = JSON.parse(req.body.tags);
                    if (Array.isArray(tags)) {
                        articleData.tags = tags.map(tag => 
                            tag.toLowerCase().trim()
                        ).filter(tag => tag.length > 0);
                    }
                } catch (tagError) {
                    console.error('Error processing tags:', tagError);
                }
            }
    
            // Handle temporary duration
            if (req.body.temporaryDuration) {
                articleData.isTemporary = true;
                articleData.temporaryDuration = req.body.temporaryDuration;
                // Calculate expiration based on duration
                const now = new Date();
                switch (req.body.temporaryDuration) {
                    case '72h':
                        articleData.expiresAt = new Date(now.getTime() + (72 * 60 * 60 * 1000));
                        break;
                    case '1w':
                        articleData.expiresAt = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
                        break;
                    case '1m':
                        articleData.expiresAt = new Date(now);
                        articleData.expiresAt.setMonth(articleData.expiresAt.getMonth() + 1);
                        break;
                    default:
                        throw new Error('Invalid duration specified');
                }
            }
    
            // Create article instance with complete data
            const article = new Article(articleData);
    
            // Handle files
            if (req.files?.length > 0) {
                try {
                    article.files = req.files.map(file => ({
                        ...fileHandler.getFileInfo(file),
                        previewUrl: `/api/articles/files/${file.filename}/preview`,
                        downloadUrl: `/api/articles/files/${file.filename}/download`
                    }));
                } catch (fileError) {
                    await fileHandler.deleteFiles(req.files);
                    throw fileError;
                }
            }
    
            await article.save();

            // Process tags immediately
            const tagUpdateJob = require('../jobs/tagUpdateJob');
            await tagUpdateJob.processNewArticle(article._id);
    
            await AdminLog.create({
                adminId: req.user._id,
                action: 'ARTICLE_CREATED',
                targetArticle: article._id,
                details: {
                    articleTitle: article.title,
                    articleId: article.articleId,
                    sections: article.sections,
                    hasAttachments: article.files?.length > 0,
                    tagCount: article.tags?.length || 0,
                    isTemporary: article.isTemporary,
                    expiresAt: article.expiresAt
                }
            });
    
            await article.populate([
                { path: 'author', select: 'email firstName lastName' },
                { path: 'sections', select: 'name' }
            ]);
    
            res.json({
                success: true,
                message: article.isTemporary ? 
                    `Article created successfully. Will expire ${new Date(article.expiresAt).toLocaleString()}.` :
                    'Article created successfully',
                data: {
                    ...article.toObject(),
                    files: article.files.map(file => ({
                        ...file.toObject(),
                        previewUrl: `/api/articles/files/${file.filename}/preview`,
                        downloadUrl: `/api/articles/files/${file.filename}/download`
                    }))
                }
            });
        } catch (error) {
            if (req.files?.length) {
                await fileHandler.deleteFiles(req.files);
            }
    
            console.error('Error creating article:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error creating article',
                error: error.message 
            });
        }
    },

  
    getTagSuggestions: async (req, res) => {
        try {
            const { q } = req.query;
            if (!q) {
                return res.json({ success: true, data: [] });
            }
    
            // Get unique tags that match the query
            const tags = await Article.aggregate([
                { 
                    $project: { 
                        allTags: { $concatArrays: ['$tags', '$autoTags'] }
                    }
                },
                { $unwind: '$allTags' },
                { 
                    $match: { 
                        'allTags': new RegExp(q, 'i')
                    }
                },
                { 
                    $group: { 
                        _id: '$allTags',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);
    
            res.json({
                success: true,
                data: tags.map(t => t._id)
            });
        } catch (error) {
            console.error('Error getting tag suggestions:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching tag suggestions'
            });
        }
    },
    // Add this method for getting related articles by tag
getRelatedArticles: async (req, res) => {
    try {
        const { articleId } = req.params;
        const article = await Article.findById(articleId);
        
        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'Article not found'
            });
        }

        // Get all tags from the article (both manual and auto)
        const allTags = [...new Set([...article.tags, ...article.autoTags])];

        if (allTags.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        // Find articles that share tags but exclude the current article
        const relatedArticles = await Article.find({
            _id: { $ne: articleId },
            $or: [
                { tags: { $in: allTags } },
                { autoTags: { $in: allTags } }
            ],
            hidden: false
        })
        .populate('author', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

        res.json({
            success: true,
            data: relatedArticles
        });
    } catch (error) {
        console.error('Error getting related articles:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching related articles'
        });
    }
},
    // Get article with view tracking and proper error handling
    async getArticle(req, res) {
        try {
            console.log('Getting article with ID:', req.params.id);
            
            const articleId = req.params.id;
            
            if (!mongoose.Types.ObjectId.isValid(articleId)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid article ID format' 
                });
            }
    
            const article = await Article.findById(articleId)
                .populate('author', 'email firstName lastName role')
                .populate('sections', 'name')
                .populate({
                    path: 'comments',
                    populate: { 
                        path: 'author', 
                        select: 'email firstName lastName role'
                    }
                });
    
            if (!article) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Article not found' 
                });
            }
    
            // Add this block to track the view
            if (req.user) {
                await article.trackView(req.user._id);
                await article.markAsRead(req.user._id); // Add this line
                await article.save();
            }
    
            // Add isBookmarked status if user is authenticated
            if (req.user) {
                const user = await User.findById(req.user._id);
                article.isBookmarked = user?.bookmarks?.includes(article._id) || false;
            } else {
                article.isBookmarked = false;
            }
    
            // Enhance files
            if (article.files?.length > 0) {
                article.files = article.files.map(file => ({
                    ...file.toObject(),
                    previewUrl: `/api/articles/files/${file.filename}/preview`,
                    downloadUrl: `/api/articles/files/${file.filename}/download`
                }));
            }
    
            return res.json({
                success: true,
                data: article
            });
    
        } catch (error) {
            console.error('Error getting article:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Error getting article',
                error: error.message 
            });
        }
    },
        
     // Get article stats for admin
     getArticleStats: async (req, res) => {
        try {
            const stats = {
                overview: {
                    totalArticles: await Article.countDocuments(),
                    hiddenArticles: await Article.countDocuments({ hidden: true }),
                    totalComments: await Comment.countDocuments(),
                    visibleArticles: await Article.countDocuments({ hidden: false })
                },
                topArticles: await Article.aggregate([
                    {
                        $lookup: {
                            from: 'comments',
                            localField: '_id',
                            foreignField: 'article',
                            as: 'comments'
                        }
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'author',
                            foreignField: '_id',
                            as: 'authorDetails'
                        }
                    },
                    {
                        $addFields: {
                            commentCount: { $size: '$comments' },
                            author: { $arrayElemAt: ['$authorDetails', 0] },
                            engagementScore: {
                                $add: [
                                    { $multiply: [{ $size: '$comments' }, 2] },
                                    { $ifNull: ['$views', 0] }
                                ]
                            }
                        }
                    },
                    {
                        $project: {
                            title: 1,
                            'author.email': 1,
                            commentCount: 1,
                            views: 1,
                            createdAt: 1,
                            engagementScore: 1,
                            hidden: 1
                        }
                    },
                    { $sort: { engagementScore: -1 } },
                    { $limit: 10 }
                ])
            };
    
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Error getting article stats:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error getting article statistics',
                error: error.message 
            });
        }
    },
        // Update article with logging
        updateArticle: async (req, res) => {
            try {
                const article = await Article.findById(req.params.id);
                if (!article) {
                    return res.status(404).json({ 
                        success: false, 
                        message: 'Article not found' 
                    });
                }
        
                // Check permissions
                const permissions = checkArticlePermissions(article, req.user._id, req.user.role);
                if (!permissions.canEdit) {
                    return res.status(403).json({
                        success: false,
                        message: 'Not authorized to modify this article'
                    });
                }
        
                // Handle basic fields
                const fieldsToUpdate = ['title', 'content'];
                fieldsToUpdate.forEach(field => {
                    if (req.body[field] !== undefined) {
                        article[field] = req.body[field];
                    }
                });
        
                // Handle sections if provided
                if (req.body.sectionId) {
                    article.sections = [req.body.sectionId];
                }
        
                // Handle tags if provided
                if (req.body.tags) {
                    try {
                        const tags = JSON.parse(req.body.tags);
                        if (Array.isArray(tags)) {
                            article.tags = tags.map(tag => 
                                tag.toLowerCase().trim()
                            ).filter(tag => tag.length > 0);
                        }
                    } catch (tagError) {
                        console.error('Error processing tags:', tagError);
                    }
                }
        
                // Handle removed files
                if (req.body.removedFiles) {
                    try {
                        const removedFiles = JSON.parse(req.body.removedFiles);
                        for (const filename of removedFiles) {
                            await fileHandler.deleteFile(filename);
                        }
                        article.files = article.files.filter(file => 
                            !removedFiles.includes(file.filename)
                        );
                    } catch (error) {
                        console.error('Error removing files:', error);
                    }
                }
        
                // Handle new files
                if (req.files?.length > 0) {
                    try {
                        const newFiles = req.files.map(file => ({
                            ...fileHandler.getFileInfo(file),
                            previewUrl: `/api/articles/files/${file.filename}/preview`,
                            downloadUrl: `/api/articles/files/${file.filename}/download`
                        }));
                        article.files = [...article.files, ...newFiles];
                    } catch (fileError) {
                        // Cleanup new files if there's an error
                        await fileHandler.deleteFiles(req.files);
                        throw fileError;
                    }
                }
        
                // Handle expiration settings
                if (req.body.temporaryDuration) {
                    try {
                        article.setExpiration(req.body.temporaryDuration);
                    } catch (expirationError) {
                        console.error('Error updating expiration:', expirationError);
                    }
                }
        
                // Update lastContentUpdate
                article.lastContentUpdate = new Date();
        
                await article.save();
        
                // Log update activity
                await activityLogger.log({
                    userId: req.user._id,
                    action: 'ARTICLE_UPDATED',
                    targetArticle: article._id,
                    details: { 
                        articleTitle: article.title,
                        articleId: article._id,
                        updatedFields: Object.keys(req.body),
                        filesAdded: req.files?.length || 0,
                        filesRemoved: req.body.removedFiles ? JSON.parse(req.body.removedFiles).length : 0
                    }
                });
        
                // Populate necessary fields
                await article.populate([
                    { path: 'author', select: 'email firstName lastName' },
                    { path: 'sections', select: 'name' }
                ]);
        
                res.json({
                    success: true,
                    message: 'Article updated successfully',
                    data: {
                        ...article.toObject(),
                        files: article.files.map(file => ({
                            ...file.toObject(),
                            previewUrl: `/api/articles/files/${file.filename}/preview`,
                            downloadUrl: `/api/articles/files/${file.filename}/download`
                        }))
                    }
                });
            } catch (error) {
                console.error('Error updating article:', error);
                // Cleanup any newly uploaded files if update failed
                if (req.files?.length) {
                    await fileHandler.deleteFiles(req.files);
                }
                res.status(500).json({ 
                    success: false, 
                    message: 'Error updating article',
                    error: error.message 
                });
            }
        },



    deleteArticle: async (req, res) => {
        try {
            const article = await Article.findById(req.params.id);
    
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: 'Article not found'
                });
            }
    
            // Check permissions
            const permissions = checkArticlePermissions(article, req.user._id, req.user.role);
            if (!permissions.canDelete) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to delete this article'
                });
            }
    
            // Delete associated files
            if (article.files && article.files.length > 0) {
                article.files.forEach(file => {
                    const filePath = path.join(__dirname, '..', 'uploads', file.filename);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                });
            }
    
            // Delete associated comments
            await Comment.deleteMany({ article: article._id });
    
            // Delete the article
            await article.deleteOne();
    
            res.json({
                success: true,
                message: 'Article deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting article:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting article',
                error: error.message
            });
        }
    },
    // Add comment
    addComment: async (req, res) => {
        try {
            const { content } = req.body;
            const article = await Article.findById(req.params.id);
    
            if (!article) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Article not found' 
                });
            }
    
            const comment = new Comment({
                content,
                author: req.user._id,
                article: article._id
            });
    
            await comment.save();
            article.comments.push(comment._id);
            await article.save();
    
            await comment.populate('author', 'email firstName lastName');
    
            res.status(201).json({
                success: true,
                message: 'Comment added successfully',
                data: comment
            });
        } catch (error) {
            console.error('Error adding comment:', error);
            res.status(500).json({ 
                success: false,
                message: 'Error adding comment', 
                error: error.message 
            });
        }
    },
    
    // Get comments
    getComments: async (req, res) => {
        try {
            const article = await Article.findById(req.params.id)
                .populate({
                    path: 'comments',
                    populate: {
                        path: 'author',
                        select: 'email firstName lastName'
                    }
                });
    
            if (!article) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Article not found' 
                });
            }
    
            res.json({
                success: true,
                data: article.comments
            });
        } catch (error) {
            console.error('Error fetching comments:', error);
            res.status(500).json({ 
                success: false,
                message: 'Error fetching comments', 
                error: error.message 
            });
        }
    },
    updateComment,  // Add this
    likeComment,   // Add this
    
    // Delete a comment
    deleteComment: async (req, res) => {
        try {
            const { id, commentId } = req.params;
            const article = await Article.findById(id);
            const comment = await Comment.findById(commentId);
    
            if (!article || !comment) {
                return res.status(404).json({
                    success: false,
                    message: 'Article or comment not found'
                });
            }
    
            // Check if user is authorized to delete the comment
            if (comment.author.toString() !== req.user._id.toString() && 
                !['admin', 'super'].includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to delete this comment'
                });
            }
    
            // Remove comment from article and delete it
            article.comments = article.comments.filter(c => c.toString() !== commentId);
            await Promise.all([
                article.save(),
                Comment.findByIdAndDelete(commentId)
            ]);
    
            res.json({
                success: true,
                message: 'Comment deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting comment:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting comment',
                error: error.message
            });
        }
    },
    // Updated deleteFile method
    deleteFile: async (req, res) => {
        try {
            const { id, filename } = req.params;
            console.log('Delete file request:', { articleId: id, filename });
    
            const article = await Article.findById(id);
    
            if (!article) {
                return res.status(404).json({
                    success: false,
                    message: 'Article not found'
                });
            }
    
            // Check permissions
            if (article.author.toString() !== req.user._id.toString() && 
                !['admin', 'super'].includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to modify this article'
                });
            }
    
            // Find the file in the article's files array
            const fileIndex = article.files.findIndex(file => file.filename === filename);
            if (fileIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'File not found in article'
                });
            }
    
            // Add the new file deletion code here
            const deleted = await fileHandler.deleteFile(filename);
            if (!deleted) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete file'
                });
            }
    
            // Remove the file from the article's files array
            article.files.splice(fileIndex, 1);
            await article.save();
    
            res.json({
                success: true,
                message: 'File deleted successfully',
                data: {
                    remainingFiles: article.files.length
                }
            });
        } catch (error) {
            console.error('Error deleting file:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting file',
                error: error.message
            });
        }
    },
    
    
        // Toggle article visibility
     // In articleController.js, update toggleVisibility method
    toggleVisibility: async (req, res) => {
        try {
            const articleId = req.params.id;
            console.log('Toggling visibility for article:', {
                articleId,
                userId: req.user._id,
                userRole: req.user.role
            });
    
            const article = await Article.findById(articleId);
    
            if (!article) {
                console.log('Article not found:', articleId);
                return res.status(404).json({
                    success: false,
                    message: 'Article not found'
                });
            }
    
            // Check permissions
            const permissions = checkArticlePermissions(article, req.user._id, req.user.role);
            if (!permissions.canEdit) {
                console.log('Permission denied for user:', {
                    userId: req.user._id,
                    userRole: req.user.role,
                    articleAuthor: article.author
                });
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to modify this article'
                });
            }
    
            // Toggle visibility without affecting other fields
            article.hidden = !article.hidden;
            console.log('New visibility state:', article.hidden);
            
            // Save without updating timestamps
            await article.save({ timestamps: false });
    
            res.json({
                success: true,
                message: `Article ${article.hidden ? 'hidden' : 'unhidden'} successfully`,
                data: {
                    hidden: article.hidden,
                    articleId: article.articleId
                }
            });
        } catch (error) {
            console.error('Error toggling article visibility:', error);
            res.status(500).json({ 
                success: false,
                message: 'Error updating article visibility', 
                error: error.message 
            });
        }
    },
    
        // Search articles
// WORKING FIX: Replace your searchArticles method with this
// This preserves all existing functionality and just filters out image metadata

searchArticles: async (req, res) => {
    try {
        const { q, filter = 'all', date } = req.query;
        
        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search term is required'
            });
        }

        let searchQuery = {
            $and: []
        };

        // Handle different filter types - EXACT SAME AS BEFORE
        switch (filter) {
            case 'tag':
                // Search in both tags and autoTags, case-insensitive
                searchQuery.$and.push({
                    $or: [
                        { tags: { $regex: `^${q}$`, $options: 'i' } },
                        { autoTags: { $regex: `^${q}$`, $options: 'i' } }
                    ]
                });
                break;
            case 'title':
                searchQuery.$and.push({ title: { $regex: q, $options: 'i' } });
                break;
            case 'content':
                searchQuery.$and.push({ content: { $regex: q, $options: 'i' } });
                break;
            default:
                // Default 'all' search - BACK TO ORIGINAL BUT WITH POST-FILTERING
                searchQuery.$and.push({
                    $or: [
                        { title: { $regex: q, $options: 'i' } },
                        { content: { $regex: q, $options: 'i' } },
                        { tags: { $regex: q, $options: 'i' } },
                        { autoTags: { $regex: q, $options: 'i' } }
                    ]
                });
        }

        // Add visibility filter for non-admin users
        if (!req.user?.role || (req.user.role !== 'admin' && req.user.role !== 'super')) {
            searchQuery.$and.push({ hidden: { $ne: true } });
        }

        console.log('Final search query:', JSON.stringify(searchQuery, null, 2));

        // Get all matching articles first
        let articles = await Article.find(searchQuery)
            .populate('author', 'email firstName lastName role')
            .sort({ createdAt: -1 });

        // FILTER OUT IMAGE METADATA MATCHES for 'all' and 'content' filters
        if (filter === 'all' || filter === 'content') {
            articles = articles.filter(article => {
                // If it matches title or tags, always include it
                const titleMatch = new RegExp(q, 'i').test(article.title || '');
                const tagMatch = (article.tags || []).some(tag => new RegExp(q, 'i').test(tag)) ||
                                 (article.autoTags || []).some(tag => new RegExp(q, 'i').test(tag));
                
                if (titleMatch || tagMatch) {
                    return true;
                }
                
                // For content matches, check if it's a real content match or just image metadata
                const content = article.content || '';
                
                // Remove image tags and file paths to get clean content
                const cleanContent = content
                    .replace(/<img[^>]*>/gi, ' ')                    // Remove img tags
                    .replace(/src="[^"]*"/gi, ' ')                   // Remove src attributes
                    .replace(/alt="[^"]*"/gi, ' ')                   // Remove alt attributes  
                    .replace(/title="[^"]*"/gi, ' ')                 // Remove title attributes
                    .replace(/uploads\/[^\s"'>]*/gi, ' ')            // Remove file paths
                    .replace(/\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx)\b/gi, ' ') // Remove file extensions
                    .replace(/\s+/g, ' ')                            // Normalize spaces
                    .trim();
                
                // Check if search term exists in clean content
                const cleanContentMatch = new RegExp(q, 'i').test(cleanContent);
                
                return cleanContentMatch;
            });
        }

        res.json({
            success: true,
            data: articles,
            meta: {
                total: articles.length,
                query: q,
                filter,
            }
        });
    } catch (error) {
        console.error('Error searching articles:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching articles',
            error: error.message
        });
    }
}, 
     // Get featured articles (newest articles by admins)
     getFeaturedArticles: async (req, res) => {
        try {
            const articles = await Article.find({ 
                hidden: false,
                author: { 
                    $in: await User.find({ role: { $in: ['admin', 'super'] } }).select('_id')
                } 
            })
            .populate('author', 'email firstName lastName role')
            .sort({ createdAt: -1 })
            .limit(5);
    
            res.json({
                success: true,
                data: articles
            });
        } catch (error) {
            console.error('Error fetching featured articles:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching featured articles',
                error: error.message
            });
        }
    },
    
    
    // In articleController.js, move this outside of the getArticleStats method
    bulkToggleVisibility: async (req, res) => {
        try {
            const { articleIds, hidden } = req.body;
    
            if (!Array.isArray(articleIds) || articleIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No articles specified'
                });
            }
    
            // Verify all articles exist and user has permission
            const articles = await Article.find({
                _id: { $in: articleIds }
            }).select('hidden author');
    
            if (articles.length !== articleIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more articles not found'
                });
            }
    
            // Update all articles
            await Article.updateMany(
                { _id: { $in: articleIds } },
                { $set: { hidden: hidden } }
            );
    
            // Log the action
            const actionType = hidden ? 'ARTICLES_HIDDEN' : 'ARTICLES_UNHIDDEN';
            console.log(`Bulk ${actionType}:`, {
                user: req.user.email,
                articleCount: articleIds.length
            });
    
            return res.json({
                success: true,
                message: `Successfully ${hidden ? 'hidden' : 'unhidden'} ${articleIds.length} articles`
            });
        } catch (error) {
            console.error('Error in bulk visibility toggle:', error);
            return res.status(500).json({
                success: false,
                message: 'Error updating articles visibility',
                error: error.message
            });
        }
    },
    // Bulk delete articles
    bulkDeleteArticles: async (req, res) => {
        try {
            const { articleIds } = req.body;
    
            if (!Array.isArray(articleIds) || articleIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No articles specified for deletion'
                });
            }
    
            // Verify all articles exist and user has permission
            const articles = await Article.find({
                _id: { $in: articleIds }
            }).populate('author', 'email');
    
            if (articles.length !== articleIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more articles not found'
                });
            }
    
            // Check permissions unless user is admin/super
            if (!['admin', 'super'].includes(req.user.role)) {
                const unauthorized = articles.some(article => 
                    article.author._id.toString() !== req.user._id.toString()
                );
    
                if (unauthorized) {
                    return res.status(403).json({
                        success: false,
                        message: 'Not authorized to delete one or more articles'
                    });
                }
            }
    
            // Enhanced file deletion with tracking
            let deletedFilesCount = 0;
            const fileDeleteResults = [];
    
            for (const article of articles) {
                if (article.files?.length > 0) {
                    const results = await Promise.allSettled(
                        article.files.map(async file => {
                            try {
                                const deleted = await fileHandler.deleteFile(file.filename);
                                if (deleted) {
                                    deletedFilesCount++;
                                    return { filename: file.filename, success: true };
                                }
                                return { filename: file.filename, success: false, error: 'File deletion failed' };
                            } catch (error) {
                                return { filename: file.filename, success: false, error: error.message };
                            }
                        })
                    );
                    fileDeleteResults.push(...results);
                }
            }
    
            // Delete all associated comments
            await Comment.deleteMany({ article: { $in: articleIds } });
    
            // Delete the articles
            const deleteResult = await Article.deleteMany({ _id: { $in: articleIds } });
    
            // Log the bulk delete action with enhanced details
            await AdminLog.create({
                adminId: req.user._id,
                action: 'BULK_ARTICLES_DELETED',
                details: {
                    deletedArticles: articles.map(article => ({
                        id: article._id,
                        title: article.title,
                        author: article.author.email
                    })),
                    totalArticles: articles.length,
                    totalFiles: deletedFilesCount,
                    fileResults: fileDeleteResults.filter(result => !result.success)
                }
            });
    
            console.log('Bulk article deletion completed:', {
                user: req.user.email,
                articlesDeleted: deleteResult.deletedCount,
                filesDeleted: deletedFilesCount,
                timestamp: new Date().toISOString()
            });
    
            return res.json({
                success: true,
                message: `Successfully deleted ${deleteResult.deletedCount} articles`,
                data: {
                    deletedArticles: deleteResult.deletedCount,
                    deletedFiles: deletedFilesCount,
                    failedFileDeletes: fileDeleteResults.filter(r => !r.success).length
                }
            });
        } catch (error) {
            console.error('Error in bulk article deletion:', error);
            return res.status(500).json({
                success: false,
                message: 'Error deleting articles',
                error: error.message
            });
        }
    },
     // Add this as the last method
     cleanupExpiredArticles: async (req, res) => {
        try {
            // Only allow admins and super admins to manually trigger cleanup
            if (!['admin', 'super'].includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to perform cleanup'
                });
            }

            const count = await Article.cleanupExpiredArticles();

            res.json({
                success: true,
                message: `Cleaned up ${count} expired articles`,
                data: { deletedCount: count }
            });
        } catch (error) {
            console.error('Error cleaning up expired articles:', error);
            res.status(500).json({
                success: false,
                message: 'Error cleaning up expired articles',
                error: error.message
            });
        }
    }
};




console.log('Available methods:', Object.keys(articleController));




module.exports = articleController;
