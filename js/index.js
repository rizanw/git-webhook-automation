/**
 * Config Profile (environment variables override these defaults):
 */
const SECRET = process.env.WEBHOOK_SECRET || "your_secret_here";
const REPO = process.env.WEBHOOK_REPO || "/var/www/project";
const PORT = Number(process.env.WEBHOOK_PORT) || 5000;
const MAX_BODY_BYTES = 5 * 1024 * 1024; // GitHub caps payloads at 25 MB; pushes are far smaller

/*****************************************************/
const http = require("http");
const crypto = require("crypto");
const { execFile } = require("child_process");

// Constant-time comparison so the secret can't be guessed byte by byte from response timing.
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function verify(headers, body) {
  // GitHub: HMAC of the raw body. Prefer SHA-256, fall back to the legacy SHA-1 header.
  const sig256 = headers["x-hub-signature-256"];
  if (sig256) {
    const expected = "sha256=" + crypto.createHmac("sha256", SECRET).update(body).digest("hex");
    return safeEqual(sig256, expected);
  }
  const sig1 = headers["x-hub-signature"];
  if (sig1) {
    const expected = "sha1=" + crypto.createHmac("sha1", SECRET).update(body).digest("hex");
    return safeEqual(sig1, expected);
  }
  // GitLab: the shared secret is sent as-is.
  const gitlabToken = headers["x-gitlab-token"];
  if (gitlabToken) {
    return safeEqual(gitlabToken, SECRET);
  }
  return false;
}

let deploying = false;

function deploy() {
  if (deploying) {
    console.log("deploy already running, skipping");
    return;
  }
  deploying = true;
  execFile("git", ["pull"], { cwd: REPO }, (err, stdout, stderr) => {
    deploying = false;
    if (err) {
      console.error("git pull failed:", stderr || err.message);
      return;
    }
    console.log("git pull done:", stdout.trim());
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405).end("Method Not Allowed");
    return;
  }

  // Collect the whole body first: the signature covers the full payload, not individual chunks.
  const chunks = [];
  let size = 0;
  req.on("data", (chunk) => {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      res.writeHead(413).end("Payload Too Large");
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on("end", () => {
    if (res.writableEnded) return;
    const body = Buffer.concat(chunks);

    if (!verify(req.headers, body)) {
      console.warn("rejected webhook: invalid or missing signature");
      res.writeHead(401).end("Unauthorized");
      return;
    }

    // Answer right away; Git providers time out after ~10 seconds.
    res.writeHead(202).end("Accepted");
    deploy();
  });
});

if (require.main === module) {
  if (SECRET === "your_secret_here") {
    console.error("refusing to start: set WEBHOOK_SECRET (or edit SECRET) first");
    process.exit(1);
  }
  server.listen(PORT, () => console.log(`server is listening on ${PORT}`));
}

module.exports = { verify, server };
