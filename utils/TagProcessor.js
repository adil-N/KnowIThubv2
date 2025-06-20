// utils/tagProcessor.js
const natural = require('natural');
const stopwords = require('stopwords').english;
const cheerio = require('cheerio');

class TagProcessor {
    constructor() {
        this.tokenizer = new natural.WordTokenizer();
        this.stemmer = natural.PorterStemmer;
        
        // Configuration
        this.MIN_WORD_LENGTH = 3;
        this.MAX_WORD_LENGTH = 25;
        this.MIN_FREQUENCY = 2; // Increased minimum frequency
        this.MAX_TAGS = 8; // Reduced max tags for better quality
        this.MIN_RELEVANCE_SCORE = 0.3; // Minimum relevance threshold

        // Enhanced blacklist with IT-specific generic terms
        this.blacklist = new Set([
            // Basic stop words
            ...stopwords,
            
            // Generic IT terms that appear everywhere
            'system', 'application', 'software', 'computer', 'technology',
            'solution', 'method', 'process', 'function', 'feature',
            'tool', 'service', 'platform', 'interface', 'framework',
            'library', 'module', 'component', 'element', 'object',
            'file', 'folder', 'directory', 'path', 'location',
            'text', 'content', 'data', 'information', 'document',
            'page', 'screen', 'window', 'dialog', 'form', 'field',
            'button', 'link', 'menu', 'option', 'setting', 'configuration',
            'version', 'update', 'install', 'setup', 'download',
            'user', 'admin', 'administrator', 'account', 'profile',
            'login', 'logout', 'password', 'username', 'email',
            'database', 'table', 'record', 'entry', 'item',
            'list', 'array', 'string', 'number', 'value', 'variable',
            'code', 'script', 'program', 'command', 'syntax',
            'error', 'bug', 'issue', 'problem', 'fix', 'solution',
            'test', 'demo', 'example', 'sample', 'tutorial',
            'guide', 'help', 'support', 'manual', 'documentation',
            
            // Generic action words
            'create', 'add', 'edit', 'update', 'delete', 'remove',
            'save', 'load', 'open', 'close', 'start', 'stop',
            'run', 'execute', 'perform', 'check', 'verify',
            'view', 'show', 'display', 'hide', 'enable', 'disable',
            'select', 'choose', 'pick', 'click', 'press',
            'browse', 'search', 'find', 'locate', 'navigate',
            'preview', 'review', 'examine', 'analyze', 'compare',
            
            // Generic tech words from your example
            'excel', 'browser', 'preview', 'view',
            
            // Time and common descriptors
            'new', 'old', 'current', 'latest', 'previous', 'next',
            'first', 'second', 'third', 'last', 'final',
            'main', 'primary', 'secondary', 'basic', 'advanced',
            'simple', 'complex', 'easy', 'difficult', 'quick', 'slow',
            'large', 'small', 'big', 'little', 'high', 'low',
            'good', 'bad', 'best', 'better', 'worse', 'worst',
            
            // Common patterns that don't add value
            'step', 'steps', 'way', 'ways', 'how', 'what', 'when', 'where',
            'why', 'which', 'who', 'many', 'much', 'more', 'most',
            'some', 'any', 'all', 'every', 'each', 'other', 'another',
            
            // Your domain-specific generic terms
            'ddf', 'pos', 'concourse', 'gray', 'red', 'tag', 'tags'
        ]);

        // Domain-specific terms that add real value
        this.valuableTerms = new Set([
            // Specific technologies
            'kubernetes', 'docker', 'jenkins', 'terraform', 'ansible',
            'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
            'nodejs', 'python', 'javascript', 'typescript', 'golang',
            'react', 'angular', 'vue', 'express', 'fastapi',
            
            // Specific tools and brands
            'salesforce', 'sharepoint', 'tableau', 'powerbi', 'jira',
            'confluence', 'slack', 'teams', 'zoom', 'webex',
            'github', 'gitlab', 'bitbucket', 'jenkins', 'bamboo',
            
            // Specific protocols and standards
            'oauth', 'saml', 'ldap', 'ssl', 'tls', 'https', 'ssh',
            'smtp', 'imap', 'pop3', 'ftp', 'sftp', 'nfs',
            
            // Specific file formats
            'json', 'xml', 'yaml', 'csv', 'pdf', 'docx', 'xlsx',
            
            // Specific methodologies
            'agile', 'scrum', 'kanban', 'devops', 'cicd', 'gitops',
            
            // Business-specific terms (customize these for your domain)
            'invoice', 'billing', 'procurement', 'inventory', 'compliance',
            'audit', 'security', 'encryption', 'backup', 'recovery'
        ]);

        console.log('Enhanced TagProcessor initialized with enhanced filtering');
    }

    async extractTags(title = '', content = '') {
        try {
            console.log('\n=== Enhanced Tag Extraction ===');
            
            const cleanContent = this.cleanContent(content);
            const combinedText = `${title} ${cleanContent}`.toLowerCase();
            
            // Extract candidate terms
            const candidates = this.extractCandidateTerms(title, cleanContent);
            
            // Score each candidate for relevance
            const scoredCandidates = candidates.map(candidate => ({
                term: candidate.term,
                score: this.calculateRelevanceScore(candidate, combinedText, title)
            }));
            
            // Filter and sort by relevance score
            const relevantTags = scoredCandidates
                .filter(candidate => candidate.score >= this.MIN_RELEVANCE_SCORE)
                .sort((a, b) => b.score - a.score)
                .slice(0, this.MAX_TAGS)
                .map(candidate => candidate.term);
            
            console.log('Enhanced tags generated:', relevantTags);
            return relevantTags;
            
        } catch (error) {
            console.error('Error in enhanced tag extraction:', error);
            return [];
        }
    }

    extractCandidateTerms(title, content) {
        const candidates = new Map();
        
        // Process single words
        const titleWords = this.tokenizer.tokenize(title.toLowerCase()) || [];
        const contentWords = this.tokenizer.tokenize(content.toLowerCase()) || [];
        
        // Add title words with higher weight
        titleWords.forEach(word => {
            if (this.isValidCandidate(word)) {
                const key = word.toLowerCase();
                candidates.set(key, {
                    term: key,
                    titleFreq: (candidates.get(key)?.titleFreq || 0) + 1,
                    contentFreq: candidates.get(key)?.contentFreq || 0,
                    totalFreq: (candidates.get(key)?.totalFreq || 0) + 1
                });
            }
        });
        
        // Add content words
        contentWords.forEach(word => {
            if (this.isValidCandidate(word)) {
                const key = word.toLowerCase();
                candidates.set(key, {
                    term: key,
                    titleFreq: candidates.get(key)?.titleFreq || 0,
                    contentFreq: (candidates.get(key)?.contentFreq || 0) + 1,
                    totalFreq: (candidates.get(key)?.totalFreq || 0) + 1
                });
            }
        });
        
        // Extract meaningful phrases (2-3 words)
        const phrases = this.extractMeaningfulPhrases(content);
        phrases.forEach(phrase => {
            const key = phrase.toLowerCase();
            candidates.set(key, {
                term: key,
                titleFreq: title.toLowerCase().includes(key) ? 1 : 0,
                contentFreq: 1,
                totalFreq: 1,
                isPhrase: true
            });
        });
        
        return Array.from(candidates.values());
    }

    calculateRelevanceScore(candidate, fullText, title) {
        let score = 0;
        
        // Base frequency score (normalized)
        const freqScore = Math.min(candidate.totalFreq / 10, 1);
        score += freqScore * 0.3;
        
        // Title presence bonus
        if (candidate.titleFreq > 0) {
            score += 0.4;
        }
        
        // Valuable term bonus
        if (this.valuableTerms.has(candidate.term)) {
            score += 0.5;
        }
        
        // Phrase bonus (multi-word terms are often more specific)
        if (candidate.isPhrase) {
            score += 0.3;
        }
        
        // Technical term detection (contains specific patterns)
        if (this.isTechnicalTerm(candidate.term)) {
            score += 0.2;
        }
        
        // Uniqueness bonus (longer, more specific terms)
        if (candidate.term.length > 6) {
            score += 0.1;
        }
        
        // Penalty for overly common terms
        const commonTermPenalty = this.getCommonTermPenalty(candidate.term, fullText);
        score -= commonTermPenalty;
        
        return Math.max(0, Math.min(1, score));
    }

    isTechnicalTerm(term) {
        // Check for technical patterns
        const patterns = [
            /^[a-z]+\d+$/,           // tech123
            /^\d+[a-z]+$/,           // 365office
            /^[a-z]+-[a-z]+$/,       // tech-term
            /api$/,                  // ends with api
            /^micro/,                // microservices, etc.
            /sql$/,                  // anything ending in sql
            /^auto/,                 // automation terms
        ];
        
        return patterns.some(pattern => pattern.test(term));
    }

    getCommonTermPenalty(term, fullText) {
        // Calculate how "common" a term is across the document
        const termCount = (fullText.match(new RegExp(term, 'gi')) || []).length;
        const wordCount = fullText.split(/\s+/).length;
        const density = termCount / wordCount;
        
        // If term appears in more than 5% of content, it's probably too common
        if (density > 0.05) {
            return 0.3;
        }
        
        return 0;
    }

    extractMeaningfulPhrases(text) {
        if (!text) return [];
        
        const words = text.toLowerCase().split(/\s+/);
        const phrases = [];
        
        // Extract 2-word phrases
        for (let i = 0; i < words.length - 1; i++) {
            const phrase = `${words[i]} ${words[i + 1]}`;
            if (this.isMeaningfulPhrase(phrase)) {
                phrases.push(phrase);
            }
        }
        
        // Extract 3-word phrases for very specific terms
        for (let i = 0; i < words.length - 2; i++) {
            const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
            if (this.isMeaningfulPhrase(phrase) && this.isSpecificPhrase(phrase)) {
                phrases.push(phrase);
            }
        }
        
        return Array.from(new Set(phrases));
    }

    isMeaningfulPhrase(phrase) {
        if (!phrase) return false;
        
        const words = phrase.split(' ');
        
        // All words must be valid
        if (!words.every(word => this.isValidCandidate(word))) {
            return false;
        }
        
        // At least one word should be valuable or technical
        const hasValuableWord = words.some(word => 
            this.valuableTerms.has(word) || this.isTechnicalTerm(word)
        );
        
        // Check for meaningful patterns
        const meaningfulPatterns = [
            /\w+ (server|client|service|protocol|framework|library|database)/,
            /\w+ (management|configuration|installation|deployment)/,
            /(user|access|security|network) \w+/,
            /\w+ (integration|automation|monitoring|backup)/
        ];
        
        const hasPattern = meaningfulPatterns.some(pattern => pattern.test(phrase));
        
        return hasValuableWord || hasPattern;
    }

    isSpecificPhrase(phrase) {
        // Only keep 3-word phrases that are highly specific
        const specificPatterns = [
            /\w+ \w+ (server|service|protocol|framework)/,
            /(active|microsoft|google) \w+ \w+/,
            /\w+ (security|access) (control|management)/
        ];
        
        return specificPatterns.some(pattern => pattern.test(phrase));
    }

    isValidCandidate(word) {
        if (!word || typeof word !== 'string') return false;
        
        const normalized = word.toLowerCase().trim();
        
        // Basic validation
        if (normalized.length < this.MIN_WORD_LENGTH || 
            normalized.length > this.MAX_WORD_LENGTH) {
            return false;
        }
        
        // Check blacklist
        if (this.blacklist.has(normalized)) {
            return false;
        }
        
        // Must contain letters (no pure numbers or symbols)
        if (!/[a-z]/i.test(normalized)) {
            return false;
        }
        
        // Valid characters only
        if (!/^[a-z0-9-_]+$/i.test(normalized)) {
            return false;
        }
        
        // No repeating characters
        if (/(.)\1{2,}/.test(normalized)) {
            return false;
        }
        
        return true;
    }

    cleanContent(content) {
        try {
            if (!content) return '';
            
            const $ = cheerio.load(content);
            
            // Remove unwanted elements
            $('script, style, noscript, iframe, embed, object, video, audio').remove();
            $('img[src^="data:"], [style*="base64"]').remove();
            
            let text = $.text();
            
            // Clean up text
            text = text
                .replace(/\s+/g, ' ')
                .replace(/[^\w\s-]/g, ' ')
                .replace(/\b\d+\b/g, ' ') // Remove standalone numbers
                .replace(/\b[a-z]\b/gi, ' ') // Remove single letters
                .trim();
            
            return text;
            
        } catch (error) {
            console.error('Error cleaning content:', error);
            return content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }
    }

    filterRedundantTags(autoTags, manualTags) {
        console.log('Enhanced tag filtering:', {
            autoTagsCount: autoTags.length,
            manualTagsCount: manualTags.length
        });
        
        const manualTagSet = new Set(manualTags.map(tag => tag.toLowerCase()));
        
        const filteredTags = autoTags.filter(autoTag => {
            const normalized = autoTag.toLowerCase();
            
            // Skip exact matches
            if (manualTagSet.has(normalized)) {
                return false;
            }
            
            // Skip if any manual tag contains this term or vice versa
            for (const manualTag of manualTagSet) {
                if (manualTag.includes(normalized) || normalized.includes(manualTag)) {
                    return false;
                }
            }
            
            // Skip if still in blacklist (safety check)
            if (this.blacklist.has(normalized)) {
                return false;
            }
            
            return true;
        });
        
        console.log('Enhanced filtering result:', {
            originalCount: autoTags.length,
            remainingCount: filteredTags.length
        });
        
        return filteredTags;
    }
}

module.exports = TagProcessor;