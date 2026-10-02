<p align="center">
  <img src="src-tauri/icons/icon.png" width="128" alt="Amend Logo" />
</p>

<h1 align="center">Amend</h1>

<p align="center">
  A lightweight Discord client for Windows, built with Tauri.<br/>
  Closes to tray, uses fewer resources, and stays out of your way.
</p>

> ⚠️ **Work in progress.** Not a stable release yet. Expect bugs.

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

## 🖱️ Tray Menu

Right-click the Amend tray icon:

| Option | What it does | Default |
|---|---|---|
| **Open Amend** | Shows the window | — |
| **Close to tray** | X hides the window instead of quitting | On |
| **Save RAM when hidden** | Suspends the app 30s after hiding | Off |
| **Start with Windows** | Opens minimized on PC startup | Off |
| **Quit** | Actually closes the app | — |

> **About "Save RAM":** while the app is suspended, **notifications and calls won't come through**. Leave this turned off if you usually stay in calls with the window hidden.
## 🗺️ Roadmap

- [ ] Auto-update (updater + GitHub Releases)
- [ ] Unread badge on the tray icon
- [ ] Clicking the notification opens Amend; window flashes on calls
- [ ] Suspend only when not in a call
- [ ] Global shortcuts (mute, deafen, push-to-talk)
- [ ] Themes and plugins
- [ ] Linux and macOS support

## 📄 License

Define the project's license here (e.g., MIT) and add a `LICENSE` file.
