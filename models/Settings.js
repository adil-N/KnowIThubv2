// models/Settings.js
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    defaultUserStatus: {
        type: String,
        enum: ['active', 'pending'],
        default: 'active'
    },
    emailDomain: {
        type: String,
        default: '@ddf.ae'
    },
    maxLoginAttempts: {
        type: Number,
        min: 3,
        max: 10,
        default: 5
    },
    lockDuration: {
        type: Number,
        min: 5,
        max: 60,
        default: 15
    },
    passwordRequirements: {
        requireNumbers: {
            type: Boolean,
            default: true
        },
        requireSpecialChars: {
            type: Boolean,
            default: true
        },
        minLength: {
            type: Number,
            default: 8
        }
    },
    systemMaintenanceMode: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const Settings = mongoose.model('Settings', settingsSchema);
module.exports = Settings;