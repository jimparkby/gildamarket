module.exports = {
  apps: [
    {
      name: 'gilda',
      script: 'src/index.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      kill_timeout: 5000,
      env_file: './backend/.env',
    },
  ],
};
