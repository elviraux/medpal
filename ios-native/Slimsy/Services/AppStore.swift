import Foundation
import Observation

@MainActor @Observable
final class AppStore {
    private(set) var data: AppData
    var selectedDate = Date.now
    var errorMessage: String?
    private(set) var storageIsReadOnly = false
    let isDemo: Bool

    @ObservationIgnored private let fileURL: URL?
    @ObservationIgnored private let schedulesReminders: Bool
    @ObservationIgnored private var lastObservedDay: String

    nonisolated static var defaultFileURL: URL {
        URL.applicationSupportDirectory.appending(path: "Slimsy", directoryHint: .isDirectory).appending(path: "slimsy-data.json")
    }

    init(fileURL: URL? = AppStore.defaultFileURL, initialData: AppData = AppData(), isDemo: Bool = false, schedulesReminders: Bool = true, now: Date = .now) {
        self.fileURL = fileURL
        self.isDemo = isDemo
        self.schedulesReminders = schedulesReminders
        self.lastObservedDay = DayKey.string(now)
        data = initialData
        self.selectedDate = now
        if let fileURL, FileManager.default.fileExists(atPath: fileURL.path) {
            do {
                var restored = try JSONDecoder().decode(AppData.self, from: Data(contentsOf: fileURL))
                try restored.validate()
                restored.normalize()
                data = restored
            } catch {
                // Never replace unreadable health records with a fresh empty store.
                storageIsReadOnly = true
                errorMessage = "Your saved data could not be opened. The original file is still intact. \(error.localizedDescription)"
            }
        } else if let fileURL, fileURL == Self.defaultFileURL {
            var copiedPhotos: [String] = []
            do {
                if var legacy = try LegacyMigration.findInCurrentContainer() {
                    copiedPhotos = try LegacyMigration.copyPhotos(in: &legacy)
                    try FileManager.default.createDirectory(at: fileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
                    try JSONEncoder().encode(legacy).write(to: fileURL, options: [.atomic, .completeFileProtectionUnlessOpen])
                    data = legacy
                }
            } catch {
                copiedPhotos.forEach(PhotoStorage.remove)
                storageIsReadOnly = true
                errorMessage = "Your previous Slimsy journal is still intact, but couldn't be migrated. \(error.localizedDescription)"
            }
        }
    }

    var profile: UserProfile { data.userProfile }
    var allowsNotifications: Bool { schedulesReminders && !isDemo }
    var units: UnitSystem { data.preferences.units }
    var targets: DailyTargets { data.dailyTargets }
    var selectedDay: String { DayKey.string(selectedDate) }
    func refreshCalendarDay(now: Date = .now) {
        let day = DayKey.string(now)
        if day != lastObservedDay && selectedDay == lastObservedDay { selectedDate = now }
        lastObservedDay = day
    }
    var currentWeight: Double? { data.weightLogs.first?.weight ?? profile.currentWeight }
    var weightChange: Double? {
        guard let start = profile.startWeight, let current = currentWeight else { return nil }
        return start - current
    }
    var goalProgress: Double {
        guard let start = profile.startWeight, let goal = profile.goalWeight, let current = currentWeight, abs(start - goal) > 0.001 else { return 0 }
        return min(1, max(0, (start - current) / (start - goal)))
    }
    var bmi: Double? {
        guard let weight = currentWeight, let height = profile.height, height > 0 else { return nil }
        return weight * 0.453592 / pow(height / 100, 2)
    }
    func lastDose(at date: Date = .now) -> MedicationLog? {
        data.medicationLogs.first { ($0.timestamp ?? .distantFuture) <= date }
    }
    func nextDose(at date: Date = .now) -> Date? {
        guard let last = lastDose(at: date)?.timestamp else { return nil }
        return Calendar.current.date(byAdding: .day, value: profile.intervalDays, to: last)
    }
    var suggestedSite: InjectionSite {
        let recent = Set(data.medicationLogs.compactMap(\.injectionSite).prefix(3))
        return InjectionSite.allCases.first { !recent.contains($0) } ?? .abdomenLeft
    }
    func food(on day: String) -> [FoodLog] { data.foodLogs.filter { $0.date == day } }
    func water(on day: String) -> Int { data.waterLogs.first { $0.date == day }?.glasses ?? 0 }
    func nutrition(on day: String) -> (calories: Double, protein: Double, fiber: Double) {
        food(on: day).reduce((0, 0, 0)) { ($0.0 + $1.calories, $0.1 + $1.protein, $0.2 + $1.fiber) }
    }

    @discardableResult
    func update(_ change: (inout AppData) -> Void) -> Bool {
        guard !storageIsReadOnly else {
            errorMessage = "Your existing data needs to be recovered before changes can be saved. It has not been overwritten."
            return false
        }
        var next = data
        change(&next)
        next.normalize()
        do {
            try next.validate()
            if let fileURL {
                try FileManager.default.createDirectory(at: fileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
                let encoder = JSONEncoder()
                encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
                try encoder.encode(next).write(to: fileURL, options: [.atomic, .completeFileProtectionUnlessOpen])
            }
            let remindersChanged = next.preferences != data.preferences || next.userProfile != data.userProfile || next.medicationLogs != data.medicationLogs
            data = next
            errorMessage = nil
            if allowsNotifications && remindersChanged { ReminderService.shared.refresh(data: next) }
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    @discardableResult func addWeight(_ log: WeightLog) -> Bool {
        update {
            $0.weightLogs.insert(log, at: 0)
            $0.normalize()
            $0.userProfile.currentWeight = $0.weightLogs.first?.weight
        }
    }
    @discardableResult func deleteWeight(_ id: String) -> Bool {
        update {
            $0.weightLogs.removeAll { $0.id == id }
            $0.userProfile.currentWeight = $0.weightLogs.first?.weight ?? $0.userProfile.startWeight
        }
    }
    @discardableResult func saveFood(_ log: FoodLog) -> Bool {
        update {
            if let index = $0.foodLogs.firstIndex(where: { $0.id == log.id }) { $0.foodLogs[index] = log }
            else { $0.foodLogs.insert(log, at: 0) }
        }
    }
    @discardableResult func deleteFood(_ id: String) -> Bool {
        let photo = data.foodLogs.first { $0.id == id }?.photoUri
        let success = update { $0.foodLogs.removeAll { $0.id == id } }
        if success, let photo, !data.foodLogs.contains(where: { $0.photoUri == photo }) { PhotoStorage.remove(photo) }
        return success
    }
    @discardableResult func setWater(_ glasses: Int, on day: String) -> Bool {
        update {
            if let index = $0.waterLogs.firstIndex(where: { $0.date == day }) { $0.waterLogs[index].glasses = min(20, max(0, glasses)) }
            else { $0.waterLogs.append(WaterLog(date: day, glasses: min(20, max(0, glasses)))) }
        }
    }
    @discardableResult func addDose(_ dose: MedicationLog, symptoms: [SideEffectLog] = []) -> Bool {
        update {
            $0.medicationLogs.insert(dose, at: 0)
            $0.sideEffectLogs.insert(contentsOf: symptoms, at: 0)
        }
    }
    @discardableResult func saveDose(_ dose: MedicationLog) -> Bool {
        update {
            if let index = $0.medicationLogs.firstIndex(where: { $0.id == dose.id }) { $0.medicationLogs[index] = dose }
            else { $0.medicationLogs.insert(dose, at: 0) }
        }
    }
    @discardableResult func deleteDose(_ id: String) -> Bool { update { $0.medicationLogs.removeAll { $0.id == id } } }
    @discardableResult func addSideEffect(_ log: SideEffectLog) -> Bool { update { $0.sideEffectLogs.insert(log, at: 0) } }
    @discardableResult func deleteSideEffect(_ id: String) -> Bool { update { $0.sideEffectLogs.removeAll { $0.id == id } } }

    func setUnits(_ units: UnitSystem) {
        update {
            let oldUnits = $0.preferences.units
            if let goal = $0.userProfile.weeklyGoal, oldUnits != units {
                let source: UnitSystem = $0.userProfile.weeklyGoalUnit == "kg" ? .metric : .imperial
                let converted = units.displayWeight(source.pounds(goal))
                let increment = units == .metric ? 0.25 : 0.5
                $0.userProfile.weeklyGoal = min(units == .metric ? 1 : 2.5, max(increment, (converted / increment).rounded() * increment))
                $0.userProfile.weeklyGoalUnit = units.weightLabel
            }
            $0.preferences.units = units
        }
    }

    @discardableResult func completeOnboarding(profile: UserProfile, units: UnitSystem, firstDose: MedicationLog?) -> Bool {
        update { state in
            state.userProfile = profile
            state.userProfile.onboardingComplete = true
            state.preferences.units = units
            if let current = profile.currentWeight, state.weightLogs.isEmpty {
                if let start = profile.startWeight, let day = profile.startDate, day < DayKey.string() {
                    state.weightLogs.append(WeightLog(date: day, weight: start, notes: "Starting weight"))
                }
                state.weightLogs.append(WeightLog(date: DayKey.string(), weight: current, notes: "Your first check-in"))
            }
            if let firstDose { state.medicationLogs.insert(firstDose, at: 0) }
        }
    }

    @discardableResult func reset() -> Bool {
        let photos = data.foodLogs.compactMap(\.photoUri)
        let success = update { $0 = AppData() }
        if success { photos.forEach(PhotoStorage.remove); selectedDate = .now }
        return success
    }
}

extension AppData {
    /// Sample records are used only by previews and explicit DEBUG launch arguments.
    static func demo(now: Date = .now) -> AppData {
        var state = AppData()
        var p = UserProfile()
        p.name = "Alex"
        p.medication = .wegovy
        p.deliveryType = .injection
        p.dose = "1 mg"
        p.frequency = .weekly
        p.deviceType = .singleUsePen
        p.height = 170
        p.currentWeight = 176.4
        p.startWeight = 192
        p.goalWeight = 155
        p.startDate = DayKey.string(Calendar.current.date(byAdding: .day, value: -56, to: now)!)
        p.activityLevel = .lightlyActive
        p.weeklyGoal = 1
        p.weeklyGoalUnit = "lbs"
        p.motivation = .improveHealth
        p.onboardingComplete = true
        p.disclaimerAccepted = true
        state.userProfile = p
        let values: [Double] = [192, 190.8, 190.2, 188.6, 189.1, 187.4, 186.3, 185.8, 184.1, 183.5, 182.2, 181.4, 180.9, 179.2, 179.6, 178.1, 177.4, 176.4]
        for (index, value) in values.enumerated() {
            let date = Calendar.current.date(byAdding: .day, value: -(values.count - 1 - index) * 3, to: now)!
            state.weightLogs.append(WeightLog(id: "demo-weight-\(index)", date: DayKey.string(date), weight: value))
        }
        for index in 0..<5 {
            let date = Calendar.current.date(byAdding: .day, value: -3 - index * 7, to: now)!
            state.medicationLogs.append(MedicationLog(id: "demo-dose-\(index)", date: DayKey.string(date), time: "09:00", dose: "1 mg", deliveryType: .injection, injectionSite: InjectionSite.allCases[index]))
        }
        let day = DayKey.string(now)
        state.foodLogs = [
            FoodLog(id: "demo-breakfast", date: day, mealType: .breakfast, aiDescription: "Greek yogurt & berries", calories: 285, protein: 24, fiber: 6, carbs: 32, fat: 8),
            FoodLog(id: "demo-lunch", date: day, mealType: .lunch, aiDescription: "Salmon & quinoa bowl", calories: 480, protein: 38, fiber: 8, carbs: 42, fat: 18),
            FoodLog(id: "demo-snack", date: day, mealType: .snack, aiDescription: "Apple with almond butter", calories: 165, protein: 5, fiber: 4, carbs: 22, fat: 7)
        ]
        state.waterLogs = [WaterLog(date: day, glasses: 5)]
        state.sideEffectLogs = [SideEffectLog(date: DayKey.string(now.addingTimeInterval(-86400)), effectType: .nausea, severity: 2, notes: "A little queasy in the morning. Felt better later.")]
        state.normalize()
        return state
    }
}
