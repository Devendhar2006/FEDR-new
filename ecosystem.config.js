module.exports = {
  apps: [
    {
      name: 'cosmic-devspace',
      script: 'server.js',
      cwd: './',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      error_file: './logs/cosmic-error.log',
      out_file: './logs/cosmic-out.log',
      log_file: './logs/cosmic-combined.log',
      time: true,
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        '.git'
      ],
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000
    }
  ]
};