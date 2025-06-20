// utils/contentCleaner.js
const { JSDOM } = require('jsdom');

class ContentCleaner {
    static cleanHTML(content) {
        try {
            // Create a new DOM parser
            const dom = new JSDOM(content);
            const document = dom.window.document;

            // Remove all script and style tags
            document.querySelectorAll('script, style').forEach(el => el.remove());

            // Clean up images - replace base64 and data URIs with placeholders
            document.querySelectorAll('img').forEach(img => {
                if (img.src.startsWith('data:')) {
                    img.removeAttribute('src');
                }
            });

            // Get text content only
            let text = document.body.textContent || '';

            // Remove technical patterns
            text = text
                // Remove base64 content
                .replace(/data:[^;]+;base64,[a-zA-Z0-9+/]+=*/g, '')
                // Remove URLs
                .replace(/https?:\/\/[^\s]+/g, '')
                // Remove file paths
                .replace(/\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+/g, '')
                // Remove binary-looking content
                .replace(/[a-zA-Z0-9+/]{30,}={0,2}/g, '')
                // Remove hex values
                .replace(/\b[A-F0-9]{6,}\b/g, '')
                // Remove multiple spaces
                .replace(/\s+/g, ' ')
                .trim();

            return text;
        } catch (error) {
            console.error('Error cleaning content:', error);
            // Fallback to basic cleaning
            return content
                .replace(/<[^>]+>/g, ' ')
                .replace(/data:[^;]+;base64,[a-zA-Z0-9+/]+=*/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        }
    }
}

module.exports = ContentCleaner;