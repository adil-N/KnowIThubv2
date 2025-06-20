// config/database.js - Enhanced for Windows sleep/hibernation issues
const mongoose = require('mongoose');

let isIndexesEnsured = false;
let isConnecting = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

const connectDB = async () => {
    try {
        // Prevent multiple simultaneous connection attempts
        if (isConnecting) {
            console.log('⏳ Connection attempt already in progress...');
            return;
        }

        isConnecting = true;

        // Enhanced connection options for Windows reliability (compatible with newer Mongoose)
        const options = {
            // Connection timeouts - more aggressive for Windows
            serverSelectionTimeoutMS: 10000,  // Increased from 5000
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            
            // Heartbeat and monitoring
            heartbeatFrequencyMS: 2000,
            
            // Retry settings
            retryWrites: true,
            retryReads: true,
            
            // Connection pool settings
            maxPoolSize: 10,
            minPoolSize: 2,
            maxIdleTimeMS: 30000,
            
            // Force IPv4 to avoid Windows IPv6 issues after sleep
            family: 4,
            
            // Read preference
            readPreference: 'primary'
        };

        console.log('🔌 Attempting to connect to MongoDB...');
        console.log('📍 URI:', process.env.MONGODB_URI ? 
            process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@') : 
            'mongodb://127.0.0.1:27017/database_name'
        );

        // Try to connect with enhanced error handling
        const conn = await mongoose.connect(process.env.MONGODB_URI, options);
        
        isConnecting = false;
        reconnectAttempts = 0;
        
        if (conn.connection.readyState === 1) {
            console.log('\x1b[32m%s\x1b[0m', '✓ MongoDB connected successfully');
            console.log('📊 Connection details:', {
                database: conn.connection.name,
                host: conn.connection.host,
                port: conn.connection.port,
                readyState: getReadyStateText(conn.connection.readyState)
            });
        }

        // Enhanced index creation with error handling
        if (!isIndexesEnsured) {
            mongoose.connection.once('connected', async () => {
                try {
                    if (mongoose.connection.models.Article) {
                        await mongoose.connection.models.Article.collection.createIndex(
                            { articleId: 1 },
                            { unique: true, background: true }
                        );
                        console.log('✓ Article indexes created successfully');
                        isIndexesEnsured = true;
                    }
                } catch (indexError) {
                    console.error('⚠️  Error creating indexes:', indexError.message);
                }
            });
        }

        setupEventListeners();
        return conn;

    } catch (error) {
        isConnecting = false;
        console.error('\x1b[31m%s\x1b[0m', '✗ MongoDB connection error:', error.message);
        
        // Enhanced error handling for Windows-specific issues
        if (error.name === 'MongooseServerSelectionError' || error.code === 'ECONNREFUSED') {
            console.error('🚨 Connection Details:', {
                message: error.message,
                code: error.code,
                codeName: error.codeName || 'Unknown'
            });
            
            console.log('\n💡 Windows MongoDB Troubleshooting:');
            console.log('1. Check if MongoDB service is running: net start MongoDB');
            console.log('2. Restart MongoDB service: net stop MongoDB && net start MongoDB');
            console.log('3. Check connection string uses 127.0.0.1 instead of localhost');
            console.log('4. Verify MongoDB is listening: netstat -an | findstr :27017');
            console.log('5. Check MongoDB logs in: C:\\Program Files\\MongoDB\\Server\\*\\log\\');
            
            // Handle post-sleep connection issues
            if (error.code === 'ECONNREFUSED') {
                console.log('\n🔧 This often happens after Windows sleep/hibernation.');
                console.log('   Try restarting the MongoDB service or running start-production.bat');
            }
        }
        
        // Exit on connection failure for initial startup (like your original code)
        console.error('❌ Failed to connect to MongoDB. Exiting...');
        process.exit(1);
    }
};

function setupEventListeners() {
    // Connection successful
    mongoose.connection.on('connected', () => {
        console.log('🟢 MongoDB connection established');
        reconnectAttempts = 0;
    });

    // Enhanced error monitoring with Windows-specific handling
    mongoose.connection.on('error', err => {
        console.error('\x1b[31m%s\x1b[0m', '🔴 MongoDB connection error:', err.message);
        
        // Check for Windows sleep-related errors
        if (err.code === 'ECONNREFUSED' || err.name === 'MongoNetworkError') {
            console.log('💤 This may be due to Windows sleep/hibernation.');
            console.log('   MongoDB service might need restarting.');
        }
    });

    // Connection lost - handle Windows sleep scenarios
    mongoose.connection.on('disconnected', () => {
        console.log('\x1b[33m%s\x1b[0m', '🟡 MongoDB disconnected');
        isIndexesEnsured = false;
        
        // Only attempt reconnection if not already connecting and not shutting down
        if (!isConnecting && !process.exitCode && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`🔄 Attempting reconnection ${reconnectAttempts}/${maxReconnectAttempts} in 5 seconds...`);
            setTimeout(() => {
                connectDB();
            }, 5000);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
            console.log('🚨 Max reconnection attempts reached. Manual intervention required.');
            console.log('   Please restart MongoDB service: net stop MongoDB && net start MongoDB');
        }
    });

    // Reconnection successful
    mongoose.connection.on('reconnected', () => {
        console.log('🟢 MongoDB reconnected successfully');
        reconnectAttempts = 0;
    });

    // Graceful shutdown handling
    process.on('SIGINT', async () => {
        await gracefulShutdown('SIGINT');
    });
    
    process.on('SIGTERM', async () => {
        await gracefulShutdown('SIGTERM');
    });
    
    // Handle Windows-specific shutdown signals
    process.on('SIGUSR2', async () => {
        await gracefulShutdown('SIGUSR2'); // nodemon restart
    });
}

async function gracefulShutdown(signal) {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    try {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log('\x1b[33m%s\x1b[0m', '✓ MongoDB connection closed gracefully');
        }
        process.exit(0);
    } catch (err) {
        console.error('\x1b[31m%s\x1b[0m', '✗ Error during graceful shutdown:', err.message);
        process.exit(1);
    }
}

function getReadyStateText(state) {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    return states[state] || 'unknown';
}

// Health check function for monitoring
const healthCheck = async () => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return { healthy: false, status: 'disconnected', readyState: mongoose.connection.readyState };
        }
        
        // Ping the database
        await mongoose.connection.db.admin().ping();
        
        return {
            healthy: true,
            status: 'connected',
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            database: mongoose.connection.name,
            readyState: mongoose.connection.readyState
        };
        
    } catch (error) {
        return {
            healthy: false,
            status: 'error',
            error: error.message,
            readyState: mongoose.connection.readyState
        };
    }
};

// Export connectDB as default function (maintains compatibility)
module.exports = connectDB;

// Add additional exports as properties (for new functionality)
module.exports.healthCheck = healthCheck;
module.exports.getConnectionStatus = () => ({
    readyState: mongoose.connection.readyState,
    status: getReadyStateText(mongoose.connection.readyState),
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    database: mongoose.connection.name,
    reconnectAttempts
});