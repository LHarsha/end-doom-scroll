const DEFAULTS = { enabled: true, minutes: 3, swipes: 40, replaceUrl: "", closedToday: 0, closedDate: "" };
const $ = (id) => document.getElementById(id);

chrome.storage.local.get(DEFAULTS).then((s) => {
  $("enabled").checked = s.enabled;
  $("minutes").value = s.minutes;
  $("swipes").value = s.swipes;
  $("replaceUrl").value = s.replaceUrl;
  const today = new Date().toISOString().slice(0, 10);
  $("closed").textContent = s.closedDate === today ? s.closedToday : 0;
});

let savedTimer;
$("f").addEventListener("input", () => {
  const minutes = Math.max(0.25, Number($("minutes").value) || DEFAULTS.minutes);
  const swipes = Math.max(3, Math.round(Number($("swipes").value) || DEFAULTS.swipes));
  chrome.storage.local.set({
    enabled: $("enabled").checked,
    minutes,
    swipes,
    replaceUrl: $("replaceUrl").value.trim(),
  });
  $("saved").textContent = "Saved";
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => ($("saved").textContent = ""), 1200);
});
