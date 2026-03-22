export const INTENT_OPTIONS = [
  {
    value: "showcase",
    label: "Showcase",
    description: "Present polished work and the finished outcome.",
    badgeClass: "border-amber-300/30 bg-amber-500/10 text-amber-200",
    panelClass: "border-amber-300/20 bg-amber-500/8",
    gradientClass: "from-amber-300 via-orange-400 to-rose-400",
    accentClass: "text-amber-300",
  },
  {
    value: "feedback",
    label: "Feedback",
    description: "Invite critique and improve the work.",
    badgeClass: "border-sky-300/30 bg-sky-500/10 text-sky-200",
    panelClass: "border-sky-300/20 bg-sky-500/8",
    gradientClass: "from-sky-300 via-cyan-400 to-blue-500",
    accentClass: "text-sky-300",
  },
  {
    value: "collaborate",
    label: "Collaborate",
    description: "Find people who want to build this with you.",
    badgeClass: "border-emerald-300/30 bg-emerald-500/10 text-emerald-200",
    panelClass: "border-emerald-300/20 bg-emerald-500/8",
    gradientClass: "from-emerald-300 via-teal-400 to-green-500",
    accentClass: "text-emerald-300",
  },
  {
    value: "experiment",
    label: "Experiment",
    description: "Share a rough idea without pressure.",
    badgeClass: "border-rose-300/30 bg-rose-500/10 text-rose-200",
    panelClass: "border-rose-300/20 bg-rose-500/8",
    gradientClass: "from-rose-300 via-pink-400 to-fuchsia-500",
    accentClass: "text-rose-300",
  },
];

export const FEEDBACK_STYLE_OPTIONS = [
  {
    value: "brutal-honesty",
    label: "Brutal honesty",
    description: "Direct critique that prioritizes clarity over softness.",
  },
  {
    value: "beginner-friendly",
    label: "Beginner-friendly",
    description: "Gentle, constructive guidance for someone still learning.",
  },
  {
    value: "expert-only",
    label: "Expert-only",
    description: "Advanced critique from people with strong domain knowledge.",
  },
];

export const getIntentMeta = (intent) =>
  INTENT_OPTIONS.find((option) => option.value === intent) || INTENT_OPTIONS[0];

export const getFeedbackStyleMeta = (feedbackStyle) =>
  FEEDBACK_STYLE_OPTIONS.find((option) => option.value === feedbackStyle) ||
  FEEDBACK_STYLE_OPTIONS[1];

export const getFeedbackPrompt = (intent, feedbackStyle) => {
  if (intent === "feedback") {
    if (feedbackStyle === "brutal-honesty") {
      return "What is the weakest part of this version, and what should change next?";
    }
    if (feedbackStyle === "expert-only") {
      return "Offer advanced critique, references, or craft-specific suggestions.";
    }
    return "What works already, and what would you improve next?";
  }

  if (intent === "collaborate") {
    return "How could you contribute, build, or partner on this Pixel?";
  }

  if (intent === "experiment") {
    return "What direction would you test next if this were your draft?";
  }

  return "What stands out to you about this Pixel?";
};

export const getIntentCTA = (intent) => {
  if (intent === "collaborate") {
    return "Connect";
  }
  if (intent === "feedback") {
    return "Give feedback";
  }
  if (intent === "experiment") {
    return "Suggest next step";
  }
  return "Open Pixel";
};

export const getPixelProfile = (pixels = []) => {
  const totalVersions = pixels.reduce(
    (sum, pixel) => sum + (pixel.versions_count || pixel.versions?.length || 1),
    0,
  );
  const intentCounts = pixels.reduce((counts, pixel) => {
    const intent = pixel.intent || "showcase";
    counts[intent] = (counts[intent] || 0) + 1;
    return counts;
  }, {});

  const dominantIntent =
    Object.entries(intentCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ||
    "showcase";

  return {
    totalVersions,
    feedbackPixels: pixels.filter((pixel) => pixel.intent === "feedback").length,
    collaborationPixels: pixels.filter((pixel) => pixel.intent === "collaborate").length,
    experimentalPixels: pixels.filter((pixel) => pixel.intent === "experiment").length,
    dominantIntent,
  };
};
