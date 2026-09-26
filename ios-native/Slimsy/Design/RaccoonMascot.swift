import SwiftUI

enum RaccoonMood: Equatable {
    case idle, greeting, celebrating
}

/// A native puppet made from the registered GPT Image 2.5 PNG layers.
/// Change `mood` for an entrance, or increment `celebration` for a new reaction.
struct RaccoonMascot: View {
    var size: CGFloat = 150
    var mood: RaccoonMood = .idle
    var interactive = true
    var active = true
    var celebration = 0
    var onGreeting: (() -> Void)? = nil

    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var appearedAt = Date.now
    @State private var reactionAt: Date?
    @State private var reactionMood = RaccoonMood.greeting
    @State private var visible = false
    @State private var greeted = false

    private var reduceMotion: Bool {
        #if DEBUG
        systemReduceMotion || ProcessInfo.processInfo.arguments.contains("--mascot-reduce-motion")
        #else
        systemReduceMotion
        #endif
    }

    private var paused: Bool { reduceMotion || !visible || !active || scenePhase != .active }

    var body: some View {
        Group {
            if interactive {
                Button {
                    reactionMood = .greeting
                    reactionAt = .now
                    greeted = true
                    Feedback.light()
                    onGreeting?()
                } label: { artwork }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Say hello to your raccoon companion")
                    .accessibilityValue(greeted ? "Happy you're here." : "")
            } else {
                artwork.accessibilityHidden(true)
            }
        }
        .frame(width: size, height: size)
        .onAppear { appearedAt = .now; visible = true }
        .onDisappear { visible = false; reactionAt = nil }
        .onChange(of: celebration) { old, new in
            guard old != new else { return }
            reactionMood = .celebrating
            reactionAt = .now
        }
        .onChange(of: mood) { _, _ in appearedAt = .now; reactionAt = nil }
        .onChange(of: active) { _, isActive in
            if !isActive { reactionAt = nil }
        }
    }

    private var artwork: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30, paused: paused)) { context in
            let elapsed = max(0, context.date.timeIntervalSince(appearedAt))
            let reactionTime = reactionAt.map { max(0, context.date.timeIntervalSince($0)) }
            let motion = paused ? RaccoonMotion.still : RaccoonMotion(
                time: elapsed,
                mood: reactionTime == nil ? mood : reactionMood,
                gestureTime: reactionTime ?? elapsed
            )
            ZStack {
                Ellipse().fill(Palette.aubergine.opacity(0.12))
                    .frame(width: size * 0.39, height: size * 0.037)
                    .blur(radius: size * 0.013)
                    .scaleEffect(1 - motion.lift * 3)
                    .opacity(1 - Double(motion.lift) * 6)
                    .offset(x: -size * 0.04, y: size * 0.465)
                if paused {
                    part("RaccoonStill")
                } else {
                    ZStack {
                        part("RaccoonTail")
                            .rotationEffect(.degrees(motion.tail), anchor: UnitPoint(x: 0.625, y: 0.8))
                        part("RaccoonLeftArm")
                            .rotationEffect(.degrees(motion.leftArm), anchor: UnitPoint(x: 0.338, y: 0.557))
                        part("RaccoonRightArm")
                            .rotationEffect(.degrees(motion.rightArm), anchor: UnitPoint(x: 0.602, y: 0.557))
                        part("RaccoonBody")
                        part(motion.blink ? "RaccoonBlink" : "RaccoonHead")
                            .rotationEffect(.degrees(motion.head), anchor: UnitPoint(x: 0.46, y: 0.505))
                            .offset(y: -size * motion.breath * 0.3)
                    }
                    .scaleEffect(x: 1 - motion.breath * 0.3, y: 1 + motion.breath, anchor: UnitPoint(x: 0.46, y: 0.962))
                    .rotationEffect(.degrees(motion.lean), anchor: UnitPoint(x: 0.46, y: 0.962))
                    .offset(y: -size * motion.lift)
                }
            }
            .frame(width: size, height: size)
        }
        .accessibilityHidden(true)
    }

    private func part(_ name: String) -> some View {
        Image(name).resizable().renderingMode(.original).interpolation(.high)
            .scaledToFit().frame(width: size, height: size)
    }
}

/// Sampled poses keep gestures interruptible without timers or stacked animations.
/// Every gesture settles back into idle; reduced motion uses the assembled still.
private struct RaccoonMotion {
    var breath: CGFloat = 0
    var lift: CGFloat = 0
    var lean = 0.0
    var head = 0.0
    var tail = 0.0
    var leftArm = 0.0
    var rightArm = 0.0
    var blink = false

    static let still = RaccoonMotion()

    private init() {}

    init(time: Double, mood: RaccoonMood, gestureTime: Double) {
        breath = CGFloat(sin(time * .pi * 2 / 3.8)) * 0.006
        head = sin(time * .pi * 2 / 5.6) * 1.7
        tail = sin(time * .pi * 2 / 4.2) * 4.5
        lean = sin(time * .pi * 2 / 7.2) * 0.35
        leftArm = sin(time * .pi * 2 / 3.8) * 1.2
        rightArm = -leftArm
        let blinkTime = time.truncatingRemainder(dividingBy: 6.4)
        blink = (4.7..<4.84).contains(blinkTime) || (5.0..<5.11).contains(blinkTime)

        switch mood {
        case .idle:
            break
        case .greeting:
            let t = gestureTime - 0.18
            let envelope = Self.smooth(t / 0.3) * (1 - Self.smooth((t - 1.55) / 0.45))
            rightArm += envelope * (-80 + sin(t * .pi * 5) * 13)
            head += envelope * -3.2
            tail += envelope * sin(t * .pi * 3) * 3
        case .celebrating:
            let t = gestureTime
            let envelope = Self.smooth(t / 0.2) * (1 - Self.smooth((t - 1.35) / 0.5))
            lift = CGFloat(abs(sin(min(t, 1.5) * .pi * 2 / 1.5)) * envelope * 0.034)
            leftArm += envelope * 80
            rightArm -= envelope * 80
            head += sin(t * .pi * 3) * envelope * 3
            tail += sin(t * .pi * 4) * envelope * 7
            if envelope > 0.75 { blink = true }
        }
    }

    private static func smooth(_ value: Double) -> Double {
        let t = min(1, max(0, value))
        return t * t * (3 - 2 * t)
    }
}

struct WelcomeRaccoonIllustration: View {
    @State private var greeted = false

    var body: some View {
        GeometryReader { proxy in
            let width = proxy.size.width
            ZStack {
                RoundedRectangle(cornerRadius: 110).fill(Palette.blush)
                    .frame(width: width * 0.76, height: 235).rotationEffect(.degrees(-9))
                Circle().fill(Palette.champagne.opacity(0.75))
                    .frame(width: 77, height: 77).offset(x: width * 0.28, y: -63)
                Circle().stroke(Palette.surface.opacity(0.65), lineWidth: 1)
                    .frame(width: 208, height: 208).offset(y: 4)
                RaccoonMascot(size: min(268, width * 0.83), mood: .greeting) { greeted = true }
                    .offset(x: 5, y: -9)
                    .accessibilityIdentifier("welcome-raccoon")
                HStack(spacing: 10) {
                    Image(systemName: "heart").font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Palette.plum).frame(width: 30, height: 30)
                        .background(Palette.blush, in: Circle())
                    VStack(alignment: .leading, spacing: 4) {
                        Text("BY YOUR SIDE").font(TypeStyle.body(8, weight: .bold))
                            .tracking(1.5).foregroundStyle(Palette.secondary)
                        Text(greeted ? "Happy you're here." : "Every step, together.")
                            .font(TypeStyle.body(11, weight: .medium)).foregroundStyle(Palette.ink)
                    }
                }
                .padding(.horizontal, 15).padding(.vertical, 12)
                .background(Palette.surface, in: RoundedRectangle(cornerRadius: 19))
                .shadow(color: Palette.aubergine.opacity(0.08), radius: 16, y: 7)
                .rotationEffect(.degrees(-4)).offset(x: -width * 0.14, y: 112)
                .allowsHitTesting(false)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

struct RaccoonCompanionCard: View {
    var active = true
    var celebration = 0
    @State private var greetingIndex = 0

    private let greetings = [
        "A little care, every day.",
        "Happy you're here.",
        "One small step is enough.",
        "Let's take it at your pace."
    ]

    var body: some View {
        HStack(spacing: 13) {
            RaccoonMascot(size: 88, active: active, celebration: celebration) {
                greetingIndex = (greetingIndex + 1) % greetings.count
            }
            .accessibilityIdentifier("dashboard-raccoon")
            VStack(alignment: .leading, spacing: 5) {
                Text(greetings[greetingIndex]).font(TypeStyle.display(20)).foregroundStyle(Palette.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text("Your little companion. Tap to say hi.")
                    .font(TypeStyle.body(11)).foregroundStyle(Palette.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14).padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.blush.opacity(0.65), in: RoundedRectangle(cornerRadius: 25))
    }
}

#Preview("Raccoon companion") {
    VStack(spacing: 30) {
        WelcomeRaccoonIllustration().frame(height: 275)
        RaccoonCompanionCard()
    }.padding(24).background(Backdrop())
}
