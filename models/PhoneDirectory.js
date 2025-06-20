// models/PhoneDirectory.js
const mongoose = require('mongoose');

const phoneDirectorySchema = new mongoose.Schema({
    directoryId: {
        type: String,
        unique: true,
        sparse: true
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxLength: [100, 'Name cannot exceed 100 characters']
    },
    department: {
        type: String,
        trim: true,
        maxLength: [50, 'Department name cannot exceed 50 characters']
    },
    position: {
        type: String,
        trim: true,
        maxLength: [50, 'Position cannot exceed 50 characters']
    },
    phoneNumbers: [{
        _id: false,  // Disable automatic _id for subdocuments
        type: {
            type: String,
            enum: ['office', 'mobile', 'home', 'other'],
            default: 'office'
        },
        number: {
            type: String,
            trim: true,
            default: ''
        },
        extension: {
            type: String,
            trim: true,
            default: ''
        }
    }],
    email: {
        type: String,
        trim: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                // If email is provided, validate its format
                return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Invalid email format'
        }
    },
    category: {
        type: String,
        enum: ['Internal', 'External', 'Vendor', 'Emergency', 'Other'],
        default: 'Internal'
    },
    notes: {
        type: String,
        trim: true,
        maxLength: [500, 'Notes cannot exceed 500 characters']
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { 
    timestamps: true 
});

// Add a custom validation to ensure contact information exists
phoneDirectorySchema.pre('validate', function(next) {
    // Check if there are any phone numbers with content
    const hasPhoneNumber = this.phoneNumbers.some(phone => 
        (phone.number && phone.number.trim() !== '') || 
        (phone.extension && phone.extension.trim() !== '')
    );

    // Check if email exists
    const hasEmail = this.email && this.email.trim() !== '';

    // Validate that either phone number or email exists
    if (!hasPhoneNumber && !hasEmail) {
        this.invalidate('contact', 'Provide either a phone number, extension, or email');
    }

    next();
});
// Add a method to find by directoryId
phoneDirectorySchema.statics.findByDirectoryId = async function(directoryId) {
    return this.findOne({ directoryId });
};
phoneDirectorySchema.pre('findOneAndUpdate', function(next) {
    // Ensure directoryId is not modified
    if (this.getUpdate().$set && this.getUpdate().$set.directoryId) {
        delete this.getUpdate().$set.directoryId;
    }
    next();
});
// Generate next directory ID
phoneDirectorySchema.statics.generateNextDirectoryId = async function() {
    let sequence = 10000;
    const lastEntry = await this.findOne()
        .sort({ directoryId: -1 })
        .select('directoryId')
        .lean();

    if (lastEntry && lastEntry.directoryId) {
        const match = lastEntry.directoryId.match(/PD-(\d+)/);
        if (match) {
            sequence = parseInt(match[1], 10) + 1;
        }
    }
    return `PD-${String(sequence).padStart(5, '0')}`;
};

// Pre-save middleware to generate directoryId
phoneDirectorySchema.pre('save', async function(next) {
    try {
        if (this.isNew && !this.directoryId) {
            this.directoryId = await this.constructor.generateNextDirectoryId();
        }
        next();
    } catch (error) {
        next(error);
    }
});

phoneDirectorySchema.index({ name: 'text', department: 'text', 'phoneNumbers.number': 'text' });

const PhoneDirectory = mongoose.model('PhoneDirectory', phoneDirectorySchema);
module.exports = PhoneDirectory;