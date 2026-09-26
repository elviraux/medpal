import SwiftUI

struct FoodView: View {
    @Environment(AppStore.self) private var store
    @Environment(AppRouter.self) private var router
    @State private var showsDatePicker = false
    @State private var pendingDelete: FoodLog?

    var body: some View {
        Screen {
            ScreenHeader(eyebrow: "Food & hydration", title: "Nourish your day.", actionLabel: "Log food", symbol: "plus") { router.sheet = .food() }
            dateSelector
            nutritionSummary
            WaterCard()
            VStack(spacing: 18) {
                SectionTitle(title: "On the menu", actionTitle: "+ Add meal") { router.sheet = .food() }
                ForEach(MealType.allCases) { meal in mealSection(meal) }
            }
        }
        .sheet(isPresented: $showsDatePicker) {
            NavigationStack {
                @Bindable var store = store
                DatePicker("Choose a day", selection: $store.selectedDate, in: ...Date.now, displayedComponents: .date)
                    .datePickerStyle(.graphical).padding(24).tint(Palette.green)
                    .navigationTitle("Your food journal").navigationBarTitleDisplayMode(.inline)
                    .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { showsDatePicker = false } } }
            }.presentationDetents([.medium, .large])
        }
        .confirmationDialog("Delete this meal?", isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } }), titleVisibility: .visible) {
            Button("Delete meal", role: .destructive) { if let log = pendingDelete { store.deleteFood(log.id) }; pendingDelete = nil }
            Button("Cancel", role: .cancel) { pendingDelete = nil }
        } message: { Text("This will remove the meal from your journal and daily totals.") }
    }

    private var dateSelector: some View {
        HStack {
            Button { shiftDay(-1) } label: { Image(systemName: "chevron.left").font(.system(size: 12, weight: .semibold)).frame(width: 44, height: 44) }.accessibilityLabel("Previous day")
            Spacer()
            Button { showsDatePicker = true } label: {
                HStack(spacing: 8) {
                    Image(systemName: "calendar").font(.system(size: 13))
                    Text(Calendar.current.isDateInToday(store.selectedDate) ? "Today, \(store.selectedDate.formatted(.dateTime.month(.abbreviated).day()))" : store.selectedDate.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day()))
                        .font(TypeStyle.body(12, weight: .medium))
                }.frame(minHeight: 44)
            }.accessibilityLabel("Choose food journal date")
            Spacer()
            Button { shiftDay(1) } label: { Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).frame(width: 44, height: 44) }
                .disabled(Calendar.current.isDateInToday(store.selectedDate)).opacity(Calendar.current.isDateInToday(store.selectedDate) ? 0.35 : 1).accessibilityLabel("Next day")
        }.foregroundStyle(Palette.green).background(Palette.paleGreen.opacity(0.6), in: Capsule())
    }
    private func shiftDay(_ amount: Int) {
        if let next = Calendar.current.date(byAdding: .day, value: amount, to: store.selectedDate) { store.selectedDate = min(next, .now) }
    }
    private var nutritionSummary: some View {
        let totals = store.nutrition(on: store.selectedDay)
        return AppCard {
            VStack(alignment: .leading, spacing: 25) {
                HStack(spacing: 24) {
                    ZStack {
                        MetricRing(progress: totals.calories / store.targets.calories, color: Palette.peach, size: 119, lineWidth: 9)
                        VStack(spacing: 3) {
                            Text(max(0, store.targets.calories - totals.calories).formatted(.number.precision(.fractionLength(0))))
                                .font(TypeStyle.metric(30)).foregroundStyle(Palette.ink).monospacedDigit().accessibilityIdentifier("calories-remaining")
                            Text("kcal remaining").font(TypeStyle.body(9)).foregroundStyle(Palette.secondary)
                        }
                    }
                    VStack(alignment: .leading, spacing: 13) {
                        Eyebrow(text: "A little balance")
                        Text("Fuel for\nfeeling good.").font(TypeStyle.display(24)).foregroundStyle(Palette.ink)
                        Text("\(Int(totals.calories)) of \(Int(store.targets.calories)) kcal").font(TypeStyle.body(11)).foregroundStyle(Palette.secondary)
                    }
                    Spacer(minLength: 0)
                }
                HStack(spacing: 24) {
                    macro(title: "Protein", value: totals.protein, target: store.targets.protein, color: Palette.green)
                    macro(title: "Fiber", value: totals.fiber, target: store.targets.fiber, color: Palette.blue)
                }
            }.padding(.vertical, 4)
        }
    }
    private func macro(title: String, value: Double, target: Double, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack {
                Text(title).font(TypeStyle.body(12, weight: .medium)).foregroundStyle(Palette.ink)
                Spacer()
                Text("\(Int(value))/\(Int(target))g").font(TypeStyle.body(10)).foregroundStyle(Palette.secondary)
            }
            ProgressTrack(progress: value / target, color: color)
        }.accessibilityElement(children: .combine)
    }
    private func mealSection(_ type: MealType) -> some View {
        let logs = store.food(on: store.selectedDay).filter { $0.mealType == type }
        return VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: type.symbol).font(.system(size: 13)).foregroundStyle(Palette.peach)
                Text(type.title).font(TypeStyle.body(13, weight: .semibold)).foregroundStyle(Palette.ink)
                Spacer()
                if !logs.isEmpty { Text("\(Int(logs.reduce(0) { $0 + $1.calories })) kcal").font(TypeStyle.body(11)).foregroundStyle(Palette.secondary) }
            }
            if logs.isEmpty {
                Button { router.sheet = .food(nil, type) } label: {
                    HStack {
                        Text("Make room for \(type.title.lowercased())").font(TypeStyle.body(12)).foregroundStyle(Palette.secondary)
                        Spacer()
                        Image(systemName: "plus").font(.system(size: 13)).foregroundStyle(Palette.green)
                    }.padding(19).frame(minHeight: 62).background(Palette.surface.opacity(0.6), in: RoundedRectangle(cornerRadius: 18))
                        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Palette.line, style: StrokeStyle(lineWidth: 1, dash: [4, 4])))
                }.buttonStyle(PressFeedback()).accessibilityLabel("Add \(type.title.lowercased())")
            } else {
                ForEach(logs) { log in
                    HStack(spacing: 0) {
                        Button { router.sheet = .food(log) } label: {
                            HStack(spacing: 13) {
                                if let image = PhotoStorage.image(log.photoUri) {
                                    Image(uiImage: image).resizable().scaledToFill().frame(width: 52, height: 56).clipShape(RoundedRectangle(cornerRadius: 13)).accessibilityHidden(true)
                                } else { MealIllustration(meal: log.mealType).frame(width: 52, height: 56) }
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(log.title).font(TypeStyle.body(13, weight: .semibold)).foregroundStyle(Palette.ink).multilineTextAlignment(.leading)
                                    Text("\(Int(log.calories)) kcal · \(Int(log.protein))g protein · \(Int(log.fiber))g fiber").font(TypeStyle.body(10)).foregroundStyle(Palette.secondary)
                                }
                                Spacer(minLength: 0)
                            }.padding(14)
                        }.buttonStyle(PressFeedback())
                        Menu {
                            Button("Edit meal", systemImage: "pencil") { router.sheet = .food(log) }
                            Button("Delete meal", systemImage: "trash", role: .destructive) { pendingDelete = log }
                        } label: { Image(systemName: "ellipsis").foregroundStyle(Palette.secondary).frame(width: 40, height: 48) }
                        .accessibilityLabel("Options for \(log.title)")
                    }.background(Palette.surface, in: RoundedRectangle(cornerRadius: 20))
                }
            }
        }
    }
}

struct MealIllustration: View {
    var meal: MealType
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 14).fill(meal == .lunch || meal == .dinner ? Palette.paleGreen : Palette.palePeach)
            Circle().fill(Palette.surface).frame(width: 35, height: 35)
                .overlay(Circle().stroke(Palette.line, lineWidth: 1).padding(3))
            Image(systemName: meal == .breakfast ? "cup.and.saucer.fill" : meal == .snack ? "carrot.fill" : "leaf.fill")
                .font(.system(size: 18, weight: .light)).foregroundStyle(meal == .lunch || meal == .dinner ? Palette.green : Palette.peach)
        }.accessibilityHidden(true)
    }
}

struct WaterCard: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        let water = store.water(on: store.selectedDay)
        AppCard(tint: Palette.paleBlue) {
            VStack(alignment: .leading, spacing: 17) {
                HStack {
                    Label("A moment to hydrate", systemImage: "drop").font(TypeStyle.body(14, weight: .semibold)).foregroundStyle(Palette.ink)
                    Spacer()
                    Text("\(water) / \(store.targets.water)").font(TypeStyle.body(12, weight: .semibold)).foregroundStyle(Palette.blue).monospacedDigit().accessibilityIdentifier("water-count")
                }
                HStack(spacing: 12) {
                    Button { change(-1) } label: { Image(systemName: "minus").frame(width: 44, height: 44).background(Palette.surface.opacity(0.7), in: Circle()) }
                        .disabled(water == 0).accessibilityLabel("Remove a glass of water").accessibilityIdentifier("water-minus")
                    if store.targets.water <= 8 {
                        HStack(spacing: 5) {
                            ForEach(0..<store.targets.water, id: \.self) { index in
                                Button {
                                    if store.setWater(index + 1, on: store.selectedDay) { Feedback.light() }
                                } label: {
                                    Image(systemName: index < water ? "drop.fill" : "drop")
                                        .font(.system(size: 21, weight: .light)).foregroundStyle(Palette.blue.opacity(index < water ? 1 : 0.25)).frame(maxWidth: .infinity, minHeight: 44)
                                }.accessibilityLabel("Set water to \(index + 1) \(index == 0 ? "glass" : "glasses")")
                            }
                        }
                    } else {
                        Slider(value: Binding(get: { Double(water) }, set: { _ = store.setWater(Int($0), on: store.selectedDay) }), in: 0...Double(max(water, store.targets.water)), step: 1)
                            .tint(Palette.blue).accessibilityLabel("Glasses of water").accessibilityValue("\(water)")
                    }
                    Button { change(1) } label: { Image(systemName: "plus").frame(width: 44, height: 44).background(Palette.surface, in: Circle()) }
                        .disabled(water == 20).accessibilityLabel("Add a glass of water").accessibilityIdentifier("water-plus")
                }.foregroundStyle(Palette.blue).font(.system(size: 13, weight: .semibold)).buttonStyle(PressFeedback())
                Text(water >= store.targets.water ? "Your daily water goal, checked off." : "One glass at a time. You've got this.").font(TypeStyle.body(11)).foregroundStyle(Palette.blue)
            }
        }
    }
    private func change(_ amount: Int) {
        if store.setWater(store.water(on: store.selectedDay) + amount, on: store.selectedDay) { Feedback.light() }
    }
}
