// Picker window: shows what the page contains, sends the chosen links to Tree.

const params = new URLSearchParams(location.search);
const tabId = Number(params.get("tab") || 0);

const listEl = document.getElementById("list");
const statusEl = document.getElementById("status");
const sendEl = document.getElementById("send");
const searchEl = document.getElementById("search");
const pageEl = document.getElementById("page");

let items = [];
let kind = "all";
let query = "";

function visible() {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (kind !== "all" && item.kind !== kind) return false;
    if (!q) return true;
    return (
      item.url.toLowerCase().includes(q) ||
      (item.name || "").toLowerCase().includes(q)
    );
  });
}

function label(item) {
  if (item.name) return item.name;
  try {
    const url = new URL(item.url);
    return decodeURIComponent(url.pathname.split("/").pop() || url.hostname);
  } catch (_) {
    return item.url;
  }
}

function render() {
  const shown = visible();
  listEl.textContent = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No http(s) links found on this page.";
    listEl.append(empty);
  }
  for (const item of shown) {
    const li = document.createElement("li");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = item.checked !== false && item.kind === "media";
    box.dataset.url = item.url;
    box.addEventListener("change", () => {
      item.checked = box.checked;
      updateFooter();
    });

    const kindEl = document.createElement("span");
    kindEl.className = `kind ${item.kind}`;
    kindEl.textContent = item.kind.toUpperCase();

    const meta = document.createElement("div");
    meta.className = "meta";
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = label(item);
    const url = document.createElement("div");
    url.className = "url";
    url.textContent = item.url;
    meta.append(name, url);

    li.append(box, kindEl, meta);
    listEl.append(li);
  }
  updateFooter();
}

function selected() {
  return items.filter((item) => item.checked === true).map((item) => item.url);
}

function updateFooter() {
  const chosen = selected().length;
  const shown = visible().length;
  sendEl.disabled = chosen === 0;
  sendEl.textContent = chosen ? `Send ${chosen} to Tree` : "Send to Tree";
  statusEl.textContent = `${shown} shown · ${chosen} selected · ${items.length} found`;
}

for (const chip of document.querySelectorAll(".chip[data-kind]")) {
  chip.addEventListener("click", () => {
    kind = chip.dataset.kind;
    for (const other of document.querySelectorAll(".chip[data-kind]")) {
      other.setAttribute("aria-pressed", String(other === chip));
    }
    render();
  });
}

document.getElementById("select-all").addEventListener("click", (event) => {
  const shown = visible();
  const allOn = shown.every((item) => item.checked === true);
  for (const item of shown) item.checked = !allOn;
  event.currentTarget.setAttribute("aria-pressed", String(!allOn));
  render();
});

searchEl.addEventListener("input", () => {
  query = searchEl.value;
  render();
});

sendEl.addEventListener("click", () => {
  const urls = selected();
  if (!urls.length) return;
  sendEl.disabled = true;
  statusEl.textContent = `Sending ${urls.length} to Tree…`;
  chrome.runtime.sendMessage({ type: "send-many", urls }, (reply) => {
    if (reply && reply.ok) {
      statusEl.textContent = `Sent ${reply.count} of ${urls.length} to Tree.`;
      sendEl.textContent = "Sent";
    } else {
      statusEl.textContent = "Tree is not running (or its port is taken).";
      sendEl.disabled = false;
    }
  });
});

chrome.runtime.sendMessage({ type: "picker-items", tab: tabId }, (data) => {
  items = (data && data.items) || [];
  if (data && data.title) pageEl.textContent = data.title;
  else if (data && data.url) pageEl.textContent = data.url;
  render();
});
