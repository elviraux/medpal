import SwiftUI

struct EditMedicationView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var profile = UserProfile()
    @State private var initialized = false
    var body: some View {
        FormShell(title: "Your medication", saveTitle: "Save medication", canSave: MedicationFields.isValid(profile), onSave: {
            if profile.deliveryType == .pill { profile.deviceType = nil }
            if profile.frequency != .custom { profile.customFrequencyDays = nil }
            if store.update({ $0.userProfile = profile }) { Feedback.saved(); dismiss() }
        }) {
            Text("Your plan,\nall in one place.").font(TypeStyle.display(30)).foregroundStyle(Palette.ink)
            MedicationFields(profile: $profile)
        }
        .onAppear { if !initialized { profile = store.profile; initialized = true } }
    }
}

struct MedicationFields: View {
    @Binding var profile: UserProfile

    static func isValid(_ p: UserProfile) -> Bool {
        p.medication != nil && p.deliveryType != nil && p.dose?.nonempty != nil && p.frequency != nil &&
        (p.frequency != .custom || p.customFrequencyDays.map { (1...365).contains($0) } == true)
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            AppCard {
                VStack(spacing: 15) {
                    Picker("Medication", selection: Binding(get: { profile.medication }, set: { profile.medication = $0 })) {
                        Text("Choose medication").tag(Optional<Medication>.none)
                        ForEach(Medication.allCases) { Text($0.title).tag(Optional($0)) }
                    }.font(TypeStyle.body(14)).accessibilityIdentifier("medication-picker")
                    Divider().overlay(Palette.line)
                    Picker("Delivery", selection: Binding(get: { profile.deliveryType }, set: { profile.deliveryType = $0 })) {
                        Text("Choose delivery").tag(Optional<DeliveryType>.none)
                        ForEach(DeliveryType.allCases) { Text($0.title).tag(Optional($0)) }
                    }.font(TypeStyle.body(14)).accessibilityIdentifier("delivery-picker")
                }
            }
            TextEntry(title: "Your prescribed dose", placeholder: "e.g. 1 mg", text: Binding(get: { profile.dose ?? "" }, set: { profile.dose = $0 }), identifier: "prescribed-dose")
            DoseChoices(value: Binding(get: { profile.dose ?? "" }, set: { profile.dose = $0 }), options: profile.deliveryType == .pill ? ["1.5mg", "4mg", "7mg", "9mg", "14mg", "25mg"] : ["0.25mg", "0.5mg", "1mg", "1.5mg", "2mg", "2.4mg"])
            AppCard {
                VStack(spacing: 16) {
                    Picker("Schedule", selection: Binding(get: { profile.frequency }, set: {
                        profile.frequency = $0
                        if $0 == .custom && profile.customFrequencyDays == nil { profile.customFrequencyDays = 7 }
                    })) {
                        Text("Choose schedule").tag(Optional<Frequency>.none)
                        ForEach(Frequency.allCases) { Text($0.title).tag(Optional($0)) }
                    }.font(TypeStyle.body(14)).accessibilityIdentifier("frequency-picker")
                    if profile.deliveryType == .injection {
                        Divider().overlay(Palette.line)
                        Picker("Device", selection: Binding(get: { profile.deviceType }, set: { profile.deviceType = $0 })) {
                            Text("Choose device").tag(Optional<DeviceType>.none)
                            ForEach(DeviceType.allCases) { Text($0.title).tag(Optional($0)) }
                        }.font(TypeStyle.body(14))
                    }
                }
            }
            if profile.frequency == .custom {
                TextEntry(title: "Days between doses", placeholder: "7", text: Binding(get: { profile.customFrequencyDays.map(String.init) ?? "" }, set: { profile.customFrequencyDays = Int($0) }), keyboard: .numberPad, suffix: "days", identifier: "custom-frequency")
            }
            AppCard {
                DatePicker("Journey start date", selection: Binding(get: { profile.startDate.flatMap { DayKey.date($0) } ?? .now }, set: { profile.startDate = DayKey.string($0) }), in: ...Date.now, displayedComponents: .date).font(TypeStyle.body(13))
            }
            Text("Enter the medication, dose, and schedule agreed with your healthcare provider.").font(TypeStyle.body(11)).foregroundStyle(Palette.secondary)
        }
    }
}

struct DoseChoices: View {
    @Binding var value: String
    var options: [String]
    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 88))], spacing: 9) {
            ForEach(options, id: \.self) { amount in
                ChoiceChip(title: amount, selected: value.replacingOccurrences(of: " ", with: "") == amount) {
                    value = amount
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                }
            }
        }
    }
}

struct EditTargetsView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var calories = ""
    @State private var protein = ""
    @State private var fiber = ""
    @State private var water = ""
    @State private var initialized = false
    private var valid: Bool {
        guard let c = calories.decimalValue, let p = protein.decimalValue, let f = fiber.decimalValue, let w = Int(water) else { return false }
        return (800...4000).contains(c) && (20...300).contains(p) && (10...60).contains(f) && (1...20).contains(w)
    }
    var body: some View {
        FormShell(title: "Daily targets", saveTitle: "Save targets", canSave: valid, onSave: save) {
            VStack(alignment: .leading, spacing: 9) {
                Eyebrow(text: "Your daily targets")
                Text("Set your intentions.").font(TypeStyle.display(30)).foregroundStyle(Palette.ink)
                Text("Set the targets that work for you and your care plan.").font(TypeStyle.body(13)).foregroundStyle(Palette.secondary)
            }
            TargetControl(title: "Calories", symbol: "flame", color: Palette.peach, value: $calories, unit: "kcal", range: 800...4000, step: 50)
            TargetControl(title: "Protein", symbol: "fish", color: Palette.plum, value: $protein, unit: "g", range: 20...300, step: 5)
            TargetControl(title: "Fiber", symbol: "leaf", color: Palette.plum, value: $fiber, unit: "g", range: 10...60, step: 1)
            TargetControl(title: "Water", symbol: "drop", color: Palette.blue, value: $water, unit: "glasses", range: 1...20, step: 1)
        }
        .onAppear {
            if !initialized {
                initialized = true
                calories = String(format: "%g", store.targets.calories)
                protein = String(format: "%g", store.targets.protein)
                fiber = String(format: "%g", store.targets.fiber)
                water = String(store.targets.water)
            }
        }
    }
    private func save() {
        guard valid, let c = calories.decimalValue, let p = protein.decimalValue, let f = fiber.decimalValue, let w = Int(water) else { return }
        if store.update({ $0.dailyTargets = DailyTargets(calories: c, protein: p, fiber: f, water: w) }) { Feedback.saved(); dismiss() }
    }
}

private struct TargetControl: View {
    var title: String
    var symbol: String
    var color: Color
    @Binding var value: String
    var unit: String
    var range: ClosedRange<Int>
    var step: Int
    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 17) {
                HStack {
                    Label(title, systemImage: symbol).font(TypeStyle.body(15, weight: .semibold)).foregroundStyle(color)
                    Spacer()
                    Text("\(range.lowerBound)–\(range.upperBound) \(unit)").font(TypeStyle.body(10)).foregroundStyle(Palette.secondary)
                }
                HStack(spacing: 14) {
                    Button { adjust(-step) } label: { Image(systemName: "minus").frame(width: 44, height: 44).background(Palette.background, in: Circle()) }.accessibilityLabel("Decrease \(title.lowercased())")
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        TextField("0", text: $value).keyboardType(.numberPad).font(TypeStyle.metric(31)).multilineTextAlignment(.center)
                            .accessibilityLabel("\(title) target").accessibilityIdentifier("target-\(title.lowercased())")
                        Text(unit).font(TypeStyle.body(11)).foregroundStyle(Palette.secondary)
                    }
                    Button { adjust(step) } label: { Image(systemName: "plus").frame(width: 44, height: 44).background(Palette.background, in: Circle()) }.accessibilityLabel("Increase \(title.lowercased())")
                }.foregroundStyle(Palette.ink).buttonStyle(PressFeedback())
            }
        }
    }
    private func adjust(_ amount: Int) {
        value = String(min(range.upperBound, max(range.lowerBound, (Int(value) ?? range.lowerBound) + amount)))
        Feedback.light()
    }
}

struct EditGoalsView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var goal = ""
    @State private var weeklyGoal: Double = 1
    @State private var activity: ActivityLevel = .lightlyActive
    @State private var initialized = false
    private var valid: Bool { goal.nonempty == nil || goal.decimalValue.map { $0 > 0 } == true }
    var body: some View {
        FormShell(title: "Your goals", saveTitle: "Save goals", canSave: valid, onSave: save) {
            Text("Your journey,\nyour pace.").font(TypeStyle.display(32)).foregroundStyle(Palette.ink)
            TextEntry(title: "Goal weight", placeholder: "Your goal", text: $goal, keyboard: .decimalPad, suffix: store.units.weightLabel, identifier: "goal-weight")
            AppCard { WeeklyPacePicker(value: $weeklyGoal, units: store.units) }
            VStack(alignment: .leading, spacing: 12) {
                FieldLabel(title: "Your activity level")
                ForEach(ActivityLevel.allCases) { level in
                    SelectionRow(title: level.title, detail: level.detail, symbol: level.symbol, selected: level == activity) { activity = level }
                }
            }
        }
        .onAppear {
            if !initialized {
                initialized = true
                goal = store.profile.goalWeight.map { String(format: "%.1f", store.units.displayWeight($0)) } ?? ""
                weeklyGoal = store.profile.weeklyGoal ?? (store.units == .metric ? 0.5 : 1)
                activity = store.profile.activityLevel ?? .lightlyActive
            }
        }
    }
    private func save() {
        guard valid else { return }
        if store.update({
            $0.userProfile.goalWeight = goal.decimalValue.map(store.units.pounds)
            $0.userProfile.weeklyGoal = weeklyGoal
            $0.userProfile.weeklyGoalUnit = store.units.weightLabel
            $0.userProfile.activityLevel = activity
        }) { Feedback.saved(); dismiss() }
    }
}

struct WeeklyPacePicker: View {
    @Binding var value: Double
    var units: UnitSystem
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            FieldLabel(title: "Your weekly goal")
            HStack(alignment: .firstTextBaseline, spacing: 5) {
                Text(value.formatted(.number.precision(.fractionLength(0...2)))).font(TypeStyle.metric(37)).foregroundStyle(Palette.ink)
                Text("\(units.weightLabel) / week").font(TypeStyle.body(13)).foregroundStyle(Palette.secondary)
            }
            Slider(value: $value, in: units == .metric ? 0.25...1 : 0.5...2.5, step: units == .metric ? 0.25 : 0.5).tint(Palette.plum).accessibilityLabel("Weekly weight goal")
            HStack { Text("A gentler pace"); Spacer(); Text("A quicker pace") }.font(TypeStyle.body(10)).foregroundStyle(Palette.secondary)
            Text("A personal tracking goal, not a prediction or a medical recommendation.").font(TypeStyle.body(10)).foregroundStyle(Palette.secondary)
        }
    }
}

struct EditProfileView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var height = ""
    @State private var feet = ""
    @State private var inches = ""
    @State private var startWeight = ""
    @State private var initialized = false
    private var heightCM: Double? {
        if store.units == .metric { return height.decimalValue }
        guard let f = feet.decimalValue else { return nil }
        return (f * 12 + (inches.decimalValue ?? 0)) * 2.54
    }
    private var valid: Bool {
        let hasHeight = store.units == .metric ? height.nonempty != nil : feet.nonempty != nil || inches.nonempty != nil
        let validHeight = !hasHeight || heightCM.map { $0 > 0 } == true
        return validHeight && (startWeight.nonempty == nil || startWeight.decimalValue.map { $0 > 0 } == true)
    }
    var body: some View {
        FormShell(title: "About you", saveTitle: "Save profile", canSave: valid, onSave: {
            if store.update({
                $0.userProfile.name = name.nonempty
                $0.userProfile.height = heightCM
                $0.userProfile.heightUnit = store.units == .metric ? "cm" : "ft"
                $0.userProfile.startWeight = startWeight.decimalValue.map(store.units.pounds)
            }) { Feedback.saved(); dismiss() }
        }) {
            Text("Your details.").font(TypeStyle.display(30)).foregroundStyle(Palette.ink)
            TextEntry(title: "Your name", placeholder: "What should we call you?", text: $name, identifier: "profile-name")
            if store.units == .metric {
                TextEntry(title: "Height", placeholder: "170", text: $height, keyboard: .decimalPad, suffix: "cm")
            } else {
                HStack(spacing: 12) {
                    TextEntry(title: "Height", placeholder: "5", text: $feet, keyboard: .numberPad, suffix: "ft")
                    TextEntry(title: "Inches", placeholder: "7", text: $inches, keyboard: .numberPad, suffix: "in")
                }
            }
            TextEntry(title: "Starting weight", placeholder: "Your weight at the start", text: $startWeight, keyboard: .decimalPad, suffix: store.units.weightLabel)
        }
        .onAppear {
            guard !initialized else { return }; initialized = true
            name = store.profile.name ?? ""
            startWeight = store.profile.startWeight.map { String(format: "%.1f", store.units.displayWeight($0)) } ?? ""
            if let h = store.profile.height {
                height = String(format: "%.0f", h)
                let total = Int((h / 2.54).rounded())
                feet = String(total / 12); inches = String(total % 12)
            }
        }
    }
}
