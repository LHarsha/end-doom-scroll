const DEFAULTS = {
  enabled: true,
  minutes: 3,
  swipes: 40,
  replaceUrl: "",
  closedToday: 0,
  closedDate: "",
  lastClosedAt: 0,
};

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(null);
  await chrome.storage.local.set({ ...DEFAULTS, ...current });
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== "mochi:close" || !sender.tab) return;

  (async () => {
    const s = await chrome.storage.local.get(DEFAULTS);
    const closedToday = s.closedDate === today() ? s.closedToday + 1 : 1;
    await chrome.storage.local.set({
      closedToday,
      closedDate: today(),
      lastClosedAt: Date.now(),
    });

    if (s.replaceUrl) {
      const url = /^https?:\/\//i.test(s.replaceUrl) ? s.replaceUrl : `https://${s.replaceUrl}`;
      await chrome.tabs.update(sender.tab.id, { url });
    } else {
      await chrome.tabs.remove(sender.tab.id);
    }
  })();
});
