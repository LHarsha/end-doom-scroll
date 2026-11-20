package com.mochi.guard;

import android.accessibilityservice.AccessibilityService;
import android.annotation.SuppressLint;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.time.LocalDate;
import java.util.Set;

/**
 * Watches which app is in front. While Instagram is open it shows Mochi in a full-screen,
 * touch-through overlay and tells the pet about each swipe. When the pet says time is up,
 * this sends the user to the home screen.
 */
public class MochiService extends AccessibilityService
        implements SharedPreferences.OnSharedPreferenceChangeListener {

    static final Set<String> FEED_APPS = Set.of("com.instagram.android", "com.instagram.lite");
    // the Reels viewer; the home feed, DMs and comments are other lists and don't count
    private static final String REELS_PAGER = ":id/clips_viewer_view_pager";

    // the practice feed has no page numbers; one swipe fires a burst of scroll events closer than this
    private static final long SWIPE_GAP_MS = 700;
    // after this long away from the feed, the next visit starts with a fresh budget
    private static final long FRESH_AFTER_MS = 10 * 60 * 1000;

    private WindowManager windowManager;
    private WebView web;
    private Handler ui;
    private SharedPreferences prefs;
    private BroadcastReceiver screenOff;

    private boolean onFeed;
    private boolean practice;
    private boolean pageReady;
    private long lastScroll;
    private int lastReel = -1;
    private long leftFeedAt;

    private final Runnable hideOverlay = () -> {
        if (!onFeed && web != null) web.setVisibility(View.GONE);
    };

    @Override
    protected void onServiceConnected() {
        ui = new Handler(Looper.getMainLooper());
        prefs = Prefs.get(this);
        prefs.registerOnSharedPreferenceChangeListener(this);
        windowManager = getSystemService(WindowManager.class);
        // the WebView is created the first time Instagram opens, not at boot: starting Chromium is slow

        screenOff = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                setFeed(false, practice);
            }
        };
        registerReceiver(screenOff, new IntentFilter(Intent.ACTION_SCREEN_OFF));
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void createOverlay() {
        web = new WebView(this);
        web.setBackgroundColor(Color.TRANSPARENT);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setAllowFileAccess(true);
        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                if (onFeed) js("feed(true)");
            }
        });
        web.setVisibility(View.GONE);

        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT);
        windowManager.addView(web, lp);
        loadPet();
    }

    /** (Re)loads the pet with the current limits. Loading again resets the swipe count. */
    private void loadPet() {
        pageReady = false;
        double minutes = practice ? 1 : Prefs.minutes(prefs);
        int swipes = practice ? 8 : Prefs.swipes(prefs);
        long lastClosed = practice ? 0 : prefs.getLong(Prefs.LAST_CLOSED_AT, 0);
        String closedText = practice ? "Mochi closed the practice feed." : "Mochi closed Instagram.";

        String html = "<!doctype html><html><head><meta charset='utf-8'>"
                + "<meta name='viewport' content='width=device-width, initial-scale=1'>"
                + "<style>html,body{margin:0;height:100%;background:transparent;overflow:hidden}</style>"
                + "</head><body><script>"
                + "window.__mochiDemo={external:true,minutes:" + minutes + ",swipes:" + swipes
                + ",lastClosedAt:" + lastClosed + ",closedText:'" + closedText + "'};"
                + "document.addEventListener('mochi:close',function(){Android.close();});"
                + "</script><script src='content.js'></script></body></html>";
        web.loadDataWithBaseURL("file:///android_asset/", html, "text/html", "utf-8", null);
    }

    private void js(String call) {
        if (web != null && pageReady) web.evaluateJavascript("window.mochi && window.mochi." + call, null);
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getPackageName() == null) return;
        String pkg = event.getPackageName().toString();
        String cls = event.getClassName() == null ? "" : event.getClassName().toString();
        int type = event.getEventType();

        if (pkg.equals(getPackageName())) {
            // our own overlay reports itself as a window change; it isn't the user leaving
            if (type == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && cls.endsWith("Activity")) {
                setFeed(cls.endsWith("PracticeActivity"), true);
            } else if (type == AccessibilityEvent.TYPE_VIEW_SCROLLED && onFeed && practice) {
                long now = System.currentTimeMillis();
                if (now - lastScroll > SWIPE_GAP_MS) js("swipe()");
                lastScroll = now;
            }
        } else if (FEED_APPS.contains(pkg)) {
            if (type == AccessibilityEvent.TYPE_VIEW_SCROLLED && isReelsPager(event.getSource())) {
                ui.removeCallbacks(checkReels);
                onReelScrolled(event.getFromIndex());
            } else {
                // home, DMs, comments, tab switches: look again once the screen settles
                ui.removeCallbacks(checkReels);
                ui.postDelayed(checkReels, 300);
            }
        } else if (type == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && !isPassingWindow(pkg, cls)) {
            ui.removeCallbacks(checkReels);
            setFeed(false, practice);
        }
    }

    private final Runnable checkReels = () -> {
        boolean visible = reelsVisible();
        if (visible != (onFeed && !practice)) setFeed(visible, false);
    };

    /** Each reel is one page of the pager, so a new page index means one more reel watched. */
    private void onReelScrolled(int page) {
        if (!onFeed || practice) {
            setFeed(true, false);
            lastReel = page;
            return;
        }
        if (page >= 0 && page != lastReel) {
            if (lastReel >= 0) js("swipe()");
            lastReel = page;
        }
    }

    private static boolean isReelsPager(AccessibilityNodeInfo node) {
        if (node == null) return false;
        String id = node.getViewIdResourceName();
        return id != null && id.endsWith(REELS_PAGER);
    }

    private boolean reelsVisible() {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null || root.getPackageName() == null) return false;
        String pkg = root.getPackageName().toString();
        if (!FEED_APPS.contains(pkg)) return false;
        // Instagram keeps the Reels tab loaded behind Home, so "visible" alone isn't enough: it has to fill the screen
        android.util.DisplayMetrics screen = getResources().getDisplayMetrics();
        Rect box = new Rect();
        for (AccessibilityNodeInfo n : root.findAccessibilityNodeInfosByViewId(pkg + REELS_PAGER)) {
            n.getBoundsInScreen(box);
            if (n.isVisibleToUser() && box.left > -10 && box.width() > screen.widthPixels * 0.9
                    && box.height() > screen.heightPixels * 0.6) return true;
        }
        return false;
    }

    /** Windows that appear on top of an app without the user leaving it. */
    private boolean isPassingWindow(String pkg, String cls) {
        return pkg.equals("com.android.systemui")
                || cls.contains("SoftInputWindow")
                || cls.contains("inputmethod");
    }

    private void setFeed(boolean on, boolean isPractice) {
        long now = System.currentTimeMillis();
        if (on) {
            if (!prefs.getBoolean(Prefs.ENABLED, true)) return;
            ui.removeCallbacks(hideOverlay);
            if (web == null) {
                practice = isPractice;
                createOverlay();
            } else if (!onFeed) {
                boolean modeChanged = isPractice != practice;
                boolean stale = leftFeedAt > 0 && now - leftFeedAt > FRESH_AFTER_MS;
                practice = isPractice;
                if (modeChanged || stale) loadPet();
            }
            onFeed = true;
            web.setVisibility(View.VISIBLE);
            js("feed(true)");
        } else if (onFeed) {
            onFeed = false;
            leftFeedAt = now;
            lastReel = -1;
            js("feed(false)");
            ui.postDelayed(hideOverlay, 700);
        }
    }

    private void closeFeed() {
        performGlobalAction(GLOBAL_ACTION_HOME);
        onFeed = false;
        leftFeedAt = 0;
        web.setVisibility(View.GONE);

        if (!practice) {
            String today = LocalDate.now().toString();
            int closedToday = today.equals(prefs.getString(Prefs.CLOSED_DATE, ""))
                    ? prefs.getInt(Prefs.CLOSED_TODAY, 0) + 1 : 1;
            prefs.edit()
                    .putLong(Prefs.LAST_CLOSED_AT, System.currentTimeMillis())
                    .putString(Prefs.CLOSED_DATE, today)
                    .putInt(Prefs.CLOSED_TODAY, closedToday)
                    .apply();
        }
        loadPet();
    }

    private class Bridge {
        @JavascriptInterface
        public void close() {
            ui.post(MochiService.this::closeFeed);
        }
    }

    @Override
    public void onSharedPreferenceChanged(SharedPreferences sp, String key) {
        if (Prefs.MINUTES.equals(key) || Prefs.SWIPES.equals(key)) {
            if (!onFeed) loadPet();
        } else if (Prefs.ENABLED.equals(key) && !sp.getBoolean(Prefs.ENABLED, true)) {
            setFeed(false, practice);
        }
    }

    @Override
    public void onInterrupt() {
    }

    @Override
    public void onDestroy() {
        if (prefs != null) prefs.unregisterOnSharedPreferenceChangeListener(this);
        if (screenOff != null) unregisterReceiver(screenOff);
        if (web != null) {
            windowManager.removeView(web);
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
