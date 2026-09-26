import Foundation

/// Port of utils/pharmacokinetics.ts. Relative estimates, never dosing advice.
enum Pharmacokinetics {
    struct Point: Identifiable {
        var hour: Double
        var level: Double
        var id: Double { hour }
    }
    struct Result {
        var curve: [Point] = []
        var currentLevel = 0
        var currentHour: Double = 0
        var cycleHours: Double = 168
        var daysSinceDose: Double = 0
        var daysUntilDose: Double = 0
    }
    static func parameters(medication: Medication?, delivery: DeliveryType?) -> (halfLife: Double, peak: Double) {
        if delivery == .pill { return (168, 1) }
        switch medication {
        case .mounjaro, .zepbound, .tirzepatide: return (120, 48)
        default: return (168, 72)
        }
    }
    static func absorptionRate(elimination ke: Double, peak: Double) -> Double {
        var ka = 3 * ke
        for _ in 0..<20 {
            let diff = ka - ke
            if abs(diff) < 1e-12 { ka = ke + 0.001; continue }
            let f = log(ka / ke) / diff - peak
            let df = 1 / (ka * diff) - log(ka / ke) / (diff * diff)
            let step = f / df
            ka -= step
            if ka <= ke { ka = ke + 0.001 }
            if abs(step) < 1e-10 { break }
        }
        return ka
    }
    static func concentration(hours: Double, ka: Double, ke: Double) -> Double {
        guard hours > 0, abs(ka - ke) >= 1e-12 else { return 0 }
        return (ka / (ka - ke)) * (exp(-ke * hours) - exp(-ka * hours))
    }
    static func compute(logs: [MedicationLog], profile: UserProfile, now: Date = .now) -> Result {
        let params = parameters(medication: profile.medication, delivery: profile.deliveryType)
        let ke = log(2.0) / params.halfLife
        let ka = absorptionRate(elimination: ke, peak: params.peak)
        let cycle = Double(profile.intervalDays * 24)
        // Future records must not affect the current level or next dose.
        let doses = logs.compactMap(\.timestamp).filter { $0 <= now }.sorted()
        guard let last = doses.last else { return Result(cycleHours: cycle) }
        func total(at date: Date) -> Double {
            doses.reduce(0) { $0 + concentration(hours: date.timeIntervalSince($1) / 3600, ka: ka, ke: ke) }
        }
        var peak = doses.map { total(at: $0.addingTimeInterval(params.peak * 3600)) }.max() ?? 0
        for step in 0...200 {
            peak = max(peak, total(at: last.addingTimeInterval(Double(step) / 200 * cycle * 3600)))
        }
        if peak == 0 { peak = 1 }
        let curve = (0...100).map { step -> Point in
            let hour = Double(step) / 100 * cycle
            return Point(hour: hour, level: min(1, total(at: last.addingTimeInterval(hour * 3600)) / peak))
        }
        let elapsed = max(0, now.timeIntervalSince(last) / 3600)
        return Result(curve: curve, currentLevel: Int(min(100, total(at: now) / peak * 100).rounded()),
                      currentHour: elapsed, cycleHours: cycle, daysSinceDose: elapsed / 24, daysUntilDose: (cycle - elapsed) / 24)
    }

    struct OnboardingResult {
        var curve: [Point]
        var peaks: [Point]
        var troughs: [Point]
        var cycleHours: Double
        var cycles: Int
        var totalHours: Double { cycleHours * Double(cycles) }
    }

    /// Multi-cycle illustration from computeOnboardingPkCurve in the original
    /// app. It deliberately simulates scheduled doses, not the user's history.
    static func onboarding(profile: UserProfile) -> OnboardingResult {
        let params = parameters(medication: profile.medication, delivery: profile.deliveryType)
        let ke = log(2.0) / params.halfLife
        let ka = absorptionRate(elimination: ke, peak: params.peak)
        let cycle = Double(profile.intervalDays * 24)
        let cycles = profile.frequency == .daily ? 5 : profile.frequency == .fortnightly ? 2 : 3
        let duration = Double(cycles) * cycle
        let doses = (0..<cycles).map { Double($0) * cycle }
        func total(_ hour: Double) -> Double {
            doses.reduce(0) { $0 + concentration(hours: hour - $1, ka: ka, ke: ke) }
        }
        let hours = (0...500).map { Double($0) / 500 * duration }
        let maximum = max(hours.map(total).max() ?? 0, 0.000000001)
        let points = hours.map { Point(hour: $0, level: total($0) / maximum) }
        var peaks: [Point] = []
        var troughs: [Point] = []
        for index in 0..<cycles {
            let start = Double(index) * cycle
            let samples = (0...100).map { start + Double($0) / 100 * cycle }
            let peakHour = samples.max { total($0) < total($1) } ?? start
            peaks.append(Point(hour: peakHour, level: total(peakHour) / maximum))
            troughs.append(Point(hour: start + cycle, level: total(start + cycle) / maximum))
        }
        return OnboardingResult(curve: points, peaks: peaks, troughs: troughs, cycleHours: cycle, cycles: cycles)
    }
}

struct DoseCountdown {
    var days: Int
    var hours: Int
    var minutes: Int
    var overdue: Bool
    init(nextDose: Date, now: Date = .now) {
        let remaining = max(0, Int(nextDose.timeIntervalSince(now) / 60))
        days = remaining / 1440
        hours = remaining % 1440 / 60
        minutes = remaining % 60
        overdue = nextDose <= now
    }
}
