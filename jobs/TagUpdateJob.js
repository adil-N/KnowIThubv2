// jobs/tagUpdateJob.js - Updated version
const Article = require('../models/Article');
const TagProcessor = require('../utils/TagProcessor');

class TagUpdateJob {
    constructor() {
        this.isRunning = false;
        this.batchSize = 10;
        this.processor = new TagProcessor();
    }

    async start() {
        if (this.isRunning) {
            console.log('Tag update job is already running');
            return;
        }

        this.isRunning = true;
        console.log('\n=== Starting Enhanced Tag Update Job ===');

        try {
            await this.processArticles();
            console.log('Enhanced tag update job completed successfully');
        } catch (error) {
            console.error('Error in enhanced tag update job:', error);
        } finally {
            this.isRunning = false;
        }
    }

    async processArticles() {
        try {
            // Enhanced query to find articles needing tag processing
            const query = {
                $or: [
                    { autoTags: { $exists: false } },
                    { autoTags: { $size: 0 } },
                    {
                        $and: [
                            { content: { $exists: true } },
                            { content: { $ne: '' } },
                            {
                                $or: [
                                    { tagMeta: { $exists: false } },
                                    { 'tagMeta.lastExtracted': { $exists: false } },
                                    { 'tagMeta.extractionVersion': { $lt: 2 } }, // Force re-extraction with new algorithm
                                    {
                                        'tagMeta.lastExtracted': {
                                            $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            console.log('\n=== Enhanced Tag Update Job Debug ===');
            
            const totalArticles = await Article.countDocuments();
            console.log(`Total articles in database: ${totalArticles}`);
            
            // Find articles that need processing
            const articles = await Article.find(query)
                .limit(this.batchSize)
                .select('title content tags autoTags tagMeta')
                .lean();

            console.log(`Found ${articles.length} articles to process in this batch`);

            // Process each article
            let successCount = 0;
            let errorCount = 0;
            let skippedCount = 0;

            for (const article of articles) {
                try {
                    if (!article.content || article.content.trim().length === 0) {
                        console.log(`Skipping article ${article._id}: No content`);
                        skippedCount++;
                        continue;
                    }

                    const articleDoc = await Article.findById(article._id);
                    if (!articleDoc) {
                        console.log(`Article ${article._id} not found, skipping`);
                        skippedCount++;
                        continue;
                    }

                    await this.processArticle(articleDoc);
                    successCount++;

                } catch (error) {
                    console.error(`Error processing article ${article._id}:`, error);
                    errorCount++;
                }
            }

            console.log('\n=== Enhanced Processing Summary ===');
            console.log(`Total articles processed: ${articles.length}`);
            console.log(`Successful: ${successCount}`);
            console.log(`Failed: ${errorCount}`);
            console.log(`Skipped: ${skippedCount}`);

            return {
                total: articles.length,
                successful: successCount,
                failed: errorCount,
                skipped: skippedCount
            };

        } catch (error) {
            console.error('Error in enhanced processArticles:', error);
            throw error;
        }
    }

    async processArticle(article) {
        try {
            console.log(`\n=== Enhanced Processing Article: ${article._id} ===`);
            console.log('Article state before processing:', {
                title: article.title,
                currentTags: article.tags || [],
                currentAutoTags: article.autoTags || [],
                hasContent: !!article.content,
                contentLength: article.content?.length || 0,
                tagMeta: article.tagMeta || null
            });

            // Skip if no content
            if (!article.content || article.content.trim().length === 0) {
                console.log('Skipping: No content to process');
                return;
            }

            // Extract tags using enhanced processor
            const autoTags = await this.processor.extractTags(
                article.title || '',
                article.content || ''
            );

            console.log('Generated enhanced auto tags:', autoTags);

            // Filter out redundant tags using enhanced filtering
            const filteredTags = this.processor.filterRedundantTags(
                autoTags,
                article.tags || []
            );

            console.log('Enhanced filtered tags:', filteredTags);

            // Update article with enhanced metadata
            article.autoTags = filteredTags;
            article.tagMeta = {
                lastExtracted: new Date(),
                extractionVersion: 2, // Updated version for enhanced algorithm
                processorVersion: 'enhanced',
                tagCount: filteredTags.length,
                processingTime: new Date()
            };

            // Save without triggering pre-save hooks
            await article.save({ timestamps: false });
            
            console.log('Article state after enhanced processing:', {
                id: article._id,
                autoTags: article.autoTags,
                tagMeta: article.tagMeta,
                updateTime: new Date()
            });

        } catch (error) {
            console.error(`Error in enhanced processing article ${article._id}:`, error);
            throw error;
        }
    }

    async processNewArticle(articleId) {
        try {
            console.log(`\n=== Enhanced Processing New Article: ${articleId} ===`);
            
            const article = await Article.findById(articleId);
            if (!article) {
                throw new Error('Article not found');
            }

            await this.processArticle(article);
            return true;
        } catch (error) {
            console.error('Error in enhanced processing new article:', error);
            return false;
        }
    }

    // Method to re-process all articles with enhanced algorithm
    async reprocessAllArticles() {
        try {
            console.log('\n=== Starting Enhanced Re-processing of All Articles ===');
            
            const articles = await Article.find({
                content: { $exists: true, $ne: '' }
            }).select('title content tags autoTags tagMeta');

            console.log(`Found ${articles.length} articles to re-process`);

            let processed = 0;
            for (const article of articles) {
                try {
                    await this.processArticle(article);
                    processed++;
                    
                    if (processed % 10 === 0) {
                        console.log(`Enhanced re-processing progress: ${processed}/${articles.length}`);
                    }
                } catch (error) {
                    console.error(`Error re-processing article ${article._id}:`, error);
                }
            }

            console.log(`Enhanced re-processing completed: ${processed}/${articles.length} articles processed`);
            return processed;
        } catch (error) {
            console.error('Error in enhanced re-processing all articles:', error);
            throw error;
        }
    }

    // Method to get tag statistics
    async getTagStatistics() {
        try {
            const stats = await Article.aggregate([
                {
                    $match: {
                        autoTags: { $exists: true, $ne: [] }
                    }
                },
                {
                    $project: {
                        tagCount: { $size: "$autoTags" },
                        autoTags: 1,
                        extractionVersion: "$tagMeta.extractionVersion"
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalArticlesWithTags: { $sum: 1 },
                        averageTagsPerArticle: { $avg: "$tagCount" },
                        maxTags: { $max: "$tagCount" },
                        minTags: { $min: "$tagCount" },
                        enhancedVersionCount: {
                            $sum: {
                                $cond: [{ $gte: ["$extractionVersion", 2] }, 1, 0]
                            }
                        }
                    }
                }
            ]);

            // Get most common auto tags
            const commonTags = await Article.aggregate([
                { $unwind: "$autoTags" },
                { $group: { _id: "$autoTags", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 20 }
            ]);

            return {
                statistics: stats[0] || {},
                commonTags: commonTags
            };
        } catch (error) {
            console.error('Error getting tag statistics:', error);
            return null;
        }
    }
}

// Export a single instance
module.exports = new TagUpdateJob();
