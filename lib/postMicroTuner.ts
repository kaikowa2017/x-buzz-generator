export type MicroScore = {
  humanness:      number;  // 人間らしさ
  hookStrength:   number;  // 初速フック
  commentability: number;  // コメント誘発
  temperature:    number;  // 投稿温度 (ideal: 30-70)
  clarity:        number;  // 説明なさ（逆数）
  dissonance:     number;  // 違和感強度
};

export type MicroIssue = {
  id:       string;
  label:    string;
  detail:   string;
  severity: "low" | "medium" | "high";
};

export type MicroAnalysis = {
  scores:    MicroScore;
  issues:    MicroIssue[];
  needsTune: boolean;
  overall:   number;
};

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function scoreHumanness(content: string): number {
  let s = 50;
  ["なんか", "ちょっと", "なんとなく", "気がする", "かもしれない", "自分は", "個人的に", "いや、", "うーん", "まあ"].forEach(
    (p) => { if (content.includes(p)) s += 8; }
  );
  ["ということです", "科学的に証明", "まとめると", "結論として", "が重要です", "必要があります", "べきです", "ということになります"].forEach(
    (n) => { if (content.includes(n)) s -= 15; }
  );
  if ((content.match(/！|!/g) ?? []).length >= 3) s -= 10;
  if (/です。$|ます。$/.test(content.trimEnd())) s -= 8;
  return clamp(s);
}

function scoreHookStrength(content: string): number {
  const first = content.split(/\n/)[0] ?? content.slice(0, 50);
  let s = 20;
  if (first.length <= 20)      s += 35;
  else if (first.length <= 35) s += 20;
  else if (first.length > 55)  s -= 20;
  if (/[？?]/.test(first))                              s += 20;
  if (/\d+/.test(first))                                s += 15;
  if (/あなた|こういう人|してる人|している人/.test(first)) s += 20;
  if (/実は|意外と|意外にも/.test(first))                s += 10;
  return clamp(s);
}

function scoreCommentability(content: string): number {
  let s = 25;
  if (/[？?]/.test(content.slice(-40)))              s += 25;
  if (/あなた|どう思う|どっち|どちら/.test(content)) s += 20;
  if (/好き|嫌い|賛否|合う|合わない/.test(content)) s += 15;
  if (/自分は|自分も|自分だけ/.test(content))        s += 10;
  return clamp(s);
}

function scoreTemperature(content: string): number {
  let heat = 0;
  heat += (content.match(/！|!/g) ?? []).length * 8;
  heat += (content.match(/感動|最高|すごい|やばい|震えた|泣いた/g) ?? []).length * 15;
  heat += (content.match(/絶対|必ず|間違いなく|確実に/g) ?? []).length * 10;
  heat -= (content.match(/かもしれない|気がする|たぶん|おそらく|なんとなく/g) ?? []).length * 8;
  return clamp(35 + heat);
}

function scoreClarity(content: string): number {
  let s = 100;
  ["つまり", "要するに", "ということです", "まとめると", "以上のことから", "ということで"].forEach(
    (p) => { if (content.includes(p)) s -= 20; }
  );
  if (content.length > 180 && /です。$|ます。$/.test(content)) s -= 15;
  const listCount = (content.match(/[①②③④⑤]|^\d\./gm) ?? []).length;
  if (listCount >= 3) s -= 15;
  return clamp(s);
}

function scoreDissonance(content: string): number {
  let s = 15;
  ["でも", "いや", "実は", "意外と", "逆に", "実際は", "本当は", "思ってたのと"].forEach(
    (w) => { if (content.includes(w)) s += 15; }
  );
  return clamp(s);
}

function hasRedundancy(content: string): boolean {
  const sentences = content.match(/[^。\n]+[。\n]/g) ?? [];
  if (sentences.length < 3) return false;
  const endings = sentences.map((s) => s.slice(-6));
  const unique = new Set(endings);
  return unique.size < endings.length * 0.7;
}

export function analyzeMicro(content: string): MicroAnalysis {
  const scores: MicroScore = {
    humanness:      scoreHumanness(content),
    hookStrength:   scoreHookStrength(content),
    commentability: scoreCommentability(content),
    temperature:    scoreTemperature(content),
    clarity:        scoreClarity(content),
    dissonance:     scoreDissonance(content),
  };

  const issues: MicroIssue[] = [];

  if (scores.humanness < 45) issues.push({
    id: "low_humanness", label: "人間らしさ不足",
    detail: "作られた感が出ている。口語・曖昧表現・言い直しを入れると自然になる",
    severity: scores.humanness < 30 ? "high" : "medium",
  });

  if (scores.hookStrength < 40) issues.push({
    id: "weak_hook", label: "初速フック弱め",
    detail: "冒頭の引きが弱い。短く・疑問形・意外性を入れると改善する",
    severity: scores.hookStrength < 25 ? "high" : "medium",
  });

  if (scores.clarity < 55) issues.push({
    id: "over_explain", label: "説明しすぎ",
    detail: "結論を言いすぎている。余白を残すと読者が考えるようになる",
    severity: "medium",
  });

  if (scores.commentability < 35) issues.push({
    id: "low_comment", label: "コメント誘発弱め",
    detail: "問いかけや意見を引き出す要素が少ない",
    severity: "low",
  });

  if (scores.temperature > 80) issues.push({
    id: "too_hot", label: "感情過多",
    detail: "感情表現が過剰。少し抑えると信頼感が増す",
    severity: "low",
  });

  if (scores.temperature < 20) issues.push({
    id: "too_cold", label: "感情が薄い",
    detail: "無機質すぎる。個人的な視点・感情を少し入れると刺さりやすくなる",
    severity: "low",
  });

  if (hasRedundancy(content)) issues.push({
    id: "redundancy", label: "繰り返し検知",
    detail: "文末・表現パターンが単調。バリエーションを持たせると読みやすくなる",
    severity: "low",
  });

  // 温度は50から外れるほど減点（±20以内は許容）
  const tempPenalty = Math.max(0, Math.abs(scores.temperature - 50) - 20) * 2;
  const overall = clamp(
    scores.humanness      * 0.25 +
    scores.hookStrength   * 0.25 +
    scores.commentability * 0.15 +
    (100 - tempPenalty)   * 0.10 +
    scores.clarity        * 0.15 +
    scores.dissonance     * 0.10
  );

  const needsTune =
    issues.some((i) => i.severity === "high") ||
    issues.filter((i) => i.severity === "medium").length >= 2 ||
    overall < 50;

  return { scores, issues, needsTune, overall };
}
