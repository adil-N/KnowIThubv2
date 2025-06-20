// config/tagExtractionConfig.js

module.exports = {
    // Basic extraction parameters
    extraction: {
        minWordLength: 3,
        maxWordLength: 25,
        minFrequency: 2,
        maxTags: 8,
        minRelevanceScore: 0.3
    },

    // Scoring weights for relevance calculation
    scoring: {
        frequencyWeight: 0.3,
        titlePresenceBonus: 0.4,
        valuableTermBonus: 0.5,
        phraseBonus: 0.3,
        technicalTermBonus: 0.2,
        lengthBonus: 0.1,
        commonTermPenalty: 0.3
    },

    // Domain-specific valuable terms that should be prioritized
    // Customize these for your organization's specific technologies and tools
    valuableTerms: [
        // Cloud & Infrastructure
        'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'terraform',
        'ansible', 'jenkins', 'gitlab', 'github', 'bitbucket',
        
        // Databases
        'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
        'oracle', 'sqlserver', 'cassandra', 'dynamodb',
        
        // Programming & Frameworks
        'nodejs', 'python', 'javascript', 'typescript', 'golang',
        'java', 'dotnet', 'react', 'angular', 'vue', 'express',
        
        // Business Applications
        'salesforce', 'sharepoint', 'confluence', 'jira', 'tableau',
        'powerbi', 'slack', 'teams', 'zoom', 'webex',
        
        // Security & Protocols
        'oauth', 'saml', 'ldap', 'ssl', 'tls', 'vpn', 'firewall',
        'encryption', 'certificate', 'authentication',
        
        // File Formats & Standards
        'json', 'xml', 'yaml', 'csv', 'pdf', 'api', 'rest', 'soap',
        
        // Methodologies
        'agile', 'scrum', 'kanban', 'devops', 'cicd', 'gitops',
        
        // Add your organization-specific terms here
        'yourcompany', 'specifictools', 'businessterms'
    ],

    // Enhanced blacklist of terms that should never become tags
    blacklistedTerms: [
        // Basic stop words are included automatically
        
        // Generic IT terms
        'system', 'application', 'software', 'computer', 'technology',
        'solution', 'method', 'process', 'function', 'feature',
        'tool', 'service', 'platform', 'interface', 'framework',
        'library', 'module', 'component', 'element', 'object',
        'file', 'folder', 'directory', 'path', 'location',
        'text', 'content', 'data', 'information', 'document',
        'page', 'screen', 'window', 'dialog', 'form', 'field',
        'button', 'link', 'menu', 'option', 'setting', 'configuration',
        
        // Generic actions
        'create', 'add', 'edit', 'update', 'delete', 'remove',
        'save', 'load', 'open', 'close', 'start', 'stop',
        'run', 'execute', 'perform', 'check', 'verify',
        'view', 'show', 'display', 'hide', 'enable', 'disable',
        'preview', 'review', 'browse', 'search', 'find',
        
        // Common descriptors
        'new', 'old', 'current', 'latest', 'previous', 'next',
        'main', 'primary', 'basic', 'advanced', 'simple', 'complex',
        'easy', 'difficult', 'quick', 'slow', 'large', 'small',
        'good', 'bad', 'best', 'better',
        
        // Your domain-specific generic terms
        'ddf', 'pos', 'concourse', 'excel', 'browser', 'tag', 'tags',
        
        // Add more terms specific to your environment
    ],

    // Patterns that indicate technical terms (regex patterns)
    technicalPatterns: [
        /^[a-z]+\d+$/,           // tech123
        /^\d+[a-z]+$/,           // 365office
        /^[a-z]+-[a-z]+$/,       // tech-term
        /api$/,                  // ends with api
        /^micro/,                // microservices, etc.
        /sql$/,                  // anything ending in sql
        /^auto/,                 // automation terms
        /config$/,               // configuration terms
        /^multi/,                // multi-something
    ],

    // Patterns for meaningful phrases
    meaningfulPhrasePatterns: [
        /\w+ (server|client|service|protocol|framework|library|database)/,
        /\w+ (management|configuration|installation|deployment)/,
        /(user|access|security|network) \w+/,
        /\w+ (integration|automation|monitoring|backup)/,
        /(active|microsoft|google|amazon|oracle) \w+/,
    ],

    // Patterns for highly specific 3-word phrases
    specificPhrasePatterns: [
        /\w+ \w+ (server|service|protocol|framework)/,
        /(active|microsoft|google) \w+ \w+/,
        /\w+ (security|access) (control|management)/,
        /(single|multi) \w+ (authentication|authorization)/,
    ]
};