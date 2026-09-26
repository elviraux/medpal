import AppKit
import CoreText

guard CommandLine.arguments.count == 3 else { fatalError("Usage: swift Scripts/create-preview.swift <project-root> <exported-XCTest-attachments>") }
let root = URL(fileURLWithPath: CommandLine.arguments[1])
let source = URL(fileURLWithPath: CommandLine.arguments[2])
let destination = root.appendingPathComponent("Preview")
try FileManager.default.createDirectory(at: destination, withIntermediateDirectories: true)
let manifest = try JSONSerialization.jsonObject(with: Data(contentsOf: source.appendingPathComponent("manifest.json"))) as! [[String: Any]]
let wanted = ["00-welcome", "01-today", "02-food", "03-medication", "04-progress", "05-weight-entry", "06-profile", "07-targets", "08-side-effects", "09-dark-today", "10-dark-food", "11-large-type-today", "12-large-type-form", "13-onboarding-insight", "14-onboarding-dose", "15-onboarding-levels", "16-onboarding-pro", "17-food-photo-picker", "18-food-photo-crop", "19-food-photo-estimate"]
for test in manifest {
    for item in test["attachments"] as? [[String: Any]] ?? [] {
        let suggested = item["suggestedHumanReadableName"] as? String ?? ""
        guard let name = wanted.first(where: { suggested.hasPrefix($0) }), let filename = item["exportedFileName"] as? String else { continue }
        let target = destination.appendingPathComponent(name + ".png")
        try Data(contentsOf: source.appendingPathComponent(filename)).write(to: target)
    }
}
for name in ["DMSans", "Fraunces"] {
    CTFontManagerRegisterFontsForURL(root.appendingPathComponent("Slimsy/Resources/Fonts/\(name).ttf") as CFURL, .process, nil)
}
func color(_ rgb: UInt32) -> NSColor {
    NSColor(srgbRed: CGFloat((rgb >> 16) & 255) / 255, green: CGFloat((rgb >> 8) & 255) / 255, blue: CGFloat(rgb & 255) / 255, alpha: 1)
}
func text(_ value: String, x: CGFloat, y: CGFloat, size: CGFloat, display: Bool = false, tint: UInt32 = 0x2D2026) {
    let name = display ? "Fraunces-Regular" : "DMSans-9ptRegular"
    let attributes: [NSAttributedString.Key: Any] = [.font: NSFont(name: name, size: size) ?? NSFont.systemFont(ofSize: size), .foregroundColor: color(tint)]
    (value as NSString).draw(at: NSPoint(x: x, y: y), withAttributes: attributes)
}
let width = 1600, height = 880
let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8, samplesPerPixel: 3, hasAlpha: false, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: width * 4, bitsPerPixel: 32)!
guard let context = NSGraphicsContext(bitmapImageRep: bitmap) else { fatalError("Could not create preview drawing context") }
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
NSGraphicsContext.current?.imageInterpolation = .high
color(0xF3EAE6).setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: width, height: height)).fill()
text("slimsy", x: 46, y: 777, size: 58, display: true)
text("Your GLP-1 journey, beautifully kept.", x: 250, y: 799, size: 21, display: true)
text("NATIVE IOS  /  SWIFTUI", x: 1320, y: 805, size: 12, tint: 0x766569)
for (index, name) in wanted.prefix(5).enumerated() {
    let image = NSImage(contentsOf: destination.appendingPathComponent(name + ".png"))!
    let x = CGFloat(46 + index * 306)
    let imageWidth: CGFloat = 282
    let imageHeight = image.size.height / image.size.width * imageWidth
    let rect = NSRect(x: x, y: 92, width: imageWidth, height: imageHeight)
    color(0x2D2026).setFill()
    NSBezierPath(roundedRect: rect.insetBy(dx: -3, dy: -3), xRadius: 38, yRadius: 38).fill()
    NSGraphicsContext.saveGraphicsState()
    NSBezierPath(roundedRect: rect, xRadius: 35, yRadius: 35).addClip()
    image.draw(in: rect)
    NSGraphicsContext.restoreGraphicsState()
    text(String(name.dropFirst(3)).uppercased(), x: x + 2, y: 54, size: 11, tint: 0x766569)
}
text("iPhone 17 Pro · Sample data", x: 46, y: 20, size: 11, tint: 0x8A7A7E)
NSGraphicsContext.restoreGraphicsState()
try bitmap.representation(using: .png, properties: [:])!.write(to: destination.appendingPathComponent("overview.png"))
print("Exported native screenshots and Preview/overview.png")
