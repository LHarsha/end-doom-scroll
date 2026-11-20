package com.mochi.guard;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.provider.Settings;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;

import java.time.LocalDate;

public class MainActivity extends Activity {

    private static final int INK = Color.parseColor("#2A1B18");
    private static final int PEACH = Color.parseColor("#FFE4D4");
    private static final int ORANGE = Color.parseColor("#FF9466");

    private SharedPreferences prefs;
    private TextView status;
    private TextView closed;
    private Button turnOn;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = Prefs.get(this);

        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(dp(20), dp(28), dp(20), dp(28));
        col.setBackgroundColor(Color.parseColor("#FFF8F3"));

        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        ImageView icon = new ImageView(this);
        icon.setImageResource(R.drawable.ic_mochi);
        header.addView(icon, new LinearLayout.LayoutParams(dp(56), dp(56)));
        LinearLayout titles = new LinearLayout(this);
        titles.setOrientation(LinearLayout.VERTICAL);
        titles.setPadding(dp(12), 0, 0, 0);
        titles.addView(text("Mochi", 24, true));
        titles.addView(text("watches Instagram so you don't have to", 14, false));
        header.addView(titles);
        col.addView(header);

        status = text("", 15, true);
        status.setPadding(dp(14), dp(12), dp(14), dp(12));
        status.setBackground(rounded(PEACH));
        col.addView(status, spaced(20));

        turnOn = button("Turn on Mochi", v -> startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)));
        col.addView(turnOn, spaced(12));

        TextView restricted = text("Installed the APK yourself and the switch is greyed out? Open Settings > Apps > Mochi, "
                + "tap the ⋮ menu, choose \"Allow restricted settings\", then try again.", 13, false);
        restricted.setAlpha(0.7f);
        col.addView(restricted, spaced(8));

        closed = text("", 15, false);
        col.addView(closed, spaced(20));

        Switch enabled = new Switch(this);
        enabled.setText("Close Instagram when time's up");
        enabled.setTextColor(INK);
        enabled.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        enabled.setChecked(prefs.getBoolean(Prefs.ENABLED, true));
        enabled.setOnCheckedChangeListener((b, on) -> prefs.edit().putBoolean(Prefs.ENABLED, on).apply());
        col.addView(enabled, spaced(16));

        col.addView(text("Minutes of scrolling allowed", 14, true), spaced(16));
        EditText minutes = number(String.valueOf(Prefs.minutes(prefs)), true);
        minutes.addTextChangedListener(onChange(s -> {
            try {
                prefs.edit().putFloat(Prefs.MINUTES, Math.max(0.25f, Float.parseFloat(s))).apply();
            } catch (NumberFormatException ignored) {
            }
        }));
        col.addView(minutes);

        col.addView(text("Reels allowed (each swipe counts as one)", 14, true), spaced(12));
        EditText swipes = number(String.valueOf(Prefs.swipes(prefs)), false);
        swipes.addTextChangedListener(onChange(s -> {
            try {
                prefs.edit().putInt(Prefs.SWIPES, Math.max(3, Integer.parseInt(s))).apply();
            } catch (NumberFormatException ignored) {
            }
        }));
        col.addView(swipes);

        col.addView(button("Try it on a practice feed", v -> startActivity(new Intent(this, PracticeActivity.class))), spaced(24));
        TextView practiceNote = text("The practice feed closes after 8 swipes so you can watch the whole routine.", 13, false);
        practiceNote.setAlpha(0.7f);
        col.addView(practiceNote, spaced(6));

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(Color.parseColor("#FFF8F3"));
        scroll.addView(col);
        setContentView(scroll);
    }

    @Override
    protected void onResume() {
        super.onResume();
        boolean on = serviceEnabled();
        status.setText(on ? "Mochi is on and watching Instagram." : "Mochi is off. Turn it on in Accessibility settings.");
        turnOn.setVisibility(on ? View.GONE : View.VISIBLE);
        String today = LocalDate.now().toString();
        int n = today.equals(prefs.getString(Prefs.CLOSED_DATE, "")) ? prefs.getInt(Prefs.CLOSED_TODAY, 0) : 0;
        closed.setText("Instagram closed today: " + n);
    }

    private boolean serviceEnabled() {
        String list = Settings.Secure.getString(getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if (list == null) return false;
        String me = new ComponentName(this, MochiService.class).flattenToString();
        String shortMe = new ComponentName(this, MochiService.class).flattenToShortString();
        for (String s : list.split(":")) {
            if (s.equalsIgnoreCase(me) || s.equalsIgnoreCase(shortMe)) return true;
        }
        return false;
    }

    private TextView text(String s, int sp, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextColor(INK);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        if (bold) t.setTypeface(t.getTypeface(), android.graphics.Typeface.BOLD);
        return t;
    }

    private Button button(String label, View.OnClickListener click) {
        Button b = new Button(this);
        b.setText(label);
        b.setAllCaps(false);
        b.setTextColor(INK);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        b.setBackground(rounded(ORANGE));
        b.setOnClickListener(click);
        return b;
    }

    private EditText number(String value, boolean decimal) {
        EditText e = new EditText(this);
        e.setText(value.endsWith(".0") ? value.substring(0, value.length() - 2) : value);
        e.setTextColor(INK);
        e.setInputType(InputType.TYPE_CLASS_NUMBER | (decimal ? InputType.TYPE_NUMBER_FLAG_DECIMAL : 0));
        return e;
    }

    private GradientDrawable rounded(int color) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(12));
        return d;
    }

    private LinearLayout.LayoutParams spaced(int topDp) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(topDp);
        return lp;
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    private interface OnText {
        void run(String s);
    }

    private TextWatcher onChange(OnText f) {
        return new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int a, int b, int c) {
            }

            public void onTextChanged(CharSequence s, int a, int b, int c) {
            }

            public void afterTextChanged(Editable s) {
                f.run(s.toString());
            }
        };
    }
}
