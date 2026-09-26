import Foundation
import UIKit

struct NutritionEstimate: Codable, Equatable {
    var description: String
    var calories: Double
    var protein: Double
    var fiber: Double
    var carbs: Double?
    var fat: Double?

    static func parse(_ data: Data) throws -> NutritionEstimate {
        var text = String(decoding: data, as: UTF8.self)
        if let unwrapped = try? JSONDecoder().decode(String.self, from: data) { text = unwrapped }
        guard let start = text.firstIndex(of: "{"), let end = text.lastIndex(of: "}"), start <= end else { throw NutritionError.invalidResponse }
        let estimate = try JSONDecoder().decode(Self.self, from: Data(text[start...end].utf8))
        guard !estimate.description.isEmpty, estimate.calories > 0,
              [estimate.calories, estimate.protein, estimate.fiber, estimate.carbs ?? 0, estimate.fat ?? 0].allSatisfy({ $0.isFinite && (0...1_000_000).contains($0) }) else { throw NutritionError.invalidResponse }
        return estimate
    }
}

enum NutritionError: LocalizedError {
    case notConfigured, invalidResponse, serviceUnavailable, invalidImage
    var errorDescription: String? {
        switch self {
        case .notConfigured: "Photo estimates aren't available right now. You can still add your photo and enter nutrition below."
        case .invalidResponse: "We couldn't read the nutrition estimate. Try another photo or enter the details yourself."
        case .serviceUnavailable: "Photo analysis is unavailable right now. Please try again or enter your meal manually."
        case .invalidImage: "This photo couldn't be processed. Please choose another image."
        }
    }
}

struct NutritionAnalyzer {
    var session: URLSession = .shared
    var baseURL: URL?
    var projectID: String

    init(session: URLSession = .shared,
         baseURL: URL? = URL(string: Bundle.main.object(forInfoDictionaryKey: "NewellAPIURL") as? String ?? ""),
         projectID: String = Bundle.main.object(forInfoDictionaryKey: "FastshotProjectID") as? String ?? "") {
        self.session = session
        self.baseURL = baseURL
        self.projectID = projectID
    }

    var isConfigured: Bool { baseURL?.scheme == "https" && !projectID.isEmpty && !projectID.contains("$(") }

    /// Uses the same multipart endpoint and fields as @fastshot/ai 1.0.8.
    func analyze(jpeg: Data) async throws -> NutritionEstimate {
        guard isConfigured, let baseURL else { throw NutritionError.notConfigured }
        guard !jpeg.isEmpty, jpeg.count <= 12_000_000 else { throw NutritionError.invalidImage }
        let boundary = "Slimsy-\(UUID().uuidString)"
        var body = Data()
        func append(_ value: String) { body.append(Data(value.utf8)) }
        let fields = [
            ("project_id", projectID),
            ("prompt", "Analyze this food photo. Identify the food and estimate total calories (kcal), protein, fiber, carbs and fat (grams). Return ONLY JSON with description, calories, protein, fiber, carbs, fat. These are estimates to be reviewed by the user."),
            ("model", "gpt-4o"),
            ("inject_branding", "false")
        ]
        for (name, value) in fields {
            append("--\(boundary)\r\nContent-Disposition: form-data; name=\"\(name)\"\r\n\r\n\(value)\r\n")
        }
        append("--\(boundary)\r\nContent-Disposition: form-data; name=\"image\"; filename=\"meal.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n")
        body.append(jpeg)
        append("\r\n--\(boundary)--\r\n")
        var request = URLRequest(url: baseURL.appending(path: "v1/analyze/image/upload"))
        request.httpMethod = "POST"
        request.timeoutInterval = 60
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        let (data, response) = try await session.data(for: request)
        try Task.checkCancellation()
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { throw NutritionError.serviceUnavailable }
        return try NutritionEstimate.parse(data)
    }
}

enum PhotoStorage {
    static var directory: URL { URL.applicationSupportDirectory.appending(path: "Slimsy/Photos", directoryHint: .isDirectory) }
    static func jpeg(from image: UIImage) -> Data? {
        let scale = min(1, 1600 / max(image.size.width, image.size.height))
        let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        guard size.width > 0, size.height > 0 else { return nil }
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: size, format: format).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }.jpegData(compressionQuality: 0.8)
    }
    static func save(_ data: Data) throws -> String {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let filename = UUID().uuidString + ".jpg"
        try data.write(to: directory.appending(path: filename), options: [.atomic, .completeFileProtectionUnlessOpen])
        return filename
    }
    static func url(_ filename: String) -> URL? {
        guard filename == (filename as NSString).lastPathComponent, !filename.contains(".."), filename.hasSuffix(".jpg") else { return nil }
        return directory.appending(path: filename)
    }
    static func image(_ filename: String?) -> UIImage? {
        guard let filename, let url = url(filename) else { return nil }
        return UIImage(contentsOfFile: url.path)
    }
    static func remove(_ filename: String) {
        if let url = url(filename) { try? FileManager.default.removeItem(at: url) }
    }
}
