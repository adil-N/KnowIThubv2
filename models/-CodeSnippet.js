// models/CodeSnippet.js
const mongoose = require('mongoose');

const codeSnippetSchema = new mongoose.Schema({
    snippetId: {
        type: String,
        unique: true,
        required: function() {
            return this.isNew;
        },
        sparse: false,
        validate: {
            validator: function(v) {
                return /^CS-\d{5}$/.test(v);
            },
            message: props => `${props.value} is not a valid snippet ID format!`
        }
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxLength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true
    },
    code: {
        type: String,
        required: [true, 'Code is required'],
        trim: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }]
}, { timestamps: true });

// models/CodeSnippet.js - Add index for snippetId
// codeSnippetSchema.index({ snippetId: 1 }, { unique: true });

// Generate next snippet ID
codeSnippetSchema.statics.generateNextSnippetId = async function() {
    let sequence = 10000;
    const lastSnippet = await this.findOne()
        .sort({ snippetId: -1 })
        .select('snippetId')
        .lean();

    if (lastSnippet && lastSnippet.snippetId) {
        const match = lastSnippet.snippetId.match(/CS-(\d+)/);
        if (match) {
            sequence = parseInt(match[1], 10) + 1;
        }
    }
    return `CS-${String(sequence).padStart(5, '0')}`;
};

// Pre-save middleware to generate snippetId
// models/CodeSnippet.js - Update the pre-save middleware
codeSnippetSchema.pre('save', async function(next) {
    try {
        if (this.isNew && !this.snippetId) {
            this.snippetId = await this.constructor.generateNextSnippetId();
            console.log('Generated snippetId:', this.snippetId);
        }
        next();
    } catch (error) {
        console.error('Error in pre-save middleware:', error);
        next(error);
    }
});

const CodeSnippet = mongoose.model('CodeSnippet', codeSnippetSchema);
module.exports = CodeSnippet;