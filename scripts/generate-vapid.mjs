#!/usr/bin/env node
/**
 * Generate a VAPID key pair for Web Push and print env-var snippets
 * ready to paste into .env.local.
 *
 * The keys are an Elliptic-Curve P-256 pair. The PUBLIC half is
 * exposed to the browser (used by the service worker to subscribe);
 * the PRIVATE half stays server-side and signs outgoing pushes.
 *
 * Run once per environment (dev / prod). Rotating keys invalidates
 * every existing subscription, so don't do it casually — clients
 * will silently stop receiving notifications until they re-subscribe.
 *
 * Usage:
 *   npm run vapid:generate
 *   # then copy the output into .env.local (and your hosting env)
 */

import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log(`
# VAPID keys — Web Push (generated ${new Date().toISOString()})
# Paste these into .env.local AND your production env.
# DO NOT commit them. Rotating invalidates every existing subscription.

NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}
VAPID_PUBLIC_KEY=${publicKey}
VAPID_PRIVATE_KEY=${privateKey}
VAPID_SUBJECT=mailto:hello@makeit.dk
`);
