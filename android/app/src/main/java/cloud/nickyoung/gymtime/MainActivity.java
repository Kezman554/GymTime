package cloud.nickyoung.gymtime;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // After super: BridgeActivity swaps the splash theme for NoActionBar there,
        // and touching the window decor any earlier builds it with the splash
        // theme's action bar.
        super.onCreate(savedInstanceState);
        // Edge-to-edge with fully transparent bars: the page's own ground shows
        // behind them, so there is no native bar colour to keep in step with the
        // CSS tokens. Icon tint is set from the page (src/native/systemBars.ts).
        SystemBarStyle transparent = SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT);
        EdgeToEdge.enable(this, transparent, transparent);
        // Otherwise Android lays a translucent scrim over 3-button navigation.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setNavigationBarContrastEnforced(false);
        }
    }
}
