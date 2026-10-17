#!/usr/bin/env python3
"""Idempotently wires ios-native/*.swift into the Capacitor-generated Xcode project. Run after `cap add ios` / `cap sync` (npm run ios:sync does).
Adds the two Swift files to the App target, makes MainViewController the root view controller, iPhone-only + portrait."""
import pathlib, re, shutil, sys

root = pathlib.Path(__file__).resolve().parent.parent
app = root / 'ios' / 'App'
src = app / 'App'
pbx = app / 'App.xcodeproj' / 'project.pbxproj'
if not pbx.exists():
    sys.exit('ios/ not found - run `npm run ios:add` first')

FILES = {'NativeShellPlugin.swift': ('B1A0000000000000000A0001', 'B1A0000000000000000A0002'),
         'MainViewController.swift': ('B1A0000000000000000A0003', 'B1A0000000000000000A0004')}
p = pbx.read_text()
for f, (ref, bf) in FILES.items():
    shutil.copy(root / 'ios-native' / f, src / f)
    if ref in p: continue
    p = p.replace('/* End PBXBuildFile section */', f'\t\t{bf} /* {f} in Sources */ = {{isa = PBXBuildFile; fileRef = {ref} /* {f} */; }};\n/* End PBXBuildFile section */')
    p = p.replace('/* End PBXFileReference section */', f'\t\t{ref} /* {f} */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = {f}; sourceTree = "<group>"; }};\n/* End PBXFileReference section */')
    p = re.sub(r'(\t\t\t\t[0-9A-F]{24} /\* SceneDelegate\.swift \*/,\n)', r'\1' + f'\t\t\t\t{ref} /* {f} */,\n', p, count=1)
    p = re.sub(r'(\t\t\t\t[0-9A-F]{24} /\* SceneDelegate\.swift in Sources \*/,\n)', r'\1' + f'\t\t\t\t{bf} /* {f} in Sources */,\n', p, count=1)
p = p.replace('TARGETED_DEVICE_FAMILY = "1,2";', 'TARGETED_DEVICE_FAMILY = 1;')

# App Store hygiene: privacy manifest (no tracking, no data collected) as a bundle resource
PX, PXR, PXB = 'PrivacyInfo.xcprivacy', 'B1A0000000000000000A0005', 'B1A0000000000000000A0006'
shutil.copy(root / 'ios-native' / PX, src / PX)
if PXR not in p:
    p = p.replace('/* End PBXBuildFile section */', f'\t\t{PXB} /* {PX} in Resources */ = {{isa = PBXBuildFile; fileRef = {PXR} /* {PX} */; }};\n/* End PBXBuildFile section */')
    p = p.replace('/* End PBXFileReference section */', f'\t\t{PXR} /* {PX} */ = {{isa = PBXFileReference; lastKnownFileType = text.xml; path = {PX}; sourceTree = "<group>"; }};\n/* End PBXFileReference section */')
    p = re.sub(r'(\t\t\t\t[0-9A-F]{24} /\* Assets\.xcassets \*/,\n)', r'\1' + f'\t\t\t\t{PXR} /* {PX} */,\n', p, count=1)
    p = re.sub(r'(\t\t\t\t[0-9A-F]{24} /\* Assets\.xcassets in Resources \*/,\n)', r'\1' + f'\t\t\t\t{PXB} /* {PX} in Resources */,\n', p, count=1)
pbx.write_text(p)

sd = src / 'SceneDelegate.swift'
if sd.exists():
    sd.write_text(sd.read_text().replace('window?.rootViewController = CAPBridgeViewController()', 'window?.rootViewController = MainViewController()'))
ip = src / 'Info.plist'
t = ip.read_text()
t = re.sub(r'(<key>UISupportedInterfaceOrientations</key>\s*<array>)(.*?)(</array>)', r'\1\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t\3', t, count=1, flags=re.S)
# arm64 only, dark UI (keeps the status bar light), no export-compliance prompt (the app uses no custom encryption)
t = t.replace('<string>armv7</string>', '<string>arm64</string>')
for key, val in (('UIUserInterfaceStyle', '<string>Dark</string>'), ('ITSAppUsesNonExemptEncryption', '<false/>')):
    if f'<key>{key}</key>' not in t: t = t.replace('</dict>\n</plist>', f'\t<key>{key}</key>\n\t{val}\n</dict>\n</plist>')
ip.write_text(t)
ls = src / 'Base.lproj' / 'LaunchScreen.storyboard'
if ls.exists():   # launch background = app background instead of white
    ls.write_text(ls.read_text().replace('<color key="backgroundColor" systemColor="systemBackgroundColor"/>', '<color key="backgroundColor" red="0.043" green="0.043" blue="0.047" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>'))
print('ios-native wired into ios/App')
