export type PanelCount = 1 | 2 | 3 | 4 | 5;

// 後方互換のため残す
export type ImageType = "single" | "4koma";

/* ------------------------------------------------------------------ */
/* Image Presets (8種)                                                  */
/* ------------------------------------------------------------------ */

export type AspectRatio = "1:1" | "4:5" | "9:16" | "16:9";

export type ImagePreset = {
  id:             string;
  label:          string;
  desc:           string;
  icon:           string;
  panelCount:     PanelCount;
  defaultAr:      AspectRatio;   // このプリセットのデフォルトAR
  locksAr:        boolean;       // true = ユーザーがARを変更できない（4コマ専用）
  styleOverride?: string;
  moodOverride?:  string;
  modifier?:      string;
  overridesGenre: boolean;
  stageLabels?:   string[];
  postNote:       string;
};

export const IMAGE_PRESETS: ImagePreset[] = [
  {
    id: "single",
    label: "1枚画像",
    desc: "インパクトのある1枚",
    icon: "🖼",
    panelCount: 1,
    defaultAr: "1:1",
    locksAr: false,
    overridesGenre: false,
    postNote: "1枚の画像が添付されます",
  },
  {
    id: "comparison",
    label: "2枚比較",
    desc: "Before / After・AとB",
    icon: "⚖️",
    panelCount: 2,
    defaultAr: "16:9",
    locksAr: false,
    modifier: "comparison layout, two contrasting scenes, clearly divided left and right",
    overridesGenre: false,
    stageLabels: ["Before / A", "After / B"],
    postNote: "2枚比較の画像（左右対比）が添付されます",
  },
  {
    id: "vertical3",
    label: "縦3コマ",
    desc: "縦読み・スマホ向け",
    icon: "📱",
    panelCount: 3,
    defaultAr: "9:16",
    locksAr: false,
    modifier: "vertical strip, tall portrait layout, top-to-bottom reading order, smartphone optimized",
    overridesGenre: false,
    postNote: "縦3コマ（スマホ向け縦長）の画像が添付されます",
  },
  {
    id: "4koma",
    label: "4コマ漫画",
    desc: "4コマ（起承転結）",
    icon: "📖",
    panelCount: 4,
    defaultAr: "1:1",  // UI表示用（実際は2:3に強制）
    locksAr: true,      // 4コマは2:3に固定
    overridesGenre: false,
    postNote: "4コマ漫画形式（4枚組）の画像が添付されます",
  },
  {
    id: "darkHorror",
    label: "暗いホラー",
    desc: "恐怖・深い闇・不安",
    icon: "👻",
    panelCount: 1,
    defaultAr: "9:16",
    locksAr: false,
    styleOverride: "extremely dark, deeply unsettling, sinister shadows, pitch black atmosphere, nightmare aesthetic",
    moodOverride: "terrifying, bone-chilling, deeply disturbing, psychological dread",
    modifier: "maximum darkness, shadows consuming the frame, implied horror, viewer unease",
    overridesGenre: true,
    postNote: "暗いホラースタイルの画像（1枚）が添付されます",
  },
  {
    id: "brightMood",
    label: "明るい雰囲気",
    desc: "ポジティブ・爽やか・希望",
    icon: "☀️",
    panelCount: 1,
    defaultAr: "1:1",
    locksAr: false,
    styleOverride: "bright, cheerful, warm golden sunlight, vibrant pastel colors, uplifting energy",
    moodOverride: "joyful, optimistic, refreshing, heartwarming, energetic",
    modifier: "positive atmosphere, inviting composition, warm color palette",
    overridesGenre: true,
    postNote: "明るくポジティブな雰囲気の画像（1枚）が添付されます",
  },
  {
    id: "contemplation",
    label: "考察用画像",
    desc: "問いかけ・哲学的・シンボル",
    icon: "🔍",
    panelCount: 1,
    defaultAr: "4:5",
    locksAr: false,
    styleOverride: "thought-provoking, symbolic composition, layered visual meaning, philosophical atmosphere",
    moodOverride: "contemplative, mysterious, deep, meaningful, open to interpretation",
    modifier: "designed to provoke thought and discussion, symbolic elements, ambiguous yet intriguing",
    overridesGenre: true,
    postNote: "考察・議論を促す象徴的な画像（1枚）が添付されます",
  },
  {
    id: "oddity",
    label: "違和感探し",
    desc: "探せ「おかしい」ところ",
    icon: "👁",
    panelCount: 1,
    defaultAr: "1:1",
    locksAr: false,
    styleOverride: "seemingly normal everyday scene, subtle uncanny wrongness hidden within, almost-right-but-not-quite",
    moodOverride: "subtly unsettling, hidden danger, something is not right, slightly off",
    modifier: "one subtle anomaly or wrongness carefully hidden in otherwise normal scene, viewers must search carefully",
    overridesGenre: true,
    postNote: "違和感探し（隠れた異変）の画像（1枚）が添付されます。「何がおかしい？」と問いかける投稿に。",
  },
];

export function getPreset(id: string): ImagePreset {
  return IMAGE_PRESETS.find((p) => p.id === id) ?? IMAGE_PRESETS[0];
}

export type ImagePromptInput = {
  subject: string;
  genre: string;
  style?: string;
  mood?: string;
  aspectRatio?: AspectRatio | "4:3" | "2:3";  // 4:3/2:3は後方互換
  imageType?: ImageType;
  panelCount?: PanelCount;
  presetId?: string;
};

export type ImagePromptOutput = {
  tool: string;
  prompt: string;
  negativePrompt?: string;
  params?: string;
  panels?: string[];       // パネルごとの説明（2枚以上）
};

/* ------------------------------------------------------------------ */
/* Panel config                                                         */
/* ------------------------------------------------------------------ */

type PanelConfig = {
  keyword:  string;   // プロンプトに必ず含めるキーワード
  mjAr:     string;   // Midjourney --ar パラメータ
  lockedAr: boolean;  // アスペクト比をロックするか
};

const PANEL_CONFIG: Record<PanelCount, PanelConfig> = {
  1: { keyword: "1 scene image",      mjAr: "--ar 1:1",  lockedAr: false },
  2: { keyword: "2 panel sequence",   mjAr: "--ar 16:9", lockedAr: false },
  3: { keyword: "3 panel strip",      mjAr: "--ar 16:9", lockedAr: false },
  4: { keyword: "4 panel manga",      mjAr: "--ar 2:3",  lockedAr: true  },
  5: { keyword: "5 panel sequence",   mjAr: "--ar 16:9", lockedAr: false },
};

/* ------------------------------------------------------------------ */
/* Stage labels per count                                               */
/* ------------------------------------------------------------------ */

const STAGE_NAMES: Record<PanelCount, string[]> = {
  1: ["Scene"],
  2: ["Setup", "Reveal"],
  3: ["Setup", "Escalation", "Climax"],
  4: ["Setup", "Buildup", "Climax", "Aftermath"],
  5: ["Normal", "Hint", "Escalation", "Climax", "Resolution"],
};

/* ------------------------------------------------------------------ */
/* Genre-specific panel progressions                                    */
/* ------------------------------------------------------------------ */

// 各ジャンル × 枚数 のパネル説明テンプレート
// 違和感の進行 = 普通 → 異変 → 高まり → クライマックス → 余韻

type Stages = Record<PanelCount, string[]>;

const GENRE_STAGES: Record<string, Stages> = {
  horror: {
    1: ["eerie abandoned location, dramatic shadow, unsettling atmosphere, strong visual impact"],
    2: [
      "ordinary peaceful scene, protagonist unaware, subtle wrongness lurking in background",
      "terrifying entity fully revealed, protagonist frozen in shock, peak horror moment",
    ],
    3: [
      "normal scene with faint unease, something slightly off that viewer notices before protagonist",
      "protagonist senses wrongness, tension rising, investigation begins, shadows deepen",
      "full horror revealed, confrontation at climax, maximum fear and dread",
    ],
    4: [
      "protagonist in seemingly safe situation, eerie detail barely visible in background",
      "anomaly undeniably present, protagonist approaches with caution, tension escalates",
      "terrifying confrontation, entity or horror fully exposed, peak terror",
      "haunting aftermath, protagonist changed, questions unanswered, lingering dread",
    ],
    5: [
      "completely ordinary everyday scene, no visible threat, calm atmosphere",
      "first barely-visible hint of wrongness, only viewer notices, protagonist oblivious",
      "danger escalates noticeably, protagonist alarmed, frantic investigation",
      "full climactic horror confrontation, everything revealed, peak emotion",
      "chilling resolution, traumatized protagonist, eerie silence, aftermath of events",
    ],
  },
  business: {
    1: ["professional setting, determined character, clean modern design, success atmosphere"],
    2: [
      "character overwhelmed by work, stress visible, cluttered environment",
      "breakthrough moment, insight achieved, confident expression, solution found",
    ],
    3: [
      "character facing challenging problem, thoughtful expression, complex task ahead",
      "deep in research and analysis, gathering data, progress being made",
      "successful outcome, satisfied expression, clean results, goal accomplished",
    ],
    4: [
      "character buried under workload, exhausted but determined",
      "clever idea strikes, lightbulb moment, energized and focused",
      "implementing the solution with enthusiasm and precision",
      "success achieved, celebration, satisfied smile, clean organized desk",
    ],
    5: [
      "starting point: character faces major challenge, realistic difficulty shown",
      "first small win, hope emerging, slight progress visible",
      "momentum building, clear path forward, confidence growing",
      "breakthrough execution, peak effort and focus",
      "triumphant outcome, transformation complete, inspiring result",
    ],
  },
  lifestyle: {
    1: ["warm lifestyle scene, authentic moment, natural lighting, relatable atmosphere"],
    2: [
      "character in familiar daily routine, comfortable but slightly unfulfilled",
      "positive change embraced, joy visible, transformation moment captured",
    ],
    3: [
      "ordinary morning routine, subtle dissatisfaction in expression",
      "discovery of something new, curiosity sparked, exploration begins",
      "positive transformation, happiness achieved, life improved",
    ],
    4: [
      "character going through repetitive daily routine, autopilot mode",
      "small but meaningful observation changes perspective",
      "deliberate change implemented, active effort visible",
      "new habit established, warmth and contentment, better daily life",
    ],
    5: [
      "starting daily routine, comfortable but stagnant",
      "inspiration strikes from unexpected source",
      "small experiment tried, tentative first steps",
      "commitment deepens, visible progress and growth",
      "transformed lifestyle, authentic happiness, sustainable joy",
    ],
  },
  knowledge: {
    1: ["educational visualization, clear concept illustration, engaging and informative design"],
    2: [
      "character confronting confusing complex concept, overwhelmed expression",
      "understanding achieved, clear insight, confident knowledgeable expression",
    ],
    3: [
      "character encounters unknown concept, puzzled and curious expression",
      "research journey underway, books and screens, discovery process",
      "clear understanding achieved, ready to share knowledge confidently",
    ],
    4: [
      "character confused by complex topic, wanting to understand",
      "diving into research, systematic exploration of the concept",
      "aha moment of realization, suddenly everything clicks",
      "confidently explaining to others, knowledge shared, cycle complete",
    ],
    5: [
      "initial encounter with unknown concept, genuine curiosity",
      "surface-level research, gathering basic information",
      "deeper investigation, connecting dots between ideas",
      "full comprehension achieved, integrating new knowledge",
      "teaching and sharing with others, knowledge multiplied",
    ],
  },
};

function getStages(genre: string, count: PanelCount): string[] {
  return (GENRE_STAGES[genre] ?? GENRE_STAGES.knowledge)[count];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const STYLE_MAP: Record<string, string> = {
  horror:    "dark, eerie, atmospheric, fog, shadows, horror photography",
  business:  "professional, clean, minimal, corporate, modern design",
  lifestyle: "bright, warm, lifestyle photography, natural light",
  knowledge: "infographic style, illustrated, educational",
};

const MOOD_MAP: Record<string, string> = {
  scary:   "terrifying, unsettling, creepy atmosphere",
  happy:   "joyful, vibrant, uplifting",
  serious: "dramatic, high contrast, powerful",
  calm:    "peaceful, soft tones, serene",
};

function resolveCount(input: ImagePromptInput): PanelCount {
  if (input.panelCount) return input.panelCount;
  if (input.imageType === "4koma") return 4;
  return 1;
}

function resolveAr(input: ImagePromptInput, preset: ImagePreset | null, count: PanelCount): string {
  // 4コマは2:3に強制
  if (PANEL_CONFIG[count].lockedAr) return "2:3";
  // プリセットがARをロックしている場合（現在は4コマのみ）
  if (preset?.locksAr) return "2:3";
  // ユーザー選択 → プリセットデフォルト → "1:1"
  return input.aspectRatio ?? preset?.defaultAr ?? "1:1";
}

/* ------------------------------------------------------------------ */
/* Main generator                                                       */
/* ------------------------------------------------------------------ */

export function generateImagePrompts(input: ImagePromptInput): ImagePromptOutput[] {
  // プリセットが指定されている場合はその値でオーバーライド
  const preset   = input.presetId ? getPreset(input.presetId) : null;
  const count    = preset?.panelCount ?? resolveCount(input);
  const cfg      = PANEL_CONFIG[count];

  // スタイル・ムード解決（プリセット > ユーザー入力 > ジャンルデフォルト）
  const style    = preset?.overridesGenre
    ? (preset.styleOverride ?? "photorealistic, detailed")
    : (STYLE_MAP[input.genre] ?? "photorealistic, detailed");
  const mood     = preset?.overridesGenre
    ? (preset.moodOverride ?? "")
    : (MOOD_MAP[input.mood ?? ""] ?? "");
  const modifier = preset?.modifier ?? "";

  // アスペクト比（ユーザー選択 > プリセットデフォルト > "1:1"）
  const ar   = resolveAr(input, preset, count);
  const arMJ = `--ar ${ar}`;

  const stages     = getStages(input.genre, count);
  const stageNames = preset?.stageLabels ?? STAGE_NAMES[count];
  const { subject } = input;

  if (count === 1) {
    // ── 1枚 ─────────────────────────────────────────────────────────
    const scene  = stages[0];
    const extras = [modifier].filter(Boolean).join(", ");
    const arText = `aspect ratio ${ar}`;

    return [
      {
        tool:   "Midjourney",
        prompt: `${subject}, ${scene}, ${style}, ${mood}${extras ? ", " + extras : ""}, masterpiece, highly detailed, cinematic ${arMJ} --v 6 --style raw --q 2`,
        params: `${arMJ} --v 6`,
      },
      {
        tool:          "Stable Diffusion",
        prompt:        `${subject}, ${scene}, ${style}, ${mood}${extras ? ", " + extras : ""}, ${arText}, 8k, ultra detailed, masterpiece, best quality`,
        negativePrompt:"blurry, low quality, watermark, text, deformed, ugly",
        params:        "Steps: 30, CFG: 7, Sampler: DPM++ 2M Karras",
      },
      {
        tool:   "DALL-E 3",
        prompt: `Create a high-quality image of: ${subject}. Scene: ${scene}. Style: ${style}. Mood: ${mood}.${extras ? " Special: " + extras + "." : ""} ${arText}.`,
      },
      {
        tool:   "Grok (Aurora)",
        prompt: `${subject} — ${scene}, ${style}, ${mood}${extras ? ", " + extras : ""}, ${arText}, photorealistic, high resolution`,
      },
    ];
  }

  // ── 2〜5枚 ─────────────────────────────────────────────────────────
  const panelLines = stages.map((desc, i) =>
    `Panel ${i + 1} (${stageNames[i]}): ${subject} — ${desc}`
  );
  const extras  = [modifier].filter(Boolean).join(", ");
  const arText  = `aspect ratio ${ar}`;

  return [
    {
      tool: "Midjourney",
      prompt: [
        `${cfg.keyword}, ${subject},`,
        ...panelLines.map((l) => `${l},`),
        `${style}, ${mood}${extras ? ", " + extras : ""}, clean composition, sequential narrative`,
        `${arMJ} --v 6 --style raw`,
      ].join(" "),
      params:  `${arMJ} --v 6`,
      panels:  panelLines,
    },
    {
      tool: "Stable Diffusion",
      prompt: [
        `${cfg.keyword}, ${subject},`,
        ...panelLines.map((l) => `${l},`),
        `${style}, ${mood}${extras ? ", " + extras : ""}, ${arText}, panel borders, sequential layout, high quality`,
      ].join(" "),
      negativePrompt: "blurry, low quality, watermark, merged panels, missing panel borders, deformed, chaotic layout",
      params:         "Steps: 35, CFG: 7.5, Sampler: DPM++ 2M Karras",
      panels:         panelLines,
    },
    {
      tool: "DALL-E 3",
      prompt: [
        `Create a ${cfg.keyword} about: ${subject}.`,
        "",
        ...panelLines.map((l) => l),
        "",
        `Style: ${style}. Mood: ${mood}.${extras ? " Layout: " + extras + "." : ""} ${arText}. Each panel clearly separated.`,
      ].join("\n"),
      panels: panelLines,
    },
    {
      tool: "Grok (Aurora)",
      prompt: [
        `${cfg.keyword}, ${subject}.`,
        ...stages.map((desc, i) => `${i + 1}. (${stageNames[i]}) ${subject} — ${desc}`),
        `${style}, ${mood}${extras ? ", " + extras : ""}, ${arText}, sequential`,
      ].join(" "),
      panels: panelLines,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Export helpers for UI                                                */
/* ------------------------------------------------------------------ */

export { PANEL_CONFIG, STAGE_NAMES };
export type { PanelConfig };
