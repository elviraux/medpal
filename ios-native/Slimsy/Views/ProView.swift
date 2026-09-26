import SwiftUI
import StoreKit

struct ProView: View {
    @Environment(PurchaseStore.self) private var purchases
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var selectedProductID: String?
    var onContinue: (() -> Void)? = nil
    private var canContinueWithoutPurchase: Bool { !purchases.isLoading && purchases.products.isEmpty && !purchases.hasPro }
    private var actionTitle: String {
        if purchases.hasPro { return "Continue" }
        if canContinueWithoutPurchase { return "Continue to Slimsy" }
        if selectedProductID.flatMap({ purchases.trialLabels[$0] }) != nil { return "Start free trial" }
        return "Subscribe"
    }
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 25) {
                    SlimsyMark(size: 45)
                    Eyebrow(text: "Slimsy Pro")
                    Text("Your journey,\nelevated.").font(TypeStyle.display(40)).foregroundStyle(Palette.ink)
                    Text("A thoughtful companion for every part of your GLP-1 journey.").font(TypeStyle.body(14)).foregroundStyle(Palette.secondary)
                    AppCard {
                        VStack(alignment: .leading, spacing: 17) {
                            feature("A photo, a food estimate", symbol: "camera")
                            feature("Your progress, beautifully clear", symbol: "chart.xyaxis.line")
                            feature("A rhythm for your medication", symbol: "bell")
                            feature("Thoughtful injection-site rotation", symbol: "figure.stand")
                            feature("Your GLP-1 level estimate", symbol: "waveform.path.ecg")
                            feature("A record of how you feel", symbol: "heart.text.clipboard")
                        }
                    }
                    if purchases.hasPro { Tag(text: "Your Pro membership is active", symbol: "checkmark.seal") }
                    ForEach(purchases.products, id: \.id) { product in
                        SelectionRow(title: product.displayName, detail: [purchases.trialLabels[product.id], "\(product.displayPrice)\(periodLabel(product))"].compactMap { $0 }.joined(separator: " · "), symbol: "sparkles", selected: product.id == selectedProductID) { selectedProductID = product.id }
                    }
                    if purchases.isLoading { ProgressView().tint(Palette.plum).frame(maxWidth: .infinity) }
                    if let message = purchases.message { Text(message).font(TypeStyle.body(12)).foregroundStyle(Palette.secondary) }
                    if canContinueWithoutPurchase {
                        Text("Subscription plans are currently unavailable. You can continue to your journal.")
                            .font(TypeStyle.body(12)).foregroundStyle(Palette.secondary)
                        if purchases.isConfigured {
                            Button("Try again") { Task { await purchases.load(); selectDefaultProduct() } }.font(TypeStyle.body(13)).frame(minHeight: 44)
                        }
                    } else if !purchases.products.isEmpty {
                        Text("Payment is charged to your Apple Account. Subscriptions renew automatically unless canceled in your account settings before the next billing period.")
                            .font(TypeStyle.body(10)).foregroundStyle(Palette.secondary)
                    }
                    if let error = store.errorMessage { ErrorBanner(message: error) }
                }.padding(26)
            }
            .background(Backdrop()).navigationBarTitleDisplayMode(.inline)
            .safeAreaInset(edge: .bottom) { actions }
            .toolbar { if onContinue == nil { ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } } } }
            .task { await purchases.load(); selectDefaultProduct() }
        }.tint(Palette.plum)
    }
    private var actions: some View {
        VStack(spacing: 8) {
            PrimaryButton(title: actionTitle, symbol: "arrow.right", isLoading: purchases.isLoading,
                          disabled: !purchases.hasPro && !canContinueWithoutPurchase && selectedProductID == nil) {
                if purchases.hasPro || canContinueWithoutPurchase { finish() }
                else if let product = purchases.products.first(where: { $0.id == selectedProductID }) {
                    Task { if await purchases.purchase(product) { finish() } }
                }
            }.accessibilityIdentifier("pro-continue")
            Button("Restore purchases") { Task { if await purchases.restore(), onContinue != nil { finish() } } }
                .font(TypeStyle.body(12, weight: .medium)).frame(maxWidth: .infinity).frame(minHeight: 40).disabled(purchases.isLoading)
                .accessibilityIdentifier("restore-purchases")
            HStack(spacing: 25) {
                Link("Terms", destination: URL(string: "https://slimsy.lovable.app/terms")!)
                Link("Privacy", destination: URL(string: "https://slimsy.lovable.app/privacy")!)
            }.font(TypeStyle.body(11)).frame(maxWidth: .infinity)
        }.padding(.horizontal, 26).padding(.top, 12).padding(.bottom, 14).background(Palette.background)
    }
    private func finish() { if let onContinue { onContinue() } else { dismiss() } }
    private func selectDefaultProduct() {
        selectedProductID = purchases.products.first(where: { $0.subscription?.subscriptionPeriod.unit == .year })?.id ?? purchases.products.first?.id
    }
    private func periodLabel(_ product: Product) -> String {
        guard let period = product.subscription?.subscriptionPeriod else { return "" }
        let label: String
        switch period.unit { case .day: label = "day"; case .week: label = "week"; case .month: label = "month"; case .year: label = "year"; @unknown default: label = "period" }
        return period.value == 1 ? " / \(label)" : " / \(period.value) \(label)s"
    }
    private func feature(_ title: String, symbol: String) -> some View {
        HStack(spacing: 14) { IconBadge(symbol: symbol); Text(title).font(TypeStyle.body(13, weight: .medium)).foregroundStyle(Palette.ink) }
    }
}
