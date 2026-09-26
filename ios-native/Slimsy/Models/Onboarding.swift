import Foundation

/// The same ordered stages as app/onboarding.tsx. Only the injection-device
/// stage is conditional; informational stages are part of the journey too.
enum OnboardingStep: Int, CaseIterable {
    case welcome, medication, delivery, trackingInsight, dose, frequency, device
    case disclaimer, units, height, currentWeight, startWeight, startDate, goalWeight
    case goalInsight, pace, paceInsight, activity, dailyInsight, toughDays
    case cravings, concerns, concernsInsight, motivation, firstDose, rating, levels, pro

    func next(delivery: DeliveryType?) -> Self {
        if self == .frequency && delivery != .injection { return .disclaimer }
        return Self(rawValue: min(Self.pro.rawValue, rawValue + 1))!
    }

    func previous(delivery: DeliveryType?) -> Self {
        if self == .disclaimer && delivery != .injection { return .frequency }
        return Self(rawValue: max(0, rawValue - 1))!
    }
}

enum OnboardingOptions {
    static let cravings = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Unknown", "Other"]
    static let concerns = SideEffect.allCases.map(\.title) + ["Not concerned"]

    static func doses(delivery: DeliveryType?) -> [String] {
        (delivery == .pill ? ["1.5mg", "4mg", "9mg", "25mg"] : ["0.25mg", "0.5mg", "1mg", "2mg"]) + ["Other", "I don't know"]
    }

    static func frequencies(delivery: DeliveryType?) -> [Frequency] {
        switch delivery {
        case .injection: [.weekly, .fortnightly, .custom]
        case .pill: [.daily, .custom, .notSure]
        default: [.daily, .weekly, .fortnightly, .custom, .notSure]
        }
    }
}

/// Existing onboarding editorial copy, retained from stat-screens.tsx.
enum OnboardingInsight {
    case tracking, goals, pace, daily, concerns

    var value: String {
        switch self { case .tracking: "3×"; case .goals: "87%"; case .pace: "18"; case .daily: "5"; case .concerns: "68%" }
    }
    var unit: String {
        switch self { case .pace: "lbs"; case .daily: "min"; default: "" }
    }
    var title: String {
        switch self {
        case .tracking: "More weight lost."
        case .goals: "Tracking changed\neverything."
        case .pace: "A little progress\nadds up."
        case .daily: "A few minutes.\nA daily rhythm."
        case .concerns: "Fewer surprises.\nMore understanding."
        }
    }
    var detail: String {
        switch self {
        case .tracking: "People who track their GLP-1 doses consistently lose 3x more weight than those who don't."
        case .goals: "87% of Slimsy users say having a clear goal made their GLP-1 journey feel manageable for the first time."
        case .pace: "Slimsy users who set a weekly pace goal lose an average of 18 lbs in their first 3 months."
        case .daily: "Just 5 minutes of daily tracking with Slimsy is enough to stay on track and hit your goals."
        case .concerns: "Users who log side effects early spot patterns 68% faster — and work with their doctor to adjust sooner."
        }
    }
    var caption: String {
        switch self {
        case .tracking: "The power of consistency"
        case .goals: "A goal that feels like yours"
        case .pace: "Average lost in 3 months"
        case .daily: "A quick daily check-in"
        case .concerns: "Spot patterns · share with your doctor"
        }
    }
    var symbol: String {
        switch self { case .tracking: "chart.bar.xaxis"; case .goals: "flag"; case .pace: "chart.line.downtrend.xyaxis"; case .daily: "clock"; case .concerns: "heart.text.clipboard" }
    }
}
