# git-webhook-automation (Node.js)

A dependency-free Node.js server that verifies GitHub and GitLab webhooks and runs `git pull` in your project.

## How to use it

1. Copy `index.js` to your server.
2. Configure it with environment variables (or edit the `Config Profile` at the top of the file):

   | Variable | Default | Meaning |
   |---|---|---|
   | `WEBHOOK_SECRET` | — (required) | Shared secret, same value as in GitHub/GitLab |
   | `WEBHOOK_REPO` | `/var/www/project` | Path of the repository to pull |
   | `WEBHOOK_PORT` | `5000` | Port to listen on |

3. Run it:

   ```bash
   WEBHOOK_SECRET=your_secret WEBHOOK_REPO=/var/www/project node index.js
   ```

   For production, run it with [pm2](https://pm2.keymetrics.io) or systemd, behind a reverse proxy with HTTPS.

## Behavior

- Accepts only `POST` requests; other methods get `405`.
- Verifies GitHub's `X-Hub-Signature-256` (or legacy `X-Hub-Signature`) over the full request body, or GitLab's `X-Gitlab-Token`, using constant-time comparison.
- Unverified requests get `401` and nothing runs.
- Verified requests get `202` immediately, then `git pull` runs in the background. Overlapping deploys are skipped.
- Refuses to start until a real secret is set.

## Generating a secret

```bash
openssl rand -hex 32
```
