// Tree Downloader — background service worker (Chromium MV3).
//
// Tree listens on 127.0.0.1:17817 and exposes:
//   GET /ping            -> {"ok":true,"app":"tree"}
//   GET /add?url=<enc>   -> {"ok":true}
// Nothing leaves the machine; the endpoint is loopback-only.

const ENDPOINT = "http://127.0.0.1:17817";
const MEDIA = /\.(mp4|webm|mkv|m4v|mov|avi|mp3|flac|m4a|ogg|opus|wav|m3u8|mpd)(\?|#|$)/i;

// storage.session is Chromium-only; fall back so the Firefox build still works.
async function saveState(key, value) {
  const area = chrome.storage.session || chrome.storage.local;
  await area.set({ [key]: value });
}

async function loadState(key) {
  const area = chrome.storage.session || chrome.storage.local;
  const result = await area.get(key);
  return result[key];
}

// Cookies make logged-in downloads work. They travel to 127.0.0.1 only, never
// to a third party, and can be switched off in the popup.
async function send(url, referer) {
  const payload = { url };
  try {
    const { sendCookies } = await chrome.storage.local.get({ sendCookies: true });
    if (sendCookies && chrome.cookies) {
      const jar = await chrome.cookies.getAll({ url });
      if (jar.length) {
        payload.cookie = jar.map((c) => `${c.name}=${c.value}`).join("; ");
      }
    }
  } catch (_) {
    // No permission or no jar: carry on anonymously.
  }
  if (referer) payload.referer = referer;

  try {
    // POST + a custom header: forces a preflight, so a web page cannot queue
    // downloads through this endpoint the way a plain GET would allow.
    const response = await fetch(`${ENDPOINT}/v1/downloads`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tree-client": "extension"
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    });
    return response.ok;
  } catch (_) {
    return false;
  }
}

async function sendMany(urls, referer) {
  let count = 0;
  for (const url of urls) {
    if (await send(url, referer)) count += 1;
  }
  return count;
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
  chrome.contextMenus.create({
    id: "tree-pick",
    title: "Pick links on this page…",
    contexts: ["page", "link", "selection", "video", "audio"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "tree-pick") {
    openPicker(tab);
    return;
  }
  const url = info.linkUrl || info.srcUrl || info.pageUrl;
  if (url) send(url, tab && tab.url);
});

if (chrome.commands) {
  chrome.commands.onCommand.addListener(async (command) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    if (command === "send-page" && tab.url) send(tab.url);
    if (command === "pick-links") openPicker(tab);
  });
}

// Collect links/media/images from the page, then open the picker window.
async function openPicker(tab) {
  if (!tab || !tab.id) return;
  let items = [];
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectLinks
    });
    items = (result && result.result) || [];
  } catch (_) {
    items = [];
  }
  await saveState(`picker-${tab.id}`, {
    url: tab.url || "",
    title: tab.title || "",
    items
  });
  await chrome.windows.create({
    url: `picker.html?tab=${tab.id}`,
    type: "popup",
    width: 780,
    height: 640
  });
}

// Serialised into the page: must be self-contained.
function collectLinks() {
  const media = /\.(mp4|webm|mkv|m4v|mov|avi|mp3|flac|m4a|ogg|opus|wav|m3u8|mpd)(\?|#|$)/i;
  const image = /\.(png|jpe?g|gif|webp|svg|bmp)(\?|#|$)/i;
  const seen = new Set();
  const out = [];
  const push = (url, name, kind) => {
    if (!url || !/^https?:/i.test(url)) return;
    const key = url.split("#")[0];
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ url: key, name: String(name || "").trim().slice(0, 120), kind });
  };

  for (const a of document.querySelectorAll("a[href]")) {
    const href = a.href;
    const name = a.getAttribute("download") || a.textContent || "";
    push(href, name, media.test(href) ? "media" : "link");
  }
  for (const el of document.querySelectorAll("video, audio, source")) {
    push(el.currentSrc || el.src, el.getAttribute("title") || "", "media");
  }
  for (const img of document.querySelectorAll("img[src]")) {
    if (image.test(img.src)) push(img.src, img.alt || "", "image");
  }
  const order = { media: 0, image: 1, link: 2 };
  return out
    .sort((a, b) => order[a.kind] - order[b.kind] || a.url.localeCompare(b.url))
    .slice(0, 2000);
}

chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  const type = message && message.type;
  if (type === "send") {
    send(message.url, message.referer).then((ok) => reply({ ok }));
    return true;
  }
  if (type === "send-many") {
    sendMany(message.urls || [], message.referer).then((count) =>
      reply({ ok: count > 0, count })
    );
    return true;
  }
  if (type === "status") {
    reachable().then((ok) => reply({ ok }));
    return true;
  }
  if (type === "is-media") {
    reply({ ok: MEDIA.test(message.url || "") });
    return false;
  }
  if (type === "open-picker") {
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => openPicker(tabs[0]));
    reply({ ok: true });
    return false;
  }
  if (type === "picker-items") {
    loadState(`picker-${message.tab}`).then((data) => reply(data || null));
    return true;
  }
  return false;
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
    // Already finished or gone.
  }
  send(item.url, item.referrer || item.url);
});
