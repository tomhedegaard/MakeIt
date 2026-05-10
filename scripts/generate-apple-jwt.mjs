#!/usr/bin/env node
/**
 * Generate the Apple Sign-in client_secret JWT.
 *
 * Apple requires a signed JWT (ES256) as the client_secret in OAuth
 * flows, NOT the raw .p8 private key. The JWT is valid for up to
 * 6 months — after that, Sign in with Apple will silently fail for
 * web users and you must regenerate + paste a new one into Supabase.
 *
 * Usage:
 *   APPLE_TEAM_ID=A48L3F75PU \
 *   APPLE_KEY_ID=H4ST39AJRQ \
 *   APPLE_SERVICES_ID=eu.nowmakeit.signin \
 *   APPLE_PRIVATE_KEY_PATH=~/Documents/AuthKey_H4ST39AJRQ.p8 \
 *   npm run apple:jwt
 *
 * Or paste the .p8 contents inline:
 *   APPLE_PRIVATE_KEY="$(cat ~/Documents/AuthKey_H4ST39AJRQ.p8)" npm run apple:jwt
 *
 * After running, paste the output into:
 *   Supabase Dashboard → Authentication → Providers → Apple →
 *   "Secret Key (for OAuth)"
 *
 * Calendar a reminder for ~5 months from now to re-run this script.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const TEAM_ID     = process.env.APPLE_TEAM_ID;
const KEY_ID      = process.env.APPLE_KEY_ID;
const SERVICES_ID = process.env.APPLE_SERVICES_ID;
const KEY_PATH    = process.env.APPLE_PRIVATE_KEY_PATH;
const KEY_INLINE  = process.env.APPLE_PRIVATE_KEY;

if (!TEAM_ID || !KEY_ID || !SERVICES_ID || (!KEY_PATH && !KEY_INLINE)) {
  console.error(
    "Missing required env vars. Set:\n" +
    "  APPLE_TEAM_ID         (10-char team identifier)\n" +
    "  APPLE_KEY_ID          (10-char Sign-in key identifier)\n" +
    "  APPLE_SERVICES_ID     (e.g. eu.nowmakeit.signin)\n" +
    "  APPLE_PRIVATE_KEY_PATH OR APPLE_PRIVATE_KEY\n"
  );
  process.exit(1);
}

let PRIVATE_KEY;
if (KEY_INLINE) {
  PRIVATE_KEY = KEY_INLINE;
} else {
  const expanded = KEY_PATH.startsWith("~")
    ? path.join(os.homedir(), KEY_PATH.slice(1))
    : KEY_PATH;
  PRIVATE_KEY = fs.readFileSync(expanded, "utf8");
}

const b64url = (buf) =>
  Buffer.from(buf).toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const now = Math.floor(Date.now() / 1000);
const SIX_MONTHS = 60 * 60 * 24 * 180;

const header  = { alg: "ES256", kid: KEY_ID, typ: "JWT" };
const payload = {
  iss: TEAM_ID,
  iat: now,
  exp: now + SIX_MONTHS,
  aud: "https://appleid.apple.com",
  sub: SERVICES_ID,
};

const headerB64  = b64url(JSON.stringify(header));
const payloadB64 = b64url(JSON.stringify(payload));
const signingInput = `${headerB64}.${payloadB64}`;

// Apple wants raw R||S (IEEE P-1363), not DER. Node 12+ supports
// dsaEncoding: 'ieee-p1363' to emit that format directly.
const signature = crypto.sign(
  "sha256",
  Buffer.from(signingInput),
  { key: PRIVATE_KEY, dsaEncoding: "ieee-p1363" }
);

const jwt = `${signingInput}.${b64url(signature)}`;

console.log(`
# Apple Sign-in client_secret JWT
# Paste into Supabase Dashboard → Authentication → Providers → Apple
# → "Secret Key (for OAuth)" field, then click Save.
#
# Generated: ${new Date(now * 1000).toISOString()}
# Expires:   ${new Date((now + SIX_MONTHS) * 1000).toISOString()}
# Re-run this script before expiry; Apple silently rejects expired JWTs.

${jwt}
`);
