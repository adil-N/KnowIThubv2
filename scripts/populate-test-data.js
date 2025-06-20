// scripts/populate-test-data.js
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import models
const User = require('../models/User');
const Article = require('../models/Article');
const Comment = require('../models/Comment');
const AdminLog = require('../models/AdminLog');

async function populateTestData() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected successfully to MongoDB');

        // Get all users
        const users = await User.find();
        if (users.length === 0) {
            console.error('No users found. Please ensure users exist before running this script.');
            return;
        }

        console.log(`Found ${users.length} users`);

        // Create test articles for each user
        for (const user of users) {
            console.log(`\nCreating content for user: ${user.email}`);
            
            // Create 2-5 articles per user
            const numArticles = Math.floor(Math.random() * 4) + 2;
            
            for (let i = 0; i < numArticles; i++) {
                const article = await Article.create({
                    title: `Test Article ${i + 1} by ${user.firstName}`,
                    content: `This is test content for article ${i + 1}. Created for testing.`,
                    author: user._id
                });

                // Log article creation
                await AdminLog.create({
                    adminId: user._id,
                    action: 'ARTICLE_CREATED',
                    targetArticle: article._id,
                    details: {
                        articleTitle: article.title,
                        articleId: article._id
                    }
                });

                // Add random views and comments
                const randomViews = Math.floor(Math.random() * 50);
                article.views = randomViews;
                await article.save();

                // Add random comments from other users
                for (const commenter of users) {
                    if (Math.random() > 0.7) { // 30% chance to comment
                        const comment = await Comment.create({
                            content: `Test comment from ${commenter.firstName}`,
                            author: commenter._id,
                            article: article._id
                        });

                        // Log comment creation
                        await AdminLog.create({
                            adminId: commenter._id,
                            action: 'COMMENT_ADDED',
                            targetArticle: article._id,
                            targetComment: comment._id,
                            details: {
                                articleTitle: article.title
                            }
                        });
                    }
                }
            }

            // Update user's last login with random recent date
            const daysAgo = Math.floor(Math.random() * 7);
            const lastLogin = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000));
            
            await User.findByIdAndUpdate(user._id, {
                lastLogin: lastLogin
            });

            // Log user login
            await AdminLog.create({
                adminId: user._id,
                action: 'USER_LOGIN',
                details: {
                    userEmail: user.email,
                    role: user.role
                }
            });
        }

        // Print summary
        const summary = await getSummary();
        console.log('\nData Population Summary:');
        console.log(JSON.stringify(summary, null, 2));

        console.log('\nTest data population completed successfully!');
    } catch (error) {
        console.error('Error populating test data:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
    }
}

async function getSummary() {
    const [articles, comments, logs, users] = await Promise.all([
        Article.countDocuments(),
        Comment.countDocuments(),
        AdminLog.countDocuments(),
        User.countDocuments()
    ]);

    return {
        totalUsers: users,
        totalArticles: articles,
        totalComments: comments,
        totalLogs: logs
    };
}

// Run the population
populateTestData();