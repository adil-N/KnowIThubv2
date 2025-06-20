// models/Comment.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: [true, 'Comment content is required'],
        trim: true,
        maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    article: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article',
        required: true
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    flags: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['active', 'hidden', 'flagged'],
        default: 'active'
    },
    edited: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Update edited status when content changes
commentSchema.pre('save', function(next) {
    if (this.isModified('content') && !this.isNew) {
        this.edited = true;
    }
    next();
});

// Methods
commentSchema.methods.like = async function(userId) {
    if (!this.likes.includes(userId)) {
        this.likes.push(userId);
        await this.save();
    }
    return this.likes.length;
};

commentSchema.methods.unlike = async function(userId) {
    this.likes = this.likes.filter(id => id.toString() !== userId.toString());
    await this.save();
    return this.likes.length;
};

commentSchema.methods.flag = async function(userId, reason) {
    if (!this.flags.find(flag => flag.user.toString() === userId.toString())) {
        this.flags.push({ user: userId, reason });
        if (this.flags.length >= 3) { // Auto-flag after 3 reports
            this.status = 'flagged';
        }
        await this.save();
    }
    return this.flags.length;
};

commentSchema.methods.canModify = function(userId, userRole) {
    return this.author.toString() === userId || 
           userRole === 'admin' || 
           userRole === 'super';
};

// Virtuals
commentSchema.virtual('likeCount').get(function() {
    return this.likes.length;
});

commentSchema.virtual('flagCount').get(function() {
    return this.flags.length;
});

// Indexes
commentSchema.index({ article: 1, createdAt: -1 });
commentSchema.index({ author: 1 });
commentSchema.index({ status: 1 });

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;