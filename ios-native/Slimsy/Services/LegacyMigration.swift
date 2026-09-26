import Foundation
import CryptoKit

/// Reads AsyncStorage 2.x directly during an in-place App Store upgrade.
/// The original manifest and data files are never modified or removed.
enum LegacyMigration {
    static let key = "slimsy-storage"
    static var keyFilename: String {
        Insecure.MD5.hash(data: Data(key.utf8)).map { String(format: "%02x", $0) }.joined()
    }
    static func load(storageDirectory: URL) throws -> AppData? {
        let manifestURL = storageDirectory.appending(path: "manifest.json")
        guard FileManager.default.fileExists(atPath: manifestURL.path) else { return nil }
        let manifest = try JSONSerialization.jsonObject(with: Data(contentsOf: manifestURL)) as? [String: Any]
        guard let value = manifest?[key] else { return nil }
        let bytes: Data
        if let inline = value as? String { bytes = Data(inline.utf8) }
        else if value is NSNull { bytes = try Data(contentsOf: storageDirectory.appending(path: keyFilename)) }
        else { throw DataError.invalidBackup }
        return try ExportService.decodeBackup(bytes).state
    }

    static func findInCurrentContainer() throws -> AppData? {
        let bundle = Bundle.main.bundleIdentifier ?? "com.fastshotai.slimsy"
        let names = ["RCTAsyncLocalStorage_V1", "RNCAsyncLocalStorage_V1", "RCTAsyncLocalStorage"]
        let roots = [URL.applicationSupportDirectory.appending(path: bundle), URL.documentsDirectory]
        for root in roots {
            for name in names {
                if let state = try load(storageDirectory: root.appending(path: name)) { return state }
            }
        }
        return nil
    }

    static func copyPhotos(in state: inout AppData) throws -> [String] {
        var created: [String] = []
        let container = URL(fileURLWithPath: NSHomeDirectory(), isDirectory: true).resolvingSymlinksInPath().path + "/"
        do {
            for index in state.foodLogs.indices {
                guard let uri = state.foodLogs[index].photoUri else { continue }
                guard let url = URL(string: uri), url.isFileURL,
                      url.resolvingSymlinksInPath().path.hasPrefix(container),
                      FileManager.default.fileExists(atPath: url.path) else {
                    state.foodLogs[index].photoUri = nil
                    continue
                }
                guard (try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0) <= 12_000_000 else {
                    state.foodLogs[index].photoUri = nil
                    continue
                }
                let filename = try PhotoStorage.save(Data(contentsOf: url))
                created.append(filename)
                state.foodLogs[index].photoUri = filename
            }
            return created
        } catch { created.forEach(PhotoStorage.remove); throw error }
    }
}
