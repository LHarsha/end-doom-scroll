const DEFAULTS = {
  enabled: true,
  minutes: 3,
  swipes: 15,
  replaceUrl: "",
  closedToday: 0,
  closedDate: "",
  lastClosedAt: 0,
};

const OLD_DEFAULT_SWIPES = 40;

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(null);
  // 40 was the first default and let way too many reels through; only bump people who never changed it
  if (current.swipes === OLD_DEFAULT_SWIPES) current.swipes = DEFAULTS.swipes;
  await chrome.storage.local.set({ ...DEFAULTS, ...current });
});

// local date as YYYY-MM-DD, so the count resets at the user's midnight and not UTC's
function today() {
  return new Date().toLocaleDateString("en-CA");
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
