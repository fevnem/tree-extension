const statusEl = document.getElementById("status");
const takeoverEl = document.getElementById("takeover");

function show(text, ok) {
  statusEl.textContent = text;
  statusEl.className = ok ? "ok" : "bad";
}

chrome.storage.local.get({ takeover: false }, (values) => {
  takeoverEl.checked = values.takeover;
});

takeoverEl.addEventListener("change", () => {
  chrome.storage.local.set({ takeover: takeoverEl.checked });
  show(
    takeoverEl.checked
      ? "Browser downloads will be handed to Tree."
      : "Browser downloads stay in the browser.",
    true
  );
});

document.getElementById("send").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || "";
  if (!/^https?:/i.test(url)) {
    show("This tab has no http(s) link to send.", false);
    return;
  }
  chrome.runtime.sendMessage({ type: "send", url }, (reply) => {
    if (reply?.ok) show("Sent to Tree.", true);
    else show("Tree is not running (or its port is taken).", false);
  });
});

chrome.runtime.sendMessage({ type: "status" }, (reply) => {
  if (reply?.ok) show("Tree is running.", true);
  else show("Tree is not running.", false);
});
