import crypto from 'crypto';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function deploySecretOk(req) {
  const expected = process.env.DEPLOY_SECRET?.trim();
  if (!expected) return false;
  const got = String(req.get('x-deploy-secret') ?? req.query?.secret ?? req.body?.secret ?? '');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(got, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function resolveDeployScript() {
  const fromEnv = process.env.DEPLOY_SCRIPT_PATH?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const local = path.join(__dirname, '../../scripts/linode-auto-deploy.sh');
  if (fs.existsSync(local)) return local;
  return null;
}

/**
 * POST/GET /api/public/deploy
 * Auth: header x-deploy-secret or ?secret= (DEPLOY_SECRET)
 * Starts linode-auto-deploy.sh in the background, then returns 202.
 */
export async function triggerDeploy(req, res) {
  if (!process.env.DEPLOY_SECRET?.trim()) {
    return res.status(503).json({
      success: false,
      message: 'Set DEPLOY_SECRET in backend/.env to enable auto-deploy',
    });
  }
  if (!deploySecretOk(req)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const script = resolveDeployScript();
  if (!script) {
    return res.status(500).json({
      success: false,
      message: 'Deploy script not found (scripts/linode-auto-deploy.sh)',
    });
  }

  try {
    fs.chmodSync(script, 0o755);
  } catch {
    /* ignore */
  }

  // Detach so PM2 restart does not kill the HTTP response mid-flight
  const child = spawn('bash', [script], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, PLACE_TRACK_ROOT: process.env.PLACE_TRACK_ROOT || undefined },
  });
  child.unref();

  console.log(`[deploy] started pid=${child.pid} script=${script}`);
  return res.status(202).json({
    success: true,
    message: 'Deploy started (git pull + pm2 restart). Check backend/logs/auto-deploy.log on the server.',
    pid: child.pid,
  });
}
