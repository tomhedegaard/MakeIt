// Playwright MCP snippet: full-page captures of the Nord key screens in
// demo mode (dev-demo on :3003). Set OUT before running ("before"/"after").
async (page) => {
  const OUT = 'after';
  const base = 'http://localhost:3003';
  const dir = `/Users/tomhedegaard/MakeIt/.reviews/2026-10-04/${OUT}`;
  await page.context().addCookies([{ name: 'mi_session', value: 'MUNK-01', url: base }]);
  await page.context().addInitScript(() => {
    for (const k of ['mi_tour_done_v1', 'mi_mind_tour_done_v1', 'mi_install_hint_dismissed']) localStorage.setItem(k, '1');
    localStorage.setItem('mi_cookie_consent_v1', 'essential');
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(base + '/dashboard', { waitUntil: 'networkidle' });
  const session = await page.locator('a[href^="/session/"]').first().getAttribute('href', { timeout: 10000 });
  const routes = [
    ['01-i-dag', '/dashboard'], ['02-session', session], ['03-hrv', '/hrv'], ['04-mad', '/nutrition'],
    ['05-mind', '/mind'], ['06-crew', '/community'], ['07-reps', '/reps'], ['08-coach-inbox', '/coach/inbox'],
  ];
  const out = [];
  for (const [w, h, tag] of [[375, 812, 'm'], [1440, 900, 'd']]) {
    for (const [name, r] of routes) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(base + r, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(500);
      // <main> is the scroll container in the app shell; grow the viewport to fit it.
      const full = await page.evaluate(() => {
        const m = document.querySelector('main');
        const inner = m && m.scrollHeight > m.clientHeight ? m.scrollHeight + (innerHeight - m.clientHeight) : 0;
        return Math.max(inner, document.documentElement.scrollHeight);
      });
      await page.setViewportSize({ width: w, height: Math.min(full, 6000) });
      await page.waitForTimeout(300);
      const ox = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      await page.screenshot({ path: `${dir}/${name}-${tag}.png` });
      out.push(`${name}-${tag} h=${full} overflowX=${ox}`);
    }
  }
  return out.join('\n');
}
