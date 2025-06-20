// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const connectDB = require('./config/database');
const errorMiddleware = require('./middleware/errorMiddleware');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const mime = require('mime-types');
const { startCleanupJob } = require('./jobs/articleCleanupJob');
const fileCleanupService = require('./jobs/fileCleanupJob');
const tagUpdateJob = require('./jobs/TagUpdateJob');
const backupRoutes = require('./routes/backupRoutes');
const backupService = require('./services/backupService');
const backupJob = require('./jobs/backupJob');
const superAdminStatsRoutes = require('./routes/superAdminStats');

// Import middleware, models, and routes
const auth = require('./middleware/auth');
const codeRoutes = require('./routes/codeRoutes');
const User = require('./models/User');
const userController = require('./controllers/userController');
const adminRoutes = require('./routes/adminRoutes');
const articleRoutes = require('./routes/articleRoutes');
const userRoutes = require('./routes/userRoutes');
const commentRoutes = require('./routes/commentRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const inviteCodeRoutes = require('./routes/inviteCodeRoutes');
const sectionRoutes = require('./routes/sectionRoutes'); 
const linkRoutes = require('./routes/linkRoutes');
const { setupDirectories } = require('./utils/directorySetup');
const phoneDirectoryRoutes = require('./routes/phoneDirectoryRoutes');
const bookmarkRoutes = require('./routes/bookmarkRoutes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Memory monitoring function
function startMemoryMonitoring() {
    setInterval(() => {
        const memUsage = process.memoryUsage();
        const mb = (bytes) => Math.round(bytes / 1024 / 1024 * 100) / 100;
        
        console.log(`📊 Memory: RSS: ${mb(memUsage.rss)}MB, Heap: ${mb(memUsage.heapUsed)}MB/${mb(memUsage.heapTotal)}MB`);
        
        // Force garbage collection if heap usage is high
        if (memUsage.heapUsed > 300 * 1024 * 1024) { // 300MB threshold
            if (global.gc) {
                console.log('🗑️ Triggering garbage collection...');
                global.gc();
            }
        }
        
        // Alert if memory usage is critical
        if (memUsage.heapUsed > 600 * 1024 * 1024) { // 600MB threshold
            console.warn('⚠️ CRITICAL: High memory usage detected!', {
                heapUsed: mb(memUsage.heapUsed),
                heapTotal: mb(memUsage.heapTotal),
                rss: mb(memUsage.rss)
            });
        }
    }, 60000); // Check every minute
}


// Setup directories
setupDirectories();

// CORS configuration
const corsOptions = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000','http://knowithub.ddf.ae:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Cache-Control',
        'Pragma',
        'Accept'
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400
};

// Basic middleware setup
app.use(cors(corsOptions));

// FIXED: Enhanced middleware to prevent conflicts with multer
// Only apply JSON/URL parsing to non-multipart requests
app.use((req, res, next) => {
    // Skip body parsing for multipart/form-data requests - let multer handle them
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
        console.log('Skipping JSON/URL parsing for multipart request to:', req.path);
        return next();
    }
    
    // Apply JSON and URL encoding only for non-multipart requests
    express.json({ limit: '10mb' })(req, res, (err) => {
        if (err) return next(err);
        express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
    });
});


// Static file serving and uploads handling
app.use('/uploads/files', express.static(path.join(__dirname, 'uploads', 'files'), {
    setHeaders: (res, filePath) => {
        const mimeType = mime.lookup(filePath) || 'application/octet-stream';
        res.set({
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=3600',
            'X-Content-Type-Options': 'nosniff'
        });
        
        if (res.req.query.download === 'true') {
            const fileName = path.basename(filePath);
            res.set('Content-Disposition', `attachment; filename="${fileName}"`);
        } else {
            res.set('Content-Disposition', 'inline');
        }
    }
}));

// Add this near your other static file serving middleware
app.use('/vendor', express.static(path.join(__dirname, 'frontend/src/vendor'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) {
            res.set('Content-Type', 'text/css');
        } else if (filePath.endsWith('.js')) { // Add this condition for JS files
            res.set('Content-Type', 'application/javascript');
        }
    }
}));

app.use('/css', express.static(path.join(__dirname, 'frontend/css'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.set('Content-Type', 'text/css');
        }
    }
}));

app.use(express.static(path.join(__dirname, 'frontend/src')));

app.use('/js', express.static(path.join(__dirname, 'frontend/src/js'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.set('Content-Type', 'application/javascript');
        }
    }
}));

app.use('/frontend/src/js', express.static(path.join(__dirname, 'frontend/src/js'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.set('Content-Type', 'application/javascript');
        }
    }
}));

// added to w/o cdn
// Serve static files from the fonts directory
// In server.js - updated for TTF fonts
app.use('/fonts', express.static(path.join(__dirname, 'frontend/fonts'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.ttf')) {
      res.set('Content-Type', 'font/ttf');
    } else if (path.endsWith('.woff2')) {
      res.set('Content-Type', 'font/woff2');
    }
  }
}));

// Setup file preview and CORS
const previewMiddleware = require('./middleware/filePreview');
previewMiddleware.setupPreviewRoutes(app);

app.use((req, res, next) => {
    if (req.path.startsWith('/uploads/files/')) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
    }
    next();
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                "https://cdn.tailwindcss.com",
                "https://cdnjs.cloudflare.com",
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://cdn.tailwindcss.com",
                "https://cdnjs.cloudflare.com"
            ],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "https://api.your-domain.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
            frameSrc: ["'self'", "https://docs.google.com"],
            objectSrc: ["'self'"],
            mediaSrc: ["'self'", "blob:"],
            workerSrc: ["'self'", "blob:"],
            childSrc: ["'self'", "blob:"],
            frameAncestors: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Routes setup
// Public routes
app.post('/api/users/login', userController.login);
app.post('/api/users/register', userController.register);
app.post('/api/users/force-change-password', userController.forceChangePassword);

// Protected routes
app.use('/api', auth);
app.use('/api/admin/super', superAdminRoutes);
app.use('/api/admin', adminRoutes);

// CRITICAL FIX: Remove the global upload.any() middleware that was causing conflicts
// Let articleRoutes handle its own multer middleware
app.use('/api/articles', articleRoutes);

app.use('/api/users', userRoutes);
try {
    console.log('✓ Registering invite code routes...');
    app.use('/api/admin/invite-codes', inviteCodeRoutes);
    
    console.log('✓ Registering section routes...');
    app.use('/api/sections', sectionRoutes);
    
    console.log('✓ Registering link routes...');
    app.use('/api/links', linkRoutes);
    
    console.log('✓ Registering code routes...');
    app.use('/api/code-snippets', codeRoutes);
    
    console.log('✓ Registering comment routes...');
    app.use('/api/articles/:articleId/comments', commentRoutes);  // ← Likely problematic
    
    console.log('✓ Registering phone directory routes...');
    app.use('/api/phone-directory', phoneDirectoryRoutes);
    
    console.log('✓ Registering bookmark routes...');
    app.use('/api/bookmarks', bookmarkRoutes);
    
} catch (error) {
    console.error('ERROR during route registration:', error);
    throw error;
}
//  stats
app.use('/api/admin/super/stats', superAdminStatsRoutes);

// app.use('/api/admin', auth);
app.use('/api/admin', backupRoutes);

// Token refresh endpoint
// Update in server.js - modify the refresh token route
app.post('/api/auth/refresh-token', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Generate a new token with a 24-hour expiry
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ 
            success: true, 
            token,
            user: {
                _id: user._id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            message: 'Error refreshing token'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});


// Enhanced health check that includes MongoDB status
app.get('/health/detailed', async (req, res) => {
    try {
        const connectDB = require('./config/database');
        const { healthCheck } = require('./config/database');
        const mongoHealth = await healthCheck();
        
        res.json({
            status: 'ok',
            timestamp: new Date(),
            mongodb: mongoHealth,
            nodejs: {
                version: process.version,
                uptime: process.uptime(),
                memory: process.memoryUsage()
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            timestamp: new Date(),
            error: error.message,
            mongodb: { healthy: false, status: 'error' }
        });
    }
});


// Frontend catch-all route
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/src/index.html'));
});

// Add this before the error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', {
        message: err.message,
        stack: err.stack,
        name: err.name
    });

    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.stack : 'An unexpected error occurred'
    });
});

// Error handling middleware
app.use(errorMiddleware.notFound);
app.use(errorMiddleware.errorHandler);

// MongoDB connection handling
mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});

// Declare articleCleanupInterval in the global scope
let articleCleanupInterval;

mongoose.connection.once('open', async () => {
    console.log('MongoDB connected successfully');
    try {
        console.log('Initializing cleanup services...');
        
        // Start memory monitoring
        startMemoryMonitoring();
        
        // Start file cleanup with error handling
        try {
            await fileCleanupService.start();
            console.log('✅ File cleanup service started');
        } catch (error) {
            console.error('❌ File cleanup service failed:', error);
        }

        // Start article cleanup with error handling
        console.log('Starting article cleanup job...');
        try {
            articleCleanupInterval = startCleanupJob();
            console.log('✅ Article cleanup job started');
        } catch (error) {
            console.error('❌ Article cleanup job failed:', error);
        }

        // Start tag update job with error handling
        console.log('Starting tag update job...');
        const startTagUpdateJob = async () => {
            try {
                await tagUpdateJob.start();
                console.log('✅ Tag update job completed successfully');
            } catch (err) {
                console.error('❌ Error in tag update job:', err);
            }
        };
        
        try {
            await startTagUpdateJob();
            global.tagUpdateInterval = setInterval(startTagUpdateJob, 5 * 60 * 1000);
            console.log('✅ Tag update interval started');
        } catch (error) {
            console.error('❌ Tag update job initialization failed:', error);
        }
        
        console.log('✅ All cleanup services initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing cleanup services:', error);
    }
});


// Add this function before startServer()
const createInitialAdmins = async () => {
    try {
        // Import models here since we removed the external file
        const User = require('./models/User');
        const InviteCode = require('./models/InviteCode');
        
        // Check if any super admin exists
        const superAdminExists = await User.findOne({ role: 'super' });
        
        if (!superAdminExists) {
            console.log('🔧 Creating initial system administrators...');
            
            // Create SYSTEM invite code for admin creation
            const systemInviteCode = new InviteCode({
                code: 'SYSTEM_INITIAL_SETUP_2024',
                isActive: true,
                createdBy: null, // System generated
                maxUses: 2, // Only for super admin and admin
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                description: 'System generated code for initial admin setup'
            });
            await systemInviteCode.save();
            
            // Create Super Admin
            const superAdmin = new User({
                firstName: 'Super',
                lastName: 'Admin',
                email: process.env.SUPER_ADMIN_EMAIL || 'super.supercms@ddf.ae',
                password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAD*1987',
                role: 'super',
                status: 'active',
                profileCompleted: true,
                inviteCode: 'SYSTEM_INITIAL_SETUP_2024'
            });
            await superAdmin.save();
            
            // Mark invite code as used
            await systemInviteCode.markAsUsed(superAdmin._id);
            
            // Create Default Admin
            const defaultAdmin = new User({
                firstName: 'System',
                lastName: 'Admin', 
                email: process.env.DEFAULT_ADMIN_EMAIL || 'admin.one@ddf.ae',
                password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin***2025',
                role: 'admin',
                status: 'active',
                profileCompleted: true,
                inviteCode: 'SYSTEM_INITIAL_SETUP_2024'
            });
            await defaultAdmin.save();
            
            // Mark invite code as used again
            await systemInviteCode.markAsUsed(defaultAdmin._id);
            
            console.log('✅ Initial administrators created successfully');
            console.log('✅ Super Admin: super.supercms@ddf.ae');
            console.log('✅ Default Admin: admin.one@ddf.ae');
            console.log('⚠️  IMPORTANT: Remove admin creation logic after first run!');
            
            // Clean up system invite code
            await systemInviteCode.deleteOne();
        }
    } catch (error) {
        console.error('❌ Error creating initial admins:', error);
    }
};

// Server startup and shutdown
async function startServer() {
    try {
        await connectDB();
        // Inside the try block after await connectDB();
        console.log('Starting backup job...');
        backupJob.start();
        console.log('MongoDB connected successfully');
        await createInitialAdmins();

        const server = app.listen(PORT, () => {
            console.log('\x1b[36m%s\x1b[0m', '🚀 Server is running!');
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`\x1b[31mError: Port ${PORT} is already in use\x1b[0m`);
                process.exit(1);
            } else {
                console.error('Server error:', err);
                process.exit(1);
            }
        });

       const gracefulShutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');
    try {
        console.log('📊 Final memory usage:', {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
        });
        
        // Stop all cleanup services
        if (fileCleanupService?.stop) {
            console.log('🛑 Stopping file cleanup service...');
            fileCleanupService.stop();
        }
        
        if (global.tagUpdateInterval) {
            console.log('🛑 Clearing tag update interval...');
            clearInterval(global.tagUpdateInterval);
            global.tagUpdateInterval = null;
        }
        
        if (articleCleanupInterval) {
            console.log('🛑 Clearing article cleanup interval...');
            clearInterval(articleCleanupInterval);
            articleCleanupInterval = null;
        }
        
        // Stop backup job
        if (backupJob?.stop) {
            console.log('🛑 Stopping backup job...');
            backupJob.stop();
        }
        
        // Force garbage collection before shutdown
        if (global.gc) {
            console.log('🗑️ Final garbage collection...');
            global.gc();
        }
        
        // Close MongoDB connection with timeout
        console.log('🛑 Closing MongoDB connection...');
        await Promise.race([
            mongoose.connection.close(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('MongoDB close timeout')), 5000)
            )
        ]);
        
        // Close server
        server.close(() => {
            console.log('🚪 Server closed successfully');
            process.exit(0);
        });
        
        // Force exit after 10 seconds if graceful shutdown fails
        setTimeout(() => {
            console.error('🚨 Force closing server after timeout');
            process.exit(1);
        }, 10000);
        
    } catch (err) {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
    }
};

        ['SIGTERM', 'SIGINT', 'SIGUSR2'].forEach(signal => {
            process.on(signal, () => gracefulShutdown());
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
