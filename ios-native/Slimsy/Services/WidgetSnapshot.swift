import Foundation
import WidgetKit

/// The profile and dose history the widget needs, shared through the app group.
enum WidgetSnapshot {
    static let kind = "SlimsyMedicationWidget"

    private static func url() throws -> URL {
        let group = Bundle.main.object(forInfoDictionaryKey: "AppGroup") as! String
        // Missing without the App Group entitlement, e.g. in an unsigned build.
        guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) else {
            throw CocoaError(.fileNoSuchFile, userInfo: [NSFilePathErrorKey: group])
        }
        return container.appending(path: "widget-snapshot.json")
    }

    static func save(_ data: AppData) throws {
        var slice = AppData()
        slice.userProfile = data.userProfile
        slice.medicationLogs = data.medicationLogs
        try JSONEncoder().encode(slice).write(to: url(), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        WidgetCenter.shared.reloadTimelines(ofKind: kind)
    }

    /// Empty until the app has saved a snapshot.
    static func load() throws -> AppData {
        let file = try url()
        guard FileManager.default.fileExists(atPath: file.path) else { return AppData() }
        return try JSONDecoder().decode(AppData.self, from: Data(contentsOf: file))
    }
}
