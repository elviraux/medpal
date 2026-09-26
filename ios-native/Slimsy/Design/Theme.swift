import SwiftUI

enum Palette {
    static let background = adaptive(0xF8F3EF, dark: 0x151012)
    static let surface = adaptive(0xFFFDFB, dark: 0x211A1E)
    static let ink = adaptive(0x2D2026, dark: 0xF5EDE9)
    static let secondary = adaptive(0x766569, dark: 0xB9A9AD)
    static let line = adaptive(0xEEE4DF, dark: 0x3A2F34)
    static let plum = adaptive(0x72384C, dark: 0xE6B3C2)
    static let blush = adaptive(0xF4E4E6, dark: 0x3B2631)
    static let aubergine = Color(hex: 0x2E1B26)
    static let champagne = Color(hex: 0xEBD5B0)
    static let peach = adaptive(0xA8544A, dark: 0xF2B7A5)
    static let palePeach = adaptive(0xF8EAE4, dark: 0x402B28)
    static let blue = adaptive(0x4D6D80, dark: 0xA9C5D5)
    static let paleBlue = adaptive(0xECF0F2, dark: 0x25343D)
    static let red = adaptive(0xB0443F, dark: 0xF3A49C)

    static func adaptive(_ light: UInt32, dark: UInt32) -> Color {
        Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? UIColor(rgb: dark) : UIColor(rgb: light) })
    }
}

extension Color {
    init(hex: UInt32) { self.init(uiColor: UIColor(rgb: hex)) }
}

extension UIColor {
    convenience init(rgb: UInt32) {
        self.init(red: CGFloat((rgb >> 16) & 0xff) / 255, green: CGFloat((rgb >> 8) & 0xff) / 255, blue: CGFloat(rgb & 0xff) / 255, alpha: 1)
    }
}

enum TypeStyle {
    static func display(_ size: CGFloat = 34) -> Font { .custom("Fraunces-Light", size: size, relativeTo: .largeTitle) }
    static func body(_ size: CGFloat = 15, weight: Font.Weight = .regular) -> Font { .custom("DMSans-9ptRegular", size: size, relativeTo: .body).weight(weight) }
    static func metric(_ size: CGFloat = 40) -> Font { .custom("Fraunces-Light", size: size, relativeTo: .title) }
    static let caption = body(12, weight: .medium)
}

/// Warm porcelain with a soft blush glow at the top of the screen.
struct Backdrop: View {
    var body: some View {
        Palette.background
            .overlay(alignment: .top) {
                RadialGradient(colors: [Palette.blush, .clear], center: .topTrailing, startRadius: 0, endRadius: 440).frame(height: 440)
            }
            .ignoresSafeArea()
    }
}

struct PressFeedback: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .opacity(configuration.isPressed ? 0.78 : 1)
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.98 : 1)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

enum Feedback {
    static func light() { UIImpactFeedbackGenerator(style: .light).impactOccurred() }
    static func saved() { UINotificationFeedbackGenerator().notificationOccurred(.success) }
}

/// Two growing leaves form Slimsy's small, recognizable mark.
struct SlimsyMark: View {
    var color: Color = Palette.plum
    var size: CGFloat = 38
    var body: some View {
        ZStack {
            LeafShape().fill(color).frame(width: size * 0.44, height: size * 0.70).rotationEffect(.degrees(-35)).offset(x: -size * 0.13, y: size * 0.01)
            LeafShape().fill(color.opacity(0.62)).frame(width: size * 0.38, height: size * 0.58).rotationEffect(.degrees(35)).offset(x: size * 0.18, y: -size * 0.1)
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}

struct LeafShape: Shape {
    func path(in rect: CGRect) -> Path {
        Path { p in
            p.move(to: CGPoint(x: rect.midX, y: rect.maxY))
            p.addCurve(to: CGPoint(x: rect.midX, y: rect.minY), control1: CGPoint(x: rect.minX - rect.width * 0.2, y: rect.height * 0.6), control2: CGPoint(x: rect.minX, y: rect.height * 0.15))
            p.addCurve(to: CGPoint(x: rect.midX, y: rect.maxY), control1: CGPoint(x: rect.maxX + rect.width * 0.4, y: rect.height * 0.3), control2: CGPoint(x: rect.maxX, y: rect.height * 0.7))
            p.closeSubpath()
        }
    }
}
