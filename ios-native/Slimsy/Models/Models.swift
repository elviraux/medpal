import Foundation

protocol LabeledChoice: RawRepresentable, CaseIterable, Identifiable, Codable, Hashable where RawValue == String {
    var title: String { get }
}

extension LabeledChoice {
    var id: String { rawValue }
}

enum UnitSystem: String, LabeledChoice {
    case imperial, metric
    var title: String { self == .metric ? "Metric" : "Imperial" }
    var weightLabel: String { self == .metric ? "kg" : "lbs" }
    func displayWeight(_ pounds: Double) -> Double { self == .metric ? pounds * 0.453592 : pounds }
    func pounds(_ value: Double) -> Double { self == .metric ? value / 0.453592 : value }
    func weight(_ pounds: Double, decimals: Int = 1) -> String {
        displayWeight(pounds).formatted(.number.precision(.fractionLength(decimals)))
    }
    func height(_ centimeters: Double) -> String {
        if self == .metric { return "\(Int(centimeters.rounded())) cm" }
        let inches = Int((centimeters / 2.54).rounded())
        return "\(inches / 12)′ \(inches % 12)″"
    }
}

enum Medication: String, LabeledChoice {
    case wegovy = "Wegovy", ozempic = "Ozempic", zepbound = "Zepbound", mounjaro = "Mounjaro"
    case semaglutide = "Semaglutide", tirzepatide = "Tirzepatide", other = "Other", unknown = "I don't know"
    var title: String { rawValue }
}

enum DeliveryType: String, LabeledChoice {
    case injection, pill, notSure = "not_sure"
    var title: String {
        switch self { case .injection: "Injection"; case .pill: "Pill"; case .notSure: "Not sure" }
    }
    var symbol: String { self == .pill ? "pills" : "syringe" }
}

enum Frequency: String, LabeledChoice {
    case weekly = "every_7_days", fortnightly = "every_14_days", daily, custom, notSure = "not_sure"
    var title: String {
        switch self {
        case .weekly: "Every 7 days"
        case .fortnightly: "Every 14 days"
        case .daily: "Daily"
        case .custom: "Custom interval"
        case .notSure: "Not sure"
        }
    }
    func days(custom: Int? = nil) -> Int {
        switch self {
        case .daily: 1
        case .fortnightly: 14
        case .custom: max(1, custom ?? 7)
        default: 7
        }
    }
}

enum DeviceType: String, LabeledChoice {
    case singleUsePen = "single_use_pen", autoInjector = "auto_injector", syringeVial = "syringe_vial", other
    var title: String {
        switch self { case .singleUsePen: "Single-use pen"; case .autoInjector: "Auto-injector"; case .syringeVial: "Syringe & vial"; case .other: "Other" }
    }
}

enum ActivityLevel: String, LabeledChoice {
    case sedentary, lightlyActive = "lightly_active", active, veryActive = "very_active"
    var title: String {
        switch self { case .sedentary: "Taking it easy"; case .lightlyActive: "Lightly active"; case .active: "Active"; case .veryActive: "Very active" }
    }
    var detail: String {
        switch self { case .sedentary: "Little or no exercise"; case .lightlyActive: "Movement 1–3 days a week"; case .active: "Movement 3–5 days a week"; case .veryActive: "Movement most days" }
    }
    var symbol: String {
        switch self { case .sedentary: "chair.lounge"; case .lightlyActive: "figure.walk"; case .active: "figure.outdoor.cycle"; case .veryActive: "figure.strengthtraining.traditional" }
    }
}

enum Motivation: String, LabeledChoice {
    case improveHealth = "improve_health", lovedOnes = "loved_ones", clothes = "feel_good_clothes", confidence, energy = "boost_energy"
    var title: String {
        switch self { case .improveHealth: "Improve my health"; case .lovedOnes: "Be there for loved ones"; case .clothes: "Feel good in my clothes"; case .confidence: "Feel more confident"; case .energy: "Have more energy" }
    }
    var symbol: String {
        switch self { case .improveHealth: "heart"; case .lovedOnes: "person.2"; case .clothes: "tshirt"; case .confidence: "sparkles"; case .energy: "bolt" }
    }
}

enum MealType: String, LabeledChoice {
    case breakfast, lunch, dinner, snack
    var title: String { rawValue.capitalized }
    var symbol: String {
        switch self { case .breakfast: "sun.horizon"; case .lunch: "sun.max"; case .dinner: "moon.stars"; case .snack: "carrot" }
    }
    static func suggested(at date: Date = .now) -> Self {
        switch Calendar.current.component(.hour, from: date) {
        case 5..<11: .breakfast
        case 11..<16: .lunch
        case 16..<22: .dinner
        default: .snack
        }
    }
}

enum InjectionSite: String, LabeledChoice {
    case abdomenLeft = "abdomen_left", abdomenRight = "abdomen_right"
    case thighLeft = "thigh_left", thighRight = "thigh_right"
    case armLeft = "upper_arm_left", armRight = "upper_arm_right"
    var title: String {
        switch self {
        case .abdomenLeft: "Left abdomen"
        case .abdomenRight: "Right abdomen"
        case .thighLeft: "Left thigh"
        case .thighRight: "Right thigh"
        case .armLeft: "Left upper arm"
        case .armRight: "Right upper arm"
        }
    }
}

enum SideEffect: String, LabeledChoice {
    case nausea, heartburn, fatigue, hairLoss = "hair_loss", constipation, muscleLoss = "muscle_loss"
    case injectionAnxiety = "injection_anxiety", looseSkin = "loose_skin", other
    var title: String {
        switch self {
        case .nausea: "Nausea"
        case .heartburn: "Heartburn"
        case .fatigue: "Fatigue"
        case .hairLoss: "Hair loss"
        case .constipation: "Constipation"
        case .muscleLoss: "Muscle loss"
        case .injectionAnxiety: "Injection anxiety"
        case .looseSkin: "Loose skin"
        case .other: "Other"
        }
    }
    var symbol: String {
        switch self {
        case .nausea: "waveform.path"
        case .heartburn: "flame"
        case .fatigue: "battery.50percent"
        case .hairLoss: "scissors"
        case .constipation: "circle.dotted"
        case .muscleLoss: "dumbbell"
        case .injectionAnxiety: "heart.text.clipboard"
        case .looseSkin: "figure.stand"
        case .other: "ellipsis"
        }
    }
}

struct Preferences: Codable, Equatable {
    var units: UnitSystem = .imperial
    var notifications = true
    var waterReminders = false
    var doseReminders = true

    init(units: UnitSystem = .imperial) { self.units = units }
    private enum CodingKeys: String, CodingKey { case units, notifications, waterReminders, doseReminders }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        units = try c.decodeIfPresent(UnitSystem.self, forKey: .units) ?? .imperial
        notifications = try c.decodeIfPresent(Bool.self, forKey: .notifications) ?? true
        waterReminders = try c.decodeIfPresent(Bool.self, forKey: .waterReminders) ?? false
        doseReminders = try c.decodeIfPresent(Bool.self, forKey: .doseReminders) ?? true
    }
}

// Property names and enum raw values deliberately match store/types.ts.
// Weights remain in pounds and height in centimeters in persisted data.
struct UserProfile: Codable, Equatable {
    var name: String?
    var medication: Medication?
    var deliveryType: DeliveryType?
    var dose: String?
    var frequency: Frequency?
    var customFrequencyDays: Int?
    var deviceType: DeviceType?
    var height: Double?
    var heightUnit: String?
    var heightFeet: Double?
    var heightInches: Double?
    var currentWeight: Double?
    var startWeight: Double?
    var goalWeight: Double?
    var startDate: String?
    var activityLevel: ActivityLevel?
    var motivation: Motivation?
    var initialSideEffects: [String]?
    var cravingsDays: [String]?
    var weeklyGoal: Double?
    var weeklyGoalUnit: String?
    var onboardingComplete: Bool?
    var disclaimerAccepted: Bool?

    var intervalDays: Int { (frequency ?? .weekly).days(custom: customFrequencyDays) }
    var frequencyLabel: String { frequency == .custom ? "Every \(intervalDays) days" : (frequency?.title ?? "Every 7 days") }
    var medicationLabel: String { medication?.title ?? "Your medication" }
    var isInjection: Bool { deliveryType != .pill }
    var firstName: String { name?.split(separator: " ").first.map(String.init) ?? "" }
}

struct WeightLog: Codable, Identifiable, Equatable {
    var id = UUID().uuidString
    var date: String
    var weight: Double
    var notes: String?
}

struct FoodLog: Codable, Identifiable, Equatable {
    var id = UUID().uuidString
    var date: String
    var mealType: MealType
    var photoUri: String?
    var aiDescription: String?
    var calories: Double
    var protein: Double
    var fiber: Double
    var carbs: Double?
    var fat: Double?
    var manualOverride: Bool?
    var title: String { aiDescription?.isEmpty == false ? aiDescription! : mealType.title }
}

struct WaterLog: Codable, Identifiable, Equatable {
    var id = UUID().uuidString
    var date: String
    var glasses: Int
}

struct MedicationLog: Codable, Identifiable, Equatable {
    var id = UUID().uuidString
    var date: String
    var time: String
    var dose: String
    var deliveryType: DeliveryType
    var injectionSite: InjectionSite?
    var notes: String?
    var timestamp: Date? { DayKey.date(date, time: time) }
}

struct SideEffectLog: Codable, Identifiable, Equatable {
    var id = UUID().uuidString
    var date: String
    var effectType: SideEffect
    var severity: Int
    var notes: String?
}

struct DailyTargets: Codable, Equatable {
    var calories: Double = 1400
    var protein: Double = 100
    var fiber: Double = 25
    var water = 8
}

struct AppData: Codable, Equatable {
    var schemaVersion = 1
    var preferences = Preferences()
    var userProfile = UserProfile()
    var weightLogs: [WeightLog] = []
    var foodLogs: [FoodLog] = []
    var waterLogs: [WaterLog] = []
    var medicationLogs: [MedicationLog] = []
    var sideEffectLogs: [SideEffectLog] = []
    var dailyTargets = DailyTargets()

    init() {}
    private enum CodingKeys: String, CodingKey {
        case schemaVersion, preferences, userProfile, weightLogs, foodLogs, waterLogs, medicationLogs, sideEffectLogs, dailyTargets
    }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        schemaVersion = try c.decodeIfPresent(Int.self, forKey: .schemaVersion) ?? 1
        guard schemaVersion == 1 else { throw DataError.newerVersion }
        preferences = try c.decodeIfPresent(Preferences.self, forKey: .preferences) ?? Preferences()
        userProfile = try c.decodeIfPresent(UserProfile.self, forKey: .userProfile) ?? UserProfile()
        weightLogs = try c.decodeIfPresent([WeightLog].self, forKey: .weightLogs) ?? []
        foodLogs = try c.decodeIfPresent([FoodLog].self, forKey: .foodLogs) ?? []
        waterLogs = try c.decodeIfPresent([WaterLog].self, forKey: .waterLogs) ?? []
        medicationLogs = try c.decodeIfPresent([MedicationLog].self, forKey: .medicationLogs) ?? []
        sideEffectLogs = try c.decodeIfPresent([SideEffectLog].self, forKey: .sideEffectLogs) ?? []
        dailyTargets = try c.decodeIfPresent(DailyTargets.self, forKey: .dailyTargets) ?? DailyTargets()
    }

    mutating func normalize() {
        weightLogs.sort { $0.date > $1.date }
        foodLogs.sort { $0.date > $1.date }
        medicationLogs.sort { ($0.date + $0.time) > ($1.date + $1.time) }
        sideEffectLogs.sort { $0.date > $1.date }
    }

    func validate() throws {
        // A generous technical bound prevents malformed imports or pasted
        // numbers from overflowing integer labels or daily aggregations.
        func positive(_ value: Double?) -> Bool { value == nil || (value!.isFinite && value! > 0 && value! <= 1_000_000) }
        guard positive(userProfile.height), positive(userProfile.startWeight), positive(userProfile.currentWeight), positive(userProfile.goalWeight), positive(userProfile.weeklyGoal),
              userProfile.customFrequencyDays.map({ (1...365).contains($0) }) ?? true,
              dailyTargets.calories.isFinite, (800...4000).contains(dailyTargets.calories),
              dailyTargets.protein.isFinite, (20...300).contains(dailyTargets.protein),
              dailyTargets.fiber.isFinite, (10...60).contains(dailyTargets.fiber), (1...20).contains(dailyTargets.water),
              weightLogs.allSatisfy({ positive($0.weight) && DayKey.date($0.date) != nil }),
              waterLogs.allSatisfy({ (0...20).contains($0.glasses) && DayKey.date($0.date) != nil }),
              foodLogs.allSatisfy({ log in
                  [log.calories, log.protein, log.fiber, log.carbs ?? 0, log.fat ?? 0].allSatisfy { $0.isFinite && (0...1_000_000).contains($0) } && log.calories > 0 && DayKey.date(log.date) != nil
              }),
              medicationLogs.allSatisfy({ !$0.dose.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && $0.timestamp != nil }),
              sideEffectLogs.allSatisfy({ (1...5).contains($0.severity) && DayKey.date($0.date) != nil }) else {
            throw DataError.invalidValues
        }
        let ids = [weightLogs.map(\.id), foodLogs.map(\.id), waterLogs.map(\.id), medicationLogs.map(\.id), sideEffectLogs.map(\.id)]
        guard ids.allSatisfy({ Set($0).count == $0.count }) else { throw DataError.duplicateIDs }
    }

    func lastDose(at date: Date = .now) -> MedicationLog? {
        medicationLogs.first { ($0.timestamp ?? .distantFuture) <= date }
    }
    func nextDose(at date: Date = .now) -> Date? {
        guard let last = lastDose(at: date)?.timestamp else { return nil }
        return Calendar.current.date(byAdding: .day, value: userProfile.intervalDays, to: last)
    }
}

enum DataError: LocalizedError {
    case invalidValues, duplicateIDs, newerVersion, invalidBackup
    var errorDescription: String? {
        switch self {
        case .invalidValues: "Some values are invalid. Check dates, positive weights, nutrition values, and your daily targets."
        case .duplicateIDs: "This backup contains duplicate entries. Your current data has not been changed."
        case .newerVersion: "This data was created by a newer version of Slimsy. Update the app before opening it."
        case .invalidBackup: "This file isn't a Slimsy backup. Select a Slimsy JSON backup or an export of slimsy-storage."
        }
    }
}

enum DayKey {
    static func formatter(_ format: String, timeZone: TimeZone = .current) -> DateFormatter {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = timeZone
        formatter.dateFormat = format
        formatter.isLenient = false
        return formatter
    }
    static func string(_ date: Date = .now, timeZone: TimeZone = .current) -> String {
        formatter("yyyy-MM-dd", timeZone: timeZone).string(from: date)
    }
    static func time(_ date: Date = .now) -> String { formatter("HH:mm").string(from: date) }
    static func date(_ key: String, time: String = "12:00", timeZone: TimeZone = .current) -> Date? {
        guard key.range(of: #"^\d{4}-\d{2}-\d{2}$"#, options: .regularExpression) != nil,
              time.range(of: #"^([01]\d|2[0-3]):[0-5]\d$"#, options: .regularExpression) != nil else { return nil }
        return formatter("yyyy-MM-dd HH:mm", timeZone: timeZone).date(from: key + " " + time)
    }
    static func label(_ key: String) -> String {
        guard let date = date(key) else { return key }
        if Calendar.current.isDateInToday(date) { return "Today" }
        if Calendar.current.isDateInYesterday(date) { return "Yesterday" }
        return date.formatted(.dateTime.month(.abbreviated).day())
    }
}

extension String {
    var nonempty: String? {
        let value = trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
    var decimalValue: Double? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        // Text fields accept either decimal separator, but never partially parse
        // invalid input such as "12kg", multiple separators, NaN, or infinity.
        guard trimmed.range(of: #"^-?(?:\d+(?:[.,]\d*)?|[.,]\d+)$"#, options: .regularExpression) != nil,
              let number = Double(trimmed.replacingOccurrences(of: ",", with: ".")), number.isFinite else { return nil }
        return number
    }
}
