// Tree Downloader — background service worker (Chromium MV3).
//
// Tree listens on 127.0.0.1:17817 and exposes:
//   GET /ping            -> {"ok":true,"app":"tree"}
//   GET /add?url=<enc>   -> {"ok":true}
// Nothing leaves the machine; the endpoint is loopback-only.

const ENDPOINT = "http://127.0.0.1:17817";

async function send(url) {
  try {
    const response = await fetch(
      `${ENDPOINT}/add?url=${encodeURIComponent(url)}`,
      { cache: "no-store" }
    );
    return response.ok;
  } catch (_) {
    return false;
  }
}

async function reachable() {
  try {
    const response = await fetch(`${ENDPOINT}/ping`, { cache: "no-store" });
    return response.ok;
  } catch (_) {
    return false;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "tree-link",
    title: "Download this link with Tree",
    contexts: ["link"]
  });
  chrome.contextMenus.create({
    id: "tree-page",
    title: "Download this page with Tree",
    contexts: ["page", "video", "audio"]
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  const url = info.linkUrl || info.pageUrl;
  if (url) send(url);
});

// Optional takeover: cancel the browser's own download and hand the URL to Tree.
chrome.downloads.onCreated.addListener(async (item) => {
  const { takeover } = await chrome.storage.local.get({ takeover: false });
  if (!takeover) return;
  if (!/^https?:/i.test(item.url)) return;
  try {
    await chrome.downloads.cancel(item.id);
    await chrome.downloads.erase({ id: item.id });
  } catch (_) {
    // Already finished or gone: nothing to do.
  }
  send(item.url);
});

// The popup asks for these.
chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  if (message?.type === "send") {
    send(message.url).then((ok) => reply({ ok }));
    return true;
  }
  if (message?.type === "status") {
    reachable().then((ok) => reply({ ok }));
    return true;
  }
  return false;
});
