import SwiftUI

struct LogWeightView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var weight = ""
    @State private var date = Date.now
    @State private var notes = ""
    @State private var initialized = false
    private var valid: Bool { weight.decimalValue.map { $0 > 0 && $0.isFinite } ?? false }

    var body: some View {
        FormShell(title: "Weight check-in", saveTitle: "Save check-in", canSave: valid, onSave: save) {
            VStack(alignment: .leading, spacing: 9) {
                Eyebrow(text: "A moment for yourself")
                Text("How's your journey?").font(TypeStyle.display(30)).foregroundStyle(Palette.ink)
                Text("One number, one day. Every check-in counts.").font(TypeStyle.body(13)).foregroundStyle(Palette.secondary)
            }
            AppCard {
                VStack(spacing: 18) {
                    IconBadge(symbol: "scalemass", size: 52)
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        TextField("0.0", text: $weight).font(TypeStyle.metric(58)).keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing).foregroundStyle(Palette.ink).fixedSize(horizontal: false, vertical: true)
                            .accessibilityLabel("Weight").accessibilityIdentifier("weight-value")
                        Text(store.units.weightLabel).font(TypeStyle.body(20)).foregroundStyle(Palette.secondary)
                        Spacer(minLength: 20)
                    }.padding(.vertical, 9)
                    Text("Your weight today").font(TypeStyle.body(12)).foregroundStyle(Palette.secondary)
                }.padding(.vertical, 10)
            }
            AppCard {
                DatePicker("Check-in date", selection: $date, in: ...Date.now, displayedComponents: .date)
                    .font(TypeStyle.body(14)).tint(Palette.green)
            }
            NotesEntry(text: $notes)
        }
        .onAppear {
            guard !initialized else { return }; initialized = true
            if let current = store.currentWeight { weight = String(format: "%.1f", store.units.displayWeight(current)) }
        }
    }
    private func save() {
        guard let value = weight.decimalValue, valid else { return }
        if store.addWeight(WeightLog(date: DayKey.string(date), weight: store.units.pounds(value), notes: notes.nonempty)) {
            Feedback.saved(); dismiss()
        }
    }
}
