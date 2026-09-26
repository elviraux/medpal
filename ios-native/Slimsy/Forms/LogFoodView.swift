import SwiftUI
import AVFoundation

struct LogFoodView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    var existingLog: FoodLog? = nil
    var initialMeal: MealType? = nil
    @State private var meal = MealType.suggested()
    @State private var date = Date.now
    @State private var description = ""
    @State private var calories = ""
    @State private var protein = ""
    @State private var fiber = ""
    @State private var carbs = ""
    @State private var fat = ""
    @State private var entryMode = 0
    @State private var photoImage: UIImage?
    @State private var photoName: String?
    @State private var photoSource: FoodPhotoSource?
    @State private var isAnalyzing = false
    @State private var photoError: String?
    @State private var estimate: NutritionEstimate?
    @State private var initialized = false
    @State private var analysisTask: Task<Void, Never>?
    @State private var generation = UUID()

    private var valid: Bool {
        guard let c = calories.decimalValue, c > 0, c <= 1_000_000 else { return false }
        return [protein, fiber, carbs, fat].allSatisfy { $0.nonempty == nil || ($0.decimalValue.map { (0...1_000_000).contains($0) } ?? false) }
    }

    var body: some View {
        FormShell(title: existingLog == nil ? "Log your food" : "Edit your meal", saveTitle: existingLog == nil ? "Save meal" : "Save changes", canSave: valid && !isAnalyzing, onSave: save) {
            VStack(alignment: .leading, spacing: 8) {
                Eyebrow(text: "A little nourishment")
                Text("What's on your plate?").font(TypeStyle.display(29)).foregroundStyle(Palette.ink)
            }
            Picker("Meal", selection: $meal) { ForEach(MealType.allCases) { Text($0.title).tag($0) } }
                .pickerStyle(.segmented)
            Picker("Entry method", selection: $entryMode) {
                Text("Photo estimate").tag(0)
                Text("Enter manually").tag(1)
            }.pickerStyle(.segmented)
            if entryMode == 0 { photoSection }
            TextEntry(title: "What did you eat?", placeholder: "e.g. Greek yogurt with berries", text: $description, identifier: "food-description")
                .disabled(isAnalyzing)
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    FieldLabel(title: "Nutrition")
                    Spacer()
                    if estimate != nil { Tag(text: "Photo estimate · review & edit", symbol: "sparkles", color: Palette.peach) }
                }
                TextEntry(title: "Calories", placeholder: "0", text: $calories, keyboard: .decimalPad, suffix: "kcal", identifier: "food-calories")
                HStack(alignment: .top, spacing: 12) {
                    TextEntry(title: "Protein", placeholder: "0", text: $protein, keyboard: .decimalPad, suffix: "g", identifier: "food-protein")
                    TextEntry(title: "Fiber", placeholder: "0", text: $fiber, keyboard: .decimalPad, suffix: "g", identifier: "food-fiber")
                }
                DisclosureGroup("More nutrition · optional") {
                    HStack(spacing: 12) {
                        TextEntry(title: "Carbs", placeholder: "0", text: $carbs, keyboard: .decimalPad, suffix: "g")
                        TextEntry(title: "Fat", placeholder: "0", text: $fat, keyboard: .decimalPad, suffix: "g")
                    }.padding(.top, 12)
                }.font(TypeStyle.body(12)).foregroundStyle(Palette.secondary)
            }
            .disabled(isAnalyzing)
            AppCard { DatePicker("Meal date", selection: $date, in: ...Date.now, displayedComponents: .date).font(TypeStyle.body(13)) }
        }
        .onAppear(perform: initialize)
        .onDisappear { analysisTask?.cancel() }
        .onChange(of: entryMode) { _, mode in
            if mode == 1 { analysisTask?.cancel(); generation = UUID(); isAnalyzing = false }
        }
        .sheet(item: $photoSource) { source in
            FoodPhotoPicker(source: source) { image in selectPhoto(image) }.ignoresSafeArea()
        }
    }

    private var photoSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            if let photoImage {
                Image(uiImage: photoImage).resizable().scaledToFill().frame(height: 192).frame(maxWidth: .infinity)
                    .clipped().clipShape(RoundedRectangle(cornerRadius: 23))
                    .overlay(alignment: .topTrailing) {
                        Button {
                            analysisTask?.cancel(); generation = UUID(); isAnalyzing = false
                            self.photoImage = nil; photoName = nil; estimate = nil
                        } label: {
                            Image(systemName: "xmark").font(.system(size: 12, weight: .bold)).foregroundStyle(.white)
                                .frame(width: 34, height: 34).background(.black.opacity(0.45), in: Circle())
                        }.padding(12).accessibilityLabel("Remove meal photo")
                    }
                    .accessibilityLabel("Your meal photo")
                if isAnalyzing {
                    HStack(spacing: 10) {
                        ProgressView().tint(Palette.green)
                        Text("Getting to know your plate…").font(TypeStyle.body(12)).foregroundStyle(Palette.green)
                        Spacer()
                        Button("Cancel") { analysisTask?.cancel(); generation = UUID(); isAnalyzing = false }.font(TypeStyle.body(11)).foregroundStyle(Palette.secondary)
                    }.frame(minHeight: 44)
                } else {
                    SecondaryButton(title: estimate == nil ? "Estimate nutrition" : "Analyze again", symbol: "sparkles", action: analyze)
                        .accessibilityIdentifier("analyze-food")
                }
                Text("Check your nutrition estimate and make any edits before saving.")
                    .font(TypeStyle.body(10)).foregroundStyle(Palette.secondary)
            } else {
                HStack(spacing: 12) {
                    Button(action: openCamera) {
                        photoAction("Take a photo", symbol: "camera", color: Palette.green, background: Palette.paleGreen)
                    }.buttonStyle(PressFeedback()).accessibilityIdentifier("food-camera")
                    Button { photoSource = .library } label: {
                        photoAction("Photo library", symbol: "photo.on.rectangle.angled", color: Palette.peach, background: Palette.palePeach)
                    }.buttonStyle(PressFeedback()).accessibilityIdentifier("food-photo-library")
                }
                Text("Choose and crop a photo for an automatic nutrition estimate. Your selected photo is sent to Slimsy's analysis service.").font(TypeStyle.body(11)).foregroundStyle(Palette.secondary)
            }
            if let photoError { ErrorBanner(message: photoError) }
        }
    }
    private func photoAction(_ title: String, symbol: String, color: Color, background: Color) -> some View {
        VStack(spacing: 13) {
            Image(systemName: symbol).font(.system(size: 25, weight: .light))
            Text(title).font(TypeStyle.body(12, weight: .semibold))
        }.foregroundStyle(color).frame(maxWidth: .infinity).frame(height: 116).background(background, in: RoundedRectangle(cornerRadius: 22))
    }
    private func initialize() {
        guard !initialized else { return }; initialized = true
        date = store.selectedDate
        meal = initialMeal ?? .suggested()
        guard let log = existingLog else { return }
        meal = log.mealType
        date = DayKey.date(log.date) ?? .now
        description = log.aiDescription ?? ""
        calories = String(format: "%g", log.calories)
        protein = String(format: "%g", log.protein)
        fiber = String(format: "%g", log.fiber)
        carbs = log.carbs.map { String(format: "%g", $0) } ?? ""
        fat = log.fat.map { String(format: "%g", $0) } ?? ""
        photoName = log.photoUri
        photoImage = PhotoStorage.image(log.photoUri)
        entryMode = photoImage == nil ? 1 : 0
    }
    private func selectPhoto(_ image: UIImage) {
        analysisTask?.cancel()
        generation = UUID()
        isAnalyzing = false
        photoImage = image
        photoName = nil
        photoError = nil
        estimate = nil
        analyze()
    }
    private func openCamera() {
        guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
            photoError = "This device doesn't have an available camera. Choose a photo from your library instead."
            return
        }
        Task {
            let granted = await AVCaptureDevice.requestAccess(for: .video)
            if granted { photoSource = .camera }
            else { photoError = "Camera access is off. You can enable it in iPhone Settings, or choose a photo from your library." }
        }
    }
    private func analyze() {
        guard let image = photoImage, let jpeg = PhotoStorage.jpeg(from: image) else { return }
        analysisTask?.cancel()
        let token = UUID()
        generation = token
        photoError = nil
        isAnalyzing = true
        analysisTask = Task {
            defer { if generation == token { isAnalyzing = false } }
            do {
                let result = try await NutritionAnalyzer().analyze(jpeg: jpeg)
                guard !Task.isCancelled, generation == token else { return }
                estimate = result
                description = result.description
                calories = String(Int(result.calories.rounded()))
                protein = String(Int(result.protein.rounded()))
                fiber = String(Int(result.fiber.rounded()))
                carbs = result.carbs.map { String(Int($0.rounded())) } ?? ""
                fat = result.fat.map { String(Int($0.rounded())) } ?? ""
                Feedback.light()
            } catch {
                guard !Task.isCancelled, generation == token else { return }
                photoError = error.localizedDescription
            }
        }
    }
    private func save() {
        guard valid, let energy = calories.decimalValue else { return }
        var filename = photoName
        var newFilename: String?
        do {
            if filename == nil, let photoImage, let jpeg = PhotoStorage.jpeg(from: photoImage) {
                filename = try PhotoStorage.save(jpeg)
                newFilename = filename
            }
            var overridden = existingLog?.manualOverride ?? true
            if let estimate {
                overridden = description != estimate.description || energy != estimate.calories.rounded() || (protein.decimalValue ?? 0) != estimate.protein.rounded() || (fiber.decimalValue ?? 0) != estimate.fiber.rounded()
            }
            let log = FoodLog(id: existingLog?.id ?? UUID().uuidString, date: DayKey.string(date), mealType: meal, photoUri: filename, aiDescription: description.nonempty, calories: energy, protein: protein.decimalValue ?? 0, fiber: fiber.decimalValue ?? 0, carbs: carbs.decimalValue, fat: fat.decimalValue, manualOverride: overridden)
            if store.saveFood(log) {
                if let old = existingLog?.photoUri, old != filename, !store.data.foodLogs.contains(where: { $0.photoUri == old }) { PhotoStorage.remove(old) }
                Feedback.saved(); dismiss()
            } else if let newFilename { PhotoStorage.remove(newFilename) }
        } catch { photoError = "Your photo couldn't be saved. Please try again." }
    }
}

enum FoodPhotoSource: String, Identifiable {
    case camera, library
    var id: String { rawValue }
    var pickerType: UIImagePickerController.SourceType { self == .camera ? .camera : .photoLibrary }
}

struct FoodPhotoPicker: UIViewControllerRepresentable {
    @Environment(\.dismiss) private var dismiss
    var source: FoodPhotoSource
    var onCapture: (UIImage) -> Void
    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = source.pickerType
        if source == .camera { picker.cameraCaptureMode = .photo }
        picker.allowsEditing = true
        picker.delegate = context.coordinator
        return picker
    }
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    final class Coordinator: NSObject, UINavigationControllerDelegate, UIImagePickerControllerDelegate {
        var parent: FoodPhotoPicker
        init(parent: FoodPhotoPicker) { self.parent = parent }
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = (info[.editedImage] ?? info[.originalImage]) as? UIImage { parent.onCapture(image) }
            parent.dismiss()
        }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { parent.dismiss() }
    }
}
