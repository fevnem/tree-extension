# Changelog

## 0.2.0

* **Pick links on this page…** — a picker window that lists every link, media file
  and image on the page (de-duplicated, 2000 max) with kind filters, a text
  filter, select-all and one-button bulk send to Tree.
* **Media detection** — `mp4/webm/mkv/mov`, `mp3/flac/m4a/ogg/opus`,
  `m3u8/mpd` links and `<video>`/`<audio>`/`<source>` elements are found and
  pre-selected; the context menu also offers the media source URL.
* **Keyboard shortcuts** — `Alt+Shift+D` sends the page, `Alt+Shift+A` opens the
  picker.
* Firefox build falls back to `storage.local` when `storage.session` is missing.
* Requires Tree 0.4.0 or newer.

## 0.1.0

* Context menu, popup send, optional takeover of browser downloads, loopback bridge.
