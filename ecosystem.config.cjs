// PM2 process definition for running FinFlow on the Synology NAS.
// See docs/deploy-synology.md for the full deploy runbook.
//
// Port 4005 matches this repo's existing dev convention (package.json's
// `dev` script already uses `-p 4005`) — check it's free on the NAS first
// (several other tunneled apps already run there per `cloudflared tunnel
// list`) and change both this file and the Cloudflare Tunnel ingress rule
// together if it's taken.
module.exports = {
  apps: [
    {
      name: "finflow",
      script: "node_modules/.bin/next",
      args: "start -p 4005",
      cwd: __dirname,
      env: { NODE_ENV: "production" },
      autorestart: true,
    },
  ],
};
