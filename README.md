# Mochi

A tiny pet that lives on your feed sites, wanders around the bottom of the screen, and closes the tab when you've been doomscrolling too long.

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

## Install (Chrome / Edge / Brave)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and pick this folder.
4. Pin the extension and click it to change the limits.

## Settings (extension popup)

- **Minutes of scrolling allowed** (default 3). Only counts while the tab is visible and you're active.
- **Swipes allowed** (default 15). Each scroll burst counts as one swipe.
- **Instead of closing, go to**: optional URL to open in place of the feed.

## Try it without installing

Serve this folder (for example `python -m http.server`) and open `demo.html`. It uses a fake feed with a 12-swipe / 40-second limit.

`shorts-demo.html` is a pretend YouTube Shorts page with up/down buttons and a link to leave Shorts, for testing the YouTube behavior (10-Short limit).
