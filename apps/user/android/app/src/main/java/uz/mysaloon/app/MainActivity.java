package uz.mysaloon.app;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Android 12+ splash → Light theme; DayNight qorong'ilikni oldini oladi.
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
    }
}
