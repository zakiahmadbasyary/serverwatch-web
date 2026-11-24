module.exports = {
  apps: [
    {
      name: "serverwatch-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3200",
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "600M",
      env: {
        NODE_ENV: "production",
        PORT: 3200,
        PROMETHEUS_URL: "http://127.0.0.1:9090",
      },
    },
  ],
};
