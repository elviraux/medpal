import SwiftUI
import StoreKit

struct OnboardingView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.requestReview) private var requestReview
    @State private var step = OnboardingStep.welcome
    @State private var profile = UserProfile()
    @State private var units = UnitSystem.imperial
    @State private var height = ""
    @State private var feet = ""
    @State private var inches = ""
    @State private var currentWeight = ""
    @State private var startWeight = ""
    @State private var goalWeight = ""
    @State private var startDate = Date.now
    @State private var weeklyGoal: Double = 1
    @State private var activity: ActivityLevel?
    @State private var motivation: Motivation?
    @State private var cravings: Set<String> = []
    @State private var concerns: Set<String> = []
    @State private var firstDoseDate = Date.now
    @State private var firstDoseSite: InjectionSite?
    @State private var firstDoseNotes = ""
    @State private var firstDoseID: String?
    @State private var consent = false
    @State private var wantsReminders = true
    @State private var isCompleting = false
    @State private var celebrating = false
    @State private var requestedReview = false

    private var heightCM: Double? {
        if units == .metric { return height.decimalValue }
        guard let f = feet.decimalValue else { return nil }
        return (f * 12 + (inches.decimalValue ?? 0)) * 2.54
    }
    private var canContinue: Bool {
        switch step {
        case .medication: return profile.medication != nil
        case .delivery: return profile.deliveryType != nil
        case .dose: return profile.dose?.nonempty != nil
        case .frequency:
            return profile.frequency != nil && (profile.frequency != .custom || profile.customFrequencyDays.map { (1...365).contains($0) } == true)
        case .device: return profile.deviceType != nil
        case .disclaimer: return consent
        case .height: return heightCM.map { (1...1_000).contains($0) } == true
        case .currentWeight: return validWeight(currentWeight)
        case .startWeight: return validWeight(startWeight)
        case .goalWeight: return validWeight(goalWeight)
        case .activity: return activity != nil
        case .motivation: return motivation != nil
        case .firstDose: return !celebrating
        default: return true
        }
    }
    private var buttonTitle: String {
        if step == .welcome { return "Let's begin" }
        if step == .firstDose { return celebrating ? "Dose logged!" : firstDoseID == nil ? "Log dose" : "Update dose" }
        return "Continue"
    }

    var body: some View {
        Group {
            if step == .pro {
                ProView(onContinue: complete)
            } else {
                NavigationStack {
                    VStack(spacing: 0) {
                        if step != .welcome { progressHeader }
                        ScrollViewReader { reader in
                            ScrollView {
                                VStack(alignment: .leading, spacing: 25) {
                                    Color.clear.frame(height: 0).id("top")
                                    content
                                    if let message = store.errorMessage { ErrorBanner(message: message) }
                                }.padding(.horizontal, 25).padding(.top, step == .welcome ? 6 : 20).padding(.bottom, 28)
                            }
                            .scrollDismissesKeyboard(.interactively).scrollIndicators(.hidden)
                            .onChange(of: step) { _, _ in reader.scrollTo("top", anchor: .top) }
                        }
                    }
                    .background(Palette.background)
                    .safeAreaInset(edge: .bottom) { footer }
                    .toolbar(.hidden, for: .navigationBar)
                    .toolbar {
                        ToolbarItemGroup(placement: .keyboard) {
                            Spacer()
                            Button("Done", action: dismissKeyboard)
                        }
                    }
                    .overlay { if celebrating { DoseCelebration() } }
                }
            }
        }
        .onChange(of: units, convertUnits)
    }

    private var progressHeader: some View {
        HStack(spacing: 16) {
            Button {
                dismissKeyboard()
                withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.2)) { step = step.previous(delivery: profile.deliveryType) }
            } label: {
                Image(systemName: "arrow.left").font(.system(size: 15)).foregroundStyle(Palette.ink).frame(width: 38, height: 44)
            }.accessibilityLabel("Previous setup step").accessibilityIdentifier("onboarding-back").disabled(celebrating)
            ProgressView(value: Double(step.rawValue), total: Double(OnboardingStep.pro.rawValue)).tint(Palette.green)
                .accessibilityLabel("Setup progress")
            Text(String(format: "%02d / 27", step.rawValue))
                .font(TypeStyle.body(10, weight: .medium)).foregroundStyle(Palette.secondary).monospacedDigit()
                .accessibilityIdentifier("onboarding-step")
        }.padding(.horizontal, 20).padding(.top, 6)
    }
    private var footer: some View {
        VStack(spacing: 5) {
            PrimaryButton(title: buttonTitle, symbol: step == .firstDose ? "checkmark" : "arrow.right", disabled: !canContinue) {
                dismissKeyboard()
                if step == .firstDose { saveFirstDose() } else { next() }
            }.accessibilityIdentifier("onboarding-continue")
            if step == .firstDose || step == .rating {
                Button(step == .rating ? "Maybe later" : firstDoseID == nil ? "Skip for now" : "Continue without changes", action: next)
                    .font(TypeStyle.body(12)).foregroundStyle(Palette.secondary).frame(minHeight: 44)
                    .accessibilityIdentifier("onboarding-skip").disabled(celebrating)
            }
            if step == .welcome {
                Text("A thoughtful companion for your GLP-1 journey").font(TypeStyle.body(10)).foregroundStyle(Palette.secondary).padding(.top, 6)
            }
        }.padding(.horizontal, 25).padding(.top, 12).padding(.bottom, 14).background(Palette.background)
    }

    @ViewBuilder private var content: some View {
        switch step {
        case .welcome: welcome
        case .medication: medication
        case .delivery: delivery
        case .trackingInsight: OnboardingInsightView(insight: .tracking)
        case .dose: dose
        case .frequency: frequency
        case .device: device
        case .disclaimer: disclaimer
        case .units: unitSelection
        case .height: heightEntry
        case .currentWeight:
            weightEntry("Your starting point", "Where are you\ntoday?", "Your current weight helps us put your progress in perspective.", field: "Current weight", text: $currentWeight, identifier: "onboarding-current-weight")
        case .startWeight:
            weightEntry("The first chapter", "Where did\nyou begin?", "Your weight when you started GLP-1 medication.", field: "Starting weight", text: $startWeight, identifier: "onboarding-start-weight")
        case .startDate: dateEntry
        case .goalWeight:
            weightEntry("Something to work toward", "What feels\nright for you?", "Set your goal weight. You can change this anytime.", field: "Goal weight", text: $goalWeight, identifier: "onboarding-goal-weight")
        case .goalInsight: OnboardingInsightView(insight: .goals)
        case .pace: pace
        case .paceInsight: OnboardingInsightView(insight: .pace)
        case .activity: activitySelection
        case .dailyInsight: OnboardingInsightView(insight: .daily)
        case .toughDays: toughDays
        case .cravings: cravingsSelection
        case .concerns: concernsSelection
        case .concernsInsight: OnboardingInsightView(insight: .concerns)
        case .motivation: motivationSelection
        case .firstDose: firstDose
        case .rating: rating
        case .levels: levels
        case .pro: EmptyView()
        }
    }

    private var welcome: some View {
        VStack(alignment: .leading, spacing: 27) {
            HStack(spacing: 4) { SlimsyMark(size: 35); Text("slimsy").font(TypeStyle.display(34)).foregroundStyle(Palette.green) }.padding(.top, 8)
            WelcomeIllustration().frame(height: 275).padding(.vertical, 4)
            VStack(alignment: .leading, spacing: 16) {
                Eyebrow(text: "A little better, every day")
                Text("Your journey.\nA gentler way.").font(TypeStyle.display(43)).foregroundStyle(Palette.ink).fixedSize(horizontal: false, vertical: true)
                Text("Your medication, meals, and milestones.\nTogether in one calm little place.")
                    .font(TypeStyle.body(15)).foregroundStyle(Palette.secondary).lineSpacing(5).fixedSize(horizontal: false, vertical: true)
            }
            HStack(spacing: 17) {
                Label("Made for you", systemImage: "heart")
                Label("At your pace", systemImage: "leaf")
            }.font(TypeStyle.body(11, weight: .medium)).foregroundStyle(Palette.green)
        }
    }
    private var medication: some View {
        VStack(alignment: .leading, spacing: 24) {
            heading("Your treatment", "Let's find\nyour rhythm.", "Which GLP-1 medication are you currently taking?")
            VStack(spacing: 9) {
                ForEach(Medication.allCases) { value in
                    SelectionRow(title: value.title, symbol: "pills", selected: profile.medication == value) { profile.medication = value }
                        .accessibilityIdentifier("onboarding-medication-\(value.rawValue)")
                }
            }
        }
    }
    private var delivery: some View {
        VStack(alignment: .leading, spacing: 24) {
            heading("Your routine", "How do\nyou take it?", "Choose your delivery method.")
            ForEach(DeliveryType.allCases) { value in
                SelectionRow(title: value.title, symbol: value == .notSure ? "questionmark" : value.symbol, selected: profile.deliveryType == value) {
                    if profile.deliveryType != value {
                        profile.deliveryType = value
                        profile.dose = nil
                        profile.frequency = nil
                        profile.deviceType = nil
                    }
                }.accessibilityIdentifier("onboarding-delivery-\(value.rawValue)")
            }
        }
    }
    private var dose: some View {
        VStack(alignment: .leading, spacing: 24) {
            heading("Your prescription", "What's your\ncurrent dose?", "Choose the dose you currently take, as prescribed by your healthcare provider.")
            ForEach(OnboardingOptions.doses(delivery: profile.deliveryType), id: \.self) { value in
                SelectionRow(title: value, symbol: "cross.case", selected: profile.dose == value) { profile.dose = value }
                    .accessibilityIdentifier("onboarding-dose-\(value)")
            }
        }
    }
    private var frequency: some View {
        VStack(alignment: .leading, spacing: 24) {
            heading("A rhythm that fits", "How often\ndo you take it?", "Choose your prescribed dosing schedule.")
            ForEach(OnboardingOptions.frequencies(delivery: profile.deliveryType)) { value in
                SelectionRow(title: value.title, symbol: "calendar", selected: profile.frequency == value) {
                    profile.frequency = value
                    if value == .custom && profile.customFrequencyDays == nil { profile.customFrequencyDays = 7 }
                }.accessibilityIdentifier("onboarding-frequency-\(value.rawValue)")
            }
            if profile.frequency == .custom {
                TextEntry(title: "Days between doses", placeholder: "7", text: Binding(get: { profile.customFrequencyDays.map(String.init) ?? "" }, set: { profile.customFrequencyDays = Int($0) }), keyboard: .numberPad, suffix: "days", identifier: "onboarding-custom-frequency")
            }
        }
    }
    private var device: some View {
        VStack(alignment: .leading, spacing: 24) {
            heading("The little details", "What type\nof device?", "How do you administer your injection?")
            ForEach(DeviceType.allCases) { value in
                SelectionRow(title: value.title, symbol: "syringe", selected: profile.deviceType == value) { profile.deviceType = value }
                    .accessibilityIdentifier("onboarding-device-\(value.rawValue)")
            }
        }
    }
    private var disclaimer: some View {
        VStack(alignment: .leading, spacing: 24) {
            heading("Before we begin", "A companion\nfor your care.", "Please read the health disclaimer before continuing.")
            AppCard(tint: Palette.paleGreen.opacity(0.6)) {
                VStack(alignment: .leading, spacing: 18) {
                    IconBadge(symbol: "cross.case", size: 48)
                    Text("Slimsy is a tracking tool, not a medical device. Its information should not be considered medical advice.")
                    Text("Always consult your healthcare provider for treatment decisions. Medication levels and food nutrition are estimates and may not reflect your actual levels or intake.")
                    Text("If you experience severe side effects, contact your doctor immediately.")
                }.font(TypeStyle.body(14)).foregroundStyle(Palette.secondary).lineSpacing(4)
            }
            AppCard {
                Toggle(isOn: $consent) {
                    Text("I understand this app is not medical advice").font(TypeStyle.body(14, weight: .medium)).foregroundStyle(Palette.ink)
                }.tint(Palette.green).accessibilityIdentifier("onboarding-consent")
            }
            legalLinks
        }
    }
    private var unitSelection: some View {
        VStack(alignment: .leading, spacing: 24) {
            heading("Make yourself at home", "Your preferred\nunits.", "Everything should feel familiar. You can change this in your profile later.")
            SelectionRow(title: "Imperial", detail: "Pounds · feet & inches", symbol: "ruler", selected: units == .imperial) { units = .imperial }
                .accessibilityIdentifier("onboarding-units-imperial")
            SelectionRow(title: "Metric", detail: "Kilograms · centimeters", symbol: "globe", selected: units == .metric) { units = .metric }
                .accessibilityIdentifier("onboarding-units-metric")
        }
    }
    private var heightEntry: some View {
        VStack(alignment: .leading, spacing: 30) {
            heading("A little about you", "What's\nyour height?", "One small detail to help personalize your progress.")
            IconBadge(symbol: "ruler", size: 64).padding(.vertical, 12)
            if units == .metric {
                TextEntry(title: "Height", placeholder: "170", text: $height, keyboard: .decimalPad, suffix: "cm", identifier: "onboarding-height")
            } else {
                HStack(spacing: 12) {
                    TextEntry(title: "Height", placeholder: "5", text: $feet, keyboard: .numberPad, suffix: "ft", identifier: "onboarding-feet")
                    TextEntry(title: "Inches", placeholder: "7", text: $inches, keyboard: .numberPad, suffix: "in", identifier: "onboarding-inches")
                }
            }
        }
    }
    private func weightEntry(_ label: String, _ title: String, _ detail: String, field: String, text: Binding<String>, identifier: String) -> some View {
        VStack(alignment: .leading, spacing: 30) {
            heading(label, title, detail)
            IconBadge(symbol: "scalemass", size: 64).padding(.vertical, 12)
            TextEntry(title: field, placeholder: "0.0", text: text, keyboard: .decimalPad, suffix: units.weightLabel, identifier: identifier)
        }
    }
    private var dateEntry: some View {
        VStack(alignment: .leading, spacing: 24) {
            heading("Mark the beginning", "When did\nyou start?", "When did you begin taking your GLP-1 medication?")
            AppCard {
                DatePicker("Journey start date", selection: $startDate, in: ...Date.now, displayedComponents: .date)
                    .datePickerStyle(.graphical).tint(Palette.green).accessibilityIdentifier("onboarding-start-date")
            }
        }
    }
    private var pace: some View {
        VStack(alignment: .leading, spacing: 24) {
            heading("One week at a time", "Set\nyour pace.", "How much weight would you like to lose each week?")
            AppCard { WeeklyPacePicker(value: $weeklyGoal, units: units) }
        }
    }
    private var activitySelection: some View {
        VStack(alignment: .leading, spacing: 24) {
            heading("Your daily life", "A little\nmovement.", "How active are you in a typical week?")
            ForEach(ActivityLevel.allCases) { level in
                SelectionRow(title: level.title, detail: level.detail, symbol: level.symbol, selected: activity == level) { activity = level }
                    .accessibilityIdentifier("onboarding-activity-\(level.rawValue)")
            }
        }
    }
    private var toughDays: some View {
        VStack(alignment: .leading, spacing: 24) {
            heading("Give yourself some grace", "Tough days\nhappen.", "And that's completely normal.")
            AppCard(tint: Palette.paleGreen) {
                VStack(alignment: .leading, spacing: 15) {
                    IconBadge(symbol: "sun.max", size: 48)
                    Text("It gets easier.").font(TypeStyle.display(25)).foregroundStyle(Palette.ink)
                    Text("Many people experience side effects and tough days in the first few weeks. Your body is adjusting to the medication. Most side effects reduce significantly over time.")
                        .font(TypeStyle.body(13)).foregroundStyle(Palette.secondary).lineSpacing(4)
                }
            }
            AppCard {
                VStack(alignment: .leading, spacing: 18) {
                    FieldLabel(title: "A little care on the tough days")
                    tip("Stay hydrated — drink plenty of water", symbol: "drop")
                    tip("Eat small, frequent meals", symbol: "fork.knife")
                    tip("Get enough rest and sleep", symbol: "moon")
                    tip("Track your side effects to share with your doctor", symbol: "heart.text.clipboard")
                }
            }
        }
    }
    private var cravingsSelection: some View {
        VStack(alignment: .leading, spacing: 24) {
            heading("Notice your patterns", "When do\ncravings hit?", "Choose the days you tend to crave food most. Select any that fit.")
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 90))], spacing: 12) {
                ForEach(OnboardingOptions.cravings, id: \.self) { value in
                    ChoiceChip(title: value, selected: cravings.contains(value)) { toggle(value, in: &cravings) }
                        .accessibilityIdentifier("onboarding-craving-\(value)")
                }
            }
        }
    }
    private var concernsSelection: some View {
        VStack(alignment: .leading, spacing: 24) {
            heading("How you're feeling", "Anything\non your mind?", "Choose side effects you're experiencing or worried about.")
            VStack(spacing: 9) {
                ForEach(OnboardingOptions.concerns, id: \.self) { value in
                    ChoiceChip(title: value, selected: concerns.contains(value)) { toggle(value, in: &concerns) }
                        .accessibilityIdentifier("onboarding-concern-\(value)")
                }
            }
        }
    }
    private var motivationSelection: some View {
        VStack(alignment: .leading, spacing: 24) {
            heading("Your reason to keep going", "What matters\nto you?", "Understanding your why helps us support you better.")
            ForEach(Motivation.allCases) { value in
                SelectionRow(title: value.title, symbol: value.symbol, selected: motivation == value) { motivation = value }
                    .accessibilityIdentifier("onboarding-motivation-\(value.rawValue)")
            }
        }
    }
    private var firstDose: some View {
        VStack(alignment: .leading, spacing: 24) {
            heading("Your first check-in", "One dose.\nA little clarity.", "Record your starting dose to begin your medication cycle, or come back to it later.")
            AppCard(tint: Palette.paleGreen) {
                HStack(spacing: 15) {
                    IconBadge(symbol: "flag", size: 46)
                    VStack(alignment: .leading, spacing: 5) {
                        Text(profile.medicationLabel).font(TypeStyle.body(15, weight: .semibold)).foregroundStyle(Palette.ink)
                        Text("\(profile.dose ?? "") · \(profile.frequencyLabel)").font(TypeStyle.body(12)).foregroundStyle(Palette.secondary)
                    }
                }
            }
            AppCard { DatePicker("Date & time", selection: $firstDoseDate, in: ...Date.now).font(TypeStyle.body(13)) }
            if profile.deliveryType == .injection { AppCard { InjectionSitePicker(selection: $firstDoseSite, suggested: nil) } }
            NotesEntry(text: $firstDoseNotes)
            AppCard {
                Toggle(isOn: $wantsReminders) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text("A gentle dose reminder").font(TypeStyle.body(14, weight: .semibold)).foregroundStyle(Palette.ink)
                        Text("We'll ask to send notifications when you're all set.").font(TypeStyle.body(11)).foregroundStyle(Palette.secondary)
                    }
                }.tint(Palette.green)
            }
        }
    }
    private var rating: some View {
        VStack(alignment: .leading, spacing: 28) {
            heading("A little encouragement", "Enjoying Slimsy\nso far?", "You're off to a great start.")
            ZStack {
                Circle().fill(Palette.palePeach).frame(width: 160, height: 160)
                Image(systemName: "heart.fill").font(.system(size: 65, weight: .light)).foregroundStyle(Palette.peach)
            }.frame(maxWidth: .infinity).padding(.vertical, 18).accessibilityHidden(true)
            Text("Your feedback helps us make Slimsy better for everyone on their journey.").font(TypeStyle.body(15)).foregroundStyle(Palette.secondary).lineSpacing(4)
            // Let the system collect the rating; do not filter the App Store
            // prompt based on a custom positive/negative rating beforehand.
            SecondaryButton(title: "Rate Slimsy", symbol: "star") {
                requestReview()
                requestedReview = true
            }.accessibilityIdentifier("onboarding-rate")
            if requestedReview { Text("Thank you for your support.").font(TypeStyle.body(13)).foregroundStyle(Palette.green) }
        }
    }
    private var levels: some View {
        VStack(alignment: .leading, spacing: 24) {
            heading("A little understanding", "Your estimated\nGLP-1 levels.", "An illustration of \(profile.medicationLabel) over your dosing schedule.")
            OnboardingLevelChart(profile: profile)
            Text("After each dose, the model rises to a peak and then gradually falls. Repeated doses build on the medication remaining from earlier doses.")
                .font(TypeStyle.body(14)).foregroundStyle(Palette.secondary).lineSpacing(4)
            Label("This is a simplified illustration, not your measured blood level. Actual levels vary. Follow your clinician's prescribed schedule.", systemImage: "info.circle")
                .font(TypeStyle.body(11)).foregroundStyle(Palette.secondary).fixedSize(horizontal: false, vertical: true)
        }
    }
    private var legalLinks: some View {
        HStack(spacing: 22) {
            Link("Terms of service", destination: URL(string: "https://slimsy.lovable.app/terms")!)
            Link("Privacy policy", destination: URL(string: "https://slimsy.lovable.app/privacy")!)
        }.font(TypeStyle.body(11)).foregroundStyle(Palette.green).frame(maxWidth: .infinity)
    }
    private func heading(_ label: String, _ title: String, _ subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 13) {
            Eyebrow(text: label)
            Text(title).font(TypeStyle.display(35)).foregroundStyle(Palette.ink).fixedSize(horizontal: false, vertical: true)
            Text(subtitle).font(TypeStyle.body(14)).foregroundStyle(Palette.secondary).lineSpacing(3).fixedSize(horizontal: false, vertical: true)
        }
    }
    private func tip(_ text: String, symbol: String) -> some View {
        HStack(alignment: .top, spacing: 13) {
            Image(systemName: symbol).foregroundStyle(Palette.green).frame(width: 20)
            Text(text).font(TypeStyle.body(13)).foregroundStyle(Palette.secondary).fixedSize(horizontal: false, vertical: true)
        }
    }
    private func toggle(_ value: String, in set: inout Set<String>) {
        if set.contains(value) { set.remove(value) } else { set.insert(value) }
    }
    private func validWeight(_ text: String) -> Bool { text.decimalValue.map { $0 > 0 && units.pounds($0) <= 10_000 } == true }
    private func dismissKeyboard() { UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil) }
    private func next() {
        dismissKeyboard()
        withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.2)) { step = step.next(delivery: profile.deliveryType) }
    }
    private func convertUnits(_ old: UnitSystem, _ new: UnitSystem) {
        func convert(_ text: String) -> String {
            guard let value = text.decimalValue else { return text }
            return String(format: "%.1f", new.displayWeight(old.pounds(value)))
        }
        currentWeight = convert(currentWeight)
        startWeight = convert(startWeight)
        goalWeight = convert(goalWeight)
        if new == .metric, let f = feet.decimalValue { height = String(format: "%.0f", (f * 12 + (inches.decimalValue ?? 0)) * 2.54) }
        else if new == .imperial, let cm = height.decimalValue { let total = Int((cm / 2.54).rounded()); feet = String(total / 12); inches = String(total % 12) }
        weeklyGoal = new == .metric ? 0.5 : 1
    }
    private func saveFirstDose() {
        guard !celebrating else { return }
        let dose = MedicationLog(id: firstDoseID ?? UUID().uuidString, date: DayKey.string(firstDoseDate), time: DayKey.time(firstDoseDate), dose: profile.dose ?? "Unknown", deliveryType: profile.deliveryType ?? .notSure, injectionSite: profile.deliveryType == .injection ? firstDoseSite : nil, notes: firstDoseNotes.nonempty)
        guard store.saveDose(dose) else { return }
        firstDoseID = dose.id
        celebrating = true
        Feedback.saved()
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(reduceMotion ? 0.8 : 1.5))
            celebrating = false
            next()
        }
    }
    private func complete() {
        guard consent, !isCompleting else { return }
        isCompleting = true
        var completed = profile
        if completed.deliveryType != .injection { completed.deviceType = nil }
        if completed.frequency != .custom { completed.customFrequencyDays = nil }
        completed.height = heightCM
        completed.heightUnit = units == .metric ? "cm" : "ft"
        completed.heightFeet = feet.decimalValue
        completed.heightInches = inches.decimalValue
        completed.currentWeight = currentWeight.decimalValue.map(units.pounds)
        completed.startWeight = startWeight.decimalValue.map(units.pounds)
        completed.goalWeight = goalWeight.decimalValue.map(units.pounds)
        completed.startDate = DayKey.string(startDate)
        completed.activityLevel = activity
        completed.weeklyGoal = weeklyGoal
        completed.weeklyGoalUnit = units.weightLabel
        completed.motivation = motivation
        completed.initialSideEffects = OnboardingOptions.concerns.filter { concerns.contains($0) }
        completed.cravingsDays = OnboardingOptions.cravings.filter { cravings.contains($0) }
        completed.disclaimerAccepted = consent
        Task {
            var permitted = false
            if wantsReminders && store.allowsNotifications { permitted = await ReminderService.shared.requestPermission() }
            // The starting dose was already saved at its own milestone stage.
            if store.completeOnboarding(profile: completed, units: units, firstDose: nil) {
                store.update { $0.preferences.doseReminders = wantsReminders && permitted; $0.preferences.notifications = permitted }
                Feedback.saved()
            }
            isCompleting = false
        }
    }
}

struct WelcomeIllustration: View {
    var body: some View {
        GeometryReader { proxy in
            let w = proxy.size.width
            ZStack {
                RoundedRectangle(cornerRadius: 120).fill(Palette.paleGreen).frame(width: w * 0.76, height: 247).rotationEffect(.degrees(-9))
                Circle().fill(Color(hex: 0xECCBA7)).frame(width: 86, height: 86).offset(x: 72, y: -64)
                Circle().stroke(Palette.surface.opacity(0.7), lineWidth: 1).frame(width: 188, height: 188).offset(x: 0, y: 15)
                Path { path in
                    path.move(to: CGPoint(x: w * 0.47, y: 235))
                    path.addCurve(to: CGPoint(x: w * 0.55, y: 55), control1: CGPoint(x: w * 0.36, y: 150), control2: CGPoint(x: w * 0.65, y: 130))
                }.stroke(Palette.green, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                LeafShape().fill(Palette.green).frame(width: 60, height: 107).rotationEffect(.degrees(-52)).offset(x: -30, y: -10)
                LeafShape().fill(Color(hex: 0x8EAA75)).frame(width: 44, height: 85).rotationEffect(.degrees(41)).offset(x: 35, y: -58)
                LeafShape().fill(Color(hex: 0xA2B78B)).frame(width: 41, height: 75).rotationEffect(.degrees(52)).offset(x: 29, y: 58)
                HStack(spacing: 9) {
                    Image(systemName: "checkmark").font(.system(size: 12, weight: .semibold)).foregroundStyle(Palette.green).frame(width: 28, height: 28).background(Palette.paleGreen, in: Circle())
                    VStack(alignment: .leading, spacing: 4) {
                        Text("A LITTLE PROGRESS").font(TypeStyle.body(8, weight: .bold)).tracking(1.4).foregroundStyle(Palette.secondary)
                        Text("Every day, a fresh start.").font(TypeStyle.body(11, weight: .medium)).foregroundStyle(Palette.ink)
                    }
                }.padding(14).background(Palette.surface, in: RoundedRectangle(cornerRadius: 19))
                    .shadow(color: Palette.forest.opacity(0.06), radius: 18, y: 8).rotationEffect(.degrees(-5)).offset(x: -25, y: 90)
                Image(systemName: "sparkle").font(.system(size: 23, weight: .ultraLight)).foregroundStyle(Palette.green).offset(x: -w * 0.38, y: -81)
                Image(systemName: "sparkle").font(.system(size: 16, weight: .ultraLight)).foregroundStyle(Palette.peach).offset(x: w * 0.38, y: 41)
            }.frame(maxWidth: .infinity, maxHeight: .infinity)
        }.accessibilityHidden(true)
    }
}
