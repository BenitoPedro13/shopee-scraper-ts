import CDP from 'chrome-remote-interface';

const targetUrl = process.argv[2] || `https://${process.env.SHOPEE_DOMAIN || 'shopee.com.br'}/`;

async function run() {
  let client;
  try {
    const host = 'localhost';
    const port = 9222;

    // Prefer creating a background page in a fresh browser context so
    // Chrome doesn't pop a visible tab/focus an existing window.
    // If this fails (older Chrome or permissions), fall back to default target.
    let targetId: string | undefined;
    try {
      const version = await CDP.Version({ host, port });
      if (version.webSocketDebuggerUrl) {
        const browser = await CDP({ target: version.webSocketDebuggerUrl });
        const { Target } = browser;
        const { browserContextId } = await Target.createBrowserContext({});
        const created = await Target.createTarget({
          url: 'about:blank',
          browserContextId,
          // Keep the new target in background to avoid UI focus.
          background: true
        } as any);
        targetId = created.targetId;
        await browser.close();
      }
    } catch {
      // ignore and fall back
    }

    client = await CDP({ host, port, target: targetId });
    const { Page, Network, Runtime } = client;

    let mainStatus = -1;
    let finalUrl = targetUrl;
    let mainSeen = false;

    Network.responseReceived(({ response, type }) => {
      if (!mainSeen && type === 'Document') {
        mainSeen = true;
        mainStatus = Math.round(response.status || -1);
        finalUrl = response.url || finalUrl;
      }
    });

    await Promise.all([Network.enable(), Page.enable()]);

    // Light stealth: remove webdriver flag before any script runs
    try {
      await Page.addScriptToEvaluateOnNewDocument({
        source: `Object.defineProperty(navigator, 'webdriver', {get: () => undefined});`
      });
    } catch {}

    await Page.navigate({ url: targetUrl });

    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Timeout waiting for load')),
15000);
      Page.loadEventFired(() => {
        clearTimeout(t);
        resolve(null);
      });
    });

    const evalRes = await Runtime.evaluate({
      expression: 'document.documentElement.outerHTML',
      returnByValue: true
    });
    const html = String(evalRes.result?.value || '');

    const lower = html.toLowerCase();
    const flags: string[] = [];
    if (finalUrl.includes('/verify') || finalUrl.includes('/captcha')) flags.push('verify/captcha-url');
    if (finalUrl.includes('/account/login')) flags.push('login-url');
    if (lower.includes('captcha')) flags.push('captcha-html');
    if (lower.includes('access denied')) flags.push('access-denied');

    const blocked = [403, 429].includes(mainStatus) || flags.length > 0;

    console.log(JSON.stringify({
      requested: targetUrl,
      finalUrl,
      status: mainStatus,
      blocked,
      blockSignals: flags
    }, null, 2));

    console.log('----- HTML START -----');
    console.log(html);
    console.log('----- HTML END -----');
  } catch (err: any) {
    console.error('CDP error:', err?.message || err);
    process.exit(1);
  } finally {
    if (client) await client.close().catch(() => {});
  }
}

run();
