package com.mochi.guard;

import android.content.Context;
import android.content.SharedPreferences;

final class Prefs {
    static final String ENABLED = "enabled";
    static final String MINUTES = "minutes";
    static final String SWIPES = "swipes";
    static final String LAST_CLOSED_AT = "lastClosedAt";
    static final String CLOSED_TODAY = "closedToday";
    static final String CLOSED_DATE = "closedDate";

    static final float DEFAULT_MINUTES = 3f;
    static final int DEFAULT_SWIPES = 15;

    private Prefs() {
    }

    static SharedPreferences get(Context context) {
        return context.getSharedPreferences("mochi", Context.MODE_PRIVATE);
    }

    static double minutes(SharedPreferences p) {
        return Math.max(0.25, p.getFloat(MINUTES, DEFAULT_MINUTES));
    }

    static int swipes(SharedPreferences p) {
        return Math.max(3, p.getInt(SWIPES, DEFAULT_SWIPES));
    }
}
