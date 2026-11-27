# 0027: Preferences in one localStorage key

Setup and sound live in a single versioned JSON key so Reset Settings is one removal and a future shape change
only needs a version bump. Each part is validated separately, so one corrupt field does not discard the rest.
Storage is read after mount (sound) or when Setup opens, never during server render, to avoid hydration mismatches.
All storage calls are wrapped in try/catch because private mode or quota limits make them throw.
