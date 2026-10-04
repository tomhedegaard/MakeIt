// Playwright MCP snippet: finds rendered text under 12.5px with more than
// four words (sentences in micro) across member + coach routes, 375 and 1440.
// Metadata lines joined by " · " are allowed and skipped.
async (page) => {
  const base = 'http://localhost:3003';
  await page.context().addCookies([{ name: 'mi_session', value: 'MUNK-01', url: base }]);
  await page.goto(base + '/dashboard', { waitUntil: 'networkidle' });
  const sess = await page.locator('a[href^="/session/"]').first().getAttribute('href');
  const routes = ['/dashboard', sess, '/hrv', '/hrv/trends', '/hrv/learn', '/nutrition', '/nutrition/shopping', '/mind', '/mind/journal', '/community', '/reps', '/profile', '/settings', '/coaching', '/program/STR-12', '/buddy', '/billing', '/science', '/coach', '/coach/inbox', '/coach/queue', '/coach/members', '/coach/analytics', '/coach/system'];
  const hits = [];
  for (const w of [375, 1440]) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const r of routes) {
      await page.goto(base + r, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(300);
      const found = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('body *')) {
          if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
          const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
          if (!own || parseFloat(getComputedStyle(el).fontSize) >= 12.5) continue;
          if (own.includes(' · ')) continue; // metadata line
          if (own.split(' ').filter(Boolean).length > 4) out.push(`${el.tagName.toLowerCase()} [${own.slice(0, 70)}]`);
        }
        return out;
      });
      for (const f of found) hits.push(`${r} | ${f}`);
    }
  }
  return [...new Set(hits)].join('\n') || 'none';
}
