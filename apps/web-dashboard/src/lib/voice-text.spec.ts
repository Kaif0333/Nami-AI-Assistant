import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatTextForSpeech,
  selectPreferredFemaleVoice
} from "./voice-text";

describe("voice text helpers", () => {
  it("removes markdown symbols before speech synthesis", () => {
    const spoken = formatTextForSpeech(
      [
        "## Summary",
        "**Albert Einstein** was a physicist.",
        "- Known for `relativity`.",
        "[Source](https://example.com)",
        "```html",
        "<main>*code*</main>",
        "```"
      ].join("\n")
    );

    assert.equal(
      spoken,
      "Summary Albert Einstein was a physicist. Known for relativity. Source Code block omitted from voice output."
    );
    assert.doesNotMatch(spoken, /[*#`]/);
    assert.doesNotMatch(spoken, /https?:\/\//);
  });

  it("prefers a female browser voice and avoids obvious male voices", () => {
    const voices = [
      { name: "Microsoft David Desktop", lang: "en-US" },
      { name: "Microsoft Zira Desktop", lang: "en-US" },
      { name: "Microsoft Mark Desktop", lang: "en-US" }
    ];

    assert.equal(selectPreferredFemaleVoice("female", voices)?.name, voices[1].name);
  });

  it("returns no voice instead of selecting an obvious male fallback", () => {
    const voices = [
      { name: "Microsoft David Desktop", lang: "en-US" },
      { name: "Microsoft Mark Desktop", lang: "en-US" }
    ];

    assert.equal(selectPreferredFemaleVoice("female", voices), undefined);
  });
});
