import SwiftUI

struct LogSideEffectView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var effect: SideEffect?
    @State private var severity = 3
    @State private var date = Date.now
    @State private var notes = ""

    var body: some View {
        FormShell(title: "How you feel", saveTitle: "Save side effect", canSave: effect != nil, onSave: save) {
            VStack(alignment: .leading, spacing: 9) {
                Eyebrow(text: "Listen to your body")
                Text("How are you feeling?").font(TypeStyle.display(30)).foregroundStyle(Palette.ink)
                Text("Keep track of what you notice, so you can share it with your care team.").font(TypeStyle.body(13)).foregroundStyle(Palette.secondary)
            }
            LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 10) {
                ForEach(SideEffect.allCases) { item in
                    ChoiceChip(title: item.title, selected: effect == item, symbol: item.symbol) { effect = item }
                }
            }
            AppCard { SeverityPicker(value: $severity) }
            AppCard { DatePicker("When did you notice it?", selection: $date, in: ...Date.now, displayedComponents: .date).font(TypeStyle.body(13)) }
            NotesEntry(text: $notes, title: "What did you notice?")
            Text("For severe or worrying symptoms, contact your healthcare provider.").font(TypeStyle.body(11)).foregroundStyle(Palette.secondary)
        }
    }
    private func save() {
        guard let effect else { return }
        if store.addSideEffect(SideEffectLog(date: DayKey.string(date), effectType: effect, severity: severity, notes: notes.nonempty)) { Feedback.saved(); dismiss() }
    }
}

struct SeverityPicker: View {
    @Binding var value: Int
    private let labels = ["Very mild", "Mild", "Moderate", "Strong", "Severe"]
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack {
                Text("How noticeable is it?").font(TypeStyle.body(13, weight: .semibold)).foregroundStyle(Palette.ink)
                Spacer()
                Text(labels[max(0, min(4, value - 1))]).font(TypeStyle.body(11)).foregroundStyle(Palette.peach)
            }
            HStack(spacing: 9) {
                ForEach(1...5, id: \.self) { severity in
                    Button { value = severity; Feedback.light() } label: {
                        Text("\(severity)").font(TypeStyle.body(17, weight: .medium))
                            .foregroundStyle(value == severity ? Palette.surface : Palette.secondary)
                            .frame(maxWidth: .infinity).frame(height: 48)
                            .background(value == severity ? Palette.peach : Palette.palePeach, in: RoundedRectangle(cornerRadius: 14))
                    }.buttonStyle(PressFeedback()).accessibilityLabel("\(severity) of 5, \(labels[severity - 1])").accessibilityAddTraits(value == severity ? .isSelected : [])
                }
            }
            HStack { Text("Barely there"); Spacer(); Text("Very noticeable") }.font(TypeStyle.body(10)).foregroundStyle(Palette.secondary)
        }
    }
}
