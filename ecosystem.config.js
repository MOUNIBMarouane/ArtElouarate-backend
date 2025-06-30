module.exports = {
  apps: [{
    name: 'elouarate-art',
    script: 'server-pro.js',
    cwd: './backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    restart_delay: 1000,
    max_restarts: 5,
    min_uptime: '10s'
  }]
};