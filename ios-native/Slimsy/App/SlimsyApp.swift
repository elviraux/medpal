import SwiftUI
import Observation
import UserNotifications

enum AppTab: String, Hashable { case today, food, medication, weight, settings }

enum AppSheet: Identifiable {
    case food(FoodLog? = nil, MealType? = nil), weight, dose, sideEffect, medication, targets, goals, profile, pro
    var id: String {
        switch self {
        case .food(let log, let meal): "food-\(log?.id ?? meal?.rawValue ?? "new")"
        case .weight: "weight"
        case .dose: "dose"
        case .sideEffect: "sideEffect"
        case .medication: "medication"
        case .targets: "targets"
        case .goals: "goals"
        case .profile: "profile"
        case .pro: "pro"
        }
    }
}

@MainActor @Observable final class AppRouter {
    var tab: AppTab = .today
    var sheet: AppSheet?
}

@main
struct SlimsyApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @State private var store: AppStore
    @State private var router = AppRouter()
    @State private var purchases = PurchaseStore()
    @Environment(\.scenePhase) private var scenePhase

    init() {
        let initial: AppStore
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        if args.contains("--demo-data") {
            initial = AppStore(fileURL: nil, initialData: .demo(), isDemo: true, schedulesReminders: false)
        } else if args.contains("--ui-testing") || args.contains("--onboarding") {
            initial = AppStore(fileURL: nil, schedulesReminders: false)
        } else if args.contains("--ui-persistence") {
            let url = URL.applicationSupportDirectory.appending(path: "Slimsy-UITests/data.json")
            if args.contains("--reset-test-store") { try? FileManager.default.removeItem(at: url) }
            initial = AppStore(fileURL: url, initialData: .demo(), schedulesReminders: false)
        } else if ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil {
            initial = AppStore(fileURL: nil, schedulesReminders: false)
        } else { initial = AppStore() }
        #else
        initial = AppStore()
        #endif
        _store = State(initialValue: initial)
        UINavigationBar.appearance().titleTextAttributes = [.font: UIFontMetrics(forTextStyle: .headline).scaledFont(for: UIFont(name: "Fraunces-Regular", size: 19)!)]
        UISegmentedControl.appearance().setTitleTextAttributes([.font: UIFontMetrics(forTextStyle: .footnote).scaledFont(for: UIFont(name: "DMSans-9ptRegular_Medium", size: 12)!)], for: .normal)
        UISegmentedControl.appearance().selectedSegmentTintColor = UIColor(Palette.surface)
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .modifier(DebugAppearance())
                .environment(store).environment(router).environment(purchases)
                .font(TypeStyle.body()).foregroundStyle(Palette.ink).tint(Palette.plum)
                .task { await purchases.refreshEntitlements() }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active {
                        store.refreshCalendarDay()
                        if store.allowsNotifications { ReminderService.shared.refresh(data: store.data) }
                    }
                }
                .onReceive(Timer.publish(every: 60, on: .main, in: .common).autoconnect()) { date in store.refreshCalendarDay(now: date) }
                .onReceive(NotificationCenter.default.publisher(for: .slimsyDestination)) { notification in
                    if let destination = notification.object as? String, let tab = AppTab(rawValue: destination) {
                        store.selectedDate = .now
                        router.tab = tab
                    }
                }
        }
    }
}

private struct DebugAppearance: ViewModifier {
    @Environment(\.dynamicTypeSize) private var systemSize
    func body(content: Content) -> some View {
        #if DEBUG
        content
            .preferredColorScheme(ProcessInfo.processInfo.arguments.contains("--dark-mode") ? .dark : nil)
            .environment(\.dynamicTypeSize, ProcessInfo.processInfo.arguments.contains("--large-type") ? .accessibility2 : systemSize)
        #else
        content
        #endif
    }
}

struct RootView: View {
    @Environment(AppStore.self) private var store
    @Environment(AppRouter.self) private var router
    var body: some View {
        @Bindable var router = router
        Group {
            if store.profile.onboardingComplete == true {
                TabView(selection: $router.tab) {
                    NavigationStack { DashboardView() }.tabItem { Label("Today", systemImage: "square.grid.2x2") }.tag(AppTab.today)
                    NavigationStack { FoodView() }.tabItem { Label("Food", systemImage: "fork.knife") }.tag(AppTab.food)
                    NavigationStack { MedicationView() }.tabItem { Label("Medication", systemImage: "pills") }.tag(AppTab.medication)
                    NavigationStack { WeightView() }.tabItem { Label("Progress", systemImage: "chart.xyaxis.line") }.tag(AppTab.weight)
                    NavigationStack { SettingsView() }.tabItem { Label("You", systemImage: "person.crop.circle") }.tag(AppTab.settings)
                }
            } else { OnboardingView() }
        }
        .sheet(item: $router.sheet) { sheet in
            Group {
                switch sheet {
                case .food(let log, let meal): LogFoodView(existingLog: log, initialMeal: meal)
                case .weight: LogWeightView()
                case .dose: LogDoseView()
                case .sideEffect: LogSideEffectView()
                case .medication: EditMedicationView()
                case .targets: EditTargetsView()
                case .goals: EditGoalsView()
                case .profile: EditProfileView()
                case .pro: ProView()
                }
            }.modifier(DebugAppearance())
        }
    }
}

extension Notification.Name {
    static let slimsyDestination = Notification.Name("slimsyDestination")
}

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        if let destination = response.notification.request.content.userInfo["destination"] as? String {
            await MainActor.run { NotificationCenter.default.post(name: .slimsyDestination, object: destination) }
        }
    }
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions { [.banner, .sound] }
}
