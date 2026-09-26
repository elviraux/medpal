import SwiftUI

struct Screen<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) { content }
                .padding(.horizontal, 24)
                .padding(.top, 12)
                .padding(.bottom, 36)
                .frame(maxWidth: 650)
                .frame(maxWidth: .infinity)
        }
        .scrollIndicators(.hidden)
        .background(Backdrop())
        .toolbar(.hidden, for: .navigationBar)
    }
}

struct Eyebrow: View {
    var text: String
    var color: Color = Palette.secondary
    var body: some View {
        Text(text.uppercased()).font(TypeStyle.body(10, weight: .semibold)).tracking(2.4).foregroundStyle(color)
    }
}

struct ScreenHeader: View {
    var eyebrow: String
    var title: String
    var subtitle: String? = nil
    var actionLabel: String? = nil
    var symbol = "plus"
    var action: (() -> Void)? = nil
    var body: some View {
        HStack(alignment: .center, spacing: 16) {
            VStack(alignment: .leading, spacing: 7) {
                Eyebrow(text: eyebrow)
                Text(title).font(TypeStyle.display()).foregroundStyle(Palette.ink).accessibilityAddTraits(.isHeader)
                if let subtitle { Text(subtitle).font(TypeStyle.body(13)).foregroundStyle(Palette.secondary) }
            }
            Spacer(minLength: 0)
            if let action, let actionLabel {
                Button(action: action) {
                    Image(systemName: symbol).font(.system(size: 19, weight: .medium))
                        .foregroundStyle(Palette.background).frame(width: 46, height: 46).background(Palette.plum, in: Circle())
                        .shadow(color: Palette.aubergine.opacity(0.18), radius: 10, y: 5)
                }
                .accessibilityLabel(actionLabel)
                .buttonStyle(PressFeedback())
            }
        }
    }
}

struct AppCard<Content: View>: View {
    var tint: Color = Palette.surface
    var padding: CGFloat = 20
    @ViewBuilder var content: Content
    var body: some View {
        content.padding(padding).frame(maxWidth: .infinity, alignment: .leading)
            .background(tint, in: RoundedRectangle(cornerRadius: 26, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 26, style: .continuous).stroke(Palette.line.opacity(0.7), lineWidth: 0.75))
            .shadow(color: Palette.aubergine.opacity(0.05), radius: 18, y: 8)
    }
}

struct SectionTitle: View {
    var title: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil
    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title).font(TypeStyle.display(21)).foregroundStyle(Palette.ink).accessibilityAddTraits(.isHeader)
            Spacer()
            if let actionTitle, let action {
                Button(actionTitle, action: action).font(TypeStyle.body(12, weight: .semibold)).foregroundStyle(Palette.plum).frame(minHeight: 32)
            }
        }
    }
}

struct IconBadge: View {
    var symbol: String
    var color: Color = Palette.plum
    var size: CGFloat = 42
    var body: some View {
        Image(systemName: symbol).font(.system(size: size * 0.43, weight: .regular))
            .foregroundStyle(color).frame(width: size, height: size)
            .background(color.opacity(0.10), in: Circle())
            .accessibilityHidden(true)
    }
}

struct Tag: View {
    var text: String
    var symbol: String? = nil
    var color: Color = Palette.plum
    var background: Color? = nil
    var body: some View {
        HStack(spacing: 5) {
            if let symbol { Image(systemName: symbol).font(.system(size: 10, weight: .semibold)) }
            Text(text).font(TypeStyle.body(10, weight: .semibold))
        }
        .foregroundStyle(color).padding(.horizontal, 10).padding(.vertical, 6)
        .background(background ?? color.opacity(0.09), in: Capsule())
        .fixedSize(horizontal: false, vertical: true)
    }
}

struct PrimaryButton: View {
    var title: String
    var symbol: String? = nil
    var isLoading = false
    var disabled = false
    var action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                if isLoading { ProgressView().tint(Palette.background) }
                Text(title).font(TypeStyle.body(15, weight: .semibold)).tracking(0.3)
                if let symbol, !isLoading { Image(systemName: symbol).font(.system(size: 13, weight: .semibold)) }
            }
            .foregroundStyle(Palette.background).frame(maxWidth: .infinity).frame(minHeight: 56)
            .background(disabled ? Palette.secondary.opacity(0.5) : Palette.plum, in: Capsule())
            .shadow(color: Palette.aubergine.opacity(disabled ? 0 : 0.2), radius: 14, y: 7)
        }
        .buttonStyle(PressFeedback()).disabled(disabled || isLoading)
    }
}

struct SecondaryButton: View {
    var title: String
    var symbol: String? = nil
    var action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if let symbol { Image(systemName: symbol) }
                Text(title)
            }
            .font(TypeStyle.body(13, weight: .semibold))
            .foregroundStyle(Palette.plum).frame(maxWidth: .infinity).frame(minHeight: 50)
            .background(Palette.blush, in: Capsule())
        }.buttonStyle(PressFeedback())
    }
}

struct EmptyState: View {
    var symbol: String
    var title: String
    var message: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil
    var body: some View {
        VStack(spacing: 12) {
            IconBadge(symbol: symbol, size: 52)
            Text(title).font(TypeStyle.body(16, weight: .semibold)).foregroundStyle(Palette.ink)
            Text(message).font(TypeStyle.body(13)).foregroundStyle(Palette.secondary).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
            if let actionTitle, let action { Button(actionTitle, action: action).font(TypeStyle.body(13, weight: .semibold)).foregroundStyle(Palette.plum).frame(minHeight: 44) }
        }.padding(.vertical, 18).frame(maxWidth: .infinity)
    }
}

struct MetricRing: View {
    var progress: Double
    var color: Color = Palette.plum
    var size: CGFloat = 60
    var lineWidth: CGFloat = 5
    var symbol: String? = nil
    var body: some View {
        ZStack {
            Circle().stroke(color.opacity(0.12), lineWidth: lineWidth)
            Circle().trim(from: 0, to: min(1, max(0, progress.isFinite ? progress : 0)))
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)).rotationEffect(.degrees(-90))
            if let symbol { Image(systemName: symbol).font(.system(size: size * 0.27, weight: .medium)).foregroundStyle(color) }
        }.frame(width: size, height: size).accessibilityHidden(true)
    }
}

struct ProgressTrack: View {
    var progress: Double
    var color: Color = Palette.plum
    var height: CGFloat = 5
    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill(color.opacity(0.12))
                Capsule().fill(color).frame(width: max(height, proxy.size.width * min(1, max(0, progress.isFinite ? progress : 0)))).opacity(progress > 0 ? 1 : 0)
            }
        }.frame(height: height).accessibilityHidden(true)
    }
}

struct StatValue: View {
    var title: String
    var value: String
    var unit: String = ""
    var color: Color = Palette.ink
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(TypeStyle.caption).foregroundStyle(Palette.secondary)
            (Text(value).font(TypeStyle.metric(25)) + Text(unit.isEmpty ? "" : " \(unit)").font(TypeStyle.body(12)))
                .foregroundStyle(color).monospacedDigit().minimumScaleFactor(0.8).lineLimit(1)
        }.frame(maxWidth: .infinity, alignment: .leading).accessibilityElement(children: .combine)
    }
}

struct InfoRow: View {
    var symbol: String
    var title: String
    var value: String
    var color: Color = Palette.plum
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: symbol).foregroundStyle(color).frame(width: 22).accessibilityHidden(true)
            Text(title).foregroundStyle(Palette.secondary)
            Spacer(minLength: 12)
            Text(value).foregroundStyle(Palette.ink).multilineTextAlignment(.trailing)
        }.font(TypeStyle.body(13)).padding(.vertical, 6).accessibilityElement(children: .combine)
    }
}

struct ChoiceChip: View {
    var title: String
    var selected: Bool
    var symbol: String? = nil
    var action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 7) {
                if let symbol { Image(systemName: symbol).font(.system(size: 12)) }
                Text(title).font(TypeStyle.body(12, weight: .medium))
            }
            .foregroundStyle(selected ? Palette.background : Palette.ink)
            .padding(.horizontal, 15).frame(minHeight: 44)
            .frame(maxWidth: .infinity)
            .background(selected ? Palette.plum : Palette.surface, in: Capsule())
            .overlay(Capsule().stroke(selected ? Color.clear : Palette.line, lineWidth: 1))
        }
        .buttonStyle(PressFeedback())
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

struct SelectionRow: View {
    var title: String
    var detail: String? = nil
    var symbol: String
    var selected: Bool
    var action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                IconBadge(symbol: symbol, size: 42)
                VStack(alignment: .leading, spacing: 4) {
                    Text(title).font(TypeStyle.body(14, weight: .semibold)).foregroundStyle(Palette.ink)
                    if let detail { Text(detail).font(TypeStyle.body(12)).foregroundStyle(Palette.secondary) }
                }
                Spacer(minLength: 0)
                Image(systemName: selected ? "checkmark.circle.fill" : "circle").foregroundStyle(selected ? Palette.plum : Palette.line).font(.system(size: 21))
            }
            .padding(15).background(selected ? Palette.blush : Palette.surface, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).stroke(selected ? Palette.plum.opacity(0.4) : Palette.line, lineWidth: 1))
        }.buttonStyle(PressFeedback()).accessibilityAddTraits(selected ? .isSelected : [])
    }
}

struct FieldLabel: View {
    var title: String
    var body: some View { Text(title).font(TypeStyle.body(12, weight: .semibold)).foregroundStyle(Palette.secondary) }
}

struct TextEntry: View {
    var title: String
    var placeholder: String
    @Binding var text: String
    var keyboard: UIKeyboardType = .default
    var suffix: String? = nil
    var identifier: String? = nil
    @FocusState private var focused: Bool
    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            FieldLabel(title: title)
            HStack {
                TextField(placeholder, text: $text)
                    .keyboardType(keyboard).font(TypeStyle.body(16)).foregroundStyle(Palette.ink)
                    .focused($focused)
                    .accessibilityLabel(title).accessibilityIdentifier(identifier ?? title)
                if let suffix { Text(suffix).font(TypeStyle.body(13)).foregroundStyle(Palette.secondary) }
            }
            .padding(15).frame(minHeight: 52)
            .background(Palette.surface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(focused ? Palette.plum.opacity(0.55) : Palette.line, lineWidth: 1))
            .animation(.easeOut(duration: 0.15), value: focused)
            .contentShape(Rectangle()).onTapGesture { focused = true }
        }
    }
}

struct NotesEntry: View {
    @Binding var text: String
    var title = "A note for yourself"
    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            FieldLabel(title: title + " · optional")
            TextField("Anything you'd like to remember…", text: $text, axis: .vertical)
                .font(TypeStyle.body(14)).foregroundStyle(Palette.ink).lineLimit(3...6)
                .padding(16).background(Palette.surface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Palette.line, lineWidth: 1))
                .accessibilityLabel(title)
        }
    }
}

struct ErrorBanner: View {
    var message: String
    var body: some View {
        Label(message, systemImage: "exclamationmark.circle")
            .font(TypeStyle.body(12)).foregroundStyle(Palette.red)
            .padding(14).frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 14))
            .accessibilityElement(children: .combine)
    }
}

struct FormShell<Content: View>: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppStore.self) private var store
    var title: String
    var saveTitle = "Save entry"
    var canSave = true
    var isSaving = false
    var onSave: () -> Void
    @ViewBuilder var content: Content
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    content
                    if let message = store.errorMessage { ErrorBanner(message: message) }
                }.padding(24).frame(maxWidth: 650).frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
            .scrollDismissesKeyboard(.interactively)
            .background(Backdrop())
            .navigationTitle(title).navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.foregroundStyle(Palette.secondary)
                }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") { UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil) }
                }
            }
            .safeAreaInset(edge: .bottom) {
                PrimaryButton(title: saveTitle, symbol: "checkmark", isLoading: isSaving, disabled: !canSave, action: onSave)
                    .accessibilityIdentifier("save-entry")
                    .padding(.horizontal, 24).padding(.top, 12).padding(.bottom, 12)
                    .background(Palette.background)
            }
        }
        .tint(Palette.plum).presentationDragIndicator(.visible)
        .alert("Changes weren't saved", isPresented: Binding(get: { store.errorMessage != nil }, set: { if !$0 { store.errorMessage = nil } })) {
            Button("OK", role: .cancel) { store.errorMessage = nil }
        } message: { Text(store.errorMessage ?? "Please try again.") }
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    var items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController { UIActivityViewController(activityItems: items, applicationActivities: nil) }
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
