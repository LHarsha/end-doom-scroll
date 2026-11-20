# Mochi

A tiny pet that lives on your feed sites, wanders around the bottom of the screen, and closes the tab when you've been doomscrolling too long.

## How to install

Everything is on the [latest release](https://github.com/LHarsha/end-doom-scroll/releases/latest).

### Android phone

1. On your phone, download [mochi.apk](https://github.com/LHarsha/end-doom-scroll/releases/latest/download/mochi.apk) and open it. If the phone asks, allow your browser or file manager to install unknown apps.
2. Open **Mochi** and tap **Turn on Mochi**. This opens Accessibility settings: find Mochi (on Samsung it's under **Installed apps**) and switch it on.
3. Switch greyed out? Android 13 and newer block this for apps installed outside the Play Store. Go to **Settings > Apps > Mochi**, tap the **⋮** menu, choose **Allow restricted settings**, then do step 2 again.
4. Tap **Try it on a practice feed** to watch the whole routine without opening Instagram.

Mochi only shows up in the Instagram Reels viewer, and sends you to the home screen after 3 minutes or 15 reels. You can change both in the app. It doesn't read your messages or any text on screen.

The APK is a debug build, so Google Play Protect may warn you about it. Tap **More details > Install anyway**.

### Chrome, Edge or Brave on a computer

1. Download the code: on the [latest release](https://github.com/LHarsha/end-doom-scroll/releases/latest), click **Source code (zip)**, or use the green **Code > Download ZIP** button on this page.
2. Extract the zip somewhere you'll keep it. The browser loads Mochi from that folder, so don't delete it.
3. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
4. Turn on **Developer mode**.
5. Click **Load unpacked** and pick the extracted folder, the one with `manifest.json` in it.
6. Pin Mochi to the toolbar and click it to change the limits.

The Instagram app from the Microsoft Store runs on Edge, so installing Mochi in Edge also puts it inside that app.

To update later, download the new zip, replace the folder, and click **Reload** on Mochi in the extensions page. Reopen any Instagram windows afterwards.

iPhone isn't supported.

## What it does

- Peeks in from the edge when you open Instagram, TikTok, YouTube Shorts, Facebook, X or Reddit and start scrolling.
- Wanders along the bottom of the page: waddles around, waves, dances, looks around, and falls asleep if you stop scrolling. Its eyes follow your cursor.
- A little bar under it fills up as you scroll (green, then orange, then red).
- At 75% it gets worried, starts sweating, and nags you on each swipe.
- At 100% it stomps, runs to the edge of the screen, climbs up the wall, boops a big red ×, and the tab closes.
- Click it for hearts.
- If you reopen the site within 10 minutes, it only gives you a quarter of the usual time.

### YouTube Shorts

On YouTube, Mochi only cares about Shorts. Regular videos, the home page and search are left alone.

- Every new Short counts as one swipe, however you get there: scrolling, arrow keys, swiping, or the on-screen up/down buttons.
- When you leave Shorts for a regular video, Mochi hides and pauses the count. When you go back to Shorts, it reappears and picks up where it left off ("welcome back. i remember everything.").

### Instagram

On Instagram, only Reels pages (`/reels/` and `/reel/`) count. DMs, the home feed and profiles are left alone, and keys typed into a message or comment box never count as swipes.

## Settings (extension popup)

- **Minutes of scrolling allowed** (default 3). Only counts while the tab is visible and you're active.
- **Swipes allowed** (default 15). Each scroll burst counts as one swipe.
- **Instead of closing, go to**: optional URL to open in place of the feed.

## Building the Android app

`android/` is a small app that puts Mochi on top of the Instagram app. It uses an accessibility service to see when the Reels viewer is on screen and when you move to the next reel, and draws the same pet (this repo's `content.js`) in a see-through overlay that doesn't block taps. When time is up it sends you to the home screen.

Build it with `cd android && ./gradlew assembleDebug` (needs the Android SDK). The APK ends up in `app/build/outputs/apk/debug/`.

## Try it without installing

Serve this folder (for example `python -m http.server`) and open `demo.html`. It uses a fake feed with a 12-swipe / 40-second limit.

`shorts-demo.html` is a pretend YouTube Shorts page with up/down buttons and a link to leave Shorts, for testing the YouTube behavior (10-Short limit).
