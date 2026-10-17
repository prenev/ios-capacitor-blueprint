import UIKit
import Capacitor

/// Capacitor only auto-registers plugins that come from npm packages, so app-local plugins are registered here.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeShellPlugin())
        webView?.scrollView.showsVerticalScrollIndicator = false   // an app, not a web page
        webView?.scrollView.showsHorizontalScrollIndicator = false
    }
}
