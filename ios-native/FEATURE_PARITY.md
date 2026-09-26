# Native feature parity

The original Expo source remains in place. The native app implements its five tabs, forms, data fields, and complete onboarding sequence in SwiftUI.

## Onboarding

`Models/Onboarding.swift` keeps the original ordering from `app/onboarding.tsx`. There are 28 stages including the welcome and Pro screens; pill and unsure delivery skip only stage 6. Required choices are explicit, and back navigation retains entered values.

| Stage | Original capability | Native implementation |
| --- | --- | --- |
| 0 | Welcome | Redesigned botanical welcome |
| 1 | Medication selection | All eight choices, including Other and I don't know |
| 2 | Delivery | Injection, pill, not sure |
| 3 | Tracking insight | Original 3× panel |
| 4 | Dose | Original injection/pill presets, Other, I don't know |
| 5 | Frequency | Same delivery-specific options; custom intervals also accept days |
| 6 | Injection device | All four choices; skipped for other delivery methods |
| 7 | Health disclaimer | Explicit acceptance required to continue |
| 8 | Units | Imperial or metric; values convert if changed later in setup |
| 9 | Height | Feet/inches or centimeters |
| 10 | Current weight | Stored in canonical pounds |
| 11 | Starting weight | Stored separately from current weight |
| 12 | Start date | Native calendar, no future dates |
| 13 | Goal weight | User-entered target |
| 14 | Goal insight | Original 87% panel |
| 15 | Weekly pace | Same slider ranges and unit increments |
| 16 | Pace insight | Original 18 lb panel |
| 17 | Activity | All four options; no preselected answer |
| 18 | Daily check-in insight | Original 5-minute panel |
| 19 | Tough days | Support text and all four care tips |
| 20 | Cravings | All weekdays, Unknown, Other; multiple selection |
| 21 | Concerns | All nine concerns plus explicit Not concerned |
| 22 | Symptom insight | Original 68% panel |
| 23 | Motivation | All five options; no preselected answer |
| 24 | First dose | Date/time, optional injection site and notes, skip, save immediately, celebration |
| 25 | Rating | Optional native App Store review request and Maybe later |
| 26 | Personalized GLP-1 illustration | Multi-cycle PK chart, peaks/troughs, medication, dose, frequency, explanation |
| 27 | Pro | Features, real localized plans/offers, purchase, restore, terms, privacy |

The five statistic panels retain the supplied app's editorial copy. The repository includes no survey or study sources for those figures; this migration does not independently substantiate them.

The system review prompt replaces the original custom star gate. Every user can open the same native rating prompt; a positive rating is not required. iOS decides whether to display it.

## Tracking and settings

| Original screen | Preserved behavior |
| --- | --- |
| Dashboard | Week/date selection, medication level, next dose, calorie/protein/fiber/water totals, weight progress, quick logging |
| Food | Camera/library with crop, automatic photo analysis, manual entry and editable results, meal categories, daily nutrition, water controls |
| Medication | Medication/dose/schedule, countdown, injection-site rotation, dose history, side-effect history |
| Log dose | Original quick-dose choices plus custom text, date/time, six sites, notes, multiple symptoms with individual severity/notes |
| Log side effect | All nine types, severity 1–5, date, notes |
| Weight | Current/start/goal weight, change, goal progress, BMI, 7/30/90-day/all-time chart, weight history and deletion |
| Edit medication | All medications/delivery methods, original dose presets plus custom text, schedule/custom days, device |
| Edit targets | Calories 800–4000, protein 20–300 g, fiber 10–60 g, water 1–20 glasses |
| Edit goals | Goal weight, unit-specific weekly pace, activity |
| Profile/preferences | Units, notification/dose/water reminder controls, prescription/targets/goals, legal links, CSV export, reset with confirmation |

Native additions include real local notifications, dark mode, Dynamic Type, meal editing/deletion, history date browsing, durable meal photos, and complete JSON backups/import. The Expo backup action and native legacy importer preserve existing profile fields, preferences, targets, logs, and available photos.

## Deliberate corrections

- Custom schedule days affect countdowns, PK estimates, and reminders.
- Calendar dates use the local day rather than slicing UTC timestamps.
- Historical weight entries and deletion recalculate the latest current weight.
- A first dose saved during onboarding survives an interrupted setup. Revisiting that screen updates the same record instead of creating a duplicate.
- The current onboarding weight is dated today. A distinct historical starting weight is recorded on the selected start date when that date is earlier.
- Food photos are cropped with the native image picker and then analyzed automatically, as in the Expo version.
- The original trial button only completed onboarding. Available native subscriptions use Adapty/StoreKit purchase verification. If plans are unavailable, setup can still finish and open the journal, preserving the original access; this does not claim a subscription or free trial.

## Verification boundaries

Model tests compare both medication charts against values generated by the original TypeScript, check all onboarding branches and options, and confirm profile/dose persistence. UI tests walk the complete injection and pill onboarding flows and cover the five tabs and logging/editing workflows.

Live service checks are opt-in and separate from deterministic tests. Real purchase/restore validation with an existing subscription requires an appropriate Apple sandbox/device account. No purchase is made by automated checks.

The supplied Adapty key successfully activates and fetches the `default` placement, which contains `monthly` and `yearly`. Apple product loading in the unsigned simulator build returned `noProductIDsFound`; live prices, a real purchase, and restoration of an existing paid subscription are therefore not verified. The native app handles that state without blocking access to the journal.
