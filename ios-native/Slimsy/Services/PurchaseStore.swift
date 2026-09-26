import Foundation
import Observation
import StoreKit
import Adapty

@MainActor @Observable
final class PurchaseStore {
    private(set) var products: [Product] = []
    private(set) var hasPro = false
    private(set) var trialLabels: [String: String] = [:]
    private(set) var loadedProductIDs: [String] = []
    var isLoading = false
    var message: String?
    @ObservationIgnored private var transactionTask: Task<Void, Never>?
    @ObservationIgnored private var activationTask: Task<Void, Error>?
    @ObservationIgnored private var adaptyProducts: [String: any AdaptyPaywallProduct] = [:]
    private var hasAdaptyPro = false
    private var hasStoreKitPro = false

    private var adaptyKey: String? {
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        if args.contains("--demo-data") || args.contains("--onboarding") || args.contains("--ui-testing") || args.contains("--ui-persistence") || ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil { return nil }
        #endif
        guard let key = (Bundle.main.object(forInfoDictionaryKey: "AdaptyPublicSDKKey") as? String)?.nonempty, !key.contains("$(") else { return nil }
        return key
    }
    private var placementID: String {
        (Bundle.main.object(forInfoDictionaryKey: "AdaptyPlacementID") as? String)?.nonempty ?? "default"
    }

    var productIDs: [String] {
        let configured = ["MonthlyProductID", "YearlyProductID"].compactMap {
            (Bundle.main.object(forInfoDictionaryKey: $0) as? String)?.nonempty
        }.filter { !$0.contains("$(") }
        return Array(Set(configured + loadedProductIDs))
    }
    var isConfigured: Bool { !productIDs.isEmpty || adaptyKey != nil }

    init() {
        transactionTask = Task { [weak self] in
            for await result in StoreKit.Transaction.updates {
                guard let self, case .verified(let transaction) = result else { continue }
                if self.adaptyKey != nil {
                    await self.refreshEntitlements()
                    continue // Adapty owns transaction completion in full mode.
                }
                guard self.productIDs.contains(transaction.productID) else { continue }
                await self.refreshEntitlements()
                await transaction.finish()
            }
        }
    }
    deinit { transactionTask?.cancel() }

    func load() async {
        guard isConfigured else { return }
        isLoading = true
        defer { isLoading = false }
        message = nil
        do {
            if adaptyKey != nil {
                try await activateAdapty()
                let paywall = try await Adapty.getPaywall(placementId: placementID)
                loadedProductIDs = paywall.vendorProductIds
                let fetched = try await Adapty.getPaywallProducts(paywall: paywall)
                adaptyProducts = Dictionary(fetched.map { ($0.vendorProductId, $0) }, uniquingKeysWith: { first, _ in first })
                products = fetched.compactMap(\.sk2Product)
                if products.count != fetched.count { products = try await Product.products(for: Array(adaptyProducts.keys)) }
                try? await Adapty.logShowPaywall(paywall)
            } else {
                products = try await Product.products(for: productIDs)
            }
            products.sort { $0.price < $1.price }
            trialLabels = [:]
            for product in products {
                if let subscription = product.subscription, let offer = subscription.introductoryOffer,
                   offer.paymentMode == .freeTrial, await subscription.isEligibleForIntroOffer {
                    trialLabels[product.id] = "\(offer.period.value * offer.periodCount)-\(Self.unitName(offer.period.unit)) free trial"
                }
            }
            if products.isEmpty { message = "Plans are unavailable right now. Please try again later." }
            await refreshEntitlements()
        } catch { message = "Plans aren't available from the App Store right now. Please try again later, or restore an existing purchase." }
    }
    func purchase(_ product: Product) async -> Bool {
        isLoading = true
        defer { isLoading = false }
        message = nil
        do {
            if adaptyKey != nil {
                guard let configured = adaptyProducts[product.id] else {
                    message = "This plan is no longer available. Reload plans and try again."
                    return false
                }
                try await activateAdapty()
                switch try await Adapty.makePurchase(product: configured) {
                case .success(let profile, _):
                    hasAdaptyPro = profile.accessLevels["premium"]?.isActive ?? false
                    await refreshEntitlements()
                    return hasPro
                case .pending: message = "Your purchase is awaiting approval. Your access will update when it's approved."
                case .userCancelled: break
                }
                return false
            }
            switch try await product.purchase() {
            case .success(.verified(let transaction)):
                await refreshEntitlements()
                await transaction.finish()
                return hasPro
            case .success(.unverified): message = "Your purchase couldn't be verified. Please restore purchases or try again."
            case .pending: message = "Your purchase is awaiting approval. Your access will update when it's approved."
            case .userCancelled: break
            @unknown default: break
            }
        } catch { message = "Your purchase couldn't be completed. Please try again." }
        return false
    }
    func restore() async -> Bool {
        guard isConfigured else {
            message = "Purchase restoration is unavailable right now. Please try again later."
            return false
        }
        isLoading = true
        defer { isLoading = false }
        message = nil
        do {
            if adaptyKey != nil {
                try await activateAdapty()
                let profile = try await Adapty.restorePurchases()
                hasAdaptyPro = profile.accessLevels["premium"]?.isActive ?? false
            } else { try await StoreKit.AppStore.sync() }
            await refreshEntitlements()
            message = hasPro ? "Your Slimsy Pro purchase has been restored." : "No active Slimsy subscription was found for this Apple Account."
        } catch { message = "We couldn't restore purchases. Please try again." }
        return hasPro
    }
    func refreshEntitlements() async {
        var active = false
        let entitledProducts = adaptyKey == nil ? Set(productIDs) : Set(adaptyProducts.values.filter { $0.accessLevelId == "premium" }.map(\.vendorProductId))
        for await result in StoreKit.Transaction.currentEntitlements {
            if case .verified(let transaction) = result,
               entitledProducts.contains(transaction.productID), transaction.revocationDate == nil,
               transaction.expirationDate.map({ $0 > .now }) ?? true { active = true }
        }
        if adaptyKey != nil {
            do {
                try await activateAdapty()
                let profile = try await Adapty.getProfile()
                hasAdaptyPro = profile.accessLevels["premium"]?.isActive ?? false
            } catch {
                // Keep a verified StoreKit entitlement available during a
                // service outage. Adapty can be retried from the Pro screen.
                message = "Your subscription service couldn't be reached. Please try again."
            }
        }
        hasStoreKitPro = active
        hasPro = hasStoreKitPro || hasAdaptyPro
    }

    private func activateAdapty() async throws {
        guard let key = adaptyKey else { return }
        if let activationTask { return try await activationTask.value }
        Adapty.delegate = self
        let task = Task<Void, Error> {
            if await Adapty.isActivated { return }
            let config = AdaptyConfiguration.builder(withAPIKey: key)
                .with(idfaCollectionDisabled: true)
                .with(ipAddressCollectionDisabled: true)
                .build()
            try await Adapty.activate(with: config)
        }
        activationTask = task
        do { try await task.value }
        catch { activationTask = nil; throw error }
    }

    private static func unitName(_ unit: Product.SubscriptionPeriod.Unit) -> String {
        switch unit { case .day: "day"; case .week: "week"; case .month: "month"; case .year: "year"; @unknown default: "period" }
    }
}

extension PurchaseStore: AdaptyDelegate {
    nonisolated func didLoadLatestProfile(_ profile: AdaptyProfile) {
        Task { @MainActor [weak self] in
            guard let self else { return }
            self.hasAdaptyPro = profile.accessLevels["premium"]?.isActive ?? false
            self.hasPro = self.hasStoreKitPro || self.hasAdaptyPro
        }
    }
}
