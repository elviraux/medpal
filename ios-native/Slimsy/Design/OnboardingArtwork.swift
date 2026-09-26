import SwiftUI
import Charts

struct OnboardingInsightView: View {
    let insight: OnboardingInsight
    private var accent: Color { insight == .pace || insight == .daily ? Palette.peach : Palette.plum }
    var body: some View {
        VStack(alignment: .leading, spacing: 25) {
            Eyebrow(text: insight.caption)
            InsightIllustration(insight: insight).frame(height: 175)
            HStack(alignment: .firstTextBaseline, spacing: 7) {
                Text(insight.value).font(TypeStyle.metric(78))
                if !insight.unit.isEmpty { Text(insight.unit).font(TypeStyle.display(31)) }
            }.foregroundStyle(accent).accessibilityElement(children: .combine)
            Text(insight.title).font(TypeStyle.display(35)).foregroundStyle(Palette.ink).fixedSize(horizontal: false, vertical: true)
            Text(insight.detail).font(TypeStyle.body(15)).foregroundStyle(Palette.secondary).lineSpacing(5).fixedSize(horizontal: false, vertical: true)
        }
    }
}

private struct InsightIllustration: View {
    var insight: OnboardingInsight
    var body: some View {
        GeometryReader { geometry in
            let width = geometry.size.width
            ZStack {
                RoundedRectangle(cornerRadius: 85).fill(Palette.blush).frame(width: width * 0.76, height: 155).rotationEffect(.degrees(-6))
                Circle().fill(Palette.palePeach).frame(width: 83, height: 83).offset(x: width * 0.22, y: -31)
                if insight == .daily {
                    Circle().stroke(Palette.plum.opacity(0.25), lineWidth: 2).frame(width: 122, height: 122)
                    Circle().trim(from: 0, to: 0.2).stroke(Palette.peach, style: StrokeStyle(lineWidth: 9, lineCap: .round)).frame(width: 122, height: 122).rotationEffect(.degrees(-90))
                    Image(systemName: "clock").font(.system(size: 63, weight: .ultraLight)).foregroundStyle(Palette.plum)
                } else if insight == .goals || insight == .concerns {
                    Circle().stroke(Palette.plum.opacity(0.15), lineWidth: 9).frame(width: 126, height: 126)
                    Circle().trim(from: 0, to: insight == .goals ? 0.87 : 0.68)
                        .stroke(Palette.plum, style: StrokeStyle(lineWidth: 9, lineCap: .round)).frame(width: 126, height: 126).rotationEffect(.degrees(-90))
                    Image(systemName: insight.symbol).font(.system(size: 44, weight: .ultraLight)).foregroundStyle(Palette.plum)
                } else {
                    HStack(alignment: .bottom, spacing: 13) {
                        ForEach(0..<4) { index in
                            let rank = insight == .pace ? 4 - index : index + 1
                            RoundedRectangle(cornerRadius: 9).fill(index == 3 ? Palette.plum : Palette.plum.opacity(0.15 + Double(index) * 0.12))
                                .frame(width: 35, height: CGFloat(24 + rank * 24))
                        }
                    }.offset(y: 7)
                }
                LeafShape().fill(Palette.plum).frame(width: 26, height: 45).rotationEffect(.degrees(35)).offset(x: width * 0.32, y: 46)
                Image(systemName: "sparkle").font(.system(size: 20, weight: .ultraLight)).foregroundStyle(Palette.peach).offset(x: -width * 0.32, y: -44)
            }.frame(maxWidth: .infinity, maxHeight: .infinity)
        }.accessibilityHidden(true)
    }
}

struct OnboardingLevelChart: View {
    var profile: UserProfile
    private var result: Pharmacokinetics.OnboardingResult { Pharmacokinetics.onboarding(profile: profile) }
    private var ticks: [Double] {
        let result = result
        return (0...(profile.frequency == .fortnightly ? result.cycles : result.cycles - 1)).map { Double($0) * result.cycleHours }
    }
    var body: some View {
        let result = result
        AppCard {
            VStack(alignment: .leading, spacing: 22) {
                HStack {
                    Label(profile.medicationLabel, systemImage: "waveform.path.ecg").font(TypeStyle.body(13, weight: .semibold))
                    Spacer()
                    Text(profile.dose ?? "").font(TypeStyle.body(12)).foregroundStyle(Palette.secondary)
                }.foregroundStyle(Palette.plum)
                Chart {
                    ForEach(result.curve) { point in
                        AreaMark(x: .value("Hours", point.hour), y: .value("Relative level", point.level))
                            .foregroundStyle(LinearGradient(colors: [Palette.plum.opacity(0.22), Palette.plum.opacity(0.01)], startPoint: .top, endPoint: .bottom))
                        LineMark(x: .value("Hours", point.hour), y: .value("Relative level", point.level))
                            .foregroundStyle(Palette.plum).lineStyle(StrokeStyle(lineWidth: 2.5, lineCap: .round))
                    }
                    ForEach(result.peaks) { point in
                        PointMark(x: .value("Hours", point.hour), y: .value("Peak", point.level)).foregroundStyle(Palette.plum).symbolSize(35)
                    }
                    ForEach(result.troughs) { point in
                        PointMark(x: .value("Hours", point.hour), y: .value("Trough", point.level)).foregroundStyle(Palette.peach).symbolSize(25)
                    }
                }
                .chartXScale(domain: 0...result.totalHours).chartYScale(domain: 0...1.13)
                .chartXAxis {
                    AxisMarks(values: ticks) { value in
                        AxisValueLabel { if let hour = value.as(Double.self) { Text(tickLabel(hour)).font(TypeStyle.body(10)).foregroundStyle(Palette.secondary) } }
                    }
                }
                .chartYAxis(.hidden).frame(height: 190)
                .accessibilityLabel("Illustrative medication levels across \(result.cycles) dosing cycles. Peaks rise as scheduled doses accumulate.")
                .accessibilityIdentifier("onboarding-level-chart")
                VStack(alignment: .leading, spacing: 14) {
                    legend("Peak level", detail: "The model's high point after a dose", color: Palette.plum)
                    legend("Trough level", detail: "The level before the next scheduled dose", color: Palette.peach)
                }
                Text(profile.frequencyLabel).font(TypeStyle.body(11, weight: .medium)).foregroundStyle(Palette.secondary)
            }
        }
    }
    private func tickLabel(_ hour: Double) -> String {
        if profile.frequency == .daily { return "Day \(Int(hour / 24) + 1)" }
        if profile.frequency == .fortnightly { return "Day \(hour == 0 ? 1 : Int(hour / 24))" }
        if profile.frequency == .custom { return "Day \(Int(hour / 24) + 1)" }
        return "Wk \(Int(hour / 168) + 1)"
    }
    private func legend(_ title: String, detail: String, color: Color) -> some View {
        HStack(alignment: .top, spacing: 11) {
            Circle().fill(color).frame(width: 8, height: 8).padding(.top, 5)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(TypeStyle.body(12, weight: .semibold)).foregroundStyle(Palette.ink)
                Text(detail).font(TypeStyle.body(11)).foregroundStyle(Palette.secondary)
            }
        }
    }
}

struct DoseCelebration: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var expanded = false
    var body: some View {
        GeometryReader { proxy in
            ZStack {
                Palette.background.opacity(0.95)
                if !reduceMotion {
                    ForEach(0..<24) { index in
                        let angle = Double(index) * .pi / 12
                        let radius = expanded ? CGFloat(100 + (index % 4) * 32) : 15
                        RoundedRectangle(cornerRadius: 3).fill(index.isMultiple(of: 2) ? Palette.plum : Palette.peach)
                            .frame(width: 6, height: 12)
                            .rotationEffect(.degrees(expanded ? Double(index) * 53 : 0))
                            .offset(x: cos(angle) * radius, y: sin(angle) * radius)
                            .opacity(expanded ? 0 : 1)
                    }
                }
                VStack(spacing: 18) {
                    RaccoonMascot(size: 155, mood: .celebrating, interactive: false)
                    Text("Beautifully done.").font(TypeStyle.display(33)).foregroundStyle(Palette.ink)
                    Text("Your dose is logged.").font(TypeStyle.body(15)).foregroundStyle(Palette.secondary)
                }
            }.frame(width: proxy.size.width, height: proxy.size.height)
        }
        .ignoresSafeArea().accessibilityElement(children: .combine)
        .onAppear { if !reduceMotion { withAnimation(.easeOut(duration: 1.35)) { expanded = true } } }
    }
}
