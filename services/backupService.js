// services/backupService.js
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const tar = require('tar');
const crypto = require('crypto');

class BackupService {
    constructor(config = {}) {
        // Root directory of the application
        this.rootDir = config.rootDir || process.cwd();

        // Database configuration
        this.dbConfig = {
            type: config.dbType || 'mongodb',
            connectionString: config.dbConnectionString || process.env.MONGODB_URI, // Changed from DATABASE_URL
            backupDir: config.dbBackupDir || path.join(this.rootDir, 'backups', 'database')
        };

        // Backup configuration
        this.config = {
            backupDir: config.backupDir || path.join(this.rootDir, 'backups'),
            maxBackups: config.maxBackups || 3, // Changed from 10 to 3
            excludePatterns: [
                '**/node_modules/**',
                '**/.git/**',
                '**/.env',
                '**/backups/**',
                '**/*.log',
                '**/.DS_Store',
                '**/Thumbs.db',
                '**/.next/**',
                '**/.nuxt/**',
                '**/.cache/**',
                '**/.tmp/**'
            ].concat(config.excludePatterns || [])
        };

        this._initializeBackupDirectories();
    }

    // Initialize backup directories
    async _initializeBackupDirectories() {
        try {
            await fs.mkdir(this.config.backupDir, { recursive: true });
            await fs.mkdir(this.dbConfig.backupDir, { recursive: true });
        } catch (error) {
            console.error('Error creating backup directories:', error);
        }
    }

    // Generate unique backup filename
    _generateBackupFilename(prefix = 'full', useCompression = true) {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const uniqueId = crypto.randomBytes(8).toString('hex');
        const extension = useCompression ? '.tar.gz' : '.json';
        return `${prefix}_backup_${uniqueId}_${timestamp}${extension}`;
    }

    // Database backup method
    async _backupDatabase() {
        console.log('Database Backup Environment:', {
            MONGODB_URI: process.env.MONGODB_URI,
            rootDir: this.rootDir,
            dbBackupDir: this.dbConfig.backupDir
        });
        // Ensure the backup directory exists
        const fs = require('fs').promises;
        const path = require('path');
    
        // Create backup directory if it doesn't exist
        await fs.mkdir(this.dbConfig.backupDir, { recursive: true });
    
        const backupFilename = this._generateBackupFilename('database');
        const backupPath = path.join(this.dbConfig.backupDir, backupFilename);
    
        console.log('Backup Configuration:', {
            backupDir: this.dbConfig.backupDir,
            backupFilename,
            backupPath,
            connectionString: process.env.MONGODB_URI
        });
    
        try {
            // Use full path to mongodump
            const mongodumpPath = path.join('C:', 'mongodb', 'mongodb-database-tools-windows-x86_64-100.10.0', 'bin', 'mongodump.exe');
            
            // Construct the full command
            const command = `"${mongodumpPath}" --uri="${process.env.MONGODB_URI}" --archive="${backupPath}" --gzip`;
            
            console.log('Mongodump Command:', command);
    
            const { execSync } = require('child_process');
            execSync(command, { 
                stdio: 'inherit',
                shell: true
            });
    
            // Verify the backup was created
            const stats = await fs.stat(backupPath);
            console.log('Backup Created:', {
                path: backupPath,
                size: stats.size
            });
    
            return {
                filename: backupFilename,
                path: backupPath,
                size: stats.size
            };
        } catch (error) {
            console.error('Detailed Database Backup Error:', {
                message: error.message,
                stack: error.stack
            });
            throw new Error(`Database backup failed: ${error.message}`);
        }
    }

    // Create a comprehensive full backup

    async createBackup() {
        try {
            console.log('Starting comprehensive backup process...');
    
            // Create database backup
            const databaseBackup = await this._backupDatabase();
            console.log('Database backup completed:', databaseBackup);
    
            // Create system backup (including uploaded files)
            const systemBackup = await this._createSystemBackup();
            console.log('System backup completed:', systemBackup);
    
            // Create manifest file without compression
            const manifestFilename = this._generateBackupFilename('manifest', false);
            const manifestPath = path.join(this.config.backupDir, manifestFilename);
            
            const manifest = {
                timestamp: new Date().toISOString(),
                databaseBackup: databaseBackup.filename,
                systemBackup: systemBackup.filename  // Add system backup filename here
            };
    
            await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    
            console.log('Created manifest:', { path: manifestPath, content: manifest });
    
            return {
                success: true,
                manifestFile: { filename: manifestFilename, path: manifestPath },
                databaseBackup,
                systemBackup
            };
        } catch (error) {
            console.error('Comprehensive backup error:', error);
            throw new Error(`Backup failed: ${error.message}`);
        }
    }
    

    // Create system backup (internal method)
    async _createSystemBackup() {
        const backupFilename = this._generateBackupFilename('full');
        const backupPath = path.join(this.config.backupDir, backupFilename);
    
        // Define directories to exclude
        const excludeDirs = [
            'backups',
            'node_modules',
            '.git',
            'logs'
        ];
    
        // Create a filter function for tar
        const filter = (path, stat) => {
            // Convert path to use forward slashes for consistency
            const normalizedPath = path.replace(/\\/g, '/');
            
            // Check if the path contains any of the excluded directories
            const shouldExclude = excludeDirs.some(dir => 
                normalizedPath.includes(`/${dir}/`) || normalizedPath === dir
            );
    
            if (shouldExclude) {
                console.log(`Excluding from backup: ${path}`);
                return false;
            }
    
            // Additional filters for specific file types
            if (
                path.endsWith('.log') ||
                path.endsWith('.tmp') ||
                path.endsWith('.DS_Store') ||
                path.endsWith('Thumbs.db')
            ) {
                console.log(`Excluding file: ${path}`);
                return false;
            }
    
            return true;
        };
    
        try {
            console.log('Starting system backup with exclusions...');
            await tar.c(
                {
                    gzip: true,
                    file: backupPath,
                    cwd: this.rootDir,
                    filter: filter
                },
                ['.']
            );
            console.log('System backup completed successfully');
    
            const stats = await fs.stat(backupPath);
            return {
                filename: backupFilename,
                path: backupPath,
                size: stats.size
            };
        } catch (error) {
            console.error('Error creating system backup:', error);
            throw new Error(`System backup failed: ${error.message}`);
        }
    }

    // Restore backup
    async restoreBackup(manifestFilename) {
        try {
            console.log('Starting restoration process with manifest:', manifestFilename);
            
            // Read manifest file
            const manifestPath = path.join(this.config.backupDir, manifestFilename);
            console.log('Reading manifest from:', manifestPath);
            
            // Read manifest as plain JSON
            const manifestContent = await fs.readFile(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestContent);
            
            console.log('Manifest content:', manifest);
    
            if (!manifest.databaseBackup) {
                throw new Error('Invalid manifest: missing database backup information');
            }
    
            console.log('Starting database restoration...');
            await this._restoreDatabase(manifest.databaseBackup);
    
            return {
                success: true,
                message: 'Backup restored successfully',
                details: {
                    databaseBackup: manifest.databaseBackup
                }
            };
        } catch (error) {
            console.error('Backup restoration error:', error);
            throw new Error(`Restoration failed: ${error.message}`);
        }
    }

    // Restore system files
    async _restoreSystemFiles(systemBackupFilename) {
        const backupPath = path.join(this.config.backupDir, systemBackupFilename);

        // Create pre-restore snapshot
        const snapshotFilename = `pre_restore_snapshot_${new Date().toISOString().replace(/:/g, '-')}.tar.gz`;
        await tar.c(
            {
                gzip: true,
                file: path.join(this.config.backupDir, snapshotFilename),
                cwd: this.rootDir
            },
            ['.']
        );

        // Extract system backup
        await tar.x({
            file: backupPath,
            cwd: this.rootDir,
            preserveOwner: true,
            strip: 0
        });

        console.log('System files restored successfully');
    }

    // Restore database
    // Update the _restoreDatabase method in backupService.js

async _restoreDatabase(databaseBackupFilename) {
    const backupPath = path.join(this.dbConfig.backupDir, databaseBackupFilename);
    
    try {
        console.log('Starting database restoration...', new Date().toISOString());
        console.log('Backup path:', backupPath);

        // Use full path to mongorestore
        const mongorestorePath = path.join('C:', 'mongodb', 'mongodb-database-tools-windows-x86_64-100.10.0', 'bin', 'mongorestore.exe');
        
        // Add the --drop flag and verbose output
        const command = `"${mongorestorePath}" --uri="${this.dbConfig.connectionString}" --archive="${backupPath}" --gzip --drop --verbose`;
        
        console.log('Executing restore command:', new Date().toISOString());
        
        // Execute with timeout
        const maxExecutionTime = 5 * 60 * 1000; // 5 minutes timeout
        const child = require('child_process').spawn(command, [], { 
            shell: true,
            stdio: 'pipe'
        });

        let output = '';

        // Handle process output
        child.stdout.on('data', (data) => {
            console.log('Restore progress:', data.toString());
            output += data;
        });

        child.stderr.on('data', (data) => {
            console.error('Restore error:', data.toString());
            output += data;
        });

        // Create a promise that resolves when the process completes
        const processPromise = new Promise((resolve, reject) => {
            child.on('close', (code) => {
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Process exited with code ${code}`));
                }
            });
        });

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                child.kill();
                reject(new Error('Restore operation timed out after 5 minutes'));
            }, maxExecutionTime);
        });

        // Wait for either process completion or timeout
        const result = await Promise.race([processPromise, timeoutPromise]);
        console.log('Database restoration completed:', new Date().toISOString());
        return result;

    } catch (error) {
        console.error('Database restoration error:', error);
        throw new Error(`Database restoration failed: ${error.message}`);
    }
}
    // Helper method to read gzipped manifest
async _readGzippedManifest(manifestPath) {
    try {
        const compressedContent = await fs.readFile(manifestPath);
        return new Promise((resolve, reject) => {
            const content = [];
            tar.list({
                onentry: (entry) => {
                    entry.on('data', (c) => content.push(c));
                    entry.on('end', () => resolve(Buffer.concat(content).toString('utf8')));
                }
            }).end(compressedContent);
        });
    } catch (error) {
        throw new Error(`Failed to read manifest: ${error.message}`);
    }
}

    // List available backups
async listBackups() {
    try {
        const manifestFiles = await fs.readdir(this.config.backupDir);
        const backupManifests = await Promise.all(
            manifestFiles
                .filter(file => file.startsWith('manifest_backup_') && file.endsWith('.json'))
                .map(async (filename) => {
                    const filePath = path.join(this.config.backupDir, filename);
                    const stats = await fs.stat(filePath);
                    
                    // Read the manifest content to get more details
                    const manifestContent = await fs.readFile(filePath, 'utf8');
                    const manifest = JSON.parse(manifestContent);
                    
                    return {
                        filename,
                        path: filePath,
                        size: stats.size,
                        createdAt: stats.mtime,
                        timestamp: manifest.timestamp,
                        databaseBackup: manifest.databaseBackup
                    };
                })
        );

        // Sort by creation date (newest first)
        return backupManifests.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
        console.error('List backups error:', error);
        throw new Error(`Failed to list backups: ${error.message}`);
    }
}
    async deleteBackup(filename) {
        try {
            // Read manifest file to get associated backup files
            const manifestPath = path.join(this.config.backupDir, filename);
            const manifestContent = await fs.readFile(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestContent);

            // Delete system backup
            if (manifest.systemBackup) {
                const systemBackupPath = path.join(this.config.backupDir, manifest.systemBackup);
                try {
                    await fs.unlink(systemBackupPath);
                } catch (err) {
                    console.warn(`Could not delete system backup: ${err.message}`);
                }
            }

            // Delete database backup
            if (manifest.databaseBackup) {
                const databaseBackupPath = path.join(this.dbConfig.backupDir, manifest.databaseBackup);
                try {
                    await fs.unlink(databaseBackupPath);
                } catch (err) {
                    console.warn(`Could not delete database backup: ${err.message}`);
                }
            }

            // Delete manifest file
            await fs.unlink(manifestPath);

            return {
                success: true,
                message: 'Backup deleted successfully'
            };
        } catch (error) {
            console.error('Delete backup error:', error);
            throw new Error(`Failed to delete backup: ${error.message}`);
        }
    }

    async rotateBackups() {
        try {
            console.log('Starting backup rotation...');
            const backups = await this.listBackups();
            console.log(`Found ${backups.length} backups, keeping last ${this.config.maxBackups}`);

            if (backups.length > this.config.maxBackups) {
                // Sort backups by creation date (oldest first)
                const sortedBackups = backups.sort((a, b) => 
                    new Date(a.createdAt) - new Date(b.createdAt)
                );
                
                // Get backups to delete (all except the last maxBackups)
                const backupsToDelete = sortedBackups.slice(0, sortedBackups.length - this.config.maxBackups);

                console.log(`Deleting ${backupsToDelete.length} old backups...`);

                // Delete old backups
                for (const backup of backupsToDelete) {
                    try {
                        await this.deleteBackup(backup.filename);
                        console.log(`Deleted backup: ${backup.filename}`);
                    } catch (err) {
                        console.error(`Failed to delete backup ${backup.filename}:`, err);
                    }
                }

                console.log('Backup rotation completed successfully');
            } else {
                console.log('No backup rotation needed');
            }
        } catch (error) {
            console.error('Backup rotation error:', error);
            throw new Error(`Failed to rotate backups: ${error.message}`);
        }
    }
}

module.exports = BackupService;