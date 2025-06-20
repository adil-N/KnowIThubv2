// COMPLETE FIXES for Section Model and Controller

// 1. FIXED Section Model (models/Section.js) - Add unique slug handling
const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Section name is required'],
        trim: true,
        maxLength: [50, 'Section name cannot exceed 50 characters']
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxLength: [200, 'Description cannot exceed 200 characters']
    },
    icon: {
        type: String,
        default: 'folder'
    },
    order: {
        type: Number,
        default: 0
    },
    parentSection: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    articleCount: {
        type: Number,
        default: 0
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
sectionSchema.index({ slug: 1 });
sectionSchema.index({ order: 1 });
sectionSchema.index({ parentSection: 1 });

// ENHANCED: Generate unique slug from name
sectionSchema.pre('save', async function(next) {
    if (this.isModified('name')) {
        let baseSlug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        
        // Check for existing slug and make it unique
        let slug = baseSlug;
        let counter = 1;
        
        while (true) {
            const existingSection = await this.constructor.findOne({ 
                slug: slug, 
                _id: { $ne: this._id } 
            });
            
            if (!existingSection) {
                break;
            }
            
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        
        this.slug = slug;
    }
    next();
});

// Virtual for child sections
sectionSchema.virtual('childSections', {
    ref: 'Section',
    localField: '_id',
    foreignField: 'parentSection'
});

// Virtual for articles in this section
sectionSchema.virtual('articles', {
    ref: 'Article',
    localField: '_id',
    foreignField: 'sections'
});

// Method to update article count
sectionSchema.methods.updateArticleCount = async function() {
    const count = await mongoose.model('Article').countDocuments({
        sections: this._id,
        hidden: false
    });
    this.articleCount = count;
    return this.save();
};

// Static method to get section tree
sectionSchema.statics.getTree = async function() {
    const sections = await this.find({ parentSection: null })
        .populate({
            path: 'childSections',
            populate: { path: 'childSections' }
        });
    return sections;
};

// Method to check if section can be deleted
sectionSchema.methods.canDelete = async function() {
    const articlesCount = await mongoose.model('Article').countDocuments({
        sections: this._id
    });
    const childrenCount = await this.model('Section').countDocuments({
        parentSection: this._id
    });
    return articlesCount === 0 && childrenCount === 0;
};

const Section = mongoose.model('Section', sectionSchema);

module.exports = Section;

// 2. ENHANCED Section Controller (controllers/sectionController.js)

// UPDATED getAllSections to include BOTH active and inactive sections for admin
exports.getAllSections = async (req, res) => {
    try {
        // For admin panel, show ALL sections (active and inactive)
        // For regular users, only show active sections
        const query = req.user && ['admin', 'super'].includes(req.user.role) 
            ? {} // Admin sees all sections
            : { isActive: true }; // Regular users see only active sections
            
        const sections = await Section.find(query)
            .populate('parentSection', 'name slug')
            .sort('order name');
            
        console.log(`📊 Returning ${sections.length} sections for ${req.user?.role || 'user'}`);
            
        res.json({
            success: true,
            data: sections
        });
    } catch (error) {
        console.error('Error fetching sections:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ENHANCED updateSection with detailed logging
exports.updateSection = async (req, res) => {
    try {
        const { name, description, parentSection, icon, order, isActive } = req.body;
        
        console.log('🔄 Section update request:', {
            sectionId: req.params.id,
            updateData: { name, description, parentSection, icon, order, isActive },
            userId: req.user._id,
            userEmail: req.user.email
        });
        
        const section = await Section.findById(req.params.id);

        if (!section) {
            console.log('❌ Section not found:', req.params.id);
            return res.status(404).json({
                success: false,
                message: 'Section not found'
            });
        }

        // Update fields
        if (name) section.name = name;
        if (description !== undefined) section.description = description;
        if (parentSection !== undefined) section.parentSection = parentSection || null;
        if (icon) section.icon = icon;
        if (order !== undefined) section.order = order;
        if (isActive !== undefined) {
            console.log(`🎯 Updating section status: ${section.isActive} → ${isActive}`);
            section.isActive = isActive;
        }

        await section.save();
        
        console.log('✅ Section updated successfully:', {
            sectionId: section._id,
            name: section.name,
            isActive: section.isActive
        });
        
        res.json({
            success: true,
            data: section
        });
    } catch (error) {
        console.error('❌ Error updating section:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// ENHANCED deleteSection with proper cleanup and email confirmation
exports.deleteSection = async (req, res) => {
    try {
        const { confirmEmail } = req.body;
        
        console.log('🗑️ Section deletion request:', {
            sectionId: req.params.id,
            confirmEmail: confirmEmail ? '[PROVIDED]' : '[MISSING]',
            userId: req.user._id,
            userEmail: req.user.email
        });
        
        // Email confirmation check
        if (!confirmEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email confirmation is required for this dangerous operation'
            });
        }

        if (confirmEmail.toLowerCase().trim() !== req.user.email.toLowerCase().trim()) {
            console.log('❌ Email confirmation failed:', {
                provided: confirmEmail,
                expected: req.user.email
            });
            
            return res.status(400).json({
                success: false,
                message: 'Email confirmation does not match your account email'
            });
        }

        const section = await Section.findById(req.params.id);
        
        if (!section) {
            return res.status(404).json({
                success: false,
                message: 'Section not found'
            });
        }

        // Check if section can be deleted
        const canDelete = await section.canDelete();
        if (!canDelete) {
            const articleCount = await require('../models/Article').countDocuments({
                sections: section._id
            });
            const childCount = await Section.countDocuments({
                parentSection: section._id
            });
            
            console.log('❌ Cannot delete section - has dependencies:', {
                sectionId: section._id,
                articleCount,
                childCount
            });
            
            return res.status(400).json({
                success: false,
                message: `Cannot delete section "${section.name}". It contains ${articleCount} article(s) and ${childCount} child section(s). Please move or delete them first.`
            });
        }

        console.log('🗑️ Proceeding with section deletion:', {
            sectionId: section._id,
            sectionName: section.name,
            slug: section.slug
        });

        // CRITICAL: Clean up article references before deleting
        const articlesUpdated = await require('../models/Article').updateMany(
            { sections: section._id },
            { $pull: { sections: section._id } }
        );

        console.log('🧹 Cleaned up article references:', {
            modifiedCount: articlesUpdated.modifiedCount
        });

        // Delete the section (this will automatically clean up the slug)
        await Section.findByIdAndDelete(section._id);
        
        console.log('✅ Section successfully deleted:', {
            sectionId: section._id,
            sectionName: section.name,
            deletedBy: req.user.email,
            timestamp: new Date().toISOString()
        });
        
        res.json({
            success: true,
            message: `Section "${section.name}" deleted successfully`
        });
    } catch (error) {
        console.error('❌ Error deleting section:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting section: ' + error.message
        });
    }
};

// ADD this new method for debugging section status
exports.debugSectionStatus = async (req, res) => {
    try {
        const sections = await Section.find({})
            .select('name slug isActive')
            .sort('name');
            
        console.log('🐛 Current section status debug:', sections.map(s => ({
            name: s.name,
            slug: s.slug,
            isActive: s.isActive
        })));
        
        res.json({
            success: true,
            message: 'Debug info logged to console',
            data: sections
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};