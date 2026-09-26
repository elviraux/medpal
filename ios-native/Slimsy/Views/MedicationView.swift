import SwiftUI

struct MedicationView: View {
    @Environment(AppStore.self) private var store
    @Environment(AppRouter.self) private var router
    @State private var historyTab = 0
    @State private var deletion: String?
    @State private var deletingSymptom = false

    var body: some View {
        Screen {
            ScreenHeader(eyebrow: "A little consistency", title: "Your medication.", actionLabel: "Edit medication", symbol: "slider.horizontal.3") { router.sheet = .medication }
            scheduleCard
            if store.profile.isInjection { rotationCard }
            HStack(spacing: 12) {
                SecondaryButton(title: "Log a dose", symbol: "plus") { router.sheet = .dose }
                SecondaryButton(title: "How you feel", symbol: "heart") { router.sheet = .sideEffect }
            }
            VStack(alignment: .leading, spacing: 17) {
                SectionTitle(title: "Your journal")
                Picker("History", selection: $historyTab) {
                    Text("Doses").tag(0)
                    Text("Side effects").tag(1)
                }.pickerStyle(.segmented).accessibilityIdentifier("medication-history-picker")
                if historyTab == 0 { doseHistory } else { symptomHistory }
            }
            AppCard {
                VStack(alignment: .leading, spacing: 12) {
                    SectionTitle(title: "Your prescription", actionTitle: "Edit") { router.sheet = .medication }
                    InfoRow(symbol: "pills", title: "Medication", value: store.profile.medicationLabel)
                    InfoRow(symbol: "drop", title: "Dose", value: store.profile.dose ?? "Not set")
                    InfoRow(symbol: "calendar", title: "Schedule", value: store.profile.frequencyLabel)
                    if let device = store.profile.deviceType, store.profile.isInjection { InfoRow(symbol: "syringe", title: "Device", value: device.title) }
                }
            }
        }
        .confirmationDialog(deletingSymptom ? "Delete this side effect?" : "Delete this dose?", isPresented: Binding(get: { deletion != nil }, set: { if !$0 { deletion = nil } }), titleVisibility: .visible) {
            Button("Delete entry", role: .destructive) {
                if let deletion {
                    if deletingSymptom { store.deleteSideEffect(deletion) } else { store.deleteDose(deletion) }
                }
                deletion = nil
            }
            Button("Cancel", role: .cancel) { deletion = nil }
        } message: { Text("Your journal and charts will update to reflect this change.") }
    }

    private var scheduleCard: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 24) {
                HStack(spacing: 13) {
                    IconBadge(symbol: store.profile.isInjection ? "syringe" : "pills", size: 49)
                    VStack(alignment: .leading, spacing: 5) {
                        Text(store.profile.medicationLabel).font(TypeStyle.body(20, weight: .semibold)).foregroundStyle(Palette.ink)
                        Text("\(store.profile.dose ?? "Dose not set") · \(store.profile.frequencyLabel)").font(TypeStyle.body(12)).foregroundStyle(Palette.secondary)
                    }
                    Spacer()
                }
                Rectangle().fill(Palette.line).frame(height: 1)
                TimelineView(.periodic(from: .now, by: 60)) { context in
                    if let next = store.nextDose(at: context.date) {
                        let countdown = DoseCountdown(nextDose: next, now: context.date)
                        VStack(alignment: .leading, spacing: 16) {
                            Eyebrow(text: countdown.overdue ? "Your scheduled dose is due" : "A little time until your next dose")
                            if countdown.overdue {
                                HStack(spacing: 10) {
                                    Image(systemName: "calendar.badge.clock").foregroundStyle(Palette.peach)
                                    Text("Time for a check-in.").font(TypeStyle.display(27)).foregroundStyle(Palette.ink)
                                }
                                Text("Follow your prescribed plan, then log your dose here.").font(TypeStyle.body(12)).foregroundStyle(Palette.secondary)
                            } else {
                                HStack(alignment: .top, spacing: 0) {
                                    countdownValue(countdown.days, unit: "DAYS")
                                    Text(":").font(TypeStyle.metric(32)).foregroundStyle(Palette.line).padding(.top, 4)
                                    countdownValue(countdown.hours, unit: "HOURS")
                                    Text(":").font(TypeStyle.metric(32)).foregroundStyle(Palette.line).padding(.top, 4)
                                    countdownValue(countdown.minutes, unit: "MINUTES")
                                }
                                HStack(spacing: 7) {
                                    Image(systemName: "calendar").font(.system(size: 11))
                                    Text(next.formatted(.dateTime.weekday(.wide).month(.abbreviated).day().hour().minute())).font(TypeStyle.body(11))
                                }.foregroundStyle(Palette.secondary)
                            }
                        }
                    } else {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Let's find your rhythm.").font(TypeStyle.display(25)).foregroundStyle(Palette.ink)
                            Text("Log a dose to see your next check-in and estimated medication cycle.").font(TypeStyle.body(13)).foregroundStyle(Palette.secondary)
                        }
                    }
                }
                PrimaryButton(title: "Log dose", symbol: "plus") { router.sheet = .dose }.accessibilityIdentifier("log-dose-button")
            }
        }
    }
    private func countdownValue(_ value: Int, unit: String) -> some View {
        VStack(spacing: 6) {
            Text(String(format: "%02d", value)).font(TypeStyle.metric(43)).monospacedDigit().foregroundStyle(Palette.ink)
            Text(unit).font(TypeStyle.body(9, weight: .medium)).tracking(1.5).foregroundStyle(Palette.secondary)
        }.frame(maxWidth: .infinity).accessibilityElement(children: .combine)
    }
    private var rotationCard: some View {
        AppCard(tint: Palette.paleGreen.opacity(0.65)) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    SectionTitle(title: "A new spot, each time")
                    Image(systemName: "arrow.triangle.2.circlepath").font(.system(size: 15)).foregroundStyle(Palette.green)
                }
                HStack(spacing: 16) {
                    InjectionDiagram(selected: store.suggestedSite, suggested: store.suggestedSite) { _ in router.sheet = .dose }
                        .frame(width: 116, height: 184)
                    VStack(alignment: .leading, spacing: 13) {
                        Eyebrow(text: "Rotation suggestion")
                        Text(store.suggestedSite.title).font(TypeStyle.display(23)).foregroundStyle(Palette.ink)
                        Text("Based on your last three logged sites. Use only sites approved for your medication.").font(TypeStyle.body(11)).foregroundStyle(Palette.secondary).fixedSize(horizontal: false, vertical: true)
                        if let site = store.lastDose()?.injectionSite {
                            Text("Last used: \(site.title.lowercased())").font(TypeStyle.body(10)).foregroundStyle(Palette.green)
                        }
                    }
                }
            }
        }
    }
    private var doseHistory: some View {
        AppCard {
            if store.data.medicationLogs.isEmpty {
                EmptyState(symbol: "syringe", title: "One dose at a time", message: "Your dose history will be right here.", actionTitle: "Log your first dose") { router.sheet = .dose }
            } else {
                VStack(spacing: 0) {
                    ForEach(store.data.medicationLogs) { log in
                        HStack(alignment: .top, spacing: 13) {
                            IconBadge(symbol: log.deliveryType.symbol, size: 37)
                            VStack(alignment: .leading, spacing: 5) {
                                HStack {
                                    Text(log.dose).font(TypeStyle.body(14, weight: .semibold)).foregroundStyle(Palette.ink)
                                    Spacer()
                                    Text(DayKey.label(log.date)).font(TypeStyle.body(10)).foregroundStyle(Palette.secondary)
                                }
                                Text([log.timestamp?.formatted(date: .omitted, time: .shortened), log.injectionSite?.title].compactMap { $0 }.joined(separator: " · "))
                                    .font(TypeStyle.body(11)).foregroundStyle(Palette.secondary)
                                if let notes = log.notes, !notes.isEmpty { Text(notes).font(TypeStyle.body(11)).foregroundStyle(Palette.secondary).fixedSize(horizontal: false, vertical: true) }
                            }
                            Menu {
                                Button("Delete dose", systemImage: "trash", role: .destructive) { deletingSymptom = false; deletion = log.id }
                            } label: { Image(systemName: "ellipsis").font(.system(size: 14)).foregroundStyle(Palette.secondary).frame(width: 26, height: 40) }.accessibilityLabel("Dose options for \(DayKey.label(log.date))")
                        }.padding(.vertical, 13)
                        if log.id != store.data.medicationLogs.last?.id { Divider().overlay(Palette.line) }
                    }
                }
            }
        }
    }
    private var symptomHistory: some View {
        AppCard {
            if store.data.sideEffectLogs.isEmpty {
                EmptyState(symbol: "heart.text.clipboard", title: "How are you feeling?", message: "Keep a record you can share with your care team.", actionTitle: "Log a side effect") { router.sheet = .sideEffect }
            } else {
                VStack(spacing: 0) {
                    ForEach(store.data.sideEffectLogs) { log in
                        HStack(alignment: .top, spacing: 12) {
                            IconBadge(symbol: log.effectType.symbol, color: Palette.peach, size: 37)
                            VStack(alignment: .leading, spacing: 7) {
                                Text(log.effectType.title).font(TypeStyle.body(14, weight: .semibold)).foregroundStyle(Palette.ink)
                                HStack(spacing: 4) {
                                    ForEach(1...5, id: \.self) { value in Capsule().fill(value <= log.severity ? Palette.peach : Palette.line).frame(width: 17, height: 4) }
                                    Text("\(log.severity)/5 · \(DayKey.label(log.date))").font(TypeStyle.body(10)).foregroundStyle(Palette.secondary).padding(.leading, 4)
                                }
                                if let notes = log.notes, !notes.isEmpty { Text(notes).font(TypeStyle.body(11)).foregroundStyle(Palette.secondary) }
                            }
                            Spacer(minLength: 0)
                            Menu { Button("Delete side effect", systemImage: "trash", role: .destructive) { deletingSymptom = true; deletion = log.id } } label: {
                                Image(systemName: "ellipsis").foregroundStyle(Palette.secondary).frame(width: 26, height: 40)
                            }.accessibilityLabel("Options for \(log.effectType.title)")
                        }.padding(.vertical, 13)
                        if log.id != store.data.sideEffectLogs.last?.id { Divider().overlay(Palette.line) }
                    }
                }
            }
        }
    }
}

struct InjectionDiagram: View {
    var selected: InjectionSite?
    var suggested: InjectionSite?
    var onSelect: (InjectionSite) -> Void
    private func location(_ site: InjectionSite) -> UnitPoint {
        switch site {
        case .abdomenLeft: UnitPoint(x: 0.65, y: 0.47)
        case .abdomenRight: UnitPoint(x: 0.35, y: 0.47)
        case .thighLeft: UnitPoint(x: 0.64, y: 0.73)
        case .thighRight: UnitPoint(x: 0.36, y: 0.73)
        case .armLeft: UnitPoint(x: 0.83, y: 0.35)
        case .armRight: UnitPoint(x: 0.17, y: 0.35)
        }
    }
    var body: some View {
        GeometryReader { proxy in
            ZStack {
                BodyShape().fill(Palette.green.opacity(0.09)).overlay(BodyShape().stroke(Palette.green.opacity(0.22), lineWidth: 1))
                ForEach(InjectionSite.allCases) { site in
                    let position = location(site)
                    Button { onSelect(site); Feedback.light() } label: {
                        ZStack {
                            if site == suggested { Circle().stroke(Palette.green.opacity(0.7), style: StrokeStyle(lineWidth: 1, dash: [2, 2])).frame(width: 26, height: 26) }
                            Circle().fill(site == selected ? Palette.green : Palette.surface).frame(width: 13, height: 13)
                                .overlay(Circle().stroke(Palette.green.opacity(0.65), lineWidth: 1))
                            if site == selected { Circle().fill(Palette.lime).frame(width: 4, height: 4) }
                        }.frame(width: 40, height: 40).contentShape(Circle())
                    }
                    .buttonStyle(.plain).position(x: proxy.size.width * position.x, y: proxy.size.height * position.y)
                    .accessibilityLabel(site.title).accessibilityAddTraits(site == selected ? .isSelected : [])
                }
            }
        }
    }
}

private struct BodyShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.addEllipse(in: CGRect(x: 39, y: 2, width: 22, height: 22))
        p.move(to: CGPoint(x: 42, y: 25))
        p.addQuadCurve(to: CGPoint(x: 29, y: 29), control: CGPoint(x: 36, y: 28))
        p.addQuadCurve(to: CGPoint(x: 17, y: 38), control: CGPoint(x: 20, y: 30))
        p.addLine(to: CGPoint(x: 8, y: 81))
        p.addQuadCurve(to: CGPoint(x: 18, y: 87), control: CGPoint(x: 5, y: 90))
        p.addLine(to: CGPoint(x: 32, y: 49))
        p.addLine(to: CGPoint(x: 32, y: 88))
        p.addLine(to: CGPoint(x: 31, y: 146))
        p.addQuadCurve(to: CGPoint(x: 44, y: 148), control: CGPoint(x: 35, y: 155))
        p.addLine(to: CGPoint(x: 50, y: 100))
        p.addLine(to: CGPoint(x: 56, y: 148))
        p.addQuadCurve(to: CGPoint(x: 69, y: 146), control: CGPoint(x: 66, y: 155))
        p.addLine(to: CGPoint(x: 68, y: 88))
        p.addLine(to: CGPoint(x: 68, y: 49))
        p.addLine(to: CGPoint(x: 82, y: 87))
        p.addQuadCurve(to: CGPoint(x: 92, y: 81), control: CGPoint(x: 95, y: 90))
        p.addLine(to: CGPoint(x: 83, y: 38))
        p.addQuadCurve(to: CGPoint(x: 71, y: 29), control: CGPoint(x: 80, y: 30))
        p.addQuadCurve(to: CGPoint(x: 58, y: 25), control: CGPoint(x: 64, y: 28))
        p.closeSubpath()
        return p.applying(CGAffineTransform(scaleX: rect.width / 100, y: rect.height / 160))
    }
}

struct InjectionSitePicker: View {
    @Binding var selection: InjectionSite?
    var suggested: InjectionSite?
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                InjectionDiagram(selected: selection, suggested: suggested) { selection = $0 }.frame(width: 160, height: 240)
                VStack(alignment: .leading, spacing: 12) {
                    Eyebrow(text: "Change your spot")
                    Text(selection?.title ?? "Where was\nyour injection?").font(TypeStyle.display(24)).foregroundStyle(Palette.ink)
                    if let suggested { Text("Rotation suggestion:\n\(suggested.title)").font(TypeStyle.body(12)).foregroundStyle(Palette.secondary) }
                    Text("Front view. Left and right refer to your body.").font(TypeStyle.body(10)).foregroundStyle(Palette.secondary)
                }.frame(maxWidth: .infinity, alignment: .leading)
            }
            LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 9) {
                ForEach(InjectionSite.allCases) { site in
                    ChoiceChip(title: site.title, selected: selection == site) { selection = selection == site ? nil : site }
                }
            }
        }
    }
}
