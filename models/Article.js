// models/Article.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const articleSchema = new mongoose.Schema({
    articleId: {
        type: String,
        unique: true,
        required: function() {
            return this.isNew; // Only required for new documents
        },
        sparse: false,
        validate: {
            validator: function(v) {
                return /^AN-\d{5}$/.test(v);
            },
            message: props => `${props.value} is not a valid article ID format!`
        }
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxLength: [200, 'Title cannot exceed 200 characters']
    },
    content: {
        type: String,
        required: [true, 'Content is required'],
        trim: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }],
    hidden: {
        type: Boolean,
        default: false
    },
    files: [{
        originalname: String,
        filename: String,
        path: String,
        mimetype: String
    }],
    reads: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    lastContentUpdate: {
        type: Date
    },
    views: {
        type: Number,
        default: 0
    },
    viewedBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    sections: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
        required: [true, 'At least one section is required'],
        validate: {
            validator: async function(value) {
                const Section = mongoose.model('Section');
                const section = await Section.findById(value);
                return section && section.isActive;
            },
            message: props => `Section does not exist or is not active`
        }
    }],
    tags: [{
        type: String,
        trim: true,
        lowercase: true,
        maxLength: [50, 'Tag cannot exceed 50 characters']
    }],
    
    // Automatically extracted keywords
    autoTags: [{
        type: String,
        trim: true,
        lowercase: true
    }],

    // Add these new fields to the articleSchema
isTemporary: {
    type: Boolean,
    default: false
},
expiresAt: {
    type: Date,
    index: true,  // Add index for better query performance
    sparse: true  // Only index documents that have this field
},
temporaryDuration: {
    type: String,
    enum: ['72h', '1w', '1m'],  // 72 hours, 1 week, 1 month
    sparse: true
},
    // Tag metadata
    tagMeta: {
        lastExtracted: Date,
        extractionVersion: Number
    },
}, { timestamps: true });


// ADD THE METHOD HERE - after schema definition but before any middleware
articleSchema.methods.processTags = function(tags) {
    if (!tags) return [];
    
    let processedTags = Array.isArray(tags) ? tags : [];
    if (typeof tags === 'string') {
        try {
            processedTags = JSON.parse(tags);
        } catch (e) {
            processedTags = tags.split(',').map(tag => tag.trim());
        }
    }

    return processedTags
        .map(tag => tag.toLowerCase().trim())
        .filter(tag => 
            tag.length > 0 && 
            tag.length <= 50 && 
            /^[a-z0-9\s-]+$/i.test(tag)
        )
        .filter((tag, index, self) => self.indexOf(tag) === index);
};

// Then update your existing pre-save middleware
articleSchema.pre('save', async function(next) {
    try {
        console.log('Pre-save hook running for article:', {
            isNew: this.isNew,
            currentId: this.articleId,
            title: this.title,
            hasTags: Array.isArray(this.tags) && this.tags.length > 0
        });

        // Handle content update timestamp
        if (this.isNew) {
            if (!this.articleId) {
                this.articleId = await this.constructor.generateNextArticleId();
                console.log('Generated new article ID:', this.articleId);
            }
            this.lastContentUpdate = this.createdAt || new Date();
        } else if (this.isModified('title') || 
                  this.isModified('content') || 
                  this.isModified('files')) {
            this.lastContentUpdate = new Date();
            console.log('Article content updated, new lastContentUpdate:', this.lastContentUpdate);
        }

        // Ensure tags arrays exist
        this.tags = this.tags || [];
        this.autoTags = this.autoTags || [];

        // Process manual tags if they are modified
        if (this.isModified('tags')) {
            this.tags = this.processTags(this.tags);
            console.log('Processed manual tags:', this.tags);
        }

        next();
    } catch (error) {
        console.error('Error in pre-save hook:', error);
        next(error);
    }
});


// Article ID Generation
articleSchema.statics.generateNextArticleId = async function() {
    console.log('\n--- Generating Article ID ---');
    let sequence = 100;  // Default starting number
    const maxAttempts = 5;

    try {
        // Find the highest existing article ID using sort
        const lastArticle = await this.findOne()
            .sort({ articleId: -1 })  // Sort in descending order
            .select('articleId')
            .lean();

        console.log('Current highest article:', lastArticle);

        if (lastArticle && lastArticle.articleId) {
            const match = lastArticle.articleId.match(/AN-(\d+)/);
            if (match) {
                sequence = parseInt(match[1], 10) + 1;
                console.log('Next sequence number will be:', sequence);
            }
        }

        // Generate the new ID
        const newArticleId = `AN-${String(sequence).padStart(5, '0')}`;
        console.log('Generated new ID:', newArticleId);

        // Double-check it doesn't exist (safety check)
        const exists = await this.findOne({ articleId: newArticleId }).lean();
        if (exists) {
            console.log('Warning: Generated ID already exists, incrementing...');
            sequence++;
            return `AN-${String(sequence).padStart(5, '0')}`;
        }

        return newArticleId;
    } catch (error) {
        console.error('Error generating article ID:', error);
        throw new Error('Failed to generate article ID');
    }
};

articleSchema.statics.initializeIndexes = async function() {
    try {
        await this.collection.createIndex(
            { articleId: 1 },
            { 
                unique: true,
                background: true
            }
        );
        console.log('Article ID index created successfully');

        // Verify current highest ID
        const lastArticle = await this.findOne()
            .sort({ articleId: -1 })
            .select('articleId')
            .lean();
            
        console.log('Current highest article ID:', lastArticle?.articleId || 'No articles found');
    } catch (error) {
        console.error('Error creating article ID index:', error);
    }
};

// Update pre-validate middleware
articleSchema.pre('validate', async function(next) {
    try {
        if (this.isNew && !this.articleId) {
            console.log('Generating article ID in pre-validate...');
            this.articleId = await this.constructor.generateNextArticleId();
            console.log('Generated article ID:', this.articleId);
        }
        next();
    } catch (error) {
        console.error('Error in pre-validate middleware:', error);
        next(error);
    }
});


// In Article.js, update the pre-save middleware

// Add this after your existing schema definition but before the pre-save middleware
articleSchema.methods.processTags = function(tags) {
    if (!tags) return [];
    
    // If tags is a string (JSON), parse it
    let processedTags = Array.isArray(tags) ? tags : [];
    if (typeof tags === 'string') {
        try {
            processedTags = JSON.parse(tags);
        } catch (e) {
            console.error('Error parsing tags:', e);
            return [];
        }
    }

    // Clean and validate tags
    return processedTags
        .map(tag => tag.toLowerCase().trim())
        .filter(tag => 
            tag.length > 0 && 
            tag.length <= 50 && 
            /^[a-z0-9\s-]+$/i.test(tag)
        );
};


// In Article.js, update the pre-save middleware

// Add this after your existing schema definition but before the pre-save middleware
articleSchema.methods.processTags = function(tags) {
    if (!tags) return [];
    
    // If tags is a string (JSON), parse it
    let processedTags = Array.isArray(tags) ? tags : [];
    if (typeof tags === 'string') {
        try {
            processedTags = JSON.parse(tags);
        } catch (e) {
            console.error('Error parsing tags:', e);
            return [];
        }
    }

    // Clean and validate tags
    return processedTags
        .map(tag => tag.toLowerCase().trim())
        .filter(tag => 
            tag.length > 0 && 
            tag.length <= 50 && 
            /^[a-z0-9\s-]+$/i.test(tag)
        );
};

// Update the pre-save middleware
articleSchema.pre('save', async function(next) {
    try {
        console.log('Pre-save hook running for article:', {
            isNew: this.isNew,
            currentId: this.articleId,
            title: this.title,
            hasTags: Array.isArray(this.tags) && this.tags.length > 0
        });

        // Handle content update timestamp
        if (this.isNew) {
            if (!this.articleId) {
                this.articleId = await this.constructor.generateNextArticleId();
                console.log('Generated new article ID:', this.articleId);
            }
            this.lastContentUpdate = this.createdAt || new Date();
        } else if (this.isModified('title') || 
                  this.isModified('content') || 
                  this.isModified('files')) {
            this.lastContentUpdate = new Date();
            console.log('Article content updated, new lastContentUpdate:', this.lastContentUpdate);
        }

        // Ensure tags arrays exist
        this.tags = this.tags || [];
        this.autoTags = this.autoTags || [];

        // Clean existing tags
        if (this.tags.length > 0) {
            this.tags = this.processTags(this.tags);
            console.log('Processed manual tags:', this.tags);
        }

        next();
    } catch (error) {
        console.error('Error in pre-save hook:', error);
        next(error);
    }
});





// Updated trackView method with improved error handling and atomic operations
articleSchema.methods.trackView = async function(userId) {
    if (!userId) {
        console.log('No userId provided for view tracking');
        return false;
    }

    try {
        const existingView = this.viewedBy.find(view => 
            view.user && view.user.toString() === userId.toString()
        );

        if (!existingView) {
            const result = await this.constructor.findByIdAndUpdate(
                this._id,
                {
                    $push: {
                        viewedBy: {
                            user: userId,
                            timestamp: new Date()
                        }
                    },
                    $inc: { views: 1 }
                },
                { new: true, runValidators: true }
            );

            if (result) {
                this.views = result.views;
                this.viewedBy = result.viewedBy;

                if (mongoose.models.AdminLog) {
                    try {
                        await mongoose.models.AdminLog.create({
                            adminId: userId,
                            action: 'ARTICLE_VIEWED',
                            targetArticle: this._id,
                            details: {
                                articleTitle: this.title,
                                articleId: this.articleId,
                                viewCount: this.views
                            }
                        });
                    } catch (logError) {
                        console.error('Error creating view log:', logError);
                    }
                }
                return true;
            }
        } else {
            existingView.timestamp = new Date();
            await this.save({ timestamps: false });
        }
        return false;
    } catch (error) {
        console.error('Error tracking article view:', error);
        return false;
    }
};

// Article read tracking method
articleSchema.methods.markAsRead = async function(userId) {
    console.log('Marking article as read:', {
        articleId: this._id,
        userId: userId,
        currentTime: new Date(),
        currentReads: this.reads
    });

    const readIndex = this.reads.findIndex(read => 
        read.user.toString() === userId.toString()
    );

    const currentTime = new Date();

    if (readIndex === -1) {
        // First time reading
        this.reads.push({
            user: userId,
            readAt: currentTime
        });
    } else {
        // Update existing read timestamp
        this.reads[readIndex].readAt = currentTime;
    }

    // Save without updating timestamps
    return this.save({ timestamps: false });
};

// Content change checking
articleSchema.methods.hasContentChanged = function() {
    return this.isModified('title') || 
           this.isModified('content') || 
           this.isModified('files');
};

// Permission methods
articleSchema.methods.canEdit = function(userId, userRole) {
    return this.author.toString() === userId || 
           ['admin', 'super'].includes(userRole);
};

articleSchema.methods.canDelete = function(userId, userRole) {
    return this.author.toString() === userId || 
           ['admin', 'super'].includes(userRole);
};

articleSchema.methods.addComment = function(commentId) {
    if (!this.comments.includes(commentId)) {
        this.comments.push(commentId);
    }
};

// Virtual properties
articleSchema.virtual('commentCount').get(function() {
    return this.comments.length;
});

articleSchema.virtual('fileCount').get(function() {
    return this.files.length;
});

// Pre-remove middleware for cleanup
articleSchema.pre('remove', async function(next) {
    try {
        // Delete associated files
        if (this.files && this.files.length > 0) {
            this.files.forEach(file => {
                const filePath = path.join(__dirname, '..', 'uploads', file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }

        // Delete associated comments
        await mongoose.model('Comment').deleteMany({ article: this._id });

        next();
    } catch (error) {
        next(error);
    }
});

// Article ID validation
articleSchema.path('articleId').validate(function(value) {
    if (!value) return false;
    return /^AN-\d{5}$/.test(value);
}, 'Invalid article ID format. Must be AN-XXXXX where X is a digit');

// Configuration
articleSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

// Add virtual for formatted ID display
articleSchema.virtual('formattedId').get(function() {
    return this.articleId || 'N/A';
});

articleSchema.set('toObject', { virtuals: true });

// Updated Indexes for better performance and sorting
articleSchema.index({ title: 'text', content: 'text' });
articleSchema.index({ author: 1, hidden: 1 });
articleSchema.index({ 'reads.user': 1 });
articleSchema.index({ lastContentUpdate: -1, createdAt: -1 }); 


// Compound index for date-based sorting
// articleSchema.index({ articleId: -1, createdAt: -1 });  // Compound index for sorting
// articleSchema.index({ createdAt: -1 });
// articleSchema.index({ articleId: 1 });





articleSchema.index({ 'viewedBy.user': 1 });
articleSchema.index({ views: -1 });
articleSchema.index({ sections: 1 });
articleSchema.index({ sections: 1, createdAt: -1 });
articleSchema.index({ tags: 1 });
articleSchema.index({ autoTags: 1 });
articleSchema.index({ 'tagMeta.lastExtracted': 1 });

// Static methods for consistent article retrieval
articleSchema.statics.findLatest = function(limit = 10) {
    return this.find({})
        .sort({ articleId: -1, createdAt: -1 })
        .limit(limit);
};

articleSchema.statics.getPagedArticles = function(page = 1, limit = 15, query = {}) {
    return this.find(query)
        .sort({ articleId: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
};

// Get article engagement score
articleSchema.methods.getEngagementScore = function() {
    const viewsWeight = 1;
    const commentsWeight = 2;
    const recentActivityBonus = 5;

    const hasRecentActivity = this.lastContentUpdate && 
        (new Date() - this.lastContentUpdate) < (7 * 24 * 60 * 60 * 1000); // 7 days

    return (this.views * viewsWeight) + 
           (this.comments.length * commentsWeight) + 
           (hasRecentActivity ? recentActivityBonus : 0);
};

// Initialize method for the model
articleSchema.statics.initialize = async function() {
    try {
        await this.collection.createIndex(
            { articleId: 1 }, 
            { 
                unique: true, 
                background: true,
                sparse: false
            }
        );
        console.log('Article indexes initialized successfully');

        const lastArticle = await this.findOne()
            .sort('-articleId')
            .select('articleId')
            .lean();

        if (lastArticle?.articleId) {
            console.log('Found highest article ID:', lastArticle.articleId);
        } else {
            console.log('No existing articles found, will start from AN-00100');
        }

    } catch (error) {
        console.error('Error initializing Article model:', error);
        throw error;
    }
    articleSchema.statics.findBySection = async function(sectionId, page = 1, limit = 15) {
        return this.find({ sections: sectionId, hidden: false })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('author', 'firstName lastName')
            .populate('sections', 'name slug');
    };
};
articleSchema.post('save', async function(doc) {
    if (doc.sections && doc.sections.length > 0) {
        const Section = mongoose.model('Section');
        await Promise.all(doc.sections.map(sectionId => 
            Section.findById(sectionId).then(section => 
                section ? section.updateArticleCount() : null
            )
        ));
    }
});
// Static method to cleanup expired articles
articleSchema.statics.cleanupExpiredArticles = async function() {
    try {
        const now = new Date();
        const result = await this.deleteMany({
            isTemporary: true,
            expiresAt: { $lte: now }
        });
        
        console.log(`Cleaned up ${result.deletedCount} expired articles at ${now.toISOString()}`);
        return result.deletedCount;
    } catch (error) {
        console.error('Error in cleanupExpiredArticles:', error);
        throw error;
    }
};

// Create the model before exporting
const Article = mongoose.model('Article', articleSchema);

// Initialize indexes when connection is ready
mongoose.connection.once('connected', () => {
    Article.initializeIndexes().catch(console.error);
});
// Tag management methods
articleSchema.methods.addTag = function(tag) {
    tag = tag.toLowerCase().trim();
    if (!this.tags.includes(tag)) {
        this.tags.push(tag);
    }
};

articleSchema.methods.removeTag = function(tag) {
    tag = tag.toLowerCase().trim();
    this.tags = this.tags.filter(t => t !== tag);
};

// Method to set automatically extracted tags
articleSchema.methods.setAutoTags = function(newTags) {
    this.autoTags = [...new Set(newTags.map(tag => tag.toLowerCase().trim()))];
    this.tagMeta = {
        lastExtracted: new Date(),
        extractionVersion: 1
    };
};


// Static methods for tag operations
articleSchema.statics.findByTag = function(tag, page = 1, limit = 15) {
    return this.find({
        $or: [
            { tags: tag.toLowerCase() },
            { autoTags: tag.toLowerCase() }
        ]
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('author', 'firstName lastName')
    .populate('sections', 'name');
};

articleSchema.statics.getPopularTags = function(limit = 10) {
    return this.aggregate([
        { $project: { allTags: { $concatArrays: ['$tags', '$autoTags'] } } },
        { $unwind: '$allTags' },
        { $group: { _id: '$allTags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit }
    ]);
};
// Method to set expiration
// Method to set expiration
articleSchema.methods.setExpiration = function(duration) {
    console.log('Setting article expiration:', { duration });

    // Validate duration input
    const validDurations = ['72h', '1w', '1m'];
    if (!validDurations.includes(duration)) {
        console.error('Invalid duration provided:', duration);
        throw new Error(`Invalid duration: ${duration}. Must be one of: ${validDurations.join(', ')}`);
    }

    // Set temporary flag and duration
    this.isTemporary = true;
    this.temporaryDuration = duration;

    // Calculate expiration date based on duration
    const now = new Date();
    switch (duration) {
        case '72h':
            this.expiresAt = new Date(now.getTime() + (72 * 60 * 60 * 1000)); // 72 hours
            break;
        case '1w':
            this.expiresAt = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 1 week
            break;
        case '1m':
            // Use setMonth to handle month boundaries correctly
            this.expiresAt = new Date(now);
            this.expiresAt.setMonth(this.expiresAt.getMonth() + 1);
            break;
        default:
            throw new Error('Invalid duration specified');
    }

    console.log('Expiration set:', {
        duration: this.temporaryDuration,
        expiresAt: this.expiresAt,
        isTemporary: this.isTemporary
    });

    return this;
};


module.exports = Article;