import XCTest
import Adapty
@testable import Slimsy

final class OnboardingTests: XCTestCase {
    func testAllOriginalStagesAndConditionalNavigationArePreserved() {
        XCTAssertEqual(OnboardingStep.allCases.count, 28)
        for delivery in DeliveryType.allCases {
            var visited: [OnboardingStep] = [.welcome]
            while visited.last != .pro { visited.append(visited.last!.next(delivery: delivery)) }
            XCTAssertEqual(visited.count, delivery == .injection ? 28 : 27)
            XCTAssertEqual(visited.contains(.device), delivery == .injection)
            for index in 1..<visited.count { XCTAssertEqual(visited[index].previous(delivery: delivery), visited[index - 1]) }
            for stage in [OnboardingStep.trackingInsight, .goalInsight, .paceInsight, .dailyInsight, .toughDays, .concernsInsight, .rating, .levels, .pro] {
                XCTAssertTrue(visited.contains(stage))
            }
        }
        XCTAssertEqual(OnboardingOptions.frequencies(delivery: .injection), [.weekly, .fortnightly, .custom])
        XCTAssertEqual(OnboardingOptions.frequencies(delivery: .pill), [.daily, .custom, .notSure])
        XCTAssertTrue(OnboardingOptions.concerns.contains("Not concerned"))
        XCTAssertEqual(OnboardingOptions.doses(delivery: .pill), ["1.5mg", "4mg", "9mg", "25mg", "Other", "I don't know"])
    }

    func testOnboardingCurveMatchesOriginalTypeScript() {
        // Golden values produced by computeOnboardingPkCurve(…, 300,170,20,16).
        let scenarios: [(Medication, DeliveryType, Frequency, [Double], Double, Double)] = [
            (.wegovy, .injection, .weekly, [94.3, 51.1, 64.2], 86.98786477627624, 64.21222342094721),
            (.mounjaro, .injection, .fortnightly, [92.5, 130.7, 127.3], 44.86514742423921, 127.3470380240549),
            (.semaglutide, .pill, .daily, [96.8, 74.2, 38.5], 123.36799792511111, 38.54194017352302)
        ]
        for (medication, delivery, frequency, expectedY, peakY, troughY) in scenarios {
            var profile = UserProfile()
            profile.medication = medication
            profile.deliveryType = delivery
            profile.frequency = frequency
            let curve = Pharmacokinetics.onboarding(profile: profile)
            XCTAssertEqual(curve.curve.count, 501)
            for (index, y) in zip([125, 250, 500], expectedY) {
                XCTAssertEqual(154 - curve.curve[index].level * 138 * 0.92, y, accuracy: 0.051)
            }
            XCTAssertEqual(154 - curve.peaks[0].level * 138 * 0.92, peakY, accuracy: 0.000001)
            XCTAssertEqual(154 - curve.troughs.last!.level * 138 * 0.92, troughY, accuracy: 0.000001)
        }
        var custom = UserProfile()
        custom.frequency = .custom
        custom.customFrequencyDays = 10
        XCTAssertEqual(Pharmacokinetics.onboarding(profile: custom).totalHours, 720)
    }

    @MainActor func testStartingDoseSavesBeforeCompletionAndDoesNotDuplicateOnBackNavigation() throws {
        let directory = URL.temporaryDirectory.appending(path: UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let url = directory.appending(path: "data.json")
        let store = AppStore(fileURL: url, schedulesReminders: false)
        var dose = MedicationLog(date: DayKey.string(), time: "09:00", dose: "1mg", deliveryType: .injection, injectionSite: .abdomenLeft, notes: "First dose")
        XCTAssertTrue(store.saveDose(dose))
        XCTAssertNotEqual(store.profile.onboardingComplete, true)
        XCTAssertEqual(AppStore(fileURL: url, schedulesReminders: false).data.medicationLogs, [dose])
        dose.notes = "Updated note after going back"
        XCTAssertTrue(store.saveDose(dose))
        XCTAssertEqual(store.data.medicationLogs, [dose])
        var profile = UserProfile()
        profile.medication = .wegovy
        profile.deliveryType = .injection
        profile.dose = "1mg"
        profile.frequency = .weekly
        profile.deviceType = .singleUsePen
        profile.height = 170
        profile.currentWeight = UnitSystem.metric.pounds(80)
        profile.startWeight = UnitSystem.metric.pounds(85)
        profile.goalWeight = UnitSystem.metric.pounds(70)
        profile.startDate = DayKey.string()
        profile.activityLevel = .active
        profile.weeklyGoal = 0.5
        profile.weeklyGoalUnit = "kg"
        profile.motivation = .improveHealth
        profile.initialSideEffects = ["Not concerned"]
        profile.cravingsDays = ["Mon", "Other"]
        profile.disclaimerAccepted = true
        XCTAssertTrue(store.completeOnboarding(profile: profile, units: .metric, firstDose: nil))
        let restored = AppStore(fileURL: url, schedulesReminders: false)
        profile.onboardingComplete = true
        XCTAssertEqual(restored.profile, profile)
        XCTAssertEqual(restored.units, .metric)
        XCTAssertEqual(restored.data.medicationLogs, [dose])
        XCTAssertEqual(restored.data.weightLogs.count, 1)
    }

    func testLiveAdaptyPlacementWhenExplicitlyEnabled() async throws {
        guard ProcessInfo.processInfo.environment["SLIMSY_LIVE_BILLING_TEST"] == "1" else {
            throw XCTSkip("Set SLIMSY_LIVE_BILLING_TEST=1 for a read-only check of the configured Adapty placement.")
        }
        let key = try XCTUnwrap((Bundle.main.object(forInfoDictionaryKey: "AdaptyPublicSDKKey") as? String)?.nonempty)
        let placement = try XCTUnwrap((Bundle.main.object(forInfoDictionaryKey: "AdaptyPlacementID") as? String)?.nonempty)
        if await !Adapty.isActivated {
            try await Adapty.activate(with: AdaptyConfiguration.builder(withAPIKey: key).with(idfaCollectionDisabled: true).with(ipAddressCollectionDisabled: true).build())
        }
        let profile = try await Adapty.getProfile()
        XCTAssertFalse(profile.profileId.isEmpty)
        let paywall = try await Adapty.getPaywall(placementId: placement, loadTimeout: 15)
        XCTAssertFalse(paywall.vendorProductIds.isEmpty, "The existing placement needs App Store products assigned to it.")
        print("Adapty placement product identifiers: \(paywall.vendorProductIds.joined(separator: ", "))")
        if ProcessInfo.processInfo.environment["SLIMSY_LIVE_STORE_PRODUCTS_TEST"] == "1" {
            let products = try await Adapty.getPaywallProducts(paywall: paywall)
            XCTAssertEqual(Set(products.map(\.vendorProductId)), Set(paywall.vendorProductIds))
            print("App Store plans: \(products.map { $0.localizedTitle + ": " + ($0.localizedPrice ?? "unavailable") }.joined(separator: ", "))")
        }
    }
}
