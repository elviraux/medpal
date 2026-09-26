import SwiftUI

struct LogDoseView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var dose = ""
    @State private var date = Date.now
    @State private var site: InjectionSite?
    @State private var notes = ""
    @State private var showsSymptoms = false
    @State private var symptoms: Set<SideEffect> = []
    @State private var severities: [SideEffect: Int] = [:]
    @State private var symptomNotes: [SideEffect: String] = [:]
    @State private var initialized = false

    var body: some View {
        FormShell(title: "Log your dose", saveTitle: "Save dose", canSave: dose.nonempty != nil, onSave: save) {
            HStack(spacing: 15) {
                IconBadge(symbol: store.profile.isInjection ? "syringe" : "pills", size: 54)
                VStack(alignment: .leading, spacing: 6) {
                    Eyebrow(text: "Keep your rhythm")
                    Text(store.profile.medicationLabel).font(TypeStyle.display(29)).foregroundStyle(Palette.ink)
                    Text(store.profile.frequencyLabel).font(TypeStyle.body(12)).foregroundStyle(Palette.secondary)
                }
            }
            TextEntry(title: "Dose as prescribed", placeholder: "e.g. 1 mg", text: $dose, identifier: "dose-value")
            DoseChoices(value: $dose, options: store.profile.deliveryType == .pill ? ["1.5mg", "4mg", "9mg", "25mg"] : ["0.25mg", "0.5mg", "1mg", "2mg", "2.5mg"])
            AppCard { DatePicker("Date & time", selection: $date, in: ...Date.now).font(TypeStyle.body(13)) }
            if store.profile.isInjection {
                VStack(alignment: .leading, spacing: 10) {
                    FieldLabel(title: "Injection site · optional")
                    AppCard { InjectionSitePicker(selection: $site, suggested: store.suggestedSite) }
                }
            }
            NotesEntry(text: $notes)
            AppCard {
                DisclosureGroup(isExpanded: $showsSymptoms) {
                    VStack(alignment: .leading, spacing: 20) {
                        LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 8) {
                            ForEach(SideEffect.allCases) { effect in
                                ChoiceChip(title: effect.title, selected: symptoms.contains(effect)) {
                                    if symptoms.contains(effect) { symptoms.remove(effect) } else { symptoms.insert(effect) }
                                }
                            }
                        }
                        ForEach(SideEffect.allCases.filter { symptoms.contains($0) }) { effect in
                            VStack(alignment: .leading, spacing: 15) {
                                Label(effect.title, systemImage: effect.symbol).font(TypeStyle.body(14, weight: .semibold)).foregroundStyle(Palette.ink)
                                SeverityPicker(value: Binding(get: { severities[effect] ?? 3 }, set: { severities[effect] = $0 }))
                                NotesEntry(text: Binding(get: { symptomNotes[effect] ?? "" }, set: { symptomNotes[effect] = $0 }), title: "\(effect.title) notes")
                            }
                        }
                    }.padding(.top, 16)
                } label: {
                    Label("Any side effects?", systemImage: "heart.text.clipboard").font(TypeStyle.body(13, weight: .semibold)).foregroundStyle(Palette.ink)
                }
            }
        }
        .onAppear {
            guard !initialized else { return }; initialized = true
            dose = store.profile.dose ?? ""
        }
    }
    private func save() {
        guard let amount = dose.nonempty else { return }
        let day = DayKey.string(date)
        let log = MedicationLog(date: day, time: DayKey.time(date), dose: amount, deliveryType: store.profile.deliveryType ?? .injection, injectionSite: store.profile.isInjection ? site : nil, notes: notes.nonempty)
        let effects = SideEffect.allCases.filter { symptoms.contains($0) }.map {
            SideEffectLog(date: day, effectType: $0, severity: severities[$0] ?? 3, notes: symptomNotes[$0]?.nonempty)
        }
        if store.addDose(log, symptoms: effects) { Feedback.saved(); dismiss() }
    }
}
