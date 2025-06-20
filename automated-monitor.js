// automated-monitor.js - Fixed version with better error handling
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

class ProductionMonitor {
    constructor(config = {}) {
        this.config = {
            appName: config.appName || 'internal-cms',
            healthCheckUrl: config.healthCheckUrl || 'http://localhost:3000/health',
            checkInterval: config.checkInterval || 60000, // Increased to 60 seconds
            maxFailures: config.maxFailures || 5, // Increased to 5 failures
            logFile: config.logFile || 'logs/monitor.log',
            criticalMemoryThreshold: config.criticalMemoryThreshold || 700, // MB
            ...config
        };
        
        this.failureCount = 0;
        this.isMonitoring = false;
        this.lastHealthCheck = null;
        this.consecutiveFailures = 0;
        
        // Ensure logs directory exists
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.config.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}\n`;
        
        console.log(logMessage.trim());
        
        try {
            fs.appendFileSync(this.config.logFile, logMessage);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    async execCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
                if (error) {
                    reject({ error, stderr });
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    async checkPM2Status() {
        try {
            const output = await this.execCommand('pm2 jlist');
            const processes = JSON.parse(output);
            
            const app = processes.find(p => p.name === this.config.appName);
            
            if (!app) {
                throw new Error(`App ${this.config.appName} not found in PM2`);
            }
            
            return {
                status: app.pm2_env.status,
                memory: Math.round(app.monit.memory / 1024 / 1024), // Convert to MB
                cpu: app.monit.cpu,
                restarts: app.pm2_env.restart_time,
                uptime: app.pm2_env.pm_uptime,
                pid: app.pid
            };
        } catch (error) {
            throw new Error(`PM2 status check failed: ${error.message}`);
        }
    }

    async checkApplicationHealth() {
        return new Promise((resolve) => {
            const req = http.get(this.config.healthCheckUrl, { timeout: 10000 }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const health = JSON.parse(data);
                        resolve({
                            healthy: res.statusCode === 200,
                            response: health,
                            statusCode: res.statusCode
                        });
                    } catch (e) {
                        resolve({
                            healthy: res.statusCode === 200,
                            response: data,
                            statusCode: res.statusCode
                        });
                    }
                });
            });
            
            req.on('error', (error) => {
                resolve({
                    healthy: false,
                    error: error.message
                });
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve({
                    healthy: false,
                    error: 'Health check timeout'
                });
            });
        });
    }

    async checkMongoDBStatus() {
        try {
            // Try to check if MongoDB process is running
            const output = await this.execCommand('tasklist /FI "IMAGENAME eq mongod.exe"');
            const isRunning = output.includes('mongod.exe');
            
            return {
                running: isRunning,
                details: isRunning ? 'MongoDB process found' : 'MongoDB process not found'
            };
        } catch (error) {
            return {
                running: false,
                details: `Failed to check MongoDB: ${error.message}`
            };
        }
    }

    async restartApplication() {
        try {
            this.log('Attempting to restart application...', 'WARN');
            
            // Check MongoDB first
            const mongoStatus = await this.checkMongoDBStatus();
            if (!mongoStatus.running) {
                this.log('MongoDB is not running! Cannot restart app without database.', 'ERROR');
                return false;
            }
            
            // First try graceful restart
            await this.execCommand(`pm2 restart ${this.config.appName}`);
            this.log('Application restart command sent', 'INFO');
            
            // Wait longer for app to come online
            await this.sleep(15000);
            
            // Verify restart was successful
            const status = await this.checkPM2Status();
            if (status.status === 'online') {
                this.log(`Application is online after restart (PID: ${status.pid})`, 'INFO');
                this.failureCount = 0;
                this.consecutiveFailures = 0;
                return true;
            } else {
                throw new Error(`Application status is ${status.status} after restart`);
            }
        } catch (error) {
            this.log(`Restart failed: ${error.message}`, 'ERROR');
            return false;
        }
    }

    async forceRecovery() {
        try {
            this.log('Performing force recovery...', 'CRITICAL');
            
            // Check MongoDB first
            const mongoStatus = await this.checkMongoDBStatus();
            if (!mongoStatus.running) {
                this.log('CRITICAL: MongoDB is not running! Please start MongoDB first.', 'CRITICAL');
                this.log('Run: net start MongoDB (or start MongoDB manually)', 'CRITICAL');
                return false;
            }
            
            // Stop the app
            await this.execCommand(`pm2 stop ${this.config.appName}`).catch(() => {});
            await this.sleep(3000);
            
            // Delete the app
            await this.execCommand(`pm2 delete ${this.config.appName}`).catch(() => {});
            await this.sleep(3000);
            
            // Start from ecosystem file
            await this.execCommand('pm2 start ecosystem.config.js');
            await this.sleep(10000);
            
            // Save configuration
            await this.execCommand('pm2 save');
            
            this.log('Force recovery completed', 'INFO');
            this.failureCount = 0;
            this.consecutiveFailures = 0;
            return true;
        } catch (error) {
            this.log(`Force recovery failed: ${error.message}`, 'CRITICAL');
            return false;
        }
    }

    async performHealthCheck() {
        try {
            // Check MongoDB status first
            const mongoStatus = await this.checkMongoDBStatus();
            if (!mongoStatus.running) {
                throw new Error('MongoDB is not running');
            }
            
            // Check PM2 status
            const pm2Status = await this.checkPM2Status();
            
            if (pm2Status.status !== 'online') {
                throw new Error(`App is ${pm2Status.status}, expected online`);
            }
            
            // Check memory usage
            if (pm2Status.memory > this.config.criticalMemoryThreshold) {
                this.log(`High memory usage detected: ${pm2Status.memory}MB`, 'WARN');
                
                // Trigger restart if memory is too high
                if (pm2Status.memory > this.config.criticalMemoryThreshold + 200) {
                    this.log('Memory usage critical, triggering restart', 'WARN');
                    return await this.restartApplication();
                }
            }
            
            // Check application health endpoint
            const healthCheck = await this.checkApplicationHealth();
            
            if (!healthCheck.healthy) {
                throw new Error(`Health check failed: ${healthCheck.error || 'HTTP ' + healthCheck.statusCode}`);
            }
            
            // Reset failure count on successful check
            if (this.consecutiveFailures > 0) {
                this.log(`Application recovered after ${this.consecutiveFailures} failures`, 'INFO');
                this.consecutiveFailures = 0;
                this.failureCount = 0;
            }
            
            this.lastHealthCheck = new Date().toISOString();
            this.log(`Health check passed - Memory: ${pm2Status.memory}MB, CPU: ${pm2Status.cpu}%`, 'INFO');
            return { healthy: true, pm2Status, healthCheck };
            
        } catch (error) {
            this.consecutiveFailures++;
            this.failureCount++;
            
            this.log(`Health check failed (${this.consecutiveFailures}/${this.config.maxFailures}): ${error.message}`, 'ERROR');
            
            if (this.consecutiveFailures >= this.config.maxFailures) {
                this.log('Max consecutive failures reached, attempting recovery', 'CRITICAL');
                
                // Try restart first (with longer wait)
                const restartSuccess = await this.restartApplication();
                
                if (!restartSuccess) {
                    // If restart fails, try force recovery
                    await this.forceRecovery();
                } else {
                    this.consecutiveFailures = 0; // Reset on successful restart
                }
            }
            
            return { healthy: false, error: error.message };
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async startMonitoring() {
        if (this.isMonitoring) {
            this.log('Monitoring is already running', 'WARN');
            return;
        }
        
        this.isMonitoring = true;
        this.log('Starting production monitoring...', 'INFO');
        this.log(`Check interval: ${this.config.checkInterval/1000}s, Max failures: ${this.config.maxFailures}`, 'INFO');
        
        const monitor = async () => {
            if (!this.isMonitoring) return;
            
            try {
                await this.performHealthCheck();
            } catch (error) {
                this.log(`Monitoring error: ${error.message}`, 'ERROR');
            }
            
            // Schedule next check
            setTimeout(monitor, this.config.checkInterval);
        };
        
        // Start monitoring after a short delay
        setTimeout(monitor, 5000);
    }

    stopMonitoring() {
        this.isMonitoring = false;
        this.log('Monitoring stopped', 'INFO');
    }

    async getStatus() {
        try {
            const pm2Status = await this.checkPM2Status();
            const mongoStatus = await this.checkMongoDBStatus();
            const healthCheck = await this.checkApplicationHealth();
            
            return {
                timestamp: new Date().toISOString(),
                monitoring: this.isMonitoring,
                failureCount: this.failureCount,
                consecutiveFailures: this.consecutiveFailures,
                lastHealthCheck: this.lastHealthCheck,
                pm2Status,
                mongoStatus,
                healthCheck
            };
        } catch (error) {
            return {
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }
}

// CLI usage
if (require.main === module) {
    const monitor = new ProductionMonitor({
        appName: 'internal-cms',
        healthCheckUrl: 'http://localhost:3000/health',
        checkInterval: 60000, // 60 seconds
        maxFailures: 5,
        logFile: 'logs/monitor.log',
        criticalMemoryThreshold: 700 // MB
    });
    
    // Handle process signals
    process.on('SIGTERM', () => {
        monitor.log('Received SIGTERM, stopping monitor', 'INFO');
        monitor.stopMonitoring();
        process.exit(0);
    });
    
    process.on('SIGINT', () => {
        monitor.log('Received SIGINT, stopping monitor', 'INFO');
        monitor.stopMonitoring();
        process.exit(0);
    });
    
    // Start monitoring
    monitor.startMonitoring();
    console.log('✓ Monitor started. Press Ctrl+C to stop.');
    console.log('✓ Monitor status available at: http://localhost:3001/monitor/status');
}

module.exports = ProductionMonitor;