# git-webhook-automation

Lightweight auto-deploy for small servers: when you push to GitHub or GitLab, a webhook hits your server, the request signature is verified, and the server pulls the latest code and runs your deploy steps. No CI/CD platform needed.

Two drop-in implementations:

| Implementation | Providers | Deploy action | Guide |
|---|---|---|---|
| [Node.js](js/) | GitHub, GitLab | `git pull` in the configured repo | [js/readme.MD](js/readme.MD) |
| [PHP / Laravel](php/laravel/) | GitHub, GitLab | runs [`webhook.sh`](php/laravel/webhook.sh): maintenance mode, `git pull`, cache rebuild, queue restart | [php/laravel/readme.MD](php/laravel/readme.MD) |

## How it works

```
git push ──► GitHub / GitLab ──POST──► your server /webhook
                                          │
                                  verify signature
                                          │
                                  git pull + deploy steps
```

- **GitHub** signs each payload with your shared secret using HMAC-SHA256 (`X-Hub-Signature-256` header; the legacy SHA-1 header is also accepted). The server recomputes the HMAC over the full request body and compares the two in constant time.
- **GitLab** sends the shared secret as-is in the `X-Gitlab-Token` header, and the server compares it to its own copy in constant time.

Requests that fail verification get `401` and nothing runs, so only your Git provider can trigger a deploy. Both implementations detect the provider from the headers automatically.

## Quick start

1. Generate a secret:

   ```bash
   openssl rand -hex 32
   ```

2. Set up one of the implementations on your server by following its guide ([Node.js](js/readme.MD) or [Laravel](php/laravel/readme.MD)), using that secret.

3. Add the webhook in your Git provider:
   - **GitHub**: repo → Settings → Webhooks → Add webhook. Payload URL `https://your-server/webhook` (Laravel: `/api/webhook`), content type `application/json`, secret from step 1, event **Just the push event**.
   - **GitLab**: project → Settings → Webhooks. URL `https://your-server/webhook` (Laravel: `/api/webhook`), secret token from step 1, trigger **Push events**.

4. Push a commit and check your server log.

The user running the service needs read access to the remote, for example a deploy key, so `git pull` works without a password prompt.

## Tech stack

Node.js (`http`, `crypto`, `child_process`) · PHP / Laravel · Symfony Process · shell

## License

[MIT](LICENSE)
