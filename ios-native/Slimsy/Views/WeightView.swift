import SwiftUI

struct WeightView: View {
    @Environment(AppStore.self) private var store
    @Environment(AppRouter.self) private var router
    @State private var period = WeightPeriod.month
    @State private var pendingDelete: WeightLog?

    enum WeightPeriod: Int, CaseIterable, Identifiable {
        case week = 7, month = 30, quarter = 90, all = 0
        var id: Int { rawValue }
        var title: String { self == .all ? "All time" : "\(rawValue) days" }
    }
    private var filtered: [WeightLog] {
        guard period != .all, let cutoff = Calendar.current.date(byAdding: .day, value: -period.rawValue + 1, to: .now) else { return store.data.weightLogs }
        let day = DayKey.string(cutoff)
        return store.data.weightLogs.filter { $0.date >= day }
    }

    var body: some View {
        Screen {
            ScreenHeader(eyebrow: "The bigger picture", title: "Every step counts.", actionLabel: "Log weight") { router.sheet = .weight }
            currentWeightCard
            HStack(spacing: 12) {
                smallStat("Since you started", value: store.weightChange.map { store.units.weight(abs($0)) } ?? "—", unit: store.units.weightLabel, symbol: (store.weightChange ?? 0) >= 0 ? "arrow.down.right" : "arrow.up.right", color: Palette.plum)
                smallStat("Current BMI", value: store.bmi.map { $0.formatted(.number.precision(.fractionLength(1))) } ?? "—", unit: "", symbol: "figure.stand", color: Palette.blue)
            }
            trendCard
            if let start = store.profile.startWeight, let goal = store.profile.goalWeight {
                milestoneCard(start: start, goal: goal)
            }
            history
        }
        .confirmationDialog("Delete this weight entry?", isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } }), titleVisibility: .visible) {
            Button("Delete entry", role: .destructive) { if let log = pendingDelete { store.deleteWeight(log.id) }; pendingDelete = nil }
            Button("Cancel", role: .cancel) { pendingDelete = nil }
        } message: { Text("Your current weight and charts will be recalculated.") }
    }

    private var currentWeightCard: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 22) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 8) {
                        Eyebrow(text: "Your latest check-in")
                        (Text(store.currentWeight.map { store.units.weight($0) } ?? "—").font(TypeStyle.metric(52)) + Text(" \(store.units.weightLabel)").font(TypeStyle.body(17)))
                            .foregroundStyle(Palette.ink).monospacedDigit().accessibilityIdentifier("current-weight")
                        Text(store.data.weightLogs.first.map { DayKey.label($0.date) } ?? "Ready when you are").font(TypeStyle.body(11)).foregroundStyle(Palette.secondary)
                    }
                    Spacer(minLength: 0)
                    ZStack {
                        Circle().fill(Palette.blush).frame(width: 74, height: 74)
                        SlimsyMark(size: 45)
                    }
                }
                if let start = store.profile.startWeight, let goal = store.profile.goalWeight {
                    VStack(spacing: 10) {
                        ProgressTrack(progress: store.goalProgress, height: 7)
                        HStack {
                            Text("Started \(store.units.weight(start, decimals: 0))")
                            Spacer()
                            Text("Goal \(store.units.weight(goal, decimals: 0)) \(store.units.weightLabel)")
                        }.font(TypeStyle.body(10)).foregroundStyle(Palette.secondary)
                    }
                }
                PrimaryButton(title: "Log weight", symbol: "plus") { router.sheet = .weight }.accessibilityIdentifier("log-weight-button")
            }
        }
    }
    private func smallStat(_ title: String, value: String, unit: String, symbol: String, color: Color) -> some View {
        AppCard(padding: 16) {
            VStack(alignment: .leading, spacing: 12) {
                Image(systemName: symbol).font(.system(size: 17)).foregroundStyle(color)
                (Text(value).font(TypeStyle.metric(29)) + Text(unit.isEmpty ? "" : " \(unit)").font(TypeStyle.body(12))).foregroundStyle(Palette.ink).monospacedDigit()
                Text(title).font(TypeStyle.body(10)).foregroundStyle(Palette.secondary)
            }
        }
    }
    private var trendCard: some View {
        VStack(spacing: 16) {
            SectionTitle(title: "Your weight over time")
            Picker("Time period", selection: $period) {
                ForEach(WeightPeriod.allCases) { Text($0.title).tag($0) }
            }.pickerStyle(.segmented).accessibilityIdentifier("weight-period")
            AppCard {
                if filtered.isEmpty {
                    EmptyState(symbol: "chart.xyaxis.line", title: "Nothing in this range", message: "No check-ins in this time period. Choose a wider range or log a weight.", actionTitle: "Add a check-in") { router.sheet = .weight }
                } else {
                    VStack(alignment: .leading, spacing: 15) {
                        HStack {
                            Text("\(filtered.count) check-ins").font(TypeStyle.body(11)).foregroundStyle(Palette.secondary)
                            Spacer()
                            Text(store.units.weightLabel.uppercased()).font(TypeStyle.body(9, weight: .semibold)).tracking(1.5).foregroundStyle(Palette.secondary)
                        }
                        WeightTrendChart(logs: filtered, units: store.units, goal: store.profile.goalWeight)
                        Text("Touch the chart to explore your check-ins.").font(TypeStyle.body(10)).foregroundStyle(Palette.secondary)
                    }
                }
            }
        }
    }
    private func milestoneCard(start: Double, goal: Double) -> some View {
        AppCard(tint: Palette.blush) {
            HStack(spacing: 17) {
                ZStack {
                    MetricRing(progress: store.goalProgress, size: 58, lineWidth: 4)
                    Text("\(Int((store.goalProgress * 100).rounded()))%").font(TypeStyle.body(14, weight: .semibold)).foregroundStyle(Palette.plum)
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text(store.goalProgress >= 1 ? "Look how far you've come." : "You're on your way.").font(TypeStyle.display(20)).foregroundStyle(Palette.ink)
                    Text("Progress toward your goal of \(store.units.weight(goal, decimals: 0)) \(store.units.weightLabel).").font(TypeStyle.body(11)).foregroundStyle(Palette.secondary)
                    Button("Adjust your goals") { router.sheet = .goals }.font(TypeStyle.body(11, weight: .semibold)).foregroundStyle(Palette.plum).frame(minHeight: 32)
                }
            }
        }
    }
    private var history: some View {
        VStack(spacing: 14) {
            SectionTitle(title: "Check-in history")
            if store.data.weightLogs.isEmpty {
                AppCard { EmptyState(symbol: "scalemass", title: "More than a number", message: "Your check-ins will help you see change over time.") }
            } else {
                AppCard {
                    VStack(spacing: 0) {
                        ForEach(store.data.weightLogs) { log in
                            HStack(spacing: 14) {
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(DayKey.label(log.date)).font(TypeStyle.body(13, weight: .medium)).foregroundStyle(Palette.ink)
                                    if let notes = log.notes, !notes.isEmpty { Text(notes).font(TypeStyle.body(10)).foregroundStyle(Palette.secondary).fixedSize(horizontal: false, vertical: true) }
                                }
                                Spacer()
                                Text("\(store.units.weight(log.weight)) \(store.units.weightLabel)").font(TypeStyle.body(14, weight: .semibold)).foregroundStyle(Palette.ink).monospacedDigit()
                                Menu { Button("Delete entry", systemImage: "trash", role: .destructive) { pendingDelete = log } } label: { Image(systemName: "ellipsis").foregroundStyle(Palette.secondary).frame(width: 28, height: 44) }.accessibilityLabel("Weight entry options for \(DayKey.label(log.date))")
                            }.padding(.vertical, 9)
                            if log.id != store.data.weightLogs.last?.id { Divider().overlay(Palette.line) }
                        }
                    }
                }
            }
        }
    }
}
