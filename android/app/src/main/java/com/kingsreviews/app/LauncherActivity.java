package com.kingsreviews.app;

import android.content.pm.ActivityInfo;
import android.os.Build;
import android.os.Bundle;

public class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Setting an orientation on a translucent activity crashes Android 8.0
        // and below, so the lock is only applied above Oreo. This only affects
        // the splash; Chrome respects the manifest's orientation on its own.
        // See https://github.com/GoogleChromeLabs/bubblewrap/issues/496
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }
}
