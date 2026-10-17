import Foundation
import Capacitor
import UIKit

/// JS name "NativeShell" (src/lib/native.ts). Adds a real UITabBar over the web view.
/// We never style its background: on iOS 26 the system draws it as Liquid Glass by itself.
@objc(NativeShellPlugin)
public class NativeShellPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeShellPlugin"
    public let jsName = "NativeShell"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setTabs", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "selectTab", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setTabsHidden", returnType: CAPPluginReturnPromise)
    ]

    private var tabBar: UITabBar?
    private var tabIds: [String] = []
    private let tabDelegate = TabBarDelegate()

    /// Resolves { native: true, height } (points the bar covers, for web padding).
    @objc func setTabs(_ call: CAPPluginCall) {
        var ids: [String] = []
        var items: [UITabBarItem] = []
        for entry in call.getArray("items") ?? [] {
            guard let d = entry as? [String: Any], let id = d["id"] as? String, let title = d["label"] as? String else { continue }
            let image = (d["symbol"] as? String).flatMap { UIImage(systemName: $0) }
            items.append(UITabBarItem(title: title, image: image, tag: ids.count))
            ids.append(id)
        }
        let selected = call.getString("selected")
        DispatchQueue.main.async {
            guard !items.isEmpty, let host = self.bridge?.viewController?.view else { call.resolve(["native": false, "height": 0]); return }
            let bar = self.tabBar ?? UITabBar()
            if bar.superview == nil {
                bar.translatesAutoresizingMaskIntoConstraints = false
                host.addSubview(bar)
                NSLayoutConstraint.activate([
                    bar.leadingAnchor.constraint(equalTo: host.leadingAnchor),
                    bar.trailingAnchor.constraint(equalTo: host.trailingAnchor),
                    bar.bottomAnchor.constraint(equalTo: host.bottomAnchor)
                ])
            }
            self.tabIds = ids
            bar.items = items
            bar.tintColor = UIColor(red: 0.784, green: 0.945, blue: 0.208, alpha: 1)   // your accent colour
            bar.delegate = self.tabDelegate
            self.tabDelegate.onSelect = { [weak self] index in
                guard let self = self, index >= 0, index < self.tabIds.count else { return }
                self.notifyListeners("tabSelected", data: ["id": self.tabIds[index]])
            }
            if let selected = selected, let index = ids.firstIndex(of: selected) { bar.selectedItem = items[index] }
            bar.isHidden = false
            self.tabBar = bar
            host.layoutIfNeeded()
            call.resolve(["native": true, "height": Double(host.bounds.height - bar.frame.minY)])
        }
    }

    /// Moves the highlight without firing tabSelected (the web side already knows).
    @objc func selectTab(_ call: CAPPluginCall) {
        let id = call.getString("id") ?? ""
        DispatchQueue.main.async {
            if let bar = self.tabBar, let index = self.tabIds.firstIndex(of: id), let items = bar.items, index < items.count { bar.selectedItem = items[index] }
            call.resolve()
        }
    }

    @objc func setTabsHidden(_ call: CAPPluginCall) {
        let hidden = call.getBool("hidden") ?? false
        DispatchQueue.main.async { self.tabBar?.isHidden = hidden; call.resolve() }
    }
}

final class TabBarDelegate: NSObject, UITabBarDelegate {
    var onSelect: ((Int) -> Void)?
    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) { onSelect?(item.tag) }
}
