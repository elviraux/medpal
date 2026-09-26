import SwiftUI
import Charts

/// The estimated-level curve shared by the Today card and the widget.
struct LevelChart: View {
    var result: Pharmacokinetics.Result
    var body: some View {
        Chart {
            ForEach(result.curve) { point in
                AreaMark(x: .value("Hours since dose", point.hour), y: .value("Relative level", point.level))
                    .foregroundStyle(LinearGradient(colors: [Palette.champagne.opacity(0.25), Palette.champagne.opacity(0)], startPoint: .top, endPoint: .bottom))
                    .interpolationMethod(.monotone)
                LineMark(x: .value("Hours since dose", point.hour), y: .value("Relative level", point.level))
                    .foregroundStyle(Palette.champagne).lineStyle(StrokeStyle(lineWidth: 2.5, lineCap: .round)).interpolationMethod(.monotone)
            }
            if result.currentHour <= result.cycleHours {
                RuleMark(x: .value("Now", result.currentHour))
                    .foregroundStyle(.white.opacity(0.3)).lineStyle(StrokeStyle(lineWidth: 1, dash: [3, 4]))
                    .annotation(position: .top, alignment: .center) {
                        Text("NOW").font(TypeStyle.body(8, weight: .bold)).tracking(1).foregroundStyle(Palette.champagne)
                    }
                PointMark(x: .value("Now", result.currentHour), y: .value("Current estimate", Double(result.currentLevel) / 100))
                    .foregroundStyle(Palette.champagne).symbolSize(35)
            }
        }
        .chartXScale(domain: 0...result.cycleHours).chartYScale(domain: 0...1.12)
        .chartXAxis(.hidden).chartYAxis(.hidden)
        .accessibilityLabel("Estimated medication level across your dosing cycle")
        .accessibilityValue("\(result.currentLevel) percent now")
    }
}

struct LevelBackground: View {
    var body: some View {
        ZStack(alignment: .topTrailing) {
            Palette.aubergine
            RadialGradient(colors: [Palette.champagne.opacity(0.22), .clear], center: .topTrailing, startRadius: 0, endRadius: 280)
            Circle().stroke(Palette.champagne.opacity(0.07), lineWidth: 1).frame(width: 240, height: 240).offset(x: 110, y: -130)
        }
    }
}
