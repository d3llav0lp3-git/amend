<p align="center">
  <img src="logo_Amend.png" width="128" alt="Amend Logo" />
</p>

<h1 align="center">Amend</h1>

<p align="center">
  A lightweight Discord client for Windows, built with Tauri.<br/>
  Closes to tray, uses fewer resources, and stays out of your way.
</p>

> ⚠️ **Work in progress.**

---

## ✨ Features

- 🗂️ **Close to tray:** clicking X hides the window and keeps the app active in the background, just like the original Discord.
- 🔔 **Auto permissions:** notifications, microphone, camera, and clipboard are automatically allowed without pop-ups.
- 🪶 **Lightweight:** uses the built-in Windows WebView2 (no embedded Chromium) and limits the V8 heap size.
- 💤 **Save RAM when hidden (optional):** suspends WebView2 after 30 seconds of being hidden.
- 🚫 **No telemetry:** blocks `science`, `metrics`, and Sentry requests.
- 🔗 **External links open in the default browser**, instead of inside the app.
- 🔒 **Single instance:** opening it again just brings the window to the front.
- 🚀 **Start with Windows** already minimized to the tray.
- 👥 **Multiple accounts:** extra Discord accounts, each in its own isolated profile (own cookies/cache), opened from the tray.
- 🔔 **Notifications when hidden:** reads the unread counter from Discord's page title and fires a Windows toast — only while the window is hidden, since Discord already notifies when it's visible.
- 🎤 **Media devices work:** the WebView2 is launched with the flags Chromium needs to enumerate microphones and cameras — the permission alone wasn't enough, and without them Discord sees no device at all.
- ⚡ **No more stutter:** the injected script talks to the app over the Tauri IPC, not by navigating. Every navigation was blocked and restored by `on_navigation`, and that was the main source of the app freezing. Timers were throttled and the DOM observers no longer scan the whole document.
- 🪶 **Background mode instead of suspension:** hiding the window no longer suspends the WebView. It only engages *after* the app has rendered, and never on a window you can see — both were causes of a blank white window.
- 🎤 **Calls are never suspended:** while a voice call is active the WebView is never suspended, so the audio survives. The app applies `content-visibility: hidden` to the Discord root, so the browser skips layout and paint (the expensive part) while **all JavaScript keeps running** — audio, gateway and counters stay alive. Verified: timers keep firing and the DOM stays intact while the app reports zero height.
- 💬 **Notifications with context:** reads author + message text from the DOM, so you get "Leo: *"olá gente"*"" instead of "3 new messages".
- ⚠️ **Warns when a global shortcut is taken:** if `Ctrl+Shift+A` belongs to another program, you get a toast instead of a silently dead key.
- 🔄 **Checks for updates on startup** (30s after opening, in background, notification only).
- 🧹 **Cleans orphan account profiles** on boot — folders in `sessions/` with no matching account get deleted.
- 🪟 **Detects a missing/old WebView2** and offers to install it, pointing at Microsoft's official bootstrapper.
- 🏷️ **Tray tooltip with unread count** (Unknown ↔ the app's own icon; Windows tray has no numeric-badge API).
- 🩺 **Diagnostics panel** (tray → *Diagnóstico*): shows whether the injection still finds Discord's DOM, how long the loading took, and why it exceeded the 3s.
- 🌐 **Follows your system language:** the tray menu uses the Windows **display** language — `GetUserDefaultUILanguage`, not the regional format. These are different settings: a Windows in English with a Brazilian regional format reports `en` for the interface and `pt-BR` for the locale. Reading the wrong one gave a Portuguese menu on an English system. Portuguese and English are supported; everything else falls back to English.
- ⌨️ **Global shortcuts:** `Ctrl+Shift+A` shows/hides Amend; `Ctrl+Alt+K` opens it with Discord's quick switcher (Ctrl+K). Editable in `settings.json`.
- 🪶 **Ultra-light mode (optional):** disables animations, transitions and blur.
- 🧹 **Clear cache:** deletes only cache folders (login is kept) and restarts the app.

## 🖱️ Tray Menu

Right-click the Amend tray icon:

| Option | What it does | Default |
|---|---|---|
| **Open Amend** | Shows the window | — |
| **Add account...** | Creates an extra account window | — |
| **Accounts** | Per-account submenu: open / **delete** | — |
| **Close to tray** | X hides the window instead of quitting | On |
| **Save RAM when hidden** | Suspends the app 30s after hiding | Off |
| **Ultra-light mode** | No animations, transitions or blur | Off |
| **Start with Windows** | Opens minimized on PC startup | Off |
| **Diagnostics** | Whether the injected code still works with Discord's DOM | — |
| **Check for updates** | Asks GitHub Releases for a newer version | — |
| **Clear cache and restart** | Removes cache folders, keeps login | — |
| **Quit** | Actually closes the app | — |

> **About "Save RAM":** this option still *suspends* the WebView, which stops all JavaScript — audio, gateway, notifications. It is now off by default in favour of **background mode**, which gives most of the RAM/CPU saving without killing the connection. Enable it only if you don't care about calls while hidden.
>


## 🗺️ Roadmap

- [ ] Auto-update (updater + GitHub Releases)
- [ ] Unread badge on the tray icon
- [ ] Clicking the notification opens Amend; window flashes on calls
- [ ] Suspend only when not in a call
- [ ] Global shortcuts (mute, deafen, push-to-talk)
- [ ] Themes and plugins
- [ ] Linux and macOS support

## ⚡ Why it used to freeze

Three things, all fixed:

1. **Every status update was a navigation.** The injected script called
   `location.href = .../__amend_cmd?…`, which the host intercepted. A blocked
   navigation still tears down and restores the WebView context — and the
   unread counter fires every second. This is now a Tauri IPC call
   (`amend_cmd`, authorised for `https://discord.com` in
   `capabilities/default.json`).
2. **A `MutationObserver` on `body` with `subtree`, calling
   `getBoundingClientRect()` on every mutation.** The Discord mutates the DOM
   dozens of times per second, and `getBoundingClientRect` forces synchronous
   layout. Background mode now polls every 2s instead.
3. **Three 1-second timers plus a full-list `querySelectorAll` per message.**
   Now one 3s timer, and the message observer reads the mutation records
   instead of rescanning the list.

## 🔧 Troubleshooting

**The icon still looks old (taskbar / Search).** Windows caches icons by file
path. After replacing it, clear the cache:

```bash
taskkill /f /im explorer.exe && del /f /q %localappdata%\Microsoft\Windows\Explorer\iconcache_*.db
```

`gerar_icons.py` does this for you. Note that the icon only gets *embedded* in
the installed `.exe` — a `cargo build` debug binary has none, so test the
installed version, not `target/debug/amend.exe`.

**The window opens white.** Background mode is the usual suspect: it must only
apply to a hidden window that has already rendered. Both guards are in place
(`appRenderizado` in the JS, `is_visible` in `modo_leve`).

**Toast appears twice / not at all.** The toast is suppressed when *any*
Discord window is visible, since Discord notifies on its own then.

## 🎨 Icons

`gerar_icons.py` rebuilds `src-tauri/icons/icon.png` (512) and `icon.ico` (16→256) from any RGBA PNG, with no dependencies:

```bash
python gerar_icons.py meu_logo.png src-tauri/icons/icon.png src-tauri/icons/icon.ico
```

## 📦 Publishing a release (updater)

The in-app updater needs three things to work. All three were missing before:

1. **`createUpdaterArtifacts: true`** in `tauri.conf.json` — without it the CLI never writes the `.sig` signature file.
2. **`latest.json`** attached to the release (tag `v0.1.0`), pointing at the installer:

   ```bash
   npm run tauri build     # gera o instalador + .sig
   node gerar_latest_json.mjs   # empacota tudo no latest.json
   ```

   Upload both the installer **and** `latest.json` as release assets.
3. **The endpoint must be the JSON**, not the release page:

   ```
   https://github.com/d3llav0lp3-git/amend/releases/latest/download/latest.json
   ```

## 📄 License

[Read the License](LICENSE)
