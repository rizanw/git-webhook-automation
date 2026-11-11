# git-webhook-automation (PHP / Laravel)

A Laravel controller that verifies GitHub and GitLab webhooks and runs a deploy script. Requires Laravel 6 or newer.

## How to use it

1. Copy `webhook.sh` to your Laravel base directory and make it executable:

   ```bash
   chmod +x webhook.sh
   ```

2. Copy `WebhookController.php` to `app/Http/Controllers/` and check that the `namespace` matches your app.

3. In `config/app.php`, add this to the array:

   ```php
   'webhook_secret' => env('WEBHOOK_SECRET'),
   ```

4. In your `.env` file, add your webhook secret:

   ```env
   WEBHOOK_SECRET=your_secret_here
   ```

5. Add the route to `routes/api.php`:

   ```php
   use App\Http\Controllers\WebhookController;

   Route::post('/webhook', [WebhookController::class, 'handle']);
   ```

   The webhook URL is then `https://your-server/api/webhook`.

There's nothing to toggle between providers: the controller detects GitHub or GitLab from the request headers.

## Behavior

- Verifies GitHub's `X-Hub-Signature-256` (or legacy `X-Hub-Signature`) or GitLab's `X-Gitlab-Token` with `hash_equals`.
- Unverified requests get `401` and nothing runs. If `WEBHOOK_SECRET` is empty, every request is rejected.
- `webhook.sh` puts the app in maintenance mode, pulls, rebuilds caches, and restarts queues. If any step fails, the script stops and the app is always brought back up.
- Script output is written to your Laravel log.

## Generating a secret

```bash
openssl rand -hex 32
```
