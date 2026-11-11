<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Psr\Log\LoggerInterface;
use Symfony\Component\Process\Process;

class WebhookController
{
    /** @var \Psr\Log\LoggerInterface */
    private $logger;

    public function __construct(LoggerInterface $logger)
    {
        $this->logger = $logger;
    }

    /**
     * Validate an incoming GitHub webhook.
     * Prefers the SHA-256 signature and falls back to the legacy SHA-1 header.
     */
    protected function isValidGithubWebhook(string $secret, Request $request): bool
    {
        $payload = $request->getContent();

        if ($signature = $request->header('X-Hub-Signature-256')) {
            $expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);
            return hash_equals($expected, $signature);
        }

        if ($signature = $request->header('X-Hub-Signature')) {
            $expected = 'sha1=' . hash_hmac('sha1', $payload, $secret);
            return hash_equals($expected, $signature);
        }

        return false;
    }

    /**
     * Validate an incoming GitLab webhook (the secret is sent as-is in a header).
     */
    protected function isValidGitlabWebhook(string $secret, Request $request): bool
    {
        $token = $request->header('X-Gitlab-Token');

        return is_string($token) && hash_equals($secret, $token);
    }

    /**
     * Entry point to our webhook handler.
     * The provider is detected from the request headers; anything unverified is rejected.
     */
    public function handle(Request $request)
    {
        $secret = (string) config('app.webhook_secret');

        if ($secret === '') {
            $this->logger->error('[webhook] WEBHOOK_SECRET is not set, rejecting request');
            return response('Webhook secret not configured', 500);
        }

        $valid = $request->hasHeader('X-Gitlab-Token')
            ? $this->isValidGitlabWebhook($secret, $request)
            : $this->isValidGithubWebhook($secret, $request);

        if (! $valid) {
            $this->logger->warning('[webhook] rejected: invalid or missing signature', ['ip' => $request->ip()]);
            return response('Unauthorized', 401);
        }

        $this->logger->info('[webhook] validated, running webhook.sh');

        // Keep deploying even if the Git provider stops waiting for the response.
        ignore_user_abort(true);
        set_time_limit(0);

        // Run the script directly in the project root (no shell, so no `cd ... &&`).
        $process = new Process(['./webhook.sh'], base_path());
        $process->setTimeout(600);
        $process->run(function ($type, $buffer) {
            $this->logger->info('[webhook] ' . trim($buffer));
        });

        if (! $process->isSuccessful()) {
            $this->logger->error('[webhook] webhook.sh failed', ['exit_code' => $process->getExitCode()]);
            return response('Deploy failed', 500);
        }

        $this->logger->info('[webhook] finished');
        return response('Deployed', 200);
    }
}
