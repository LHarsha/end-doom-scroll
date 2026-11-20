package com.mochi.guard;

import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/** A fake vertical feed so people can see Mochi work without opening Instagram. */
public class PracticeActivity extends Activity {

    private static final String[] COLORS = {"#7B2FF7", "#D6157F", "#0096B7", "#E85D2A", "#1FA596", "#2F6FE0"};

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        int screen = getResources().getDisplayMetrics().heightPixels;

        LinearLayout feed = new LinearLayout(this);
        feed.setOrientation(LinearLayout.VERTICAL);
        for (int i = 1; i <= 60; i++) {
            TextView reel = new TextView(this);
            reel.setText(i == 1 ? "Practice feed\n\nswipe up like it's Reels" : "reel #" + i);
            reel.setTextColor(Color.WHITE);
            reel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 30);
            reel.setGravity(Gravity.CENTER);
            reel.setBackgroundColor(Color.parseColor(COLORS[i % COLORS.length]));
            feed.addView(reel, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, screen));
        }

        ScrollView scroll = new PagedScroll(this, screen);
        scroll.setVerticalScrollBarEnabled(false);
        scroll.addView(feed);
        setContentView(scroll);
    }

    /** Moves one reel per swipe like Reels does, instead of flinging halfway down the list. */
    private static class PagedScroll extends ScrollView {
        private final int page;
        private boolean flung;

        PagedScroll(Context context, int page) {
            super(context);
            this.page = page;
        }

        @Override
        public void fling(int velocityY) {
            flung = true;
            int current = Math.round(getScrollY() / (float) page);
            int next = current + (velocityY > 0 ? 1 : -1);
            smoothScrollTo(0, Math.max(0, next) * page);
        }

        @Override
        public boolean onTouchEvent(MotionEvent ev) {
            if (ev.getActionMasked() == MotionEvent.ACTION_DOWN) flung = false;
            boolean handled = super.onTouchEvent(ev);
            int action = ev.getActionMasked();
            if ((action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_CANCEL) && !flung) {
                smoothScrollTo(0, Math.round(getScrollY() / (float) page) * page);
            }
            return handled;
        }
    }
}
