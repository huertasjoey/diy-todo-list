// How an average completion percentage is described. The same scale is used everywhere so
// weeks and months can be compared at a glance.
export const LEVELS = [
  { min: 0, max: 29, label: "Just starting", note: "Getting going. Be patient with yourself.", dot: "bg-muted" },
  { min: 30, max: 49, label: "Building", note: "Some habits are starting to stick.", dot: "bg-goal" },
  { min: 50, max: 69, label: "Steady", note: "Halfway there and consistent.", dot: "bg-diary" },
  { min: 70, max: 84, label: "Strong", note: "You're doing well. Keep it up.", dot: "bg-accent" },
  { min: 85, max: 100, label: "Excellent", note: "Near-perfect consistency.", dot: "bg-ink" },
];

export const levelFor = (percent) => LEVELS.find((l) => percent >= l.min && percent <= l.max) ?? LEVELS[0];
