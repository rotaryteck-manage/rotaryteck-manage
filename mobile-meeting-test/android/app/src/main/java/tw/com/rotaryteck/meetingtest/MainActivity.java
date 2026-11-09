package tw.com.rotaryteck.meetingtest;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class MainActivity extends Activity {
    private static final String SITE_HOST = "rotaryteck-manage.rotaryteckserve.workers.dev";
    private static final String LINK_HOST = "rotaryteck-meeting-link-test.rotaryteckserve.workers.dev";
    private static final Pattern PATH = Pattern.compile("/meeting/([A-Za-z0-9_-]{1,80})");
    private WebView web;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri url = req.getUrl();
                return req.isForMainFrame() && !isHttpsHost(url, SITE_HOST);
            }
        });
        setContentView(web);
        if (!openMeeting(getIntent()) && (state == null || web.restoreState(state) == null)) {
            web.loadUrl("https://" + SITE_HOST + "/");
        }
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        openMeeting(intent);
    }

    @Override protected void onSaveInstanceState(Bundle out) {
        web.saveState(out);
        super.onSaveInstanceState(out);
    }

    private static boolean isHttpsHost(Uri url, String host) {
        return url != null && "https".equalsIgnoreCase(url.getScheme())
            && host.equalsIgnoreCase(url.getEncodedAuthority());
    }

    private boolean openMeeting(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) return false;
        Uri link = intent.getData();
        if (!isHttpsHost(link, LINK_HOST)) return false;
        Matcher match = PATH.matcher(link.getEncodedPath() == null ? "" : link.getEncodedPath());
        if (!match.matches()) return false;
        web.loadUrl(new Uri.Builder().scheme("https").authority(SITE_HOST).path("/")
            .appendQueryParameter("notificationMeeting", match.group(1)).fragment("schedule").build().toString());
        return true;
    }
}
