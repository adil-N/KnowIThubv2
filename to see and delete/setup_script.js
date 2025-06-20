// setup.js - One-time setup script
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to generate random secure passwords
function generateSecurePassword(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Function to generate JWT secret
function generateJWTSecret() {
    return crypto.randomBytes(64).toString('hex');
}

// Function to prompt user input
function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Function to hide password input (basic implementation)
function questionPassword(query) {
    return new Promise(resolve => {
        process.stdout.write(query);
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        
        let password = '';
        process.stdin.on('data', function(char) {
            char = char + '';
            switch(char) {
                case '\n':
                case '\r':
                case '\u0004':
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    process.stdout.write('\n');
                    resolve(password);
                    break;
                case '\u0003':
                    process.exit();
                    break;
                default:
                    if (char.charCodeAt(0) === 8) { // Backspace
                        password = password.slice(0, -1);
                        process.stdout.write('\b \b');
                    } else {
                        password += char;
                        process.stdout.write('*');
                    }
                    break;
            }
        });
    });
}

async function setupApplication() {
    console.log('='.repeat(60));
    console.log('        KNOW IT HUB - ONE-TIME SETUP');
    console.log('='.repeat(60));
    console.log();
    
    try {
        // Check if .env already exists
        if (fs.existsSync('.env')) {
            console.log('⚠️  .env file already exists!');
            const overwrite = await question('Do you want to overwrite it? (y/N): ');
            if (overwrite.toLowerCase() !== 'y') {
                console.log('Setup cancelled.');
                rl.close();
                return;
            }
        }

        console.log('📝 Setting up your application configuration...\n');

        // Database Configuration
        console.log('--- DATABASE CONFIGURATION ---');
        const dbHost = await question('MongoDB Host (default: localhost): ') || 'localhost';
        const dbPort = await question('MongoDB Port (default: 27017): ') || '27017';
        const dbName = await question('Database Name (default: internalcms): ') || 'internalcms';
        const dbUsername = await question('Database Username: ');
        const dbPassword = await questionPassword('Database Password: ');
        console.log();

        // Application Configuration
        console.log('--- APPLICATION CONFIGURATION ---');
        const appPort = await question('Application Port (default: 3000): ') || '3000';
        const nodeEnv = await question('Environment (development/production) [default: production]: ') || 'production';
        console.log();

        // Generate secure JWT secret
        const jwtSecret = generateJWTSecret();
        console.log('🔐 Generated secure JWT secret');

        // Admin Users Configuration
        console.log('--- ADMIN USERS SETUP ---');
        
        // Super Admin
        console.log('\n🔹 Super Administrator Account:');
        const superAdminEmail = await question('Super Admin Email: ');
        const superAdminPassword = await questionPassword('Super Admin Password (leave empty to generate): ');
        const finalSuperAdminPassword = superAdminPassword || generateSecurePassword(16);
        
        // Validate email domain
        if (!superAdminEmail.endsWith('@ddf.ae')) {
            console.log('❌ Super Admin email must end with @ddf.ae');
            rl.close();
            return;
        }
        
        // Regular Admin
        console.log('\n🔹 Administrator Account:');
        const adminEmail = await question('Admin Email (must end with @ddf.ae): ');
        
        // Validate email domain
        if (!adminEmail.endsWith('@ddf.ae')) {
            console.log('❌ Admin email must end with @ddf.ae');
            rl.close();
            return;
        }
        const adminPassword = await questionPassword('Admin Password (leave empty to generate): ');
        const finalAdminPassword = adminPassword || generateSecurePassword(16);
        
        // Regular User
        console.log('\n🔹 Test User Account:');
        const userEmail = await question('Test User Email (must end with @ddf.ae): ');
        
        // Validate email domain
        if (!userEmail.endsWith('@ddf.ae')) {
            console.log('❌ Test User email must end with @ddf.ae');
            rl.close();
            return;
        }
        const userPassword = await questionPassword('Test User Password (leave empty to generate): ');
        const finalUserPassword = userPassword || generateSecurePassword(12);
        
        // Invitation Code Setup
        console.log('\n🔹 Invitation Code Configuration:');
        const defaultInviteCode = await question('Default Invitation Code (leave empty to generate): ');
        const finalInviteCode = defaultInviteCode || generateSecurePassword(8).toUpperCase();

        // Create .env file
        const envContent = `# Server Configuration
PORT=${appPort}
NODE_ENV=${nodeEnv}

# Database Configuration
MONGODB_URI=mongodb://${dbUsername}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}?authSource=admin

# JWT Configuration
JWT_SECRET=${jwtSecret}

# Security Configuration
SECURITY_AUTHORIZATION=enabled

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads

# Initial Admin Configuration (REMOVE AFTER FIRST RUN)
SUPER_ADMIN_EMAIL=${superAdminEmail}
SUPER_ADMIN_PASSWORD=${finalSuperAdminPassword}
ADMIN_EMAIL=${adminEmail}
ADMIN_PASSWORD=${finalAdminPassword}
TEST_USER_EMAIL=${userEmail}
TEST_USER_PASSWORD=${finalUserPassword}

# Organization Configuration
ORGANIZATION_DOMAIN=ddf.ae
DEFAULT_INVITE_CODE=${finalInviteCode}
`;

        fs.writeFileSync('.env', envContent);
        console.log('\n✅ .env file created successfully!');

        // Create setup credentials file for reference
        const credentialsContent = `KNOW IT HUB - INITIAL CREDENTIALS
Generated on: ${new Date().toISOString()}

=== ADMINISTRATOR ACCOUNTS ===

Super Administrator:
Email: ${superAdminEmail}
Password: ${finalSuperAdminPassword}

Administrator:
Email: ${adminEmail}
Password: ${finalAdminPassword}

Test User:
Email: ${userEmail}
Password: ${finalUserPassword}

=== ORGANIZATION CONFIG ===
Domain: @${userEmail.split('@')[1]}
Default Invite Code: ${finalInviteCode}
(Create additional invite codes through admin panel)

=== IMPORTANT SECURITY NOTES ===
1. DELETE this file after noting down the credentials
2. Remove the admin configuration from .env after first run
3. Change default passwords immediately after first login
4. Keep the .env file secure and never commit it to version control

=== NEXT STEPS ===
1. Run: npm start
2. Login with the super admin credentials
3. Delete this credentials file
4. Remove the admin setup variables from .env file
5. Change all default passwords through the admin panel
`;

        fs.writeFileSync('SETUP_CREDENTIALS.txt', credentialsContent);
        console.log('📋 Credentials saved to SETUP_CREDENTIALS.txt');

        console.log('\n' + '='.repeat(60));
        console.log('✅ SETUP COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(60));
        console.log('\n🔴 IMPORTANT SECURITY STEPS:');
        console.log('1. Review SETUP_CREDENTIALS.txt for all login details');
        console.log('2. Start the application: npm start');
        console.log('3. Login and test all accounts');
        console.log('4. DELETE the SETUP_CREDENTIALS.txt file');
        console.log('5. Remove admin variables from .env file');
        console.log('6. Change all default passwords\n');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
    } finally {
        rl.close();
    }
}

// Run setup
setupApplication();