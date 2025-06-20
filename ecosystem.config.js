module.exports = {
  apps: [{
    name: 'internal-cms',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    
    // Environment variables for production
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Environment variables for development  
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    
    // Default environment (will be overridden by --env flag)
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Logging configuration
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/err.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Auto-restart configuration
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // Restart strategy
    min_uptime: '10s',
    max_restarts: 10,
    
    // Advanced PM2 features
    restart_delay: 4000,
    
    // Kill timeout
    kill_timeout: 5000,
    
    // Wait for ready signal
    wait_ready: true,
    listen_timeout: 10000,
    
    // Source map support
    source_map_support: true,
    
    // Merge logs from cluster
    merge_logs: true,
    
    // Time stamps in logs
    time: true
  }]
};