import SwiftUI

enum Palette {
    static let background = adaptive(0xF6F6EF, dark: 0x131D18)
    static let surface = adaptive(0xFFFFFF, dark: 0x1D2C24)
    static let ink = adaptive(0x253B30, dark: 0xEFF2E7)
    static let secondary = adaptive(0x657160, dark: 0xAFBBAC)
    static let line = adaptive(0xE5E8DD, dark: 0x34473A)
    static let green = adaptive(0x315F48, dark: 0xAFD1A0)
    static let paleGreen = adaptive(0xE8EEDF, dark: 0x2C4031)
    static let forest = Color(hex: 0x193E31)
    static let lime = Color(hex: 0xDBEAAF)
    static let peach = adaptive(0xA65532, dark: 0xF0B591)
    static let palePeach = adaptive(0xF6EADD, dark: 0x413025)
    static let blue = adaptive(0x446E83, dark: 0xA2C8DA)
    static let paleBlue = adaptive(0xEAF1F3, dark: 0x283D46)
    static let red = adaptive(0xB24E45, dark: 0xF3A49C)

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
    static func display(_ size: CGFloat = 34) -> Font { .custom("Fraunces-Regular", size: size, relativeTo: .largeTitle) }
    static func body(_ size: CGFloat = 15, weight: Font.Weight = .regular) -> Font { .custom("DMSans-9ptRegular", size: size, relativeTo: .body).weight(weight) }
    static func metric(_ size: CGFloat = 40) -> Font { .custom("DMSans-9ptRegular", size: size, relativeTo: .title).weight(.medium) }
    static let caption = body(12, weight: .medium)
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
    var color: Color = Palette.green
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
