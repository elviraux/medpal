import SwiftUI
import WidgetKit

@main
struct SlimsyWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: WidgetSnapshot.kind, provider: MedicationProvider()) { entry in
            MedicationWidgetView(entry: entry)
        }
        .configurationDisplayName("Medication cycle")
        .description("Your estimated GLP-1 level and next dose.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct MedicationEntry: TimelineEntry {
    var date: Date
    /// Nil while the snapshot can't be read, e.g. before the first unlock after a restart.
    var data: AppData?
}

struct MedicationProvider: TimelineProvider {
    func placeholder(in context: Context) -> MedicationEntry { MedicationEntry(date: .now, data: nil) }

    func getSnapshot(in context: Context, completion: @escaping (MedicationEntry) -> Void) {
        completion(MedicationEntry(date: .now, data: context.isPreview ? .widgetSample : try? WidgetSnapshot.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MedicationEntry>) -> Void) {
        let now = Date.now
        guard let data = try? WidgetSnapshot.load() else {
            completion(Timeline(entries: [MedicationEntry(date: now, data: nil)], policy: .after(now.addingTimeInterval(15 * 60))))
            return
        }
        var dates = (0..<24).map { now.addingTimeInterval(Double($0) * 3600) }
        // Switch exactly when a dose becomes due or a future-dated dose takes effect.
        let changes = data.medicationLogs.compactMap(\.timestamp) + [data.nextDose(at: now)].compactMap { $0 }
        dates += changes.filter { $0 > now && $0 < dates.last! }
        completion(Timeline(entries: dates.sorted().map { MedicationEntry(date: $0, data: data) }, policy: .atEnd))
    }
}

struct MedicationWidgetView: View {
    @Environment(\.widgetFamily) private var family
    var entry: MedicationEntry

    var body: some View {
        let data = entry.data ?? .widgetSample
        let profile = data.userProfile
        let result = Pharmacokinetics.compute(logs: data.medicationLogs, profile: profile, now: entry.date)
        HStack(spacing: 18) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 5) {
                    Image(systemName: "waveform.path.ecg").font(.system(size: 10))
                    Text("ESTIMATED LEVEL").font(TypeStyle.body(8, weight: .semibold)).tracking(1.4)
                }
                .foregroundStyle(Palette.champagne)
                Spacer(minLength: 6)
                if result.curve.isEmpty {
                    Text("Clarity, one dose\nat a time.").font(TypeStyle.display(18)).foregroundStyle(.white)
                    Text("Log your first dose in Slimsy.").font(TypeStyle.body(10)).foregroundStyle(.white.opacity(0.6)).padding(.top, 6)
                } else {
                    HStack(alignment: .lastTextBaseline, spacing: 3) {
                        Text("\(result.currentLevel)").font(TypeStyle.metric(46)).monospacedDigit().foregroundStyle(.white)
                        Text("%").font(TypeStyle.display(20)).foregroundStyle(Palette.champagne)
                    }
                    Text([profile.medicationLabel, profile.dose].compactMap { $0 }.joined(separator: " · "))
                        .font(TypeStyle.body(11)).foregroundStyle(.white.opacity(0.65)).lineLimit(1)
                    Spacer(minLength: 6)
                    if let next = data.nextDose(at: entry.date) {
                        Text("NEXT DOSE").font(TypeStyle.body(8, weight: .semibold)).tracking(1.4).foregroundStyle(.white.opacity(0.5))
                        Text(next <= entry.date ? "Dose due" : next.formatted(.dateTime.weekday(.abbreviated).hour().minute()))
                            .font(TypeStyle.body(12, weight: .medium)).foregroundStyle(next <= entry.date ? Palette.champagne : .white).padding(.top, 3)
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .accessibilityElement(children: .combine)
            if family == .systemMedium && !result.curve.isEmpty {
                LevelChart(result: result).padding(.top, 14)
            }
        }
        .privacySensitive()
        .redacted(reason: entry.data == nil ? .placeholder : [])
        .containerBackground(for: .widget) { LevelBackground() }
    }
}

private extension AppData {
    static var widgetSample: AppData {
        var data = AppData()
        data.userProfile.medication = .wegovy
        data.userProfile.deliveryType = .injection
        data.userProfile.dose = "1 mg"
        data.userProfile.frequency = .weekly
        data.medicationLogs = [3, 10].map { days in
            MedicationLog(date: DayKey.string(Date.now.addingTimeInterval(-Double(days) * 86_400)), time: "09:00", dose: "1 mg", deliveryType: .injection)
        }
        return data
    }
}
