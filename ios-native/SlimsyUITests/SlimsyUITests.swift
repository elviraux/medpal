import XCTest

final class SlimsyUITests: XCTestCase {
    private var app: XCUIApplication!
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
    }

    func testAllTabsAndNativeSheets() {
        app.launchArguments = ["--demo-data"]
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["Today"].waitForExistence(timeout: 15))
        capture("01-today")
        app.tabBars.buttons["Food"].tap()
        XCTAssertTrue(app.staticTexts["Nourish your day."].waitForExistence(timeout: 5))
        capture("02-food")
        app.tabBars.buttons["Medication"].tap()
        XCTAssertTrue(app.staticTexts["Your medication."].waitForExistence(timeout: 5))
        capture("03-medication")
        app.tabBars.buttons["Progress"].tap()
        XCTAssertTrue(app.staticTexts["Every step counts."].waitForExistence(timeout: 5))
        capture("04-progress")
        app.buttons["log-weight-button"].tap()
        XCTAssertTrue(app.textFields["weight-value"].waitForExistence(timeout: 5))
        capture("05-weight-entry")
        app.buttons["Cancel"].tap()
        app.tabBars.buttons["You"].tap()
        XCTAssertTrue(app.staticTexts["A little more you."].waitForExistence(timeout: 5))
        capture("06-profile")
        app.buttons["settings-daily-targets"].tap()
        XCTAssertTrue(app.textFields["target-calories"].waitForExistence(timeout: 5))
        capture("07-targets")
        app.buttons["Cancel"].tap()
    }

    func testDarkAppearanceAndLargerText() {
        app.launchArguments = ["--demo-data", "--dark-mode"]
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["Today"].waitForExistence(timeout: 15))
        capture("09-dark-today")
        app.tabBars.buttons["Food"].tap()
        capture("10-dark-food")
        app.terminate()
        app.launchArguments = ["--demo-data", "--large-type"]
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["Today"].waitForExistence(timeout: 15))
        capture("11-large-type-today")
        reveal(app.buttons["quick-food"])
        app.buttons["quick-food"].tap()
        XCTAssertTrue(app.buttons["save-entry"].waitForExistence(timeout: 5))
        capture("12-large-type-form")
    }

    func testLoggingEditingUnitConversionAndPersistence() {
        app.launchArguments = ["--ui-persistence", "--reset-test-store"]
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["Food"].waitForExistence(timeout: 15))
        app.tabBars.buttons["Food"].tap()
        reveal(app.buttons["water-plus"])
        app.buttons["water-plus"].tap()
        XCTAssertEqual(app.staticTexts["water-count"].label, "6 / 8")
        app.buttons["Log food"].tap()
        XCTAssertTrue(app.segmentedControls.buttons["Enter manually"].waitForExistence(timeout: 5))
        app.segmentedControls.buttons["Enter manually"].tap()
        enter("Test avocado toast", into: "food-description")
        enter("300", into: "food-calories")
        enter("12", into: "food-protein")
        enter("6", into: "food-fiber")
        dismissKeyboard()
        app.buttons["save-entry"].tap()
        XCTAssertTrue(app.staticTexts["calories-remaining"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["calories-remaining"].label, "170")
        let savedMeal = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Test avocado toast")).firstMatch
        reveal(savedMeal)
        savedMeal.tap()
        enter("320", into: "food-calories")
        dismissKeyboard()
        app.buttons["save-entry"].tap()
        XCTAssertTrue(app.staticTexts["calories-remaining"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["calories-remaining"].label, "150")
        app.tabBars.buttons["Progress"].tap()
        app.buttons["log-weight-button"].tap()
        enter("175.2", into: "weight-value")
        dismissKeyboard()
        app.buttons["save-entry"].tap()
        XCTAssertTrue(app.staticTexts["current-weight"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["current-weight"].label.contains("175.2"))

        app.terminate()
        app.launchArguments = ["--ui-persistence"]
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["Food"].waitForExistence(timeout: 15))
        app.tabBars.buttons["Food"].tap()
        XCTAssertEqual(app.staticTexts["water-count"].label, "6 / 8")
        XCTAssertEqual(app.staticTexts["calories-remaining"].label, "150")
        app.tabBars.buttons["Progress"].tap()
        XCTAssertTrue(app.staticTexts["current-weight"].label.contains("175.2"))
        app.tabBars.buttons["You"].tap()
        reveal(app.segmentedControls.buttons["Metric · kg, cm"])
        app.segmentedControls.buttons["Metric · kg, cm"].tap()
        app.tabBars.buttons["Progress"].tap()
        XCTAssertTrue(app.staticTexts["current-weight"].label.contains("79.5"))
    }

    func testDoseAndSideEffectLogging() {
        app.launchArguments = ["--demo-data"]
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["Medication"].waitForExistence(timeout: 15))
        app.tabBars.buttons["Medication"].tap()
        app.buttons["log-dose-button"].tap()
        XCTAssertTrue(app.textFields["dose-value"].waitForExistence(timeout: 5))
        enter("1.5 mg", into: "dose-value")
        dismissKeyboard()
        app.buttons["save-entry"].tap()
        XCTAssertTrue(app.buttons["How you feel"].waitForExistence(timeout: 5))
        reveal(app.buttons["How you feel"])
        app.buttons["How you feel"].tap()
        XCTAssertTrue(app.buttons["Fatigue"].waitForExistence(timeout: 5))
        app.buttons["Fatigue"].tap()
        app.buttons["4 of 5, Strong"].tap()
        app.buttons["save-entry"].tap()
        reveal(app.segmentedControls.buttons["Side effects"])
        app.segmentedControls.buttons["Side effects"].tap()
        XCTAssertTrue(app.staticTexts["Fatigue"].waitForExistence(timeout: 5))
        capture("08-side-effects")
    }

    func testFullInjectionOnboardingIncludesEveryStageAndSavesFirstDose() {
        app.launchArguments = ["--ui-testing"]
        app.launch()
        XCTAssertTrue(app.buttons["onboarding-continue"].waitForExistence(timeout: 15))
        capture("00-welcome")
        advanceOnboarding(to: 1)
        XCTAssertFalse(app.buttons["onboarding-continue"].isEnabled)
        selectOnboarding("medication-Wegovy")
        advanceOnboarding(to: 2)
        selectOnboarding("delivery-injection")
        advanceOnboarding(to: 3)
        XCTAssertTrue(app.staticTexts["3×"].exists)
        capture("13-onboarding-insight")
        advanceOnboarding(to: 4)
        selectOnboarding("dose-1mg")
        advanceOnboarding(to: 5)
        XCTAssertFalse(app.buttons["onboarding-frequency-daily"].exists)
        selectOnboarding("frequency-every_7_days")
        advanceOnboarding(to: 6)
        selectOnboarding("device-single_use_pen")
        advanceOnboarding(to: 7)
        XCTAssertFalse(app.buttons["onboarding-continue"].isEnabled)
        reveal(app.switches["onboarding-consent"])
        app.switches["onboarding-consent"].tap()
        advanceOnboarding(to: 8)
        selectOnboarding("units-imperial")
        advanceOnboarding(to: 9)
        enter("5", into: "onboarding-feet")
        enter("7", into: "onboarding-inches")
        advanceOnboarding(to: 10)
        enter("180", into: "onboarding-current-weight")
        advanceOnboarding(to: 11)
        enter("190", into: "onboarding-start-weight")
        advanceOnboarding(to: 12)
        advanceOnboarding(to: 13)
        enter("160", into: "onboarding-goal-weight")
        advanceOnboarding(to: 14)
        XCTAssertTrue(app.staticTexts["87%"].exists)
        advanceOnboarding(to: 15)
        advanceOnboarding(to: 16)
        XCTAssertTrue(app.staticTexts["18"].exists)
        advanceOnboarding(to: 17)
        XCTAssertFalse(app.buttons["onboarding-continue"].isEnabled)
        selectOnboarding("activity-active")
        advanceOnboarding(to: 18)
        advanceOnboarding(to: 19)
        XCTAssertTrue(app.staticTexts["Tough days\nhappen."].exists)
        advanceOnboarding(to: 20)
        selectOnboarding("craving-Mon")
        selectOnboarding("craving-Fri")
        advanceOnboarding(to: 21)
        selectOnboarding("concern-Nausea")
        advanceOnboarding(to: 22)
        XCTAssertTrue(app.staticTexts["68%"].exists)
        advanceOnboarding(to: 23)
        selectOnboarding("motivation-improve_health")
        advanceOnboarding(to: 24)
        capture("14-onboarding-dose")
        app.buttons["onboarding-continue"].tap()
        assertOnboardingStep(25)
        XCTAssertTrue(app.buttons["onboarding-rate"].exists)
        app.buttons["onboarding-skip"].tap()
        assertOnboardingStep(26)
        XCTAssertTrue(app.otherElements["onboarding-level-chart"].exists)
        capture("15-onboarding-levels")
        app.buttons["onboarding-continue"].tap()
        let finish = app.buttons["pro-continue"]
        reveal(finish)
        XCTAssertTrue(finish.waitForExistence(timeout: 8))
        capture("16-onboarding-pro")
        finish.tap()
        XCTAssertTrue(app.tabBars.buttons["Today"].waitForExistence(timeout: 15))
        app.tabBars.buttons["Progress"].tap()
        XCTAssertTrue(app.staticTexts["current-weight"].label.contains("180"))
        app.tabBars.buttons["Medication"].tap()
        XCTAssertTrue(app.staticTexts["1mg · Every 7 days"].exists)
        XCTAssertFalse(app.staticTexts["One dose at a time"].exists)
    }

    func testPillOnboardingSkipsDeviceSupportsMetricAndCanSkipDose() {
        app.launchArguments = ["--ui-testing"]
        app.launch()
        XCTAssertTrue(app.buttons["onboarding-continue"].waitForExistence(timeout: 15))
        advanceOnboarding(to: 1)
        selectOnboarding("medication-Semaglutide")
        advanceOnboarding(to: 2)
        selectOnboarding("delivery-pill")
        advanceOnboarding(to: 3)
        advanceOnboarding(to: 4)
        XCTAssertTrue(app.buttons["onboarding-dose-4mg"].exists)
        XCTAssertFalse(app.buttons["onboarding-dose-0.25mg"].exists)
        selectOnboarding("dose-4mg")
        advanceOnboarding(to: 5)
        selectOnboarding("frequency-daily")
        advanceOnboarding(to: 7)
        app.buttons["onboarding-back"].tap()
        assertOnboardingStep(5)
        advanceOnboarding(to: 7)
        reveal(app.switches["onboarding-consent"])
        app.switches["onboarding-consent"].tap()
        advanceOnboarding(to: 8)
        selectOnboarding("units-metric")
        advanceOnboarding(to: 9)
        enter("170", into: "onboarding-height")
        advanceOnboarding(to: 10)
        enter("80", into: "onboarding-current-weight")
        advanceOnboarding(to: 11)
        enter("85", into: "onboarding-start-weight")
        advanceOnboarding(to: 12)
        advanceOnboarding(to: 13)
        enter("70", into: "onboarding-goal-weight")
        for step in 14...17 { advanceOnboarding(to: step) }
        selectOnboarding("activity-lightly_active")
        for step in 18...21 { advanceOnboarding(to: step) }
        selectOnboarding("concern-Not concerned")
        advanceOnboarding(to: 22)
        advanceOnboarding(to: 23)
        selectOnboarding("motivation-boost_energy")
        advanceOnboarding(to: 24)
        XCTAssertFalse(app.buttons["Left abdomen"].exists)
        app.buttons["onboarding-skip"].tap()
        assertOnboardingStep(25)
        app.buttons["onboarding-skip"].tap()
        assertOnboardingStep(26)
        app.buttons["onboarding-continue"].tap()
        reveal(app.buttons["pro-continue"])
        app.buttons["pro-continue"].tap()
        XCTAssertTrue(app.tabBars.buttons["Today"].waitForExistence(timeout: 15))
        app.tabBars.buttons["Progress"].tap()
        XCTAssertTrue(app.staticTexts["current-weight"].label.contains("80.0"))
        app.tabBars.buttons["Medication"].tap()
        XCTAssertTrue(app.staticTexts["4mg · Daily"].exists)
        XCTAssertFalse(app.staticTexts["A new spot, each time"].exists)
    }

    func testResetRequiresConfirmationAndRestartsOnboarding() {
        app.launchArguments = ["--demo-data"]
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["You"].waitForExistence(timeout: 15))
        app.tabBars.buttons["You"].tap()
        reveal(app.buttons["reset-data"])
        app.buttons["reset-data"].tap()
        XCTAssertTrue(app.buttons["Delete all data"].waitForExistence(timeout: 5))
        if app.buttons["Cancel"].exists { app.buttons["Cancel"].tap() }
        else {
            let dismissRegion = app.otherElements["PopoverDismissRegion"]
            XCTAssertTrue(dismissRegion.exists)
            dismissRegion.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.2)).tap()
        }
        XCTAssertFalse(app.buttons["Delete all data"].exists)
        XCTAssertTrue(app.tabBars.buttons["You"].exists)
        app.buttons["reset-data"].tap()
        app.buttons["Delete all data"].tap()
        XCTAssertTrue(app.buttons["onboarding-continue"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.tabBars.buttons["Today"].exists)
    }

    func testNativePhotoPickerOpensAndCanCancel() {
        app.launchArguments = ["--demo-data"]
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["Food"].waitForExistence(timeout: 15))
        app.tabBars.buttons["Food"].tap()
        app.buttons["Log food"].tap()
        XCTAssertTrue(app.buttons["food-photo-library"].waitForExistence(timeout: 5))
        app.buttons["food-photo-library"].tap()
        let cancelPicker = app.buttons.matching(NSPredicate(format: "identifier == %@", "Cancel")).firstMatch
        XCTAssertTrue(cancelPicker.waitForExistence(timeout: 5))
        capture("17-food-photo-picker")
        // Photos runs in a remote view service. XCTest can read its elements
        // but may report no hit point; use the observed element's center.
        cancelPicker.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        XCTAssertTrue(app.buttons["food-photo-library"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.textFields["food-description"].exists)
        XCTAssertTrue(app.textFields["food-description"].isHittable)
    }

    func testPublicPhotoCanBeCroppedAndIsAnalyzedAutomatically() throws {
        // Opt-in only: import the documented public salad fixture into a test
        // simulator, then pass its observed Photos label prefix explicitly.
        // Never pick an arbitrary item from someone's library in a default run.
        guard ProcessInfo.processInfo.environment["SLIMSY_LIVE_PHOTO_UI_TEST"] == "1" else {
            throw XCTSkip("Requires the public fixture in a test simulator and explicit live-photo opt-in.")
        }
        let prefix = try XCTUnwrap(ProcessInfo.processInfo.environment["SLIMSY_PHOTO_FIXTURE_LABEL"]?.nilIfEmpty)
        app.launchArguments = ["--demo-data"]
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["Food"].waitForExistence(timeout: 15))
        app.tabBars.buttons["Food"].tap()
        app.buttons["Log food"].tap()
        XCTAssertTrue(app.buttons["food-photo-library"].waitForExistence(timeout: 5))
        app.buttons["food-photo-library"].tap()
        let matchingPhoto = app.images.matching(NSPredicate(format: "label BEGINSWITH %@", prefix))
        XCTAssertTrue(matchingPhoto.firstMatch.waitForExistence(timeout: 8))
        XCTAssertEqual(matchingPhoto.count, 1, "Only the explicitly selected public fixture may be used")
        matchingPhoto.firstMatch.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        XCTAssertTrue(app.buttons["Choose"].waitForExistence(timeout: 8))
        capture("18-food-photo-crop")
        app.buttons["Choose"].coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        let save = app.buttons["save-entry"]
        let ready = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == true AND enabled == true"), object: save)
        XCTAssertEqual(XCTWaiter.wait(for: [ready], timeout: 40), .completed)
        let description = app.textFields["food-description"]
        XCTAssertNotEqual(description.value as? String, description.placeholderValue)
        capture("19-food-photo-estimate")
        save.tap()
        XCTAssertTrue(app.staticTexts["calories-remaining"].waitForExistence(timeout: 8))
        XCTAssertNotEqual(app.staticTexts["calories-remaining"].label, "470")
    }

    private func selectOnboarding(_ identifier: String) {
        let button = app.buttons["onboarding-\(identifier)"]
        reveal(button)
        XCTAssertTrue(button.waitForExistence(timeout: 5), identifier)
        button.tap()
    }
    private func advanceOnboarding(to step: Int) {
        dismissKeyboard()
        app.buttons["onboarding-continue"].tap()
        assertOnboardingStep(step)
    }
    private func assertOnboardingStep(_ step: Int) {
        let label = app.staticTexts["onboarding-step"]
        let expected = String(format: "%02d / 27", step)
        let reached = XCTNSPredicateExpectation(predicate: NSPredicate(format: "label == %@", expected), object: label)
        XCTAssertEqual(XCTWaiter.wait(for: [reached], timeout: 8), .completed, "Expected onboarding step \(step)")
    }

    private func choosePicker(_ identifier: String, option: String) {
        let picker = app.buttons[identifier]
        reveal(picker)
        XCTAssertTrue(picker.waitForExistence(timeout: 5), identifier)
        picker.tap()
        let choice = app.buttons[option]
        XCTAssertTrue(choice.waitForExistence(timeout: 5), option)
        choice.tap()
    }
    private func enter(_ text: String, into identifier: String) {
        // The keyboard and pinned Save button can cover the next input even
        // while XCTest reports its underlying accessibility node as hittable.
        dismissKeyboard()
        let field = app.textFields[identifier]
        reveal(field)
        XCTAssertTrue(field.waitForExistence(timeout: 5), identifier)
        field.tap()
        if let existing = field.value as? String, existing != field.placeholderValue, !existing.isEmpty {
            // A centered tap in a right-aligned weight input puts the caret
            // before its value. Move to the trailing edge before replacing it.
            field.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: 0.5)).tap()
            field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: existing.count))
        }
        field.typeText(text)
        XCTAssertEqual(field.value as? String, text, "The complete field value should be replaced")
    }
    private func dismissKeyboard() {
        let done = app.toolbars.buttons["Done"]
        if done.exists { done.tap() }
    }
    private func reveal(_ element: XCUIElement) {
        for _ in 0..<8 {
            if element.exists && element.isHittable {
                let footer = app.buttons["save-entry"].exists ? app.buttons["save-entry"] : app.buttons["onboarding-continue"]
                if !footer.exists || element.frame.maxY < footer.frame.minY || element == footer { return }
            }
            app.swipeUp()
        }
    }
    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}

private extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
