"use client";
import { useState, useEffect } from "react";
import { useAccount } from "@/contexts/AccountContext";
import {
  TRIGGERS,
  AUTO_TRIGGER_MAP,
  getTrigger,
  type TriggerId,
  type PostType as TriggerPostType,
} from "@/lib/triggers";
import {
  PSYCH_LAWS,
  AUTO_LAW_MAP,
  type PsychLawId,
  type PostType as PsychPostType,
} from "@/lib/psychLaws";

/** レスポンスを安全に JSON パースする。空・非JSONでも必ずオブジェクトを返す */
async function safeJson(res: Response): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const text = await res.text().catch(() => "");
  if (!text.trim()) {
    return { ok: false, data: { error: "レスポンスが空です（APIエラー）" } };
  }
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    return { ok: res.ok, data };
  } catch {
    const preview = text.slice(0, 120).replace(/\n/g, " ");
    return { ok: false, data: { error: `JSONパースエラー: "${preview}"` } };
  }
}

type PostType = "バズ" | "考察" | "刺さる";
type RiskLevel = "safe" | "caution" | "blocked" | "checking" | "error";

type GuardState = {
  riskLevel:  RiskLevel;
  violations: { ruleName: string; detail: string; level: string }[];
  fixedPost:  string | null;
  fixNote:    string | null;
  showFixed:  boolean;
};

type QualityIssue = {
  checkId:  string;
  name:     string;
  level:    "blocked" | "warning" | "info";
  detail:   string;
  hint?:    string;
};

type QualityState = {
  checking:           boolean;
  overallRisk:        "safe" | "caution" | "blocked";
  issues:             QualityIssue[];
  fixedContent:       string | null;
  postTypeSuggestion: string | null;
  structureInsight:   string | null;
  showFixed:          boolean;
};
type GenMode = "claude" | "rule";

type MicroScore = {
  humanness:      number;
  hookStrength:   number;
  commentability: number;
  temperature:    number;
  clarity:        number;
  dissonance:     number;
};

type TuneState = {
  checking:     boolean;
  scores:       MicroScore | null;
  issues:       { id: string; label: string; detail: string; severity: string }[];
  overall:      number;
  needsTune:    boolean;
  tunedContent: string | null;
  seriesHint:   string | null;
  showTuned:    boolean;
};

type AutofixState = {
  processing:   boolean;
  fixedContent: string | null;
  changeNote:   string | null;
  applied:      string[];
  changed:      boolean;
  showFixed:    boolean;
};

type ClaudePost = {
  content:              string;
  imagePrompt:          string;
  videoPrompt:          string;
  triggersApplied?:     string[];
  triggerAim?:          string;
  psychLawsApplied?:    string[];
  psychLawExplanation?: string;
  horrorTier?:          "good" | "minor" | "bad";
  horrorPassed?:        boolean;
  horrorOverall?:       number;
  horrorFailedChecks?:  string[];
  horrorScores?:        MicroScore | null;
  horrorSuggestions?:   { type: string; description: string; instruction: string }[];
};

type PostLength = "short" | "medium" | "long";

const POST_LENGTHS: { value: PostLength; label: string; range: string; hint: string; color: string }[] = [
  { value: "short",  label: "短文", range: "〜100字",    hint: "フック特化",      color: "bg-sky-700 border-sky-500"    },
  { value: "medium", label: "中文", range: "100〜250字", hint: "違和感＋余白",    color: "bg-teal-700 border-teal-500"  },
  { value: "long",   label: "長文", range: "250〜500字", hint: "ストーリー＋没入", color: "bg-indigo-700 border-indigo-500" },
];

type RulePost = {
  content: string;
  score: number;
  tags: string[];
  imagePromptHint: string;
  videoPromptHint: string;
};

type Account = { id: string; name: string; handle: string };
type Genre = { id: string; name: string };

const IMAGE_PRESETS = [
  { id: "single",        label: "1枚",     icon: "🖼",  panelCount: 1, styleHint: "single image"             },
  { id: "comparison",    label: "2枚比較", icon: "⚖️",  panelCount: 2, styleHint: "side-by-side comparison"  },
  { id: "vertical3",     label: "縦3コマ", icon: "📱",  panelCount: 3, styleHint: "vertical 3-panel"         },
  { id: "4koma",         label: "4コマ",   icon: "📖",  panelCount: 4, styleHint: "4-panel manga"            },
  { id: "darkHorror",    label: "ホラー",  icon: "🌑",  panelCount: 1, styleHint: "dark horror atmosphere"   },
  { id: "brightMood",    label: "明るい",  icon: "☀️",  panelCount: 1, styleHint: "bright cheerful mood"     },
  { id: "contemplation", label: "考察",    icon: "🤔",  panelCount: 1, styleHint: "contemplative analytical" },
  { id: "oddity",        label: "違和感",  icon: "👁",  panelCount: 1, styleHint: "uncanny surreal oddity"   },
] as const;
type ImagePresetId = typeof IMAGE_PRESETS[number]["id"];

const ASPECT_RATIOS = [
  { value: "1:1",  label: "1:1",  desc: "正方形"    },
  { value: "4:5",  label: "4:5",  desc: "縦長"      },
  { value: "9:16", label: "9:16", desc: "ストーリー" },
  { value: "16:9", label: "16:9", desc: "横長"      },
] as const;
type AspectRatio = typeof ASPECT_RATIOS[number]["value"];

const POST_TYPES: { value: PostType; label: string; desc: string; color: string }[] = [
  { value: "バズ", label: "バズ", desc: "強烈フック・拡散狙い", color: "bg-orange-600 hover:bg-orange-500 border-orange-500" },
  { value: "考察", label: "考察", desc: "独自視点・論理的", color: "bg-blue-600 hover:bg-blue-500 border-blue-500" },
  { value: "刺さる", label: "刺さる", desc: "感情直撃・共感重視", color: "bg-purple-600 hover:bg-purple-500 border-purple-500" },
];

export default function GeneratePage() {
  const { account } = useAccount();
  const [mode, setMode] = useState<GenMode>("claude");
  const [theme, setTheme] = useState("");
  const [accountId, setAccountId] = useState("");
  const [genreId, setGenreId] = useState("");
  const [postType, setPostType] = useState<PostType>("バズ");
  const [mood, setMood] = useState("");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [postLength,       setPostLength]       = useState<PostLength>("medium");
  const [imagePreset,      setImagePreset]      = useState<ImagePresetId>("single");
  const [aspectRatio,      setAspectRatio]      = useState<AspectRatio>("1:1");
  const [triggerMode,      setTriggerMode]      = useState<"auto" | "manual">("auto");
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [lawMode,          setLawMode]          = useState<"auto" | "manual">("auto");
  const [selectedLaws,     setSelectedLaws]     = useState<PsychLawId[]>([]);
  const [naturalBreak,     setNaturalBreak]     = useState(false);
  const [claudeResults, setClaudeResults] = useState<ClaudePost[]>([]);
  const [ruleResults,   setRuleResults]   = useState<RulePost[]>([]);
  const [guardStates,   setGuardStates]   = useState<GuardState[]>([]);
  const [qualityStates, setQualityStates] = useState<QualityState[]>([]);
  const [tuneStates,    setTuneStates]    = useState<TuneState[]>([]);
  const [autofixStates, setAutofixStates] = useState<AutofixState[]>([]);
  const [usedPatterns, setUsedPatterns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [inited, setInited] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [cacheInfo, setCacheInfo] = useState<{ hit: boolean; read: number } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error,          setError]          = useState<string | null>(null);
  const [previewIndex,   setPreviewIndex]   = useState<number | null>(null);
  const [horrorAttempts,  setHorrorAttempts]  = useState<number | null>(null);
  const [horrorApplying,  setHorrorApplying]  = useState<Record<number, boolean>>({});
  const [horrorRegenning, setHorrorRegenning] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (inited) return;
    setInited(true);
    Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/genres").then((r) => r.json()),
    ]).then(([a, g]) => {
      setAccounts(a);
      setGenres(g);
    });
  }, [inited]);

  // アクティブアカウントをデフォルトにセット
  useEffect(() => {
    if (account?.id && !accountId) setAccountId(account.id);
  }, [account]);

  const selectedGenre = genres.find((g) => g.id === genreId);

  /** 自動/手動に応じてトリガーIDリストを返す */
  function resolveTriggers(): string[] {
    if (triggerMode === "auto") {
      return AUTO_TRIGGER_MAP[postType as TriggerPostType] ?? [];
    }
    return selectedTriggers;
  }

  function toggleTrigger(id: string) {
    setSelectedTriggers((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function resolvePsychLaws(): PsychLawId[] {
    if (lawMode === "auto") return AUTO_LAW_MAP[postType as PsychPostType] ?? [];
    return selectedLaws;
  }

  function toggleLaw(id: PsychLawId) {
    setSelectedLaws((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }

  async function generate() {
    if (mode === "claude" && !genreId) return;
    if (mode === "rule" && !theme) return;
    setLoading(true);
    setSavedId(null);
    setCacheInfo(null);
    setUsedPatterns([]);
    setTuneStates([]);
    setAutofixStates([]);
    setHorrorAttempts(null);
    setError(null);

    try {
      if (mode === "claude") {
        const genreName    = selectedGenre?.name ?? genreId;
        const isHorror     = /horror|ホラー|怪談|恐怖/i.test(genreName);
        const endpoint     = isHorror ? "/api/generate/horror" : "/api/generate/claude";
        const basePayload  = {
          genre:       genreName,
          postType,
          theme:        theme || undefined,
          accountId:    accountId || undefined,
        };
        const claudePayload = isHorror ? basePayload : {
          ...basePayload,
          postLength,
          panelCount:  IMAGE_PRESETS.find((p) => p.id === imagePreset)?.panelCount ?? 1,
          imageStyle:  IMAGE_PRESETS.find((p) => p.id === imagePreset)?.styleHint,
          aspectRatio,
          triggerIds:   resolveTriggers(),
          psychLawIds:  resolvePsychLaws(),
          naturalBreak: naturalBreak || undefined,
        };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(claudePayload),
        });
        const { ok, data } = await safeJson(res);
        if (!ok) {
          setError((data.error as string | undefined) ?? "生成に失敗しました");
        } else {
          const posts = (data.posts as typeof claudeResults) ?? [];
          setClaudeResults(posts);
          setUsedPatterns((data.usedPatterns as string[]) ?? []);
          if (isHorror) {
            setHorrorAttempts((data.horrorAttempts as number | null) ?? null);
          } else {
            const usage = data.usage as { cacheHit?: boolean; cacheRead?: number } | undefined;
            setCacheInfo({ hit: usage?.cacheHit ?? false, read: usage?.cacheRead ?? 0 });
          }
          // X安全チェック + 品質チェック + 微調整チェックを並列実行
          runGuardChecks(posts, genreName, postType).catch(() => {});
          runQualityChecksForPosts(posts, genreName, postType).catch(() => {});
          runTuneAndAutofix(posts, postType, accountId || undefined).catch(() => {});
        }
      } else {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            theme,
            genreId: genreId || undefined,
            accountId: accountId || undefined,
            mood: mood || undefined,
            length,
          }),
        });
        const { ok, data } = await safeJson(res);
        if (!ok) {
          setError((data.error as string | undefined) ?? "生成に失敗しました");
        } else {
          setRuleResults(data as unknown as typeof ruleResults);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ネットワークエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  /** 生成後に各投稿をチェック（並列） */
  async function runGuardChecks(posts: ClaudePost[], genre: string, pType: string) {
    const initial: GuardState[] = posts.map(() => ({
      riskLevel: "checking", violations: [], fixedPost: null, fixNote: null, showFixed: false,
    }));
    setGuardStates(initial);

    await Promise.all(posts.map(async (post, i) => {
      try {
        const res  = await fetch("/api/guard/check", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            content:      post.content,
            imagePrompt:  post.imagePrompt,
            videoPrompt:  post.videoPrompt,
            genre,
            postType:     pType,
          }),
        });
        const { data } = await safeJson(res);
        setGuardStates((prev) => {
          const next = [...prev];
          const rLvl  = (data.riskLevel as RiskLevel | undefined) ?? "error";
          const fPost = (data.fixedPost as string | null) ?? null;
          next[i] = {
            riskLevel:  rLvl,
            violations: (data.violations as GuardState["violations"]) ?? [],
            fixedPost:  fPost,
            fixNote:    (data.fixNote as string | null) ?? null,
            showFixed:  rLvl === "blocked" && fPost !== null, // blocked なら自動で修正版を表示
          };
          return next;
        });
      } catch {
        setGuardStates((prev) => {
          const next = [...prev];
          next[i] = { riskLevel: "error", violations: [], fixedPost: null, fixNote: null, showFixed: false };
          return next;
        });
      }
    }));
  }

  /** 品質チェック（並列） */
  async function runQualityChecksForPosts(posts: ClaudePost[], genre: string, pType: string) {
    const initial: QualityState[] = posts.map(() => ({
      checking: true, overallRisk: "safe", issues: [], fixedContent: null,
      postTypeSuggestion: null, structureInsight: null, showFixed: false,
    }));
    setQualityStates(initial);

    await Promise.all(posts.map(async (post, i) => {
      try {
        const res = await fetch("/api/guard/quality-check", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            content:      post.content,
            imagePrompt:  post.imagePrompt,
            videoPrompt:  post.videoPrompt,
            accountId:    accountId || undefined,
            postType:     pType,
            genre,
          }),
        });
        const { data } = await safeJson(res);
        setQualityStates((prev) => {
          const next = [...prev];
          next[i] = {
            checking:           false,
            overallRisk:        (data.overallRisk as QualityState["overallRisk"]) ?? "safe",
            issues:             (data.issues as QualityIssue[]) ?? [],
            fixedContent:       (data.fixedContent as string | null) ?? null,
            postTypeSuggestion: (data.postTypeSuggestion as string | null) ?? null,
            structureInsight:   (data.structureInsight as string | null) ?? null,
            showFixed:          false,
          };
          return next;
        });
      } catch {
        setQualityStates((prev) => {
          const next = [...prev];
          next[i] = { checking: false, overallRisk: "safe", issues: [], fixedContent: null, postTypeSuggestion: null, structureInsight: null, showFixed: false };
          return next;
        });
      }
    }));
  }

  /** スコア分析 → 低スコア時はaggressive autofix を自動実行（ポストごとに並列） */
  async function runTuneAndAutofix(posts: ClaudePost[], pType: string, aId?: string) {
    setTuneStates(posts.map(() => ({
      checking: true, scores: null, issues: [], overall: 0,
      needsTune: false, tunedContent: null, seriesHint: null, showTuned: false,
    })));
    setAutofixStates(posts.map(() => ({
      processing: true, fixedContent: null, changeNote: null,
      applied: [], changed: false, showFixed: false,
    })));

    await Promise.all(posts.map(async (post, i) => {
      // Step 1: スコア分析
      let overall    = 100;
      let tuneScores: MicroScore | null = null;
      try {
        const tuneRes = await fetch("/api/generate/tune", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: post.content, postType: pType }),
        });
        const { data } = await safeJson(tuneRes);
        overall    = (data.overall as number) ?? 100;
        tuneScores = (data.scores as MicroScore | null) ?? null;
        setTuneStates((prev) => {
          const next = [...prev];
          next[i] = {
            checking:     false,
            scores:       (data.scores as MicroScore | null) ?? null,
            issues:       (data.issues as TuneState["issues"]) ?? [],
            overall,
            needsTune:    (data.needsTune as boolean) ?? false,
            tunedContent: (data.tunedContent as string | null) ?? null,
            seriesHint:   (data.seriesHint as string | null) ?? null,
            showTuned:    false,
          };
          return next;
        });
      } catch {
        setTuneStates((prev) => {
          const next = [...prev];
          next[i] = { checking: false, scores: null, issues: [], overall: 100, needsTune: false, tunedContent: null, seriesHint: null, showTuned: false };
          return next;
        });
      }

      // Step 2: autofix（スコア < 50 なら自動 aggressive、コメント誘発低なら専用修正）
      try {
        const aggressive       = overall < 50;
        const commentabilityFix = (tuneScores?.commentability ?? 100) < 35;
        const afRes = await fetch("/api/generate/autofix", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: post.content, postType: pType, accountId: aId,
            aggressiveMode: aggressive, commentabilityFix,
          }),
        });
        const { data } = await safeJson(afRes);
        const changed = (data.changed as boolean) ?? false;
        setAutofixStates((prev) => {
          const next = [...prev];
          next[i] = {
            processing:   false,
            fixedContent: (data.fixedContent as string | null) ?? null,
            changeNote:   (data.changeNote as string | null) ?? null,
            applied:      (data.applied as string[]) ?? [],
            changed,
            showFixed:    aggressive && changed, // 低スコアなら自動適用
          };
          return next;
        });
      } catch {
        setAutofixStates((prev) => {
          const next = [...prev];
          next[i] = { processing: false, fixedContent: null, changeNote: null, applied: [], changed: false, showFixed: false };
          return next;
        });
      }
    }));
  }

  /** ホラー改善案を適用 */
  async function applyHorrorSuggestion(idx: number, instruction: string) {
    const post = claudeResults[idx];
    if (!post) return;
    setHorrorApplying((prev) => ({ ...prev, [idx]: true }));
    try {
      const res = await fetch("/api/generate/horror/apply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: post.content, instruction, mode: "apply" }),
      });
      const { data } = await safeJson(res);
      if (data.appliedContent) {
        setClaudeResults((prev) => {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            content:            data.appliedContent as string,
            horrorTier:         data.horrorTier as ClaudePost["horrorTier"],
            horrorPassed:       data.horrorPassed as boolean,
            horrorOverall:      data.horrorOverall as number,
            horrorFailedChecks: (data.horrorFailedChecks as string[]) ?? [],
            horrorScores:       (data.horrorScores as MicroScore | null) ?? null,
            horrorSuggestions:  (data.horrorSuggestions as ClaudePost["horrorSuggestions"]) ?? [],
          };
          return next;
        });
      }
    } catch { /* silent */ }
    setHorrorApplying((prev) => ({ ...prev, [idx]: false }));
  }

  /** ホラー1投稿を再生成 */
  async function regenHorrorPost(idx: number) {
    setHorrorRegenning((prev) => ({ ...prev, [idx]: true }));
    try {
      const res = await fetch("/api/generate/horror/apply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "", mode: "regen",
          genre:    selectedGenre?.name ?? genreId,
          postType,
        }),
      });
      const { data } = await safeJson(res);
      if (data.appliedContent) {
        setClaudeResults((prev) => {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            content:            data.appliedContent as string,
            horrorTier:         data.horrorTier as ClaudePost["horrorTier"],
            horrorPassed:       data.horrorPassed as boolean,
            horrorOverall:      data.horrorOverall as number,
            horrorFailedChecks: (data.horrorFailedChecks as string[]) ?? [],
            horrorScores:       (data.horrorScores as MicroScore | null) ?? null,
            horrorSuggestions:  (data.horrorSuggestions as ClaudePost["horrorSuggestions"]) ?? [],
          };
          return next;
        });
      }
    } catch { /* silent */ }
    setHorrorRegenning((prev) => ({ ...prev, [idx]: false }));
  }

  async function savePost(content: string, imagePrompt: string, videoPrompt: string) {
    if (!accountId) { alert("アカウントを選択してください"); return; }
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          genreId: genreId || undefined,
          content,
          imagePrompt,
          videoPrompt,
          postType: mode === "claude" ? postType : null,
          usedPatterns: usedPatterns.length > 0 ? usedPatterns : undefined,
        }),
      });
      const { ok, data } = await safeJson(res);
      if (ok && data.id) setSavedId(data.id as string);
      else setError((data.error as string | undefined) ?? "保存に失敗しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存中にエラーが発生しました");
    }
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const results = mode === "claude" ? claudeResults : ruleResults;
  const hasResults = results.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">投稿生成</h1>
        <div className="flex gap-2 p-1 bg-zinc-800 rounded-lg">
          <button
            onClick={() => setMode("claude")}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${
              mode === "claude" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            Claude AI
          </button>
          <button
            onClick={() => setMode("rule")}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
              mode === "rule" ? "bg-zinc-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            ルールベース
          </button>
        </div>
      </div>

      {/* 入力フォーム */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-5">

        {/* Claude専用: 投稿タイプ */}
        {mode === "claude" && (
          <div>
            <label className="block text-sm text-zinc-400 mb-2">投稿タイプ *</label>
            <div className="grid grid-cols-3 gap-2">
              {POST_TYPES.map(({ value, label, desc, color }) => (
                <button
                  key={value}
                  onClick={() => setPostType(value)}
                  className={`relative p-3 rounded-lg border text-left transition-colors ${
                    postType === value
                      ? `${color} text-white border-transparent`
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  <div className="font-bold text-sm">{label}</div>
                  <div className={`text-xs mt-0.5 ${postType === value ? "text-white/70" : "text-zinc-500"}`}>
                    {desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 文字数モード（Claude専用） */}
        {mode === "claude" && (
          <div>
            <label className="block text-xs text-zinc-500 mb-2">文字数モード</label>
            <div className="grid grid-cols-3 gap-2">
              {POST_LENGTHS.map(({ value, label, range, hint, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPostLength(value)}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    postLength === value
                      ? `${color} text-white border-transparent`
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  <div className="font-bold text-sm">{label}</div>
                  <div className={`text-xs mt-0.5 ${postLength === value ? "text-white/70" : "text-zinc-500"}`}>{range}</div>
                  <div className={`text-xs mt-0.5 ${postLength === value ? "text-white/60" : "text-zinc-600"}`}>{hint}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 共通: ジャンル・アカウント */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              ジャンル {mode === "claude" ? "*" : ""}
            </label>
            <select
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
              value={genreId}
              onChange={(e) => setGenreId(e.target.value)}
            >
              <option value="">選択...</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">アカウント</label>
            <select
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm focus:outline-none"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">選択...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 心理トリガー選択（Claude専用） */}
        {mode === "claude" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-zinc-500">心理トリガー</label>
              <div className="flex gap-1 p-0.5 bg-zinc-800 rounded-md">
                {(["auto", "manual"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTriggerMode(m)}
                    className={`text-xs px-2.5 py-1 rounded transition-colors ${
                      triggerMode === m ? "bg-zinc-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {m === "auto" ? "自動" : "手動選択"}
                  </button>
                ))}
              </div>
            </div>

            {triggerMode === "auto" ? (
              <div className="flex flex-wrap gap-1.5">
                {resolveTriggers().map((id) => {
                  const t = getTrigger(id as TriggerId);
                  return (
                    <span key={id} className={`text-xs px-2 py-1 rounded-md font-medium ${t.color}`}>
                      {t.icon} {t.name}
                    </span>
                  );
                })}
                <span className="text-xs text-zinc-600 self-center ml-1">自動適用（{postType}）</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {TRIGGERS.map((t) => {
                  const active = selectedTriggers.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTrigger(t.id)}
                      title={t.description}
                      className={`text-xs px-2 py-1.5 rounded-md border text-left transition-colors ${
                        active
                          ? `${t.color} border-current`
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      <span>{t.icon} {t.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 心理法則エンジン（Claude専用） */}
        {mode === "claude" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-zinc-500">心理法則エンジン</label>
              <div className="flex gap-1 p-0.5 bg-zinc-800 rounded-md">
                {(["auto", "manual"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setLawMode(m)}
                    className={`text-xs px-2.5 py-1 rounded transition-colors ${
                      lawMode === m ? "bg-zinc-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {m === "auto" ? "自動" : "手動選択"}
                  </button>
                ))}
              </div>
            </div>

            {lawMode === "auto" ? (
              <div className="flex flex-wrap gap-1.5">
                {resolvePsychLaws().map((id) => {
                  const law = PSYCH_LAWS.find((l) => l.id === id);
                  if (!law) return null;
                  return (
                    <span key={id} className={`text-xs px-2 py-1 rounded-md font-medium ${law.color}`}>
                      {law.icon} {law.name}
                    </span>
                  );
                })}
                <span className="text-xs text-zinc-600 self-center ml-1">自動適用（{postType}）</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {PSYCH_LAWS.map((law) => {
                  const active = selectedLaws.includes(law.id);
                  return (
                    <button
                      key={law.id}
                      type="button"
                      onClick={() => toggleLaw(law.id)}
                      title={law.definition}
                      className={`text-xs px-2 py-1.5 rounded-md border text-left transition-colors ${
                        active
                          ? `${law.color} border-current`
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      <span>{law.icon} {law.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 自然崩しモード（Claude専用） */}
        {mode === "claude" && (
          <button
            type="button"
            onClick={() => setNaturalBreak((v) => !v)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors ${
              naturalBreak
                ? "bg-amber-900/20 border-amber-700/50 text-amber-400"
                : "bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-400"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">{naturalBreak ? "✍️" : "📝"}</span>
              <div>
                <div className="text-xs font-medium">自然崩しモード</div>
                <div className={`text-xs mt-0.5 ${naturalBreak ? "text-amber-500/70" : "text-zinc-600"}`}>
                  {naturalBreak
                    ? "思考途中感・言い直し・口語崩しを適用中"
                    : "思考途中感・言い直し・口語崩しを入れる"}
                </div>
              </div>
            </div>
            <div className={`relative w-9 h-5 rounded-full transition-colors flex-none ${naturalBreak ? "bg-amber-600" : "bg-zinc-700"}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${naturalBreak ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
          </button>
        )}

        {/* 画像タイプ + アスペクト比（Claude専用） */}
        {mode === "claude" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">画像タイプ</label>
              <div className="grid grid-cols-4 gap-1.5">
                {IMAGE_PRESETS.map(({ id, label, icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setImagePreset(id)}
                    className={`py-1.5 px-2 rounded-md border text-center transition-colors text-xs ${
                      imagePreset === id
                        ? "bg-blue-700 border-blue-500 text-white"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    <div>{icon}</div>
                    <div className="font-medium mt-0.5">{label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">アスペクト比</label>
              <div className="grid grid-cols-4 gap-1.5">
                {ASPECT_RATIOS.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAspectRatio(value)}
                    className={`py-1.5 px-2 rounded-md border text-center transition-colors text-xs ${
                      aspectRatio === value
                        ? "bg-blue-700 border-blue-500 text-white"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    <div className="font-mono font-medium">{label}</div>
                    <div className={`mt-0.5 ${aspectRatio === value ? "text-blue-200" : "text-zinc-600"}`}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* テーマ */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            テーマ・ネタ {mode === "rule" ? "*" : "(任意)"}
          </label>
          <input
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder={mode === "claude" ? "例: 廃病院の怪談、節約術、AI活用法... (省略可)" : "例: 怪談、生産性、節約術..."}
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          />
        </div>

        {/* ルールベース専用オプション */}
        {mode === "rule" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">ムード</label>
              <select
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm focus:outline-none"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
              >
                <option value="">自動</option>
                <option value="shock">衝撃</option>
                <option value="question">疑問</option>
                <option value="story">実話</option>
                <option value="value">価値</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">長さ</label>
              <select
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm focus:outline-none"
                value={length}
                onChange={(e) => setLength(e.target.value as "short" | "medium" | "long")}
              >
                <option value="short">短文 (60字)</option>
                <option value="medium">中文 (140字)</option>
                <option value="long">長文 (280字)</option>
              </select>
            </div>
          </div>
        )}

        <button
          onClick={generate}
          disabled={loading || (mode === "claude" ? !genreId : !theme)}
          className={`w-full disabled:opacity-50 disabled:cursor-not-allowed rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "claude"
              ? "bg-blue-600 hover:bg-blue-500"
              : "bg-zinc-600 hover:bg-zinc-500"
          }`}
        >
          {loading
            ? "生成中..."
            : mode === "claude"
            ? `Claude で「${postType}」投稿を3案生成`
            : "ルールベースで3案生成"}
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-md px-4 py-2 text-sm text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-3 text-red-600 hover:text-red-400">✕</button>
        </div>
      )}

      {/* 保存成功 */}
      {savedId && (
        <div className="bg-green-900/30 border border-green-700 rounded-md px-4 py-2 text-sm text-green-400">
          投稿を保存しました
        </div>
      )}

      {/* キャッシュ情報 */}
      {cacheInfo && mode === "claude" && (
        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md ${
          cacheInfo.hit ? "bg-green-900/20 text-green-500" : "bg-zinc-800 text-zinc-500"
        }`}>
          <span>{cacheInfo.hit ? "プロンプトキャッシュ ヒット" : "キャッシュ書き込み済み（次回から高速）"}</span>
          {cacheInfo.read > 0 && <span>({cacheInfo.read.toLocaleString()} tokens キャッシュから)</span>}
        </div>
      )}

      {/* 生成結果 */}
      {hasResults && (
        <div className="space-y-4">
          {mode === "claude"
            ? (claudeResults as ClaudePost[]).map((post, i) => {
                const guard    = guardStates[i];
                const risk     = guard?.riskLevel ?? "safe";
                const isBlocked = risk === "blocked";
                const isCaution = risk === "caution";
                const isChecking = risk === "checking";

                // 表示コンテンツ: X安全修正版 > 品質修正版 > 自動チューニング版 > 微調整版 > 元のコンテンツ
                const q      = qualityStates[i];
                const tune   = tuneStates[i];
                const autofix = autofixStates[i];
                const displayContent =
                  (isBlocked && guard?.showFixed && guard.fixedPost) ? guard.fixedPost :
                  (q?.showFixed && q.fixedContent) ? q.fixedContent :
                  (autofix?.showFixed && autofix.fixedContent) ? autofix.fixedContent :
                  (tune?.showTuned && tune.tunedContent) ? tune.tunedContent :
                  post.content;

                // カードの境界線スタイル
                const borderClass =
                  isBlocked  ? "border-red-700/60" :
                  isCaution  ? "border-yellow-700/60" :
                  risk === "safe" ? "border-green-700/30" : "border-zinc-800";

                return (
                <div key={i} className={`bg-zinc-900 border rounded-lg overflow-hidden ${borderClass}`}>

                  {/* ── ホラー検証バナー ── */}
                  {post.horrorTier === "good" && (
                    <div className="px-4 py-1.5 bg-green-900/10 border-b border-green-800/30 text-xs text-green-600 flex items-center gap-2">
                      <span>✓</span>
                      <span>ホラースコア通過 {post.horrorOverall !== undefined ? `（${(post.horrorOverall / 10).toFixed(1)}/10）` : ""}</span>
                    </div>
                  )}
                  {post.horrorTier === "minor" && (
                    <div className="px-4 py-3 bg-amber-950/20 border-b border-amber-900/30 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-400 font-medium flex items-center gap-1.5">
                          <span>⚠</span> 軽微な改善余地あり
                          {post.horrorOverall !== undefined && (
                            <span className="font-mono text-amber-500">（{(post.horrorOverall / 10).toFixed(1)}/10）</span>
                          )}
                        </span>
                        {horrorRegenning[i] ? (
                          <span className="text-zinc-500 text-xs">再生成中...</span>
                        ) : (
                          <button
                            onClick={() => regenHorrorPost(i)}
                            className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded transition-colors"
                          >
                            再生成
                          </button>
                        )}
                      </div>
                      {(post.horrorFailedChecks ?? []).map((c) => (
                        <div key={c} className="text-xs text-zinc-500 ml-1">• {c}</div>
                      ))}
                      {(post.horrorSuggestions ?? []).length > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="text-xs text-zinc-600">改善案（クリックで適用）:</div>
                          <div className="flex flex-wrap gap-1.5">
                            {(post.horrorSuggestions ?? []).map((sg) => (
                              <button
                                key={sg.type}
                                onClick={() => applyHorrorSuggestion(i, sg.instruction)}
                                disabled={horrorApplying[i]}
                                title={sg.description}
                                className="text-xs px-2 py-1 bg-amber-900/30 text-amber-400 hover:bg-amber-900/50 rounded-md transition-colors disabled:opacity-50"
                              >
                                {horrorApplying[i] ? "適用中..." : `+ ${sg.type}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {post.horrorTier === "bad" && (
                    <div className="px-4 py-3 bg-red-950/20 border-b border-red-900/30 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-red-400 font-medium flex items-center gap-1.5">
                          <span>⛔</span> 再生成を推奨
                          {post.horrorOverall !== undefined && (
                            <span className="font-mono">（{(post.horrorOverall / 10).toFixed(1)}/10）</span>
                          )}
                        </span>
                        {horrorRegenning[i] ? (
                          <span className="text-zinc-500 text-xs">再生成中...</span>
                        ) : (
                          <button
                            onClick={() => regenHorrorPost(i)}
                            className="text-xs px-2.5 py-1 bg-red-900/40 text-red-400 hover:bg-red-900/60 rounded transition-colors"
                          >
                            再生成
                          </button>
                        )}
                      </div>
                      {(post.horrorFailedChecks ?? []).map((c) => (
                        <div key={c} className="text-xs text-zinc-500 ml-1">• {c}</div>
                      ))}
                    </div>
                  )}

                  {/* ── Guard バナー ── */}
                  {isChecking && (
                    <div className="px-4 py-2 bg-zinc-800/50 text-xs text-zinc-500 flex items-center gap-2">
                      <span className="animate-pulse">●</span> 安全チェック中...
                    </div>
                  )}
                  {isBlocked && (
                    <div className="px-4 py-2 bg-red-900/30 border-b border-red-700/50 text-xs text-red-400 space-y-1">
                      <div className="font-medium flex items-center gap-1.5">
                        <span>⛔</span> X利用規約違反リスクあり — 保存・投稿は推奨しません
                      </div>
                      {guard.violations.map((v, vi) => (
                        <div key={vi} className="text-red-300/70 ml-4">• {v.ruleName}: {v.detail}</div>
                      ))}
                      {guard.fixedPost && (
                        <button
                          onClick={() => setGuardStates((prev) => {
                            const next = [...prev];
                            next[i] = { ...next[i], showFixed: !next[i].showFixed };
                            return next;
                          })}
                          className="mt-1 text-xs underline text-red-300 hover:text-red-200"
                        >
                          {guard.showFixed ? "元の投稿を表示" : "修正版を表示"}
                        </button>
                      )}
                    </div>
                  )}
                  {isCaution && (
                    <div className="px-4 py-2 bg-yellow-900/20 border-b border-yellow-700/50 text-xs text-yellow-400 space-y-1">
                      <div className="font-medium flex items-center gap-1.5">
                        <span>⚠</span> 注意: 表現に誤解を招く可能性があります
                      </div>
                      {guard.violations.map((v, vi) => (
                        <div key={vi} className="text-yellow-300/70 ml-4">• {v.ruleName}: {v.detail}</div>
                      ))}
                    </div>
                  )}
                  {risk === "safe" && !isChecking && (
                    <div className="px-4 py-1.5 bg-green-900/10 border-b border-green-800/30 text-xs text-green-600 flex items-center gap-1.5">
                      <span>✓</span> X安全チェック通過
                    </div>
                  )}

                  {/* ── 品質チェックバナー ── */}
                  {(() => {
                    const q = qualityStates[i];
                    if (!q) return null;
                    if (q.checking) return (
                      <div className="px-4 py-2 bg-zinc-800/40 text-xs text-zinc-500 flex items-center gap-2 border-b border-zinc-800">
                        <span className="animate-pulse">●</span> 品質チェック中...
                      </div>
                    );
                    if (!q.issues.length && !q.postTypeSuggestion && !q.structureInsight) return null;
                    return (
                      <div className="border-b border-zinc-800 px-4 py-3 space-y-2">
                        {/* 警告・ブロックイシュー */}
                        {q.issues.filter((x) => x.level !== "info").map((issue, ii) => (
                          <div key={ii} className={`text-xs rounded-md px-3 py-2 space-y-1 ${
                            issue.level === "blocked" ? "bg-red-900/20 text-red-400" : "bg-yellow-900/20 text-yellow-400"
                          }`}>
                            <div className="font-medium flex items-center gap-1.5">
                              <span>{issue.level === "blocked" ? "⛔" : "⚠"}</span>
                              {issue.name}: {issue.detail}
                            </div>
                            {issue.hint && <div className="text-xs opacity-70 ml-4">{issue.hint}</div>}
                          </div>
                        ))}
                        {/* infoイシュー（折りたたみ） */}
                        {q.issues.filter((x) => x.level === "info").length > 0 && (
                          <details className="text-xs text-zinc-500">
                            <summary className="cursor-pointer hover:text-zinc-400">
                              ℹ 品質ヒント {q.issues.filter((x) => x.level === "info").length}件
                            </summary>
                            <div className="mt-1.5 space-y-1 ml-2">
                              {q.issues.filter((x) => x.level === "info").map((issue, ii) => (
                                <div key={ii} className="text-zinc-500">• {issue.name}: {issue.detail}</div>
                              ))}
                            </div>
                          </details>
                        )}
                        {/* 修正版 */}
                        {q.fixedContent && q.overallRisk === "blocked" && (
                          <button
                            onClick={() => setQualityStates((prev) => {
                              const next = [...prev]; next[i] = { ...next[i], showFixed: !next[i].showFixed }; return next;
                            })}
                            className="text-xs underline text-blue-400 hover:text-blue-300"
                          >
                            {q.showFixed ? "元の投稿を表示" : "品質修正版を表示"}
                          </button>
                        )}
                        {/* 投稿タイプ提案 */}
                        {q.postTypeSuggestion && (
                          <div className="text-xs text-zinc-500 flex gap-1.5">
                            <span>💡</span><span>{q.postTypeSuggestion}</span>
                          </div>
                        )}
                        {/* 構造学習インサイト */}
                        {q.structureInsight && (
                          <div className="text-xs text-zinc-600">
                            📊 {q.structureInsight}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── 自動チューニングストリップ ── */}
                  {autofix?.processing && (
                    <div className="px-4 py-2 border-b border-zinc-800 text-xs text-zinc-600 flex items-center gap-2">
                      <span className="inline-block animate-spin">⚙</span> チューニング処理中...
                    </div>
                  )}
                  {autofix && !autofix.processing && autofix.changed && (
                    <div className="px-4 py-2.5 border-b border-amber-900/30 bg-amber-950/20 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {autofix.applied.map((label) => (
                            <span key={label} className="text-xs px-1.5 py-0.5 bg-amber-900/40 text-amber-400 rounded">
                              {label}
                            </span>
                          ))}
                        </div>
                        {autofix.changeNote && (
                          <p className="text-xs text-amber-600/80 leading-relaxed">{autofix.changeNote}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setAutofixStates((prev) => {
                          const next = [...prev];
                          next[i] = { ...next[i], showFixed: !next[i].showFixed };
                          return next;
                        })}
                        className={`text-xs px-2.5 py-1 rounded flex-none transition-colors ${
                          autofix.showFixed
                            ? "bg-amber-700 text-white"
                            : "bg-amber-900/40 text-amber-400 hover:bg-amber-900/60"
                        }`}
                      >
                        {autofix.showFixed ? "元に戻す" : "適用"}
                      </button>
                    </div>
                  )}

                  {/* ── 投稿文 ── */}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-zinc-500">
                        案 {i + 1}
                        {isBlocked && guard.showFixed && (
                          <span className="ml-1.5 text-green-400">（修正版）</span>
                        )}
                        {autofix?.showFixed && !guard?.showFixed && (
                          <span className="ml-1.5 text-amber-400">（チューニング済）</span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {tune?.scores && !tune.checking && (
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                            tune.overall >= 70 ? "text-green-400 bg-green-900/20" :
                            tune.overall >= 50 ? "text-yellow-400 bg-yellow-900/20" :
                            "text-red-400 bg-red-900/20"
                          }`}>
                            {(tune.overall / 10).toFixed(1)}/10
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          postType === "バズ" ? "bg-orange-900/40 text-orange-400" :
                          postType === "考察" ? "bg-blue-900/40 text-blue-400" :
                          "bg-purple-900/40 text-purple-400"
                        }`}>{postType}</span>
                      </div>
                    </div>

                    {/* 4次元スコア（0-10）*/}
                    {tune?.scores && !tune.checking && (
                      <div className="flex gap-3 mb-2 flex-wrap">
                        {([
                          { label: "フック",   val: tune.scores.hookStrength   },
                          { label: "人間らしさ", val: tune.scores.humanness    },
                          { label: "違和感",   val: tune.scores.dissonance     },
                          { label: "コメント誘発", val: tune.scores.commentability },
                        ] as { label: string; val: number }[]).map(({ label, val }) => (
                          <span key={label} className={`text-xs ${
                            val >= 65 ? "text-green-500" : val >= 45 ? "text-yellow-500" : "text-red-500"
                          }`}>
                            {label} <span className="font-mono">{(val / 10).toFixed(1)}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 内部ロジック（心理設計） — 折りたたみ */}
                    {((post.triggersApplied?.length ?? 0) > 0 || (post.psychLawsApplied?.length ?? 0) > 0) && (
                      <details className="mb-3 group">
                        <summary className="cursor-pointer text-xs text-zinc-600 hover:text-zinc-500 select-none flex items-center gap-1.5 list-none">
                          <span className="text-zinc-700 group-open:hidden">▶</span>
                          <span className="text-zinc-700 hidden group-open:inline">▼</span>
                          内部ロジック（投稿文には非表示）
                        </summary>
                        <div className="mt-2 pl-3 border-l border-zinc-800 space-y-2">
                          {/* 心理トリガー */}
                          {(post.triggersApplied?.length ?? 0) > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs text-zinc-700">心理トリガー</div>
                              <div className="flex flex-wrap gap-1">
                                {post.triggersApplied!.map((name) => {
                                  const t = TRIGGERS.find((tr) => tr.name === name);
                                  return (
                                    <span key={name} className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                                      {t?.icon ?? "🧠"} {name}
                                    </span>
                                  );
                                })}
                              </div>
                              {post.triggerAim && (
                                <p className="text-xs text-zinc-600 leading-relaxed">{post.triggerAim}</p>
                              )}
                            </div>
                          )}
                          {/* 心理法則 */}
                          {(post.psychLawsApplied?.length ?? 0) > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs text-zinc-700">心理法則</div>
                              <div className="flex flex-wrap gap-1">
                                {post.psychLawsApplied!.map((name) => {
                                  const law = PSYCH_LAWS.find((l) => l.name === name);
                                  return (
                                    <span key={name} className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                                      {law?.icon ?? "🔬"} {name}
                                    </span>
                                  );
                                })}
                              </div>
                              {post.psychLawExplanation && (
                                <p className="text-xs text-zinc-600 leading-relaxed">{post.psychLawExplanation}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </details>
                    )}

                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isBlocked && !guard?.showFixed ? "opacity-50 line-through decoration-red-500/50" : ""}`}>
                      {displayContent}
                    </p>
                    <div className="mt-2 text-xs text-zinc-600">{displayContent.length}文字</div>

                    <div className="mt-3 flex gap-2 flex-wrap">
                      <button
                        onClick={() => setPreviewIndex(i)}
                        className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors"
                      >
                        詳細評価
                      </button>
                      <button
                        onClick={() => copy(displayContent, `content-${i}`)}
                        className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
                      >
                        {copied === `content-${i}` ? "コピー済!" : "コピー"}
                      </button>
                      {!isBlocked && (
                        <button
                          onClick={() => savePost(displayContent, post.imagePrompt, post.videoPrompt)}
                          className="text-xs px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded-md transition-colors"
                        >
                          保存
                        </button>
                      )}
                      {isBlocked && !guard.showFixed && guard.fixedPost && (
                        <button
                          onClick={() => setGuardStates((prev) => {
                            const next = [...prev]; next[i] = { ...next[i], showFixed: true }; return next;
                          })}
                          className="text-xs px-3 py-1.5 bg-green-800 hover:bg-green-700 rounded-md transition-colors"
                        >
                          修正版を使う
                        </button>
                      )}
                      {isBlocked && guard.showFixed && (
                        <button
                          onClick={() => savePost(displayContent, post.imagePrompt, post.videoPrompt)}
                          className="text-xs px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded-md transition-colors"
                        >
                          修正版を保存
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── 微調整パネル ── */}
                  {tune && !tune.checking && tune.scores && (
                    <div className="border-t border-zinc-800 px-5 py-3">
                      <details className="group">
                        <summary className="cursor-pointer flex items-center justify-between select-none list-none">
                          <div className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-400">
                            <span className="text-zinc-700 group-open:hidden">▶</span>
                            <span className="text-zinc-700 hidden group-open:inline">▼</span>
                            品質微調整
                          </div>
                          <div className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                            tune.overall >= 70 ? "bg-green-900/40 text-green-400" :
                            tune.overall >= 50 ? "bg-yellow-900/40 text-yellow-400" :
                            "bg-red-900/40 text-red-400"
                          }`}>
                            {tune.overall}点
                          </div>
                        </summary>

                        <div className="mt-3 space-y-3">
                          {/* スコアグリッド */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                            {([
                              { key: "humanness",      label: "人間らしさ",   ideal: [50, 100] },
                              { key: "hookStrength",   label: "初速フック",   ideal: [50, 100] },
                              { key: "commentability", label: "コメント誘発", ideal: [40, 100] },
                              { key: "clarity",        label: "説明なさ",     ideal: [60, 100] },
                              { key: "dissonance",     label: "違和感",       ideal: [20, 70]  },
                              { key: "temperature",    label: "投稿温度",     ideal: [30, 70]  },
                            ] as { key: keyof MicroScore; label: string; ideal: [number, number] }[]).map(({ key, label, ideal }) => {
                              const val = tune.scores![key];
                              const inRange = val >= ideal[0] && val <= ideal[1];
                              return (
                                <div key={key} className="flex items-center gap-2 text-xs">
                                  <span className="text-zinc-600 w-16 flex-none">{label}</span>
                                  <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${inRange ? "bg-blue-500" : "bg-amber-600"}`}
                                      style={{ width: `${val}%` }}
                                    />
                                  </div>
                                  <span className={`font-mono w-7 text-right flex-none ${inRange ? "text-zinc-500" : "text-amber-500"}`}>
                                    {val}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* 問題一覧 */}
                          {tune.issues.length > 0 && (
                            <div className="space-y-1">
                              {tune.issues.map((issue) => (
                                <div key={issue.id} className={`text-xs px-2 py-1 rounded flex gap-1.5 ${
                                  issue.severity === "high"   ? "bg-red-900/20 text-red-400" :
                                  issue.severity === "medium" ? "bg-yellow-900/20 text-yellow-500" :
                                  "bg-zinc-800/50 text-zinc-500"
                                }`}>
                                  <span className="flex-none">{issue.severity === "high" ? "⚠" : "·"}</span>
                                  <span><span className="font-medium">{issue.label}</span>: {issue.detail}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* シリーズヒント */}
                          {tune.seriesHint && (
                            <div className="text-xs text-zinc-500 flex gap-1.5 bg-zinc-800/50 px-2 py-1.5 rounded">
                              <span className="flex-none">🔗</span>
                              <span>{tune.seriesHint}</span>
                            </div>
                          )}

                          {/* 調整版 */}
                          {tune.tunedContent && (
                            <button
                              onClick={() => setTuneStates((prev) => {
                                const next = [...prev];
                                next[i] = { ...next[i], showTuned: !next[i].showTuned };
                                return next;
                              })}
                              className="text-xs underline text-blue-400 hover:text-blue-300"
                            >
                              {tune.showTuned ? "元の投稿に戻す" : "微調整版を使う"}
                            </button>
                          )}
                        </div>
                      </details>
                    </div>
                  )}
                  {tune?.checking && (
                    <div className="border-t border-zinc-800 px-5 py-2 text-xs text-zinc-600 flex items-center gap-2">
                      <span className="animate-pulse">●</span> 品質微調整チェック中...
                    </div>
                  )}

                  {/* ── 画像・動画プロンプト ── */}
                  <div className="border-t border-zinc-800 grid grid-cols-2 divide-x divide-zinc-800">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-purple-400">画像プロンプト</span>
                        <button onClick={() => copy(post.imagePrompt, `img-${i}`)} className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors">
                          {copied === `img-${i}` ? "✓" : "コピー"}
                        </button>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{post.imagePrompt}</p>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-red-400">動画プロンプト</span>
                        <button onClick={() => copy(post.videoPrompt, `vid-${i}`)} className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors">
                          {copied === `vid-${i}` ? "✓" : "コピー"}
                        </button>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{post.videoPrompt}</p>
                    </div>
                  </div>
                </div>
                );
              })
            : (ruleResults as RulePost[]).map((post, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-zinc-500">案 {i + 1}</span>
                    <span className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full">
                      スコア {(post.score * 100).toFixed(0)}点
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  <details className="mt-3 text-xs text-zinc-600">
                    <summary className="cursor-pointer hover:text-zinc-400">プロンプトヒント</summary>
                    <div className="mt-2 space-y-1">
                      <div>画像: {post.imagePromptHint}</div>
                      <div>動画: {post.videoPromptHint}</div>
                    </div>
                  </details>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => copy(post.content, `rule-${i}`)}
                      className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
                    >
                      {copied === `rule-${i}` ? "コピー済!" : "コピー"}
                    </button>
                    <button
                      onClick={() => savePost(post.content, post.imagePromptHint, post.videoPromptHint)}
                      className="text-xs px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded-md transition-colors"
                    >
                      保存
                    </button>
                  </div>
                </div>
              ))}
        </div>
      )}

      {/* ── プレビュー評価モーダル ── */}
      {previewIndex !== null && claudeResults[previewIndex] && (() => {
        const pi     = previewIndex;
        const post   = claudeResults[pi];
        const guard  = guardStates[pi];
        const q      = qualityStates[pi];
        const tune   = tuneStates[pi];
        const af     = autofixStates[pi];
        const risk   = guard?.riskLevel ?? "safe";
        const isBlocked = risk === "blocked";
        const finalContent =
          (isBlocked && guard?.showFixed && guard.fixedPost) ? guard.fixedPost :
          (q?.showFixed && q.fixedContent) ? q.fixedContent :
          (af?.showFixed && af.fixedContent) ? af.fixedContent :
          (tune?.showTuned && tune.tunedContent) ? tune.tunedContent :
          post.content;

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
            onClick={(e) => e.target === e.currentTarget && setPreviewIndex(null)}
          >
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl">

              {/* ヘッダー */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">投稿前プレビュー評価</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    postType === "バズ" ? "bg-orange-900/40 text-orange-400" :
                    postType === "考察" ? "bg-blue-900/40 text-blue-400" :
                    "bg-purple-900/40 text-purple-400"
                  }`}>{postType}</span>
                </div>
                <button onClick={() => setPreviewIndex(null)} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
              </div>

              <div className="p-5 space-y-4">
                {/* 投稿文 */}
                <div className="bg-zinc-800/60 rounded-lg p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-100">{finalContent}</p>
                  <div className="mt-2 text-xs text-zinc-600 flex items-center justify-between">
                    <span>{finalContent.length}文字</span>
                    {af?.showFixed && <span className="text-amber-500">チューニング済</span>}
                    {isBlocked && guard?.showFixed && <span className="text-green-500">安全修正済</span>}
                  </div>
                </div>

                {/* スコア */}
                {tune?.scores && !tune.checking && (
                  <div>
                    <div className="text-xs text-zinc-500 mb-2">品質スコア</div>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { label: "フック力",    val: tune.scores.hookStrength,   ideal: [50, 100] as [number,number] },
                        { label: "人間らしさ",  val: tune.scores.humanness,      ideal: [50, 100] as [number,number] },
                        { label: "コメント誘発", val: tune.scores.commentability, ideal: [40, 100] as [number,number] },
                        { label: "違和感",      val: tune.scores.dissonance,     ideal: [20, 70]  as [number,number] },
                        { label: "説明なさ",    val: tune.scores.clarity,        ideal: [60, 100] as [number,number] },
                        { label: "投稿温度",    val: tune.scores.temperature,    ideal: [30, 70]  as [number,number] },
                      ]).map(({ label, val, ideal }) => {
                        const ok = val >= ideal[0] && val <= ideal[1];
                        return (
                          <div key={label} className="flex items-center gap-2 text-xs">
                            <span className="text-zinc-500 w-20 flex-none">{label}</span>
                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${ok ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${val}%` }} />
                            </div>
                            <span className={`font-mono w-8 text-right flex-none ${ok ? "text-zinc-400" : "text-amber-400"}`}>
                              {(val / 10).toFixed(1)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 text-right text-xs">
                      総合 <span className={`font-mono font-semibold ${
                        tune.overall >= 70 ? "text-green-400" : tune.overall >= 50 ? "text-yellow-400" : "text-red-400"
                      }`}>{(tune.overall / 10).toFixed(1)}/10</span>
                    </div>
                  </div>
                )}

                {/* 安全チェック */}
                <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${
                  risk === "blocked" ? "bg-red-900/20 text-red-400" :
                  risk === "caution" ? "bg-yellow-900/20 text-yellow-400" :
                  risk === "safe"    ? "bg-green-900/20 text-green-400" :
                  "bg-zinc-800 text-zinc-500"
                }`}>
                  <span>{risk === "blocked" ? "⛔" : risk === "caution" ? "⚠" : risk === "safe" ? "✓" : "●"}</span>
                  <span>X安全チェック: {risk === "blocked" ? "違反リスクあり" : risk === "caution" ? "注意" : risk === "safe" ? "通過" : "チェック中"}</span>
                </div>

                {/* 品質問題 */}
                {(q?.issues ?? []).filter(x => x.level !== "info").length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-zinc-500 mb-1">品質チェック</div>
                    {q!.issues.filter(x => x.level !== "info").map((issue) => (
                      <div key={issue.checkId} className={`text-xs px-2 py-1.5 rounded ${
                        issue.level === "blocked" ? "bg-red-900/20 text-red-400" : "bg-yellow-900/20 text-yellow-500"
                      }`}>
                        {issue.level === "blocked" ? "⛔" : "⚠"} {issue.name}: {issue.detail}
                      </div>
                    ))}
                  </div>
                )}

                {/* チューニング結果 */}
                {af?.changed && (
                  <div className="text-xs px-3 py-2 rounded-lg bg-amber-900/20 text-amber-400 space-y-1">
                    <div className="flex flex-wrap gap-1">
                      {af.applied.map(l => <span key={l} className="px-1.5 py-0.5 bg-amber-900/40 rounded">{l}</span>)}
                    </div>
                    {af.changeNote && <p className="text-amber-500/80">{af.changeNote}</p>}
                  </div>
                )}

                {/* 画像プロンプト */}
                <details className="text-xs">
                  <summary className="cursor-pointer text-zinc-500 hover:text-zinc-400">画像 / 動画プロンプト</summary>
                  <div className="mt-2 space-y-2 pl-2">
                    <div>
                      <div className="text-purple-400 mb-0.5">画像プロンプト</div>
                      <p className="text-zinc-400 leading-relaxed">{post.imagePrompt}</p>
                    </div>
                    <div>
                      <div className="text-red-400 mb-0.5">動画プロンプト</div>
                      <p className="text-zinc-400 leading-relaxed">{post.videoPrompt}</p>
                    </div>
                  </div>
                </details>

                {/* アクション */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { copy(finalContent, `preview-${pi}`); }}
                    className="flex-1 text-sm py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    {copied === `preview-${pi}` ? "コピー済!" : "コピー"}
                  </button>
                  {!isBlocked && (
                    <button
                      onClick={() => { savePost(finalContent, post.imagePrompt, post.videoPrompt); setPreviewIndex(null); }}
                      className="flex-1 text-sm py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium"
                    >
                      この内容で保存
                    </button>
                  )}
                  <button
                    onClick={() => setPreviewIndex(null)}
                    className="px-4 text-sm py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
