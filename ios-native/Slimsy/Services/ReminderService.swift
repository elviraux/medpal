import Foundation
import UserNotifications

@MainActor
final class ReminderService {
    static let shared = ReminderService()
    private var task: Task<Void, Never>?
    private var generation = 0

    func requestPermission() async -> Bool {
        (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])) ?? false
    }

    func refresh(data: AppData) {
        let previousTask = task
        task?.cancel()
        generation += 1
        let token = generation
        task = Task {
            // Finish an in-flight add before removing old requests, so rapid
            // preference edits cannot leave a stale reminder behind.
            await previousTask?.value
            guard !Task.isCancelled, token == generation else { return }
            let center = UNUserNotificationCenter.current()
            let settings = await center.notificationSettings()
            guard !Task.isCancelled, token == generation else { return }
            let pending = await center.pendingNotificationRequests()
            guard !Task.isCancelled, token == generation else { return }
            center.removePendingNotificationRequests(withIdentifiers: pending.filter { $0.identifier.hasPrefix("slimsy.") }.map(\.identifier))
            guard data.preferences.notifications, settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }

            var requests: [UNNotificationRequest] = []
            let now = Date.now
            let knownSchedule = data.userProfile.frequency != nil && data.userProfile.frequency != .notSure &&
                (data.userProfile.frequency != .custom || data.userProfile.customFrequencyDays != nil)
            if data.preferences.doseReminders, knownSchedule, let last = data.medicationLogs.compactMap(\.timestamp).filter({ $0 <= now }).max() {
                let interval = data.userProfile.intervalDays
                // Stop after a bounded number of requests; daily dosing + water stays below iOS's limit.
                for cycle in 1...32 {
                    guard let date = Calendar.current.date(byAdding: .day, value: interval * cycle, to: last), date > now else { continue }
                    let content = UNMutableNotificationContent()
                    content.title = "Your medication check-in"
                    content.body = "Your \(data.userProfile.medicationLabel) dose is on your schedule today. Follow your prescribed plan and record it in Slimsy."
                    content.sound = .default
                    content.userInfo = ["destination": "medication"]
                    let components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
                    requests.append(UNNotificationRequest(identifier: "slimsy.dose.\(cycle)", content: content, trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: false)))
                }
            }
            if data.preferences.waterReminders {
                for hour in [10, 14, 18] {
                    let content = UNMutableNotificationContent()
                    content.title = "A little hydration break"
                    content.body = "A sip, a pause, a moment for you. Remember to log your water."
                    content.sound = .default
                    content.userInfo = ["destination": "food"]
                    requests.append(UNNotificationRequest(identifier: "slimsy.water.\(hour)", content: content, trigger: UNCalendarNotificationTrigger(dateMatching: DateComponents(hour: hour, minute: 0), repeats: true)))
                }
            }
            for request in requests {
                guard !Task.isCancelled, token == generation else { return }
                try? await center.add(request)
            }
        }
    }
}
