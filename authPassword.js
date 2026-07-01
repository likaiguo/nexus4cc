import bcrypt from 'bcrypt';
import { existsSync, readFileSync, writeFileSync } from 'fs';

export const DEFAULT_LOGIN_PASSWORD = 'nexus123';
export const MIN_PASSWORD_LENGTH = 6;
export const PASSWORD_HASH_ENV_KEY = 'ACC_PASSWORD_HASH';
const AUTH_ENV_KEYS = new Set(['JWT_SECRET', PASSWORD_HASH_ENV_KEY]);

export function parseEnvValue(rawValue) {
  const trimmed = rawValue.trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function loadEnvFile(envPath, targetEnv = process.env) {
  if (!existsSync(envPath)) return false;
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = parseEnvValue(trimmed.slice(idx + 1));
    if (key && (!(key in targetEnv) || AUTH_ENV_KEYS.has(key))) targetEnv[key] = val;
  }
  return true;
}

export function setEnvValue(content, key, value) {
  const hasFinalNewline = content.endsWith('\n');
  const lines = content.split(/\r?\n/);
  if (hasFinalNewline) lines.pop();

  let replaced = false;
  const nextLines = lines.map(line => {
    const trimmedStart = line.trimStart();
    if (!trimmedStart || trimmedStart.startsWith('#')) return line;
    const leading = line.slice(0, line.length - trimmedStart.length);
    if (!trimmedStart.startsWith(`${key}=`)) return line;
    replaced = true;
    return `${leading}${key}=${value}`;
  });

  if (!replaced) nextLines.push(`${key}=${value}`);
  return `${nextLines.join('\n')}${hasFinalNewline ? '\n' : ''}`;
}

export function createPasswordManager({ envPath, initialHash }) {
  let passwordHash = initialHash;

  async function verify(password) {
    if (typeof password !== 'string' || password.length === 0) return false;
    return bcrypt.compare(password, passwordHash);
  }

  async function status() {
    const usesDefault = await bcrypt.compare(DEFAULT_LOGIN_PASSWORD, passwordHash);
    if (!usesDefault) return { defaultPassword: false };
    return { defaultPassword: true, password: DEFAULT_LOGIN_PASSWORD };
  }

  async function updatePassword(currentPassword, newPassword) {
    if (!(await verify(currentPassword))) {
      return { ok: false, status: 401, error: 'current password incorrect' };
    }
    if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
      return { ok: false, status: 400, error: `new password must be at least ${MIN_PASSWORD_LENGTH} characters` };
    }

    const nextHash = await bcrypt.hash(newPassword, 12);
    const envContent = readFileSync(envPath, 'utf8');
    writeFileSync(envPath, setEnvValue(envContent, PASSWORD_HASH_ENV_KEY, nextHash), 'utf8');
    passwordHash = nextHash;
    process.env[PASSWORD_HASH_ENV_KEY] = nextHash;
    return { ok: true };
  }

  return {
    status,
    updatePassword,
    verify,
  };
}
