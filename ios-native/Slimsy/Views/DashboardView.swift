import SwiftUI

struct DashboardView: View {
    @Environment(AppStore.self) private var store
    @Environment(AppRouter.self) private var router

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: .now)
        return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
    }

    var body: some View {
        Screen {
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 7) {
                    Eyebrow(text: "\(greeting)\(store.profile.firstName.isEmpty ? "" : ", \(store.profile.firstName)")")
                    Text("Your daily rhythm.").font(TypeStyle.display(32)).foregroundStyle(Palette.ink)
                }
                Spacer(minLength: 0)
                Button { router.tab = .settings } label: {
                    SlimsyMark(size: 29).frame(width: 48, height: 48).background(Palette.paleGreen, in: Circle())
                }.accessibilityLabel("Open your profile").buttonStyle(PressFeedback())
            }
            WeekStrip()
            MedicationLevelCard()
            NextDoseRow()
            quickActions
            DailyGoalsCard()
            weightCard
            recentActivity
            HStack(spacing: 8) {
                SlimsyMark(size: 18)
                Text("Small steps. Lasting change.").font(TypeStyle.body(11)).foregroundStyle(Palette.secondary)
            }.frame(maxWidth: .infinity).padding(.top, 4)
        }
        .accessibilityIdentifier("dashboard-screen")
    }

    private var quickActions: some View {
        HStack(spacing: 10) {
            quickAction("Food", symbol: "fork.knife", color: Palette.peach, sheet: .food(), identifier: "quick-food")
            quickAction("Dose", symbol: "syringe", color: Palette.green, sheet: .dose, identifier: "quick-dose")
            quickAction("Weight", symbol: "scalemass", color: Palette.blue, sheet: .weight, identifier: "quick-weight")
            quickAction("Symptoms", symbol: "heart.text.clipboard", color: Palette.peach, sheet: .sideEffect, identifier: "quick-symptoms")
        }
    }
    private func quickAction(_ title: String, symbol: String, color: Color, sheet: AppSheet, identifier: String) -> some View {
        Button { router.sheet = sheet } label: {
            VStack(spacing: 9) {
                IconBadge(symbol: symbol, color: color, size: 44)
                Text(title).font(TypeStyle.body(10, weight: .medium)).foregroundStyle(Palette.ink)
            }.frame(maxWidth: .infinity).padding(.vertical, 9)
        }.buttonStyle(PressFeedback()).accessibilityLabel("Log \(title.lowercased())").accessibilityIdentifier(identifier)
    }

    private var weightCard: some View {
        VStack(spacing: 14) {
            SectionTitle(title: "The bigger picture", actionTitle: "View progress") { router.tab = .weight }
            AppCard {
                if let weight = store.currentWeight, !store.data.weightLogs.isEmpty {
                    VStack(alignment: .leading, spacing: 18) {
                        HStack(alignment: .firstTextBaseline) {
                            (Text(store.units.weight(weight)).font(TypeStyle.metric(32)) + Text(" \(store.units.weightLabel)").font(TypeStyle.body(13))).foregroundStyle(Palette.ink)
                            Spacer()
                            if let change = store.weightChange {
                                Tag(text: "\(store.units.weight(abs(change))) \(store.units.weightLabel) \(change >= 0 ? "down" : "up")", symbol: change >= 0 ? "arrow.down.right" : "arrow.up.right")
                            }
                        }
                        WeightTrendChart(logs: Array(store.data.weightLogs.prefix(30)), units: store.units, compact: true)
                    }
                } else {
                    EmptyState(symbol: "chart.xyaxis.line", title: "Your progress starts here", message: "Every check-in is part of your story.", actionTitle: "Log your weight") { router.sheet = .weight }
                }
            }
        }
    }

    private var recentActivity: some View {
        let entries = activityEntries
        return VStack(spacing: 14) {
            SectionTitle(title: "Little things, logged")
            AppCard {
                if entries.isEmpty {
                    EmptyState(symbol: "checkmark.seal", title: "Make a little space for you", message: "Your meals, doses, and check-ins will appear here.")
                } else {
                    VStack(spacing: 16) {
                        ForEach(entries.prefix(5)) { entry in
                            HStack(spacing: 12) {
                                IconBadge(symbol: entry.symbol, color: entry.color, size: 35)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(entry.title).font(TypeStyle.body(13, weight: .medium)).foregroundStyle(Palette.ink)
                                    Text(DayKey.label(entry.date)).font(TypeStyle.body(10)).foregroundStyle(Palette.secondary)
                                }
                                Spacer()
                                Image(systemName: "checkmark").font(.system(size: 11, weight: .medium)).foregroundStyle(Palette.green.opacity(0.65))
                            }.accessibilityElement(children: .combine)
                        }
                    }
                }
            }
        }
    }
    private struct Activity: Identifiable {
        var id: String
        var date: String
        var title: String
        var symbol: String
        var color: Color
    }
    private var activityEntries: [Activity] {
        let food = store.data.foodLogs.prefix(3).map { Activity(id: "f-" + $0.id, date: $0.date, title: $0.title, symbol: "fork.knife", color: Palette.peach) }
        let doses = store.data.medicationLogs.prefix(3).map { Activity(id: "m-" + $0.id, date: $0.date, title: "\($0.dose) dose recorded", symbol: $0.deliveryType.symbol, color: Palette.green) }
        let weights = store.data.weightLogs.prefix(3).map { Activity(id: "w-" + $0.id, date: $0.date, title: "Checked in at \(store.units.weight($0.weight)) \(store.units.weightLabel)", symbol: "scalemass", color: Palette.blue) }
        let symptoms = store.data.sideEffectLogs.prefix(2).map { Activity(id: "s-" + $0.id, date: $0.date, title: "\($0.effectType.title) · \($0.severity)/5", symbol: "heart.text.clipboard", color: Palette.peach) }
        return (food + doses + weights + symptoms).sorted { $0.date > $1.date }
    }
}

struct WeekStrip: View {
    @Environment(AppStore.self) private var store
    private var dates: [Date] { (-6...0).compactMap { Calendar.current.date(byAdding: .day, value: $0, to: .now) } }
    var body: some View {
        HStack(spacing: 4) {
            ForEach(dates, id: \.self) { date in
                let selected = Calendar.current.isDate(date, inSameDayAs: store.selectedDate)
                let today = Calendar.current.isDateInToday(date)
                Button {
                    store.selectedDate = date
                    Feedback.light()
                } label: {
                    VStack(spacing: 8) {
                        Text(date.formatted(.dateTime.weekday(.abbreviated)).uppercased()).font(TypeStyle.body(9, weight: .medium)).tracking(0.3)
                        Text(date.formatted(.dateTime.day())).font(TypeStyle.body(17, weight: .medium)).monospacedDigit()
                        Circle().fill(selected ? Palette.lime : (today ? Palette.green : .clear)).frame(width: 3, height: 3)
                    }
                    .foregroundStyle(selected ? .white : Palette.secondary)
                    .frame(maxWidth: .infinity).padding(.vertical, 11)
                    .background(selected ? Palette.forest : .clear, in: RoundedRectangle(cornerRadius: 22))
                }
                .buttonStyle(PressFeedback())
                .accessibilityLabel(date.formatted(date: .complete, time: .omitted))
                .accessibilityAddTraits(selected ? .isSelected : [])
            }
        }
    }
}

struct NextDoseRow: View {
    @Environment(AppStore.self) private var store
    @Environment(AppRouter.self) private var router
    var body: some View {
        TimelineView(.periodic(from: .now, by: 60)) { context in
            HStack(spacing: 12) {
                IconBadge(symbol: store.profile.isInjection ? "syringe" : "pills", size: 40)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Next dose").font(TypeStyle.body(13, weight: .semibold)).foregroundStyle(Palette.ink)
                    if let next = store.nextDose(at: context.date) {
                        Text(next < context.date ? "Ready for a schedule check-in" : next.formatted(.dateTime.weekday(.wide).hour().minute()))
                            .font(TypeStyle.body(11)).foregroundStyle(next < context.date ? Palette.peach : Palette.secondary)
                    } else { Text("Begin with your first dose").font(TypeStyle.body(11)).foregroundStyle(Palette.secondary) }
                }
                Spacer(minLength: 4)
                Button { router.sheet = .dose } label: {
                    Text("Log dose").font(TypeStyle.body(11, weight: .semibold)).foregroundStyle(Palette.green)
                        .padding(.horizontal, 14).frame(minHeight: 40).background(Palette.paleGreen, in: Capsule())
                }.buttonStyle(PressFeedback())
            }.padding(14).background(Palette.surface, in: RoundedRectangle(cornerRadius: 21))
        }
    }
}

struct DailyGoalsCard: View {
    @Environment(AppStore.self) private var store
    @Environment(AppRouter.self) private var router
    var body: some View {
        let totals = store.nutrition(on: store.selectedDay)
        VStack(spacing: 14) {
            SectionTitle(title: "Daily nourishment", actionTitle: DayKey.label(store.selectedDay)) { router.tab = .food }
            AppCard {
                HStack(spacing: 10) {
                    goal(value: totals.calories, target: store.targets.calories, unit: "kcal", name: "Calories", symbol: "flame", color: Palette.peach)
                    goal(value: totals.protein, target: store.targets.protein, unit: "g", name: "Protein", symbol: "fish", color: Palette.green)
                    goal(value: totals.fiber, target: store.targets.fiber, unit: "g", name: "Fiber", symbol: "leaf", color: Palette.blue)
                    goal(value: Double(store.water(on: store.selectedDay)), target: Double(store.targets.water), unit: "cups", name: "Water", symbol: "drop", color: Palette.blue)
                }
            }
        }
    }
    private func goal(value: Double, target: Double, unit: String, name: String, symbol: String, color: Color) -> some View {
        VStack(spacing: 9) {
            MetricRing(progress: value / target, color: color, size: 48, lineWidth: 4, symbol: symbol)
            Text(value.formatted(.number.precision(.fractionLength(0)))).font(TypeStyle.body(16, weight: .semibold)).foregroundStyle(Palette.ink).monospacedDigit()
            Text(name).font(TypeStyle.body(10)).foregroundStyle(Palette.secondary)
        }.frame(maxWidth: .infinity).accessibilityElement(children: .ignore)
            .accessibilityLabel("\(name): \(Int(value)) of \(Int(target)) \(unit)")
    }
}
