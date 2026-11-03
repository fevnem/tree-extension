# Changelog

## 0.4.0

* **Security**: sends `POST /v1/downloads` with a `X-Tree-Client` header instead of
  `GET /add?url=…`. A cross-origin GET needs no preflight, so any web page could
  have queued downloads through the old endpoint; the POST forces a preflight that
  Tree answers only for extension origins.
* Cookies and the referer now travel in the JSON body.
* Requires Tree 0.6.0 or newer.

## 0.3.0

* **Logged-in downloads** — links carry the session cookies for their own URL plus
  the page as `Referer`; Tree applies both to the probe and every segment. Cookie
  sending is on by default and can be switched off in the popup.
* Adds the `cookies` permission and all-site host access, needed to read the jar
  for arbitrary links. Cookies go to 127.0.0.1 only.
* Requires Tree 0.5.1 or newer.

## 0.2.0

* **Pick links on this page…** — a picker window that lists every link, media file
  and image on the page (de-duplicated, 2000 max) with kind filters, a text
  filter, select-all and one-button bulk send to Tree.
* **Media detection** — `mp4/webm/mkv/mov`, `mp3/flac/m4a/ogg/opus`,
  `m3u8/mpd` links and `<video>`/`<audio>`/`<source>` elements are found and
  pre-selected.
* **Keyboard shortcuts** — `Alt+Shift+D` sends the page, `Alt+Shift+A` opens the
  picker.

## 0.1.0

* Context menu, popup send, optional takeover of browser downloads, loopback bridge.
