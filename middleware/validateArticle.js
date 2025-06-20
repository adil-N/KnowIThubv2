// middleware/validateArticle.js
const validateArticle = (req, res, next) => {
    console.log('Validating article submission:', {
        body: req.body,
        files: req.files,
        contentType: req.headers['content-type']
    });

    try {
        // Check if title exists and is not undefined
        if (!req.body || typeof req.body.title === 'undefined') {
            console.log('Title validation failed:', {
                bodyExists: !!req.body,
                title: req.body?.title
            });
            return res.status(400).json({
                success: false,
                message: 'Title is required'
            });
        }

        // Trim title if it exists
        const title = req.body.title?.trim();
        if (!title) {
            console.log('Title is empty after trimming');
            return res.status(400).json({
                success: false,
                message: 'Title is required'
            });
        }

        // Validate temporary article settings
        if (req.body.temporaryDuration) {
            const validDurations = ['1h', '1w', '1m'];
            if (!validDurations.includes(req.body.temporaryDuration)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid expiration duration. Must be one of: 1h, 1w, 1m'
                });
            }
        }

        // If section is Flash Information, require temporary duration
        if (req.body.sectionId) {
            const Section = require('../models/Section');
            Section.findById(req.body.sectionId)
                .then(section => {
                    if (section?.name === 'Flash Information' && !req.body.temporaryDuration) {
                        return res.status(400).json({
                            success: false,
                            message: 'Flash Information articles must have an expiration time'
                        });
                    }
                    next();
                })
                .catch(error => {
                    console.error('Error validating section:', error);
                    next();
                });
        } else {
            next();
        }
    } catch (error) {
        console.error('Article validation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error validating article',
            error: error.message
        });
    }
};