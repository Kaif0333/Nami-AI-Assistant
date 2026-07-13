const preferredFemaleVoiceNames = [
  "Microsoft Zira",
  "Microsoft Aria",
  "Microsoft Jenny",
  "Microsoft Sonia",
  "Microsoft Natasha",
  "Google US English Female",
  "Google UK English Female",
  "Samantha",
  "Victoria",
  "Karen",
  "Tessa",
  "Moira",
  "Joanna",
  "Salli",
  "Kendra",
  "Hannah"
];

const preferredFemaleVoiceFragments = [
  "zira",
  "aria",
  "jenny",
  "sonia",
  "natasha",
  "female",
  "woman",
  "girl",
  "samantha",
  "victoria",
  "karen",
  "tessa",
  "moira",
  "joanna",
  "salli",
  "kendra",
  "hannah"
];

const likelyMaleVoiceFragments = [
  "david",
  "mark",
  "george",
  "daniel",
  "james",
  "alex",
  "fred",
  "tom",
  "guy",
  "male"
];

type BrowserVoiceLike = {
  lang: string;
  name: string;
};

export function formatTextForSpeech(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " Code block omitted from voice output. ")
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/[*_~]+/g, "")
    .replace(/[<>]/g, "")
    .replace(/\s*&\s*/g, " and ")
    .replace(/\s+/g, " ")
    .trim();
}

export function selectPreferredFemaleVoice<TVoice extends BrowserVoiceLike>(
  requestedVoiceName: string,
  voices: readonly TVoice[]
) {
  const requested = requestedVoiceName.trim().toLowerCase();

  if (requested && requested !== "system" && requested !== "female") {
    const exactMatch = voices.find(
      (voice) =>
        voice.name.toLowerCase() === requested &&
        !isLikelyMaleVoiceName(voice.name)
    );

    if (exactMatch) {
      return exactMatch;
    }

    const namedMatch = voices.find(
      (voice) =>
        voice.name.toLowerCase().includes(requested) &&
        !isLikelyMaleVoiceName(voice.name)
    );

    if (namedMatch) {
      return namedMatch;
    }
  }

  for (const preferredName of preferredFemaleVoiceNames) {
    const normalizedPreferredName = preferredName.toLowerCase();
    const match = voices.find((voice) =>
      voice.name.toLowerCase().includes(normalizedPreferredName)
    );

    if (match) {
      return match;
    }
  }

  const fragmentMatch = voices.find((voice) =>
    preferredFemaleVoiceFragments.some((fragment) =>
      voice.name.toLowerCase().includes(fragment)
    )
  );

  if (fragmentMatch) {
    return fragmentMatch;
  }

  return voices.find(
    (voice) =>
      voice.lang.toLowerCase().startsWith("en") &&
      !isLikelyMaleVoiceName(voice.name)
  );
}

function isLikelyMaleVoiceName(name: string) {
  const normalized = name.toLowerCase();

  return likelyMaleVoiceFragments.some((fragment) =>
    normalized.includes(fragment)
  );
}
