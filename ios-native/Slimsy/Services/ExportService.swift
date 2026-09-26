import Foundation

enum ExportService {
    static func csvCell(_ value: String) -> String {
        // Protect spreadsheet consumers against formula execution from freeform notes.
        let trimmed = value.trimmingCharacters(in: .whitespaces)
        let safe = ["=", "+", "-", "@", "\t", "\r"].contains(where: { trimmed.hasPrefix($0) }) && Double(value) == nil ? "'" + value : value
        if safe.contains(",") || safe.contains("\"") || safe.contains("\n") || safe.contains("\r") {
            return "\"" + safe.replacingOccurrences(of: "\"", with: "\"\"") + "\""
        }
        return safe
    }
    static func csv(_ data: AppData, now: Date = .now) -> String {
        let units = data.preferences.units
        let profile = data.userProfile
        func table(_ headers: [String], _ rows: [[String]]) -> String { ([headers] + rows).map { $0.map(csvCell).joined(separator: ",") }.joined(separator: "\r\n") }
        func number(_ value: Double?) -> String { value.map { String($0) } ?? "" }
        let profileRows: [[String]] = [
            ["Name", profile.name ?? ""], ["Medication", profile.medication?.rawValue ?? ""],
            ["Dose", profile.dose ?? ""], ["Delivery Type", profile.deliveryType?.rawValue ?? ""],
            ["Frequency", profile.frequency?.rawValue ?? ""], ["Custom Frequency Days", profile.customFrequencyDays.map(String.init) ?? ""],
            ["Device", profile.deviceType?.rawValue ?? ""], ["Start Date", profile.startDate ?? ""],
            ["Height", profile.height.map { units.height($0) } ?? ""],
            ["Start Weight", profile.startWeight.map { "\(units.weight($0)) \(units.weightLabel)" } ?? ""],
            ["Current Weight", (data.weightLogs.first?.weight ?? profile.currentWeight).map { "\(units.weight($0)) \(units.weightLabel)" } ?? ""],
            ["Goal Weight", profile.goalWeight.map { "\(units.weight($0)) \(units.weightLabel)" } ?? ""],
            ["Weekly Goal", number(profile.weeklyGoal)], ["Weekly Goal Unit", profile.weeklyGoalUnit ?? ""],
            ["Activity Level", profile.activityLevel?.rawValue ?? ""], ["Motivation", profile.motivation?.rawValue ?? ""],
            ["Initial Side Effects", profile.initialSideEffects?.joined(separator: "; ") ?? ""],
            ["Cravings Days", profile.cravingsDays?.joined(separator: "; ") ?? ""], ["Units", units.rawValue]
        ]
        return [
            "SLIMSY DATA EXPORT — \(DayKey.string(now))", "",
            "=== USER PROFILE ===", table(["Field", "Value"], profileRows), "",
            "=== DAILY TARGETS ===", table(["Calories", "Protein (g)", "Fiber (g)", "Water (glasses)"], [[number(data.dailyTargets.calories), number(data.dailyTargets.protein), number(data.dailyTargets.fiber), String(data.dailyTargets.water)]]), "",
            "=== WEIGHT LOGS ===", table(["Date", "Weight (\(units.weightLabel))", "Notes"], data.weightLogs.map { [$0.date, units.weight($0.weight), $0.notes ?? ""] }), "",
            "=== FOOD LOGS ===", table(["Date", "Meal Type", "Description", "Calories", "Protein (g)", "Fiber (g)", "Carbs (g)", "Fat (g)"], data.foodLogs.map { [$0.date, $0.mealType.rawValue, $0.aiDescription ?? "", number($0.calories), number($0.protein), number($0.fiber), number($0.carbs), number($0.fat)] }), "",
            "=== MEDICATION LOGS ===", table(["Date", "Time", "Dose", "Delivery Type", "Injection Site", "Notes"], data.medicationLogs.map { [$0.date, $0.time, $0.dose, $0.deliveryType.rawValue, $0.injectionSite?.rawValue ?? "", $0.notes ?? ""] }), "",
            "=== SIDE EFFECT LOGS ===", table(["Date", "Effect Type", "Severity (1-5)", "Notes"], data.sideEffectLogs.map { [$0.date, $0.effectType.rawValue, String($0.severity), $0.notes ?? ""] }), "",
            "=== WATER LOGS ===", table(["Date", "Glasses"], data.waterLogs.map { [$0.date, String($0.glasses)] })
        ].joined(separator: "\r\n")
    }

    static func csvFile(_ data: AppData) throws -> URL {
        let url = URL.temporaryDirectory.appending(path: "slimsy-export-\(DayKey.string()).csv")
        try Data(csv(data).utf8).write(to: url, options: [.atomic, .completeFileProtectionUnlessOpen])
        return url
    }

    struct Backup: Codable {
        var format = "slimsy-backup"
        var version = 1
        var state: AppData
        var photos: [String: Data] = [:]
    }
    struct LegacyEnvelope: Decodable { var state: AppData }

    static func backupFile(_ data: AppData) throws -> URL {
        var backup = Backup(state: data)
        for filename in Set(data.foodLogs.compactMap(\.photoUri)) {
            if let url = PhotoStorage.url(filename), let bytes = try? Data(contentsOf: url) { backup.photos[filename] = bytes }
        }
        let url = URL.temporaryDirectory.appending(path: "slimsy-backup-\(DayKey.string()).json")
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        try encoder.encode(backup).write(to: url, options: [.atomic, .completeFileProtectionUnlessOpen])
        return url
    }

    static func decodeBackup(_ bytes: Data) throws -> Backup {
        let object = try JSONSerialization.jsonObject(with: bytes) as? [String: Any]
        let decoder = JSONDecoder()
        var backup: Backup
        if object?["format"] as? String == "slimsy-backup" {
            backup = try decoder.decode(Backup.self, from: bytes)
            guard backup.version == 1 else { throw DataError.newerVersion }
        } else if let state = object?["state"] as? [String: Any], state["userProfile"] != nil {
            backup = Backup(state: try decoder.decode(LegacyEnvelope.self, from: bytes).state)
        } else if object?["userProfile"] != nil && object?["weightLogs"] != nil {
            backup = Backup(state: try decoder.decode(AppData.self, from: bytes))
        } else { throw DataError.invalidBackup }
        try backup.state.validate()
        guard backup.photos.allSatisfy({ PhotoStorage.url($0.key) != nil && $0.value.count <= 12_000_000 }) else { throw DataError.invalidBackup }
        backup.state.normalize()
        return backup
    }
}
