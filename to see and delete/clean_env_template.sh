# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
MONGODB_URI=mongodb://username:password@localhost:27017/internalcms?authSource=admin

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret_here

# Security Configuration
SECURITY_AUTHORIZATION=enabled

# Organization Configuration  
ORGANIZATION_DOMAIN=ddf.ae

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads

# ==================================================
# REMOVE THESE AFTER FIRST RUN FOR SECURITY
# ==================================================
# Initial Admin Configuration (REMOVE AFTER FIRST RUN)
# SUPER_ADMIN_EMAIL=
# SUPER_ADMIN_PASSWORD=
# ADMIN_EMAIL=
# ADMIN_PASSWORD=
# ADMIN_PASSWORD=
# TEST_USER_EMAIL=
# TEST_USER_PASSWORD=
# DEFAULT_INVITE_CODE=