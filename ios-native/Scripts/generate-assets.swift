import AppKit
import CoreText

let root = URL(fileURLWithPath: CommandLine.arguments.dropFirst().first ?? FileManager.default.currentDirectoryPath)
let assets = root.appendingPathComponent("Slimsy/Resources/Assets.xcassets")
let iconDirectory = assets.appendingPathComponent("AppIcon.appiconset")
try FileManager.default.createDirectory(at: iconDirectory, withIntermediateDirectories: true)

func color(_ rgb: UInt32) -> NSColor {
    NSColor(srgbRed: CGFloat((rgb >> 16) & 255) / 255, green: CGFloat((rgb >> 8) & 255) / 255, blue: CGFloat(rgb & 255) / 255, alpha: 1)
}
let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 1024, pixelsHigh: 1024, bitsPerSample: 8, samplesPerPixel: 3, hasAlpha: false, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 4096, bitsPerPixel: 32)!
guard let context = NSGraphicsContext(bitmapImageRep: bitmap) else { fatalError("Could not create icon drawing context") }
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
color(0x2E1B26).setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: 1024, height: 1024)).fill()

let firstLeaf = NSBezierPath()
firstLeaf.move(to: NSPoint(x: 507, y: 218))
firstLeaf.curve(to: NSPoint(x: 280, y: 791), controlPoint1: NSPoint(x: 129, y: 410), controlPoint2: NSPoint(x: 196, y: 693))
firstLeaf.curve(to: NSPoint(x: 507, y: 218), controlPoint1: NSPoint(x: 686, y: 672), controlPoint2: NSPoint(x: 696, y: 452))
color(0xEBD5B0).setFill(); firstLeaf.fill()

let secondLeaf = NSBezierPath()
secondLeaf.move(to: NSPoint(x: 552, y: 511))
secondLeaf.curve(to: NSPoint(x: 803, y: 821), controlPoint1: NSPoint(x: 506, y: 748), controlPoint2: NSPoint(x: 680, y: 850))
secondLeaf.curve(to: NSPoint(x: 552, y: 511), controlPoint1: NSPoint(x: 856, y: 587), controlPoint2: NSPoint(x: 749, y: 483))
color(0xC48A99).setFill(); secondLeaf.fill()
NSGraphicsContext.restoreGraphicsState()
try bitmap.representation(using: .png, properties: [:])!.write(to: iconDirectory.appendingPathComponent("AppIcon.png"))
let contents = """
{"images":[{"filename":"AppIcon.png","idiom":"universal","platform":"ios","size":"1024x1024"}],"info":{"author":"xcode","version":1}}
"""
try contents.write(to: iconDirectory.appendingPathComponent("Contents.json"), atomically: true, encoding: .utf8)
print("Generated native Slimsy icon")

for name in ["DMSans", "Fraunces"] {
    let url = root.appendingPathComponent("Slimsy/Resources/Fonts/\(name).ttf")
    let descriptors = CTFontManagerCreateFontDescriptorsFromURL(url as CFURL) as? [CTFontDescriptor] ?? []
    for descriptor in descriptors {
        let font = CTFontCreateWithFontDescriptor(descriptor, 16, nil)
        print("\(name) PostScript name: \(CTFontCopyPostScriptName(font))")
    }
}
