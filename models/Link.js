// models/Link.js
const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Link name is required'],
        trim: true
    },
    url: {
        type: String,
        required: [true, 'URL is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    category: {
        type: String,
        trim: true,
        default: 'General'
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes for better performance
linkSchema.index({ category: 1, name: 1 });
linkSchema.index({ name: 'text', description: 'text' });

const Link = mongoose.model('Link', linkSchema);

module.exports = Link;