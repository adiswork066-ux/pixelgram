export const MOOD_OPTIONS = [
  {
    value: "electric",
    label: "Electric",
    badgeClass: "border-cyan-400/30 bg-cyan-500/15 text-cyan-200",
    panelClass: "border-cyan-400/20 bg-cyan-500/10",
    gradientClass: "from-cyan-400 via-sky-500 to-blue-500",
    accentClass: "text-cyan-300",
  },
  {
    value: "soft",
    label: "Soft",
    badgeClass: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
    panelClass: "border-emerald-400/20 bg-emerald-500/10",
    gradientClass: "from-emerald-300 via-teal-400 to-green-500",
    accentClass: "text-emerald-300",
  },
  {
    value: "curious",
    label: "Curious",
    badgeClass: "border-amber-400/30 bg-amber-500/15 text-amber-200",
    panelClass: "border-amber-400/20 bg-amber-500/10",
    gradientClass: "from-amber-300 via-orange-400 to-yellow-500",
    accentClass: "text-amber-300",
  },
  {
    value: "nostalgic",
    label: "Nostalgic",
    badgeClass: "border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-200",
    panelClass: "border-fuchsia-400/20 bg-fuchsia-500/10",
    gradientClass: "from-fuchsia-300 via-pink-400 to-rose-500",
    accentClass: "text-fuchsia-300",
  },
  {
    value: "chaotic",
    label: "Chaotic",
    badgeClass: "border-red-400/30 bg-red-500/15 text-red-200",
    panelClass: "border-red-400/20 bg-red-500/10",
    gradientClass: "from-rose-400 via-red-500 to-orange-500",
    accentClass: "text-red-300",
  },
  {
    value: "hopeful",
    label: "Hopeful",
    badgeClass: "border-violet-400/30 bg-violet-500/15 text-violet-200",
    panelClass: "border-violet-400/20 bg-violet-500/10",
    gradientClass: "from-violet-300 via-indigo-400 to-blue-500",
    accentClass: "text-violet-300",
  },
  {
    value: "unfiltered",
    label: "Unfiltered",
    badgeClass: "border-white/15 bg-white/5 text-white/80",
    panelClass: "border-white/10 bg-white/[0.03]",
    gradientClass: "from-zinc-500 via-zinc-400 to-zinc-600",
    accentClass: "text-white/80",
  },
];

const ECHO_SUGGESTIONS = {
  electric: ["charged", "alive", "bold", "cinematic"],
  soft: ["gentle", "safe", "warm", "quiet"],
  curious: ["intriguing", "smart", "unexpected", "clever"],
  nostalgic: ["bittersweet", "familiar", "golden", "memory"],
  chaotic: ["wild", "unhinged", "loud", "restless"],
  hopeful: ["uplifting", "steady", "brave", "glowing"],
  unfiltered: ["real", "honest", "raw", "relatable"],
};

export const getMoodMeta = (mood) =>
  MOOD_OPTIONS.find((option) => option.value === mood) ||
  MOOD_OPTIONS[MOOD_OPTIONS.length - 1];

export const getEchoSuggestions = (mood) =>
  ECHO_SUGGESTIONS[mood] || ECHO_SUGGESTIONS.unfiltered;

export const getStoryProfile = (posts = []) => {
  const storyLayers = posts.filter((post) => (post.backstory || "").trim()).length;
  const totalEchoes = posts.reduce((sum, post) => sum + (post.echo_count || 0), 0);
  const moodCounts = posts.reduce((counts, post) => {
    const mood = post.mood || "unfiltered";
    counts[mood] = (counts[mood] || 0) + 1;
    return counts;
  }, {});

  const signatureMood =
    Object.entries(moodCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ||
    "unfiltered";

  return {
    signatureMood,
    storyLayers,
    totalEchoes,
  };
};
