// scripts/migrateSections.js
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Article = require('../models/Article');
const Section = require('../models/Section');
const User = require('../models/User');

const defaultSections = [
    {
        name: 'Troubleshooting',
        description: 'Solutions and guides for common problems',
        icon: 'tool',
        order: 1
    },
    {
        name: 'Updates',
        description: 'Latest system and application updates',
        icon: 'refresh-cw',
        order: 2
    },
    {
        name: 'Procedures',
        description: 'Step-by-step guides and procedures',
        icon: 'list',
        order: 3
    },
    {
        name: 'Documentation',
        description: 'General documentation and references',
        icon: 'book',
        order: 4
    },
    {
        name: 'FAQs',
        description: 'Frequently asked questions and answers',
        icon: 'help-circle',
        order: 5
    },
    {
        name: 'Quick Start',
        description: 'Getting started guides and tutorials',
        icon: 'play',
        order: 6
    }
];

async function migrate() {
    try {
        console.log('Starting migration process...');
        
        // Connect to MongoDB
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB successfully');

        // Get admin user for default sections
        console.log('Finding super admin user...');
        const admin = await User.findOne({ role: 'super' });
        if (!admin) {
            throw new Error('No super admin found in the system');
        }
        console.log('Found super admin:', admin.email);

        // Create default sections
        console.log('\nCreating default sections...');
        const createdSections = [];
        for (const section of defaultSections) {
            try {
                const existingSection = await Section.findOne({ name: section.name });
                if (existingSection) {
                    console.log(`Section "${section.name}" already exists, updating...`);
                    Object.assign(existingSection, section);
                    await existingSection.save();
                    createdSections.push(existingSection);
                } else {
                    console.log(`Creating new section: ${section.name}`);
                    const newSection = await Section.create({
                        ...section,
                        createdBy: admin._id
                    });
                    createdSections.push(newSection);
                }
            } catch (error) {
                console.error(`Error processing section "${section.name}":`, error.message);
            }
        }

        // Get the Documentation section ID (default section)
        const defaultSection = createdSections.find(s => s.name === 'Documentation');
        if (!defaultSection) {
            throw new Error('Failed to create default Documentation section');
        }
        
        // Update articles without sections
        console.log('\nUpdating existing articles...');
        const articlesWithoutSections = await Article.countDocuments({ 
            $or: [
                { sections: { $exists: false } },
                { sections: { $size: 0 } },
                { sections: null }
            ]
        });
        console.log(`Found ${articlesWithoutSections} articles without sections`);

        const updateResult = await Article.updateMany(
            { 
                $or: [
                    { sections: { $exists: false } },
                    { sections: { $size: 0 } },
                    { sections: null }
                ]
            },
            { 
                $set: { sections: [defaultSection._id] }
            }
        );

        console.log(`Updated ${updateResult.modifiedCount} articles with default section`);
        
        // Update article counts for all sections
        console.log('\nUpdating article counts for sections...');
        for (const section of createdSections) {
            try {
                await section.updateArticleCount();
                const count = await Article.countDocuments({ sections: section._id });
                console.log(`Section "${section.name}": ${count} articles`);
            } catch (error) {
                console.error(`Error updating count for section "${section.name}":`, error.message);
            }
        }

        console.log('\nMigration completed successfully!');
    } catch (error) {
        console.error('\nMigration failed:', error.message);
    } finally {
        if (mongoose.connection.readyState === 1) {
            console.log('Closing database connection...');
            await mongoose.connection.close();
            console.log('Database connection closed');
        }
        process.exit();
    }
}

// Run migration
console.log('=== Section Migration Script ===');
migrate().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});