// pm2 process definition for the API. The admin panel is a static build served
// by nginx straight from disk — it has no process here.
//
// Usage on the server:
//   pm2 start ecosystem.config.js     # first time
//   pm2 reload ecosystem.config.js    # after a deploy (zero-downtime)
//   pm2 save                          # persist across reboots
module.exports = {
  apps: [
    {
      name: "codeboujida-api",

      // MUST be the api folder, not the repo root: the app resolves its uploads
      // directory and the /legal static folder from process.cwd(), and dotenv
      // loads .env from here too. Launching from anywhere else silently writes
      // media to the wrong place and serves the privacy policy as a 404.
      cwd: "/var/www/codeboujida/api",
      script: "dist/index.js",

      // FORK with a single instance — not cluster, and this is deliberate.
      // The app runs an in-process cron every minute that sends the daily live
      // notification. Every extra worker is another cron tick, so candidates
      // would receive the push 2-4 times, and each worker opens its own Prisma
      // connection pool. Two vCPUs are ample for this workload as one process.
      exec_mode: "fork",
      instances: 1,

      // Crash recovery. min_uptime + max_restarts stop a boot-time failure
      // (bad .env, database down) from looping forever — after 10 fast crashes
      // pm2 marks it "errored" so `pm2 status` shows the real problem.
      autorestart: true,
      min_uptime: "20s",
      max_restarts: 10,
      restart_delay: 2000,

      // A leak restarts the process instead of taking the whole VPS down.
      // Well above normal use: this API idles around 120-250 MB.
      max_memory_restart: "600M",

      // NODE_ENV must be production: it binds the API to 127.0.0.1, refuses to
      // mount the mock payment gateway, and requires APP_BASE_URL. Everything
      // else comes from api/.env, which the app loads itself via dotenv.
      env: {
        NODE_ENV: "production",
      },

      // Create with: sudo mkdir -p /var/log/codeboujida
      //              sudo chown $USER:$USER /var/log/codeboujida
      error_file: "/var/log/codeboujida/api.error.log",
      out_file: "/var/log/codeboujida/api.out.log",
      merge_logs: true,
      time: true, // timestamp every line — logs are useless without it
    },
  ],
};
