import SwiftUI
import Charts

struct MedicationLevelCard: View {
    @Environment(AppStore.self) private var store
    @Environment(AppRouter.self) private var router
    @State private var showsExplanation = false

    var body: some View {
        TimelineView(.periodic(from: .now, by: 60)) { context in
            let result = Pharmacokinetics.compute(logs: store.data.medicationLogs, profile: store.profile, now: context.date)
            let hasDoses = !result.curve.isEmpty
            let daysUntil = max(0, Int(ceil(result.daysUntilDose)))
            VStack(alignment: .leading, spacing: 17) {
                HStack {
                    HStack(spacing: 7) {
                        Image(systemName: "waveform.path.ecg").font(.system(size: 14))
                        Text("YOUR MEDICATION CYCLE").font(TypeStyle.body(10, weight: .semibold)).tracking(1.6)
                    }.foregroundStyle(Palette.lime)
                    Spacer()
                    Button { showsExplanation = true } label: {
                        Image(systemName: "info.circle").font(.system(size: 15)).foregroundStyle(.white.opacity(0.65)).frame(width: 32, height: 32)
                    }.accessibilityLabel("About the medication estimate")
                }
                HStack(alignment: .lastTextBaseline, spacing: 6) {
                    Text(hasDoses ? "\(result.currentLevel)" : "—").font(TypeStyle.metric(53)).monospacedDigit().foregroundStyle(.white)
                    if hasDoses { Text("%").font(TypeStyle.body(24)).foregroundStyle(Palette.lime) }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 6) {
                        Text(store.profile.medicationLabel).font(TypeStyle.body(15, weight: .medium)).foregroundStyle(.white)
                        Text([store.profile.dose, store.profile.frequencyLabel].compactMap { $0 }.joined(separator: " · "))
                            .font(TypeStyle.body(11)).foregroundStyle(.white.opacity(0.6))
                    }
                }
                .accessibilityElement(children: .combine)
                .accessibilityLabel(hasDoses ? "Estimated relative GLP-1 level \(result.currentLevel) percent. \(store.profile.medicationLabel)." : "No doses recorded yet")

                if hasDoses {
                    levelChart(result)
                    HStack {
                        Text("\(Int(result.daysSinceDose)) days since dose")
                        Spacer()
                        Text(daysUntil == 0 ? "Dose due" : "Next in \(daysUntil) \(daysUntil == 1 ? "day" : "days")")
                    }.font(TypeStyle.body(10)).foregroundStyle(.white.opacity(0.55))
                } else {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("A little clarity,\none dose at a time.").font(TypeStyle.display(24)).foregroundStyle(.white.opacity(0.85))
                        Button { router.sheet = .dose } label: {
                            Label("Log your first dose", systemImage: "plus").font(TypeStyle.body(12, weight: .semibold)).foregroundStyle(Palette.lime).frame(minHeight: 40)
                        }
                    }.padding(.vertical, 6)
                }
                HStack(spacing: 6) {
                    Circle().fill(Palette.lime).frame(width: 4, height: 4)
                    Text("Estimated relative level · not a measured blood level")
                        .font(TypeStyle.body(9)).foregroundStyle(.white.opacity(0.55))
                }
            }
            .padding(22)
            .background {
                ZStack(alignment: .topTrailing) {
                    Palette.forest
                    Circle().stroke(.white.opacity(0.04), lineWidth: 36).frame(width: 220, height: 220).offset(x: 100, y: -130)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 28))
        }
        .alert("Understanding your estimate", isPresented: $showsExplanation) {
            Button("Got it", role: .cancel) {}
        } message: {
            Text("This is the same relative-level model used in Slimsy, based on your logged doses and medication. It is an approximation, not a blood measurement or advice about when to take a dose. Always follow your clinician’s prescribed plan.")
        }
    }

    private func levelChart(_ result: Pharmacokinetics.Result) -> some View {
        Chart {
            ForEach(result.curve) { point in
                AreaMark(x: .value("Hours since dose", point.hour), y: .value("Relative level", point.level))
                    .foregroundStyle(LinearGradient(colors: [Palette.lime.opacity(0.25), Palette.lime.opacity(0)], startPoint: .top, endPoint: .bottom))
                    .interpolationMethod(.monotone)
                LineMark(x: .value("Hours since dose", point.hour), y: .value("Relative level", point.level))
                    .foregroundStyle(Palette.lime).lineStyle(StrokeStyle(lineWidth: 2.5, lineCap: .round)).interpolationMethod(.monotone)
            }
            if result.currentHour <= result.cycleHours {
                RuleMark(x: .value("Now", result.currentHour))
                    .foregroundStyle(.white.opacity(0.3)).lineStyle(StrokeStyle(lineWidth: 1, dash: [3, 4]))
                    .annotation(position: .top, alignment: .center) {
                        Text("NOW").font(TypeStyle.body(8, weight: .bold)).tracking(1).foregroundStyle(Palette.lime)
                    }
                PointMark(x: .value("Now", result.currentHour), y: .value("Current estimate", Double(result.currentLevel) / 100))
                    .foregroundStyle(Palette.lime).symbolSize(35)
            }
        }
        .chartXScale(domain: 0...result.cycleHours).chartYScale(domain: 0...1.12)
        .chartXAxis(.hidden).chartYAxis(.hidden).frame(height: 77)
        .accessibilityLabel("Estimated medication level across your dosing cycle")
        .accessibilityValue("\(result.currentLevel) percent now")
    }
}

struct WeightTrendChart: View {
    var logs: [WeightLog]
    var units: UnitSystem
    var goal: Double? = nil
    var compact = false
    @State private var selectedDate: Date?

    private struct Point: Identifiable {
        var id: String
        var date: Date
        var weight: Double
    }
    private var points: [Point] {
        logs.compactMap { log in DayKey.date(log.date).map { Point(id: log.id, date: $0, weight: units.displayWeight(log.weight)) } }.sorted { $0.date < $1.date }
    }
    private var range: ClosedRange<Double> {
        let values = points.map(\.weight) + (goal.map { [units.displayWeight($0)] } ?? [])
        let minimum = values.min() ?? 0
        let maximum = values.max() ?? 1
        let padding = max(1.5, (maximum - minimum) * 0.17)
        return (minimum - padding)...(maximum + padding)
    }
    private var selection: Point? {
        guard let selectedDate else { return nil }
        return points.min { abs($0.date.timeIntervalSince(selectedDate)) < abs($1.date.timeIntervalSince(selectedDate)) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let selection, !compact {
                Text("\(selection.date.formatted(.dateTime.month(.abbreviated).day())) · \(selection.weight.formatted(.number.precision(.fractionLength(1)))) \(units.weightLabel)")
                    .font(TypeStyle.caption).foregroundStyle(Palette.green)
            }
            Chart {
                ForEach(points) { point in
                    AreaMark(x: .value("Date", point.date), yStart: .value("Baseline", range.lowerBound), yEnd: .value("Weight", point.weight))
                        .foregroundStyle(LinearGradient(colors: [Palette.green.opacity(0.12), Palette.green.opacity(0.01)], startPoint: .top, endPoint: .bottom)).interpolationMethod(.monotone)
                    LineMark(x: .value("Date", point.date), y: .value("Weight", point.weight))
                        .foregroundStyle(Palette.green).lineStyle(StrokeStyle(lineWidth: 2.5, lineCap: .round)).interpolationMethod(.monotone)
                    if points.count < 3 {
                        PointMark(x: .value("Date", point.date), y: .value("Weight", point.weight)).foregroundStyle(Palette.green).symbolSize(34)
                    }
                }
                if let goal {
                    RuleMark(y: .value("Goal", units.displayWeight(goal)))
                        .foregroundStyle(Palette.peach.opacity(0.65)).lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 5]))
                        .annotation(position: .top, alignment: .trailing) { Text("GOAL").font(TypeStyle.body(8, weight: .semibold)).tracking(1).foregroundStyle(Palette.peach) }
                }
                if let selection, !compact {
                    RuleMark(x: .value("Selected date", selection.date)).foregroundStyle(Palette.green.opacity(0.3))
                    PointMark(x: .value("Date", selection.date), y: .value("Weight", selection.weight)).foregroundStyle(Palette.green).symbolSize(55)
                }
            }
            .chartYScale(domain: range)
            .chartXAxis {
                AxisMarks(values: .automatic(desiredCount: compact ? 3 : 4)) { _ in
                    AxisValueLabel(format: .dateTime.month(.abbreviated).day()).font(TypeStyle.body(9)).foregroundStyle(Palette.secondary)
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading, values: .automatic(desiredCount: 3)) { _ in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [3, 4])).foregroundStyle(Palette.line)
                    AxisValueLabel().font(TypeStyle.body(9)).foregroundStyle(Palette.secondary)
                }
            }
            .chartXSelection(value: $selectedDate)
            .frame(height: compact ? 115 : 200)
            .accessibilityLabel("Weight history in \(units.weightLabel)")
        }
    }
}
