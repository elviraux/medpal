import XCTest
import UIKit
@testable import Slimsy

private final class NutritionURLProtocol: URLProtocol {
    static var handler: ((URLRequest) throws -> (Int, Data))?
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        do {
            let (status, data) = try Self.handler!(request)
            let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: ["Content-Type": "text/plain"])!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() {}
}

final class NutritionTests: XCTestCase {
    override func tearDown() { NutritionURLProtocol.handler = nil; super.tearDown() }

    func testNativeClientUsesExistingMultipartContract() async throws {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [NutritionURLProtocol.self]
        let session = URLSession(configuration: config)
        defer { session.invalidateAndCancel() }
        NutritionURLProtocol.handler = { request in
            XCTAssertEqual(request.url?.absoluteString, "https://analysis.example/v1/analyze/image/upload")
            XCTAssertEqual(request.httpMethod, "POST")
            XCTAssertTrue(request.value(forHTTPHeaderField: "Content-Type")?.hasPrefix("multipart/form-data; boundary=Slimsy-") == true)
            return (200, Data(#"```json {"description":"Lunch","calories":350,"protein":25,"fiber":0} ```"#.utf8))
        }
        let client = NutritionAnalyzer(session: session, baseURL: URL(string: "https://analysis.example")!, projectID: "fixture-project")
        let result = try await client.analyze(jpeg: Data([0xff, 0xd8, 0xff, 0xd9]))
        XCTAssertEqual(result.description, "Lunch")
        XCTAssertEqual(result.fiber, 0)
    }

    func testHTTPFailureAndMissingConfigurationAreReported() async {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [NutritionURLProtocol.self]
        let session = URLSession(configuration: config)
        defer { session.invalidateAndCancel() }
        NutritionURLProtocol.handler = { _ in (503, Data("unavailable".utf8)) }
        do {
            _ = try await NutritionAnalyzer(session: session, baseURL: URL(string: "https://analysis.example")!, projectID: "fixture").analyze(jpeg: Data([1]))
            XCTFail("Expected a service error")
        } catch { XCTAssertTrue(error is NutritionError) }
        do {
            _ = try await NutritionAnalyzer(session: session, baseURL: nil, projectID: "").analyze(jpeg: Data([1]))
            XCTFail("Expected missing configuration")
        } catch { XCTAssertTrue(error is NutritionError) }
    }

    func testLiveFoodEstimateWhenExplicitlyEnabled() async throws {
        guard ProcessInfo.processInfo.environment["SLIMSY_LIVE_AI_TEST"] == "1" else {
            throw XCTSkip("Set SLIMSY_LIVE_AI_TEST=1 to use the configured service with a public sample image.")
        }
        let client = NutritionAnalyzer()
        XCTAssertTrue(client.isConfigured)
        let sample = URL(string: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80")!
        let (data, _) = try await URLSession.shared.data(from: sample)
        let image = try XCTUnwrap(UIImage(data: data))
        let jpeg = try XCTUnwrap(PhotoStorage.jpeg(from: image))
        let result = try await client.analyze(jpeg: jpeg)
        XCTAssertFalse(result.description.isEmpty)
        XCTAssertGreaterThan(result.calories, 0)
        XCTAssertGreaterThanOrEqual(result.protein, 0)
        XCTAssertGreaterThanOrEqual(result.fiber, 0)
    }
}
