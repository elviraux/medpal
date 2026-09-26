import SwiftUI
import UniformTypeIdentifiers
import UserNotifications
import StoreKit

struct SettingsView: View {
    @Environment(AppStore.self) private var store
    @Environment(AppRouter.self) private var router
    @Environment(PurchaseStore.self) private var purchases
    @Environment(\.openURL) private var openURL
    @Environment(\.requestReview) private var requestReview
    @State private var shareURL: URL?
    @State private var showingShare = false
    @State private var showingImporter = false
    @State private var pendingImport: ExportService.Backup?
    @State private var confirmingImport = false
    @State private var confirmingReset = false
    @State private var message: String?
    @State private var notificationDenied = false
    @State private var notificationRequestInFlight = false

    var body: some View {
        Screen {
            ScreenHeader(eyebrow: "Made for your journey", title: "A little more you.")
            profileCard
            if store.isDemo {
                Tag(text: "Previewing sample data", symbol: "eye", color: Palette.peach)
            }
            VStack(spacing: 14) {
                SectionTitle(title: "Your plan")
                AppCard(padding: 7) {
                    VStack(spacing: 0) {
                        settingLink("Medication", detail: "\(store.profile.medicationLabel) · \(store.profile.dose ?? "")", symbol: "pills", color: Palette.green) { router.sheet = .medication }
                        Divider().padding(.leading, 58)
                        settingLink("Daily targets", detail: "Food, nutrition & hydration", symbol: "target", color: Palette.peach) { router.sheet = .targets }
                        Divider().padding(.leading, 58)
                        settingLink("Weight goals", detail: store.profile.goalWeight.map { "Goal: \(store.units.weight($0)) \(store.units.weightLabel)" } ?? "Set your own pace", symbol: "flag", color: Palette.blue) { router.sheet = .goals }
                        if purchases.isConfigured {
                            Divider().padding(.leading, 58)
                            settingLink("Slimsy Pro", detail: purchases.hasPro ? "Your membership is active" : "Explore plans & restore purchases", symbol: "sparkles", color: Palette.green) { router.sheet = .pro }
                        }
                    }
                }
            }
            preferencesCard
            dataCard
            AppCard(padding: 7) {
                VStack(spacing: 0) {
                    settingLink("Rate Slimsy", symbol: "star", color: Palette.peach) { requestReview() }
                    Divider().padding(.leading, 58)
                    settingLink("Privacy policy", symbol: "hand.raised", color: Palette.secondary) { openURL(URL(string: "https://slimsy.lovable.app/privacy")!) }
                    Divider().padding(.leading, 58)
                    settingLink("Terms of service", symbol: "doc.text", color: Palette.secondary) { openURL(URL(string: "https://slimsy.lovable.app/terms")!) }
                }
            }
            Button("Reset all data", role: .destructive) { confirmingReset = true }
                .font(TypeStyle.body(12, weight: .medium)).foregroundStyle(Palette.red).frame(maxWidth: .infinity).frame(minHeight: 44)
                .accessibilityIdentifier("reset-data")
            VStack(spacing: 8) {
                HStack(spacing: 4) { SlimsyMark(size: 24); Text("slimsy").font(TypeStyle.display(25)).foregroundStyle(Palette.green) }
                Text("A little better, every day.").font(TypeStyle.body(11)).foregroundStyle(Palette.secondary)
                Text("Version \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0") · Made for iPhone")
                    .font(TypeStyle.body(9)).foregroundStyle(Palette.secondary.opacity(0.7))
            }.frame(maxWidth: .infinity).padding(.bottom, 12)
            if let error = store.errorMessage { ErrorBanner(message: error) }
        }
        .task { await refreshNotificationStatus() }
        .sheet(isPresented: $showingShare) { if let shareURL { ShareSheet(items: [shareURL]) } }
        .fileImporter(isPresented: $showingImporter, allowedContentTypes: [.json]) { result in
            do {
                let url = try result.get()
                let access = url.startAccessingSecurityScopedResource()
                defer { if access { url.stopAccessingSecurityScopedResource() } }
                guard (try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0) <= 100_000_000 else { throw DataError.invalidBackup }
                pendingImport = try ExportService.decodeBackup(Data(contentsOf: url))
                confirmingImport = true
            } catch { message = error.localizedDescription }
        }
        .confirmationDialog("Replace your data with this backup?", isPresented: $confirmingImport, titleVisibility: .visible) {
            Button("Restore backup", role: .destructive, action: restoreBackup)
            Button("Cancel", role: .cancel) { pendingImport = nil }
        } message: {
            if let backup = pendingImport { Text("This backup contains \(backup.state.weightLogs.count) weight entries, \(backup.state.foodLogs.count) meals, and \(backup.state.medicationLogs.count) doses. Your current records will be replaced.") }
        }
        .confirmationDialog("Reset Slimsy?", isPresented: $confirmingReset, titleVisibility: .visible) {
            Button("Delete all data", role: .destructive) {
                if store.reset() { router.tab = .today; Feedback.light() }
            }
            Button("Cancel", role: .cancel) {}
        } message: { Text("This permanently removes your profile, photos, logs, and preferences from this device and restarts onboarding. Export a backup first if you want to keep them.") }
        .alert("Slimsy", isPresented: Binding(get: { message != nil }, set: { if !$0 { message = nil } })) { Button("OK", role: .cancel) { message = nil } } message: { Text(message ?? "") }
    }

    private var profileCard: some View {
        Button { router.sheet = .profile } label: {
            HStack(spacing: 17) {
                ZStack {
                    Circle().fill(Palette.paleGreen).frame(width: 66, height: 66)
                    if let initial = store.profile.name?.first { Text(String(initial).uppercased()).font(TypeStyle.display(32)).foregroundStyle(Palette.green) }
                    else { SlimsyMark(size: 37) }
                }
                VStack(alignment: .leading, spacing: 7) {
                    Text(store.profile.name?.nonempty ?? "Your Slimsy profile").font(TypeStyle.display(25)).foregroundStyle(Palette.ink)
                    Text(store.profile.startDate.flatMap { DayKey.date($0) }.map { "Growing since \($0.formatted(.dateTime.month(.wide).year()))" } ?? "Your journey, your own pace")
                        .font(TypeStyle.body(11)).foregroundStyle(Palette.secondary)
                }
                Spacer(minLength: 0)
                Image(systemName: "pencil").font(.system(size: 13)).foregroundStyle(Palette.green)
            }.padding(20).frame(maxWidth: .infinity).background(Palette.surface, in: RoundedRectangle(cornerRadius: 24))
        }.buttonStyle(PressFeedback()).accessibilityLabel("Edit your profile")
    }

    private var preferencesCard: some View {
        VStack(spacing: 14) {
            SectionTitle(title: "Make it yours")
            AppCard {
                VStack(alignment: .leading, spacing: 21) {
                    VStack(alignment: .leading, spacing: 11) {
                        Label("Your units", systemImage: "ruler").font(TypeStyle.body(13, weight: .medium)).foregroundStyle(Palette.ink)
                        Picker("Units", selection: Binding(get: { store.units }, set: { store.setUnits($0) })) {
                            Text("Imperial · lbs, ft").tag(UnitSystem.imperial)
                            Text("Metric · kg, cm").tag(UnitSystem.metric)
                        }.pickerStyle(.segmented).accessibilityIdentifier("units-picker")
                    }
                    Divider().overlay(Palette.line)
                    reminderToggle(title: "Dose reminders", subtitle: "A nudge when it's time", symbol: "bell", value: store.data.preferences.doseReminders, isWater: false)
                    reminderToggle(title: "Water reminders", subtitle: "A pause at 10am, 2pm & 6pm", symbol: "drop", value: store.data.preferences.waterReminders, isWater: true)
                    if notificationDenied {
                        Button { openURL(URL(string: UIApplication.openSettingsURLString)!) } label: {
                            Label("Allow notifications in iPhone Settings", systemImage: "arrow.up.right.square")
                                .font(TypeStyle.body(11)).foregroundStyle(Palette.peach)
                        }.frame(minHeight: 40)
                    }
                }
            }
        }
    }
    private func reminderToggle(title: String, subtitle: String, symbol: String, value: Bool, isWater: Bool) -> some View {
        Toggle(isOn: Binding(get: { value }, set: { enabled in changeReminder(enabled, isWater: isWater) })) {
            HStack(spacing: 11) {
                Image(systemName: symbol).font(.system(size: 17)).foregroundStyle(Palette.green).frame(width: 24)
                VStack(alignment: .leading, spacing: 4) {
                    Text(title).font(TypeStyle.body(13, weight: .medium)).foregroundStyle(Palette.ink)
                    Text(subtitle).font(TypeStyle.body(10)).foregroundStyle(Palette.secondary)
                }
            }
        }.tint(Palette.green).disabled(notificationRequestInFlight)
    }
    private func changeReminder(_ enabled: Bool, isWater: Bool) {
        if !store.allowsNotifications {
            store.update { if isWater { $0.preferences.waterReminders = enabled } else { $0.preferences.doseReminders = enabled } }
            return
        }
        if !enabled {
            store.update { if isWater { $0.preferences.waterReminders = false } else { $0.preferences.doseReminders = false } }
            return
        }
        notificationRequestInFlight = true
        Task {
            let granted = await ReminderService.shared.requestPermission()
            notificationDenied = !granted
            store.update {
                $0.preferences.notifications = granted
                if isWater { $0.preferences.waterReminders = granted } else { $0.preferences.doseReminders = granted }
            }
            notificationRequestInFlight = false
        }
    }
    private func refreshNotificationStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        notificationDenied = settings.authorizationStatus == .denied
    }

    private var dataCard: some View {
        VStack(spacing: 14) {
            SectionTitle(title: "Your data, in your hands")
            AppCard(padding: 7) {
                VStack(spacing: 0) {
                    settingLink("Export your journal", detail: "A CSV to keep or share with your care team", symbol: "square.and.arrow.up", color: Palette.green) {
                        do { shareURL = try ExportService.csvFile(store.data); showingShare = true } catch { message = error.localizedDescription }
                    }
                    Divider().padding(.leading, 58)
                    settingLink("Save a backup", detail: "All your records, preferences & meal photos", symbol: "arrow.down.document", color: Palette.blue) {
                        do { shareURL = try ExportService.backupFile(store.data); showingShare = true } catch { message = error.localizedDescription }
                    }
                    Divider().padding(.leading, 58)
                    settingLink("Restore a backup", detail: "Bring an existing Slimsy journey with you", symbol: "arrow.clockwise", color: Palette.peach) { showingImporter = true }
                }
            }
            Text("Your journal is saved on this iPhone. Meal photos are shared with the analysis service only when you ask for an estimate.")
                .font(TypeStyle.body(10)).foregroundStyle(Palette.secondary).padding(.horizontal, 5)
        }
    }
    private func settingLink(_ title: String, detail: String? = nil, symbol: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                IconBadge(symbol: symbol, color: color, size: 37)
                VStack(alignment: .leading, spacing: 5) {
                    Text(title).font(TypeStyle.body(13, weight: .medium)).foregroundStyle(Palette.ink)
                    if let detail { Text(detail).font(TypeStyle.body(10)).foregroundStyle(Palette.secondary).multilineTextAlignment(.leading) }
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right").font(.system(size: 10, weight: .semibold)).foregroundStyle(Palette.secondary.opacity(0.6))
            }.padding(13).frame(minHeight: 65)
        }.buttonStyle(PressFeedback()).accessibilityIdentifier("settings-\(title.lowercased().replacingOccurrences(of: " ", with: "-"))")
    }
    private func restoreBackup() {
        guard var backup = pendingImport else { return }
        var written: [String] = []
        do {
            var mapping: [String: String] = [:]
            for (name, bytes) in backup.photos {
                let newName = try PhotoStorage.save(bytes)
                mapping[name] = newName
                written.append(newName)
            }
            for index in backup.state.foodLogs.indices {
                if let old = backup.state.foodLogs[index].photoUri { backup.state.foodLogs[index].photoUri = mapping[old] }
            }
            let previousPhotos = store.data.foodLogs.compactMap(\.photoUri)
            if store.update({ $0 = backup.state }) {
                previousPhotos.forEach(PhotoStorage.remove)
                Feedback.saved()
                message = "Your Slimsy backup has been restored."
            } else { written.forEach(PhotoStorage.remove) }
        } catch { written.forEach(PhotoStorage.remove); message = error.localizedDescription }
        pendingImport = nil
    }
}
