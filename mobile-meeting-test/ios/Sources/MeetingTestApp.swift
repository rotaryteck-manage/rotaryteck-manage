import SwiftUI
import WebKit

private let siteHost = "rotaryteck-manage.rotaryteckserve.workers.dev"
private let linkHost = "rotaryteck-meeting-link-test.rotaryteckserve.workers.dev"

private func isHTTPS(_ url: URL, host: String) -> Bool {
    url.scheme?.lowercased() == "https" && url.host?.lowercased() == host
        && url.port == nil && url.user == nil && url.password == nil
}

@MainActor
private final class MeetingBrowser: NSObject, ObservableObject, WKNavigationDelegate {
    let web = WKWebView()

    override init() {
        super.init()
        web.navigationDelegate = self
        if let home = URL(string: "https://" + siteHost + "/") {
            web.load(URLRequest(url: home))
        }
    }

    func openMeeting(_ link: URL) {
        guard isHTTPS(link, host: linkHost),
              let path = URLComponents(url: link, resolvingAgainstBaseURL: false)?.percentEncodedPath,
              path.range(of: #"\A/meeting/[A-Za-z0-9_-]{1,80}\z"#, options: .regularExpression) != nil else { return }
        var target = URLComponents()
        target.scheme = "https"
        target.host = siteHost
        target.path = "/"
        target.queryItems = [URLQueryItem(name: "notificationMeeting", value: String(path.dropFirst("/meeting/".count)))]
        target.fragment = "schedule"
        if let url = target.url { web.load(URLRequest(url: url)) }
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard action.targetFrame?.isMainFrame == true else { decisionHandler(.allow); return }
        decisionHandler(action.request.url.map { isHTTPS($0, host: siteHost) } == true ? .allow : .cancel)
    }
}

private struct MeetingView: UIViewRepresentable {
    let web: WKWebView
    func makeUIView(context: Context) -> WKWebView { web }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

@main
@MainActor
struct MeetingTestApp: App {
    @StateObject private var browser = MeetingBrowser()

    var body: some Scene {
        WindowGroup {
            MeetingView(web: browser.web)
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    if let link = activity.webpageURL { browser.openMeeting(link) }
                }
                .onOpenURL { browser.openMeeting($0) }
        }
    }
}
