// Rule-based generation engine for ホラーX編集長AI
// Outputs change based on all input parameters — no fixed mocks

// ─────────────────── Types ───────────────────

export type PostType =
  | '短文ポスト' | '意味怖' | '考察誘導' | 'ブログ誘導'
  | 'X記事' | '漫画構成' | '画像付き投稿' | '動画付き投稿'

export type StyleType =
  | 'ぼそっと怖い' | '友達口調' | '怪談師' | '考察勢'
  | 'ふざけ怖い' | '都市伝説風' | '2ch怪談風'

export type ScaryLevel = '軽い' | '普通' | 'ガチ怖'
export type EndingType = '怖い' | 'ギャグ' | '意味怖' | '考察'
export type LevelThree = 'なし' | '少' | '中' | '多'
export type LevelWeak = '弱' | '中' | '強'
export type LineBreakLevel = '少' | '普通' | '多'
export type CharPreset = '短い' | '普通' | '長文' | 'X記事' | 'カスタム'

export interface PostInput {
  keyword?: string
  postType: PostType
  charPreset: CharPreset
  minChars: number
  maxChars: number
  targetChars: number
  scaryLevel: ScaryLevel
  ending: EndingType
  style: StyleType
  onomatopoeia: LevelThree
  colloquial: LevelWeak
  antiAI: LevelWeak
  lineBreak: LineBreakLevel
  emoji: LevelThree
  hasHook: boolean
  hasQuestion: boolean
  hasCommentPrompt: boolean
  hasFollowPrompt: boolean
  hasBlogGuide: boolean
  usePatterns: boolean
  stylePresetId?: string
}

export interface PostOutput {
  text: string
  charCount: number
  hookUsed?: string
  tips: string[]
}

export interface HookOutput {
  category: string
  hooks: string[]
}

export interface IdeaOutput {
  horror: string[]
  manga: string[]
  consideration: string[]
  meaningScary: string[]
  twoImage: string[]
  xArticle: string[]
}

export interface ReviewOutput {
  weakPoints: string[]
  improvements: string[]
  revised: string[]
  buzzScore: number
  hookSuggestions: string[]
  commentPrompts: string[]
  imageSuggestion: string
}

export interface ArticleOutput {
  titles: string[]
  hooks: string[]
  headings: string[]
  body: string
  closing: string
  commentPrompt: string
  announcement: string
}

export interface MangaPanel {
  panelNum: number
  scene: string
  dialogue: string[]
  narration: string
  imagePrompt: string
  composition: string
  uncanny: string
}

export interface MangaOutput {
  title: string
  postText: string
  commentPrompt: string
  panels: MangaPanel[]
  punchline: string
}

export interface ImagePromptOutput {
  type: string
  jaPrompt: string
  enPrompt: string
  negativePrompt: string
  composition: string
  uncanny: string
  textIdea: string
}

export interface VideoPromptOutput {
  tool: string
  jaPrompt: string
  enPrompt: string
  camera: string
  movement: string
  sound: string
  atmosphere: string
  finalUncanny: string
  durationSec: number
}

export interface PromptsOutput {
  images: ImagePromptOutput[]
  videos: VideoPromptOutput[]
}

export interface BuzzAnalysis {
  hook: string
  charCount: number
  lineBreakCount: number
  hasQuestion: boolean
  onomatopoeiaCount: number
  emotionWords: string[]
  hasCommentPrompt: boolean
  hasFollowPrompt: boolean
  styleSummary: string
}

// ─────────────────── Word Banks ───────────────────

const LOCATIONS = [
  '実家', '学校の廊下', '山の中', '廃病院', '深夜のコンビニ',
  '地下鉄', '古い団地', 'トンネル', '神社の裏', '海沿いの道',
  '友人の家', '職場のトイレ', '閉店後のデパート', '山奥の旅館',
]

const TIMES = [
  '夜中の3時', '明け方', '夕暮れ時', '真昼間', '誰もいない時間',
  '停電の夜', '台風の夜', '満月の夜', '日が暮れた直後',
]

const ENTITIES = [
  '人影', '声', '足音', '視線', '子供の笑い声', '白い手',
  '知らない電話番号', '写真の中の顔', '窓の外のシルエット', '鏡の中の何か',
]

const HORROR_VERBS = [
  '現れた', '消えた', '増えていた', '変わっていた', '動いていた',
  '写っていた', '聞こえた', '向いていた', '近づいていた', '笑っていた',
]

const ONOMATOPOEIA_BANK: Record<LevelThree, string[]> = {
  'なし': [],
  '少': ['ぞわっ', 'ひゅっ'],
  '中': ['ぞわっ', 'ひゅっ', 'じわ…', 'ぞぞっ', 'ぞくっ'],
  '多': ['ぞわっ', 'ひゅっ', 'じわ…', 'ぞぞっ', 'ぞくっ', 'ぞっ', 'ひたひた', 'ざわ…', 'ふぅ…', 'ぐら'],
}

const EMOTION_WORDS = [
  'こわい', 'やばい', '無理', 'きつい', 'ぞっとした',
  'なんか変', '気持ち悪い', '嫌な感じ', '背筋が凍った', 'ぞわぞわした',
]

const COLLOQUIAL_OPENERS: Record<LevelWeak, string[]> = {
  '弱': [],
  '中': ['え、', 'いや待って', 'うわ'],
  '強': ['え、', 'いや待って', 'うわ', 'これ気づいた？', 'ほんとに嫌な感じする', 'なんか変'],
}

const QUESTIONS_BANK = [
  'みなさんも同じような経験ありますか？',
  'これって普通じゃないですよね？',
  'どう思いますか？',
  '同じこと経験した人いますか？',
  'これ、何だったんでしょう……',
  '解説できる人いたら教えてください',
  'ただの気のせいだったんでしょうか……',
]

const COMMENT_PROMPTS = [
  'コメントで教えてください',
  'あなたの体験も聞かせてください',
  '同じ経験した人はコメントを',
  '解説できる人、コメント待ってます',
  'あなたはどう思う？コメントで',
]

const FOLLOW_PROMPTS = [
  'フォローすると毎日ホラー投稿が届きます',
  'もっと怖い話はプロフィールから',
  'フォロー＆ブックマークで保存推奨',
]

const BLOG_PROMPTS = [
  'フル版はブログで読めます→プロフィールリンクから',
  '続きはブログに書きました',
  '詳細版はリンクから',
]

const AI_PHRASES = [
  ['なお、', ''],
  ['また、', ''],
  ['さらに、', 'さらに'],
  ['このような', 'こういう'],
  ['において', 'で'],
  ['したがって', 'だから'],
  ['しかしながら', 'でも'],
  ['考えられます', '思います'],
  ['ことがあります', 'こともあります'],
  ['ということです', 'ってことです'],
  ['ではないでしょうか', 'じゃないかな'],
]

// ─────────────────── Template Banks ───────────────────

const SHORT_POST_TEMPLATES: Record<StyleType, string[]> = {
  'ぼそっと怖い': [
    '{場所}に{時間}だけ現れる{存在}がいる。\n誰も信じないけど、私は見た。',
    '昨日、{場所}で撮った写真。\n{存在}が{動詞}んだけど、誰か説明してほしい。',
    '{場所}に行くなら、絶対に{時間}は避けてください。\nそれだけです。',
    '{存在}が{動詞}のを、3回見た。\n場所はいつも{場所}だった。',
    '引っ越してから、{場所}で{存在}を見るようになった。\n毎晩じゃないけど、確かにいる。',
    '親が死んで{場所}を片付けていたら、{存在}が{動詞}た。\n怖いというより、悲しかった。',
    '{時間}に{場所}を通ると、必ず{存在}が{動詞}。\nもう三ヶ月続いてる。',
  ],
  '友達口調': [
    'ねえ聞いて、{場所}で本当に{存在}が{動詞}んだけど笑えない\nまじでどうしよう',
    '{場所}でやばいもの見た\n{時間}に{存在}が{動詞}やつ\n誰か経験ある？',
    'え待って{場所}こわすぎる\n{時間}ごろ{存在}が{動詞}て普通に泣いた',
    '{場所}行ったときさ、{存在}がいて\nなんか{動詞}んだよね……\n気のせいかな',
    'こんな話してもいい？{場所}で{存在}が{動詞}の見た\nもうそこ行けない',
  ],
  '怪談師': [
    'あれは{時間}のことでした。{場所}を歩いていた私は、ふと立ち止まりました。\n{存在}が、確かに{動詞}のです。',
    '{場所}には、昔から{存在}が出ると言われていました。\nそして{時間}、私はとうとうそれを目にしてしまったのです。',
    '語るのもためらわれますが、{場所}で起きた出来事をお話しします。\n{時間}、{存在}が{動詞}た夜のことを。',
    'この話を最後まで聞いてもらえますか。{場所}で{時間}に、{存在}が{動詞}た話です。\n今でも夢に出ます。',
  ],
  '考察勢': [
    '{場所}で{存在}が{動詞}た件、調べたら怖い事実が出てきた。\nスレッドで解説します。',
    '仮説：{場所}で頻繁に{存在}が目撃される理由、考えてみた。\n怖すぎてあまり話したくない。',
    '{時間}に{場所}で起きる現象について。{存在}が{動詞}のはなぜか考察。\n複数の情報を突き合わせると……',
    '【{場所}の怪異】{時間}に{存在}が{動詞}目撃談が複数。\n共通点を分析した結果が怖い。',
  ],
  'ふざけ怖い': [
    '{場所}で{存在}が{動詞}んだけど\nとりあえず「こんちは」って言っておいた',
    '{時間}に{場所}行ったら{存在}がいて\n思わず「あ、ども」って言った自分が怖い',
    '{存在}が{動詞}の見て\nとっさに写真撮ろうとしたら電池切れてた\nそっちの方が怖くない？',
    '{場所}に{存在}がいるって有名なんだって\nじゃあもう友達じゃん',
  ],
  '都市伝説風': [
    '【未確認情報】{場所}では{時間}に{存在}が{動詞}という目撃情報が相次いでいる。\n共通点が多すぎる。',
    'この情報は削除されるかもしれないので今のうちに。{場所}で{存在}が{動詞}件、複数の証言あり。',
    '公式には否定されているが、{場所}で{時間}に{存在}が{動詞}という証言は消えない。\nなぜ隠すのか。',
    'アーカイブされる前に拡散してほしい。{場所}の{存在}の件、本当のことを知ってる人がいる。',
  ],
  '2ch怪談風': [
    '1 名前：名無しさん：{時間}\n{場所}でやばいもの見た\n2 名前：名無しさん：\nkwsk\n3 名前：1：\n{存在}が{動詞}た',
    '俺の体験談書く\n{場所}に行ったときの話\n{時間}ごろ急に{存在}が{動詞}た\nこれマジの話',
    '聞いてもいいか\n{場所}で{存在}見た奴いる？\n{動詞}やつ\n俺だけじゃないよな',
  ],
}

const KOWAI_ENDINGS: Record<EndingType, string[]> = {
  '怖い': [
    'あれが何だったのか、今でもわからない。',
    'それ以来、そこには近づかないようにしている。',
    '翌朝、その場所には何も残っていなかった。',
    '今でも夢に出る。',
    'その後、誰も確認していない。',
  ],
  'ギャグ': [
    'というわけで今ホテルにいます',
    'フォロワー増えたのはそのせいかもしれない',
    'というかなんで撮れてんの俺',
    'あ、でも今日も普通に出勤しました',
    'まあ慣れました（慣れてない）',
  ],
  '意味怖': [
    'そのことに気づいたのは、ずっと後になってからだった。',
    '写真を見返したとき、ようやく意味がわかった。',
    '最初から、答えはそこにあった。',
    '今この文章を読んでいるあなたにも、同じことが起きているかもしれない。',
    '数を数え直したとき、おかしいことに気づいた。',
  ],
  '考察': [
    'この現象には説明がつく気がするが、怖くて調べられない。',
    '複数の証言が一致しているということは……',
    '偶然にしては、共通点が多すぎる。',
    '誰かが意図的に隠しているとしたら、なぜ？',
    '次に同じことが起きたとき、記録を取るつもりだ。',
  ],
}

const HOOK_TEMPLATES: Record<string, string[]> = {
  '命令系': [
    'これ、最後まで読まないと後悔します',
    '絶対に夜中に読まないでください',
    'スクロールを止めてください',
    '今すぐブックマークしてください。後で消えるかもしれないので',
    '読んだら必ず誰かに共有してください',
    '一人のときに読まないでください',
    'これだけは信じてください',
  ],
  '違和感系': [
    'この画像、何かおかしくないですか？',
    'え、これ気づいた人いる？',
    '最後のコマ、何かおかしいです',
    'この写真、どこかへんなんですが',
    '数えてみてください、絶対に何かある',
    '普通に見えるけど、実は……',
    'ここをよく見てください',
  ],
  '体験系': [
    'これ、実際に起きた話です',
    '昨夜体験したことを書きます',
    '今でも信じられないんですが',
    '誰かに話したくて投稿します',
    'ずっと言えなかったことを',
    '記録として残しておきます',
  ],
  '共感系': [
    'こういう経験ある人いませんか',
    '同じ感覚になった人いたら教えてほしい',
    '私だけじゃないと思いたい',
    'あるある、と思ったらフォローお願いします',
    'みんなはどう思う？',
  ],
  '危険系': [
    '夜中に見ないでください',
    'これを見た後は一人でいないでください',
    '心臓が弱い方は閲覧注意',
    '見てしまったらごめんなさい',
    'これ以上スクロールするのは自己責任で',
  ],
  '考察系': [
    'この謎、解ける人います？',
    'みんなで考察してほしいんですが',
    'これの意味、わかる方いますか',
    '3つの共通点に気づいたとき背筋が凍った',
    '偶然にしては出来すぎてる',
    '説明できる人コメントください',
  ],
  '画像誘導系': [
    'この画像、2枚目で意味変わります',
    '次の画像、見るべきかどうか迷ってます',
    '最後の画像まで見てください',
    '1枚目と2枚目、どこが違うかわかりますか',
    '画像の〇のところを見てください',
  ],
}

const IDEA_TEMPLATES = {
  horror: [
    '夜中に届いたメッセージの送信者が、実は昨年死んでいた',
    '引っ越し先の押し入れの中に、前の住人の日記があった',
    '子供の頃の写真を整理していたら、知らない子供が毎回写り込んでいた',
    '同じ夢を毎晩見ていたら、ある日その場所が実在することに気づいた',
    '電話口で亡くなった祖母の声が聞こえた気がした',
    '鏡に映る自分が、一瞬だけ違う動きをした',
    '深夜に誰もいない部屋から、子供の足音がした',
    '近所の空き家に毎晩明かりが灯る',
    '友人からのLINEが届いたが、その友人は事故で入院中だった',
    'スマホの写真フォルダに、撮った覚えのない深夜の写真があった',
  ],
  manga: [
    '普通のアパートの一室、引っ越し初日から始まる違和感の連鎖',
    '呪われた写真を削除しようとするたびに増えていく枚数',
    '毎朝同じ夢を見る少女が、ある日夢の中の存在と目が合う',
    '怪談収集家が集めた話の「共通点」に気づいてしまうホラー',
    '深夜バイト中のコンビニ店員が体験する不可解な来客',
  ],
  consideration: [
    '都市伝説「口裂け女」の起源と、近年の目撃情報の共通点',
    '「異次元ホテル」の報告が複数の国で一致している件',
    '昔話に登場するキャラクターが実は警告だった説',
  ],
  meaningScary: [
    '夜中に目が覚めて時計を見たら、針が止まっていた。翌朝確認すると、正確に動いていた',
    '「また会いましょう」と言った友人の顔が、なぜか思い出せない',
    '誰もいないはずの家に帰ったら、玄関の靴が並び直されていた',
  ],
  twoImage: [
    '1枚目：普通の部屋の写真。2枚目：同じ部屋、窓の外に人影',
    '1枚目：笑顔の集合写真。2枚目：全員が同じ方向を向いている',
    '1枚目：静かな廊下。2枚目：廊下の端に白い手',
    '1枚目：階段の写真。2枚目：階段の踊り場に子供のシルエット',
    '1枚目：何もない夜の道。2枚目：遠くに立っている人影',
  ],
  xArticle: [
    '日本のホラー都市伝説ベスト10：実は元ネタがある',
    '心霊写真の「見分け方」と、本当に怖い写真の特徴',
    '怪談師が語る「怖い話の作り方」完全解説',
  ],
}

const MANGA_SCENE_TEMPLATES: Record<string, string[][]> = {
  '意味怖漫画': [
    [
      '普通の日常シーン。主人公が部屋にいる',
      '小さな違和感。気のせいかと思う',
      '同じ違和感が繰り返される',
      '違和感の正体を発見。背筋が凍る',
    ],
    [
      '子供が独り言を言っている',
      '親が不思議に思って聞く',
      '子供の答えが意味深',
      '親が気づく。読者も同時に気づく構成',
    ],
  ],
  '4コマ': [
    [
      '日常の一コマ',
      '小さな異変が起きる',
      '無視しようとする',
      'オチ：実は怖かった',
    ],
  ],
  'ショート漫画': [
    [
      'キャラクター紹介と状況説明',
      '事件の始まり',
      '謎が深まる',
      '対決または逃走',
      'オチと余韻',
    ],
  ],
  'ギャグホラー漫画': [
    [
      '怖い状況に主人公が置かれる',
      '主人公の予想外のリアクション',
      '幽霊や怪異のリアクション',
      '笑えるオチだが実は怖い',
    ],
  ],
  '考察型漫画': [
    [
      '謎めいた現象の提示',
      '登場人物が考察し始める',
      '証拠を集める',
      '仮説の提示',
      '真相に近づく',
      '最後に新たな謎',
    ],
  ],
}

const IMAGE_STYLES = [
  'dark horror manga style, ink illustration',
  'japanese horror aesthetic, high contrast black and white',
  'creepy atmospheric horror, deep shadows',
  'unsettling realism, subtle horror elements',
]

const VIDEO_CAMERA_WORKS = [
  'ゆっくりズームイン', 'パン左から右', '固定ショット', 'わずかに揺れる手持ち',
  'ゆっくりティルトアップ', '逆再生風の動き',
]

// ─────────────────── Helper Functions ───────────────────

function pick<T>(arr: T[], seed: string = ''): T {
  const hash = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return arr[(hash + arr.length) % arr.length]
}

function pickN<T>(arr: T[], n: number, seed: string = ''): T[] {
  const result: T[] = []
  for (let i = 0; i < n && i < arr.length; i++) {
    result.push(arr[(seed.split('').reduce((a, c) => a + c.charCodeAt(0), i * 7) + i * 13) % arr.length])
  }
  return [...new Set(result)].slice(0, n)
}

function fillTemplate(template: string, keyword: string = ''): string {
  const seed = keyword || template.slice(0, 5)
  return template
    .replace(/\{場所\}/g, keyword.includes('で') ? keyword.split('で')[0] : pick(LOCATIONS, seed))
    .replace(/\{時間\}/g, pick(TIMES, seed + 'time'))
    .replace(/\{存在\}/g, pick(ENTITIES, seed + 'ent'))
    .replace(/\{動詞\}/g, pick(HORROR_VERBS, seed + 'verb'))
}

function injectKeyword(text: string, keyword: string): string {
  if (!keyword) return text
  if (text.includes(keyword)) return text
  const sentences = text.split('\n')
  if (sentences.length > 0) {
    sentences[0] = sentences[0].replace(
      pick(LOCATIONS, keyword),
      keyword.length < 15 ? keyword : sentences[0].split('')[0]
    )
  }
  return sentences.join('\n')
}

function addOnomatopoeia(text: string, level: LevelThree): string {
  if (level === 'なし') return text
  const words = ONOMATOPOEIA_BANK[level]
  if (words.length === 0) return text
  const ono = pick(words, text.slice(0, 3))
  const sentences = text.split('\n')
  const midPoint = Math.floor(sentences.length / 2)
  sentences.splice(midPoint, 0, ono)
  return sentences.join('\n')
}

function applyStyle(text: string, style: StyleType): string {
  switch (style) {
    case 'ぼそっと怖い':
      return text
        .replace(/。/g, '。\n')
        .replace(/\n\n+/g, '\n')
        .replace(/！/g, '。')
        .replace(/ね$/gm, '')
        .trim()
    case '友達口調':
      return text
        .replace(/でした/g, 'だった')
        .replace(/ました/g, 'た')
        .replace(/ます/g, 'る')
        .replace(/です/g, 'だ')
        .replace(/ください/g, 'ね')
    case '怪談師':
      return text
        .replace(/\n/g, '\n　')
        .replace(/た。/g, 'た……。')
        .replace(/いる。/g, 'いるのです。')
    case '考察勢':
      return '【考察】\n' + text
    case 'ふざけ怖い':
      return text + '\n\nいや笑えない'
    case '都市伝説風':
      return '【閲覧注意】\n' + text
    case '2ch怪談風':
      return text.replace(/私は/g, '俺は').replace(/ました/g, 'た').replace(/です/g, 'だ')
    default:
      return text
  }
}

function applyColloquial(text: string, level: LevelWeak): string {
  const openers = COLLOQUIAL_OPENERS[level]
  if (openers.length === 0) return text
  const opener = pick(openers, text.slice(0, 3))
  return opener + text
}

function removeAI(text: string, level: LevelWeak): string {
  let result = text
  const count = level === '弱' ? 2 : level === '中' ? 5 : AI_PHRASES.length
  AI_PHRASES.slice(0, count).forEach(([from, to]) => {
    result = result.replace(new RegExp(from, 'g'), to)
  })
  if (level === '強') {
    result = result
      .replace(/また、/g, '')
      .replace(/さらに/g, 'で')
      .replace(/一方で/g, 'でも')
      .replace(/ご注意ください/g, '気をつけて')
  }
  return result
}

function applyLineBreaks(text: string, level: LineBreakLevel): string {
  switch (level) {
    case '少':
      return text.replace(/\n+/g, ' ').replace(/。 /g, '。\n')
    case '普通':
      return text
    case '多':
      return text.replace(/。/g, '。\n').replace(/、/g, '、\n').replace(/\n\n+/g, '\n\n')
    default:
      return text
  }
}

function applyEmoji(text: string, level: LevelThree): string {
  if (level === 'なし') return text
  const horrorEmoji = ['👁️', '🩸', '💀', '🕯️', '🌑', '⚠️', '🔪']
  const e = pick(horrorEmoji, text.slice(0, 3))
  if (level === '少') return e + ' ' + text
  if (level === '多') return e + ' ' + text + ' ' + e
  return text
}

function enforceCharCount(text: string, min: number, max: number): string {
  if (text.length >= min && text.length <= max) return text
  if (text.length > max) {
    const sentences = text.split(/[。\n]/).filter(Boolean)
    let result = ''
    for (const s of sentences) {
      if ((result + s + '。').length > max) break
      result += s + '。'
    }
    return result || text.slice(0, max)
  }
  if (text.length < min) {
    const additions = [
      '\nあれが何だったのか、今でもわからない。',
      '\nそれ以来、ずっと考えている。',
      '\n誰かに話したくて、ここに書いた。',
      '\nみなさんはどう思いますか。',
    ]
    let result = text
    for (const add of additions) {
      if (result.length >= min) break
      result += add
    }
    return result
  }
  return text
}

function getCharRange(preset: CharPreset, min: number, max: number): [number, number] {
  switch (preset) {
    case '短い': return [40, 120]
    case '普通': return [120, 280]
    case '長文': return [280, 800]
    case 'X記事': return [800, 2000]
    case 'カスタム': return [min, max]
    default: return [120, 280]
  }
}

// ─────────────────── Main Generator Functions ───────────────────

export function generatePost(input: PostInput): PostOutput {
  const [minC, maxC] = getCharRange(input.charPreset, input.minChars, input.maxChars)
  const templates = SHORT_POST_TEMPLATES[input.style] || SHORT_POST_TEMPLATES['ぼそっと怖い']
  const ending = KOWAI_ENDINGS[input.ending] || KOWAI_ENDINGS['怖い']

  const seed = input.keyword || input.postType
  let template = pick(templates, seed)
  let body = fillTemplate(template, input.keyword || '')

  const endingText = pick(ending, seed + 'end')
  body = body + '\n' + endingText

  if (input.keyword) body = injectKeyword(body, input.keyword)

  let hookUsed: string | undefined
  if (input.hasHook) {
    const allHooks = Object.values(HOOK_TEMPLATES).flat()
    hookUsed = pick(allHooks, seed + 'hook')
    body = hookUsed + '\n\n' + body
  }

  body = addOnomatopoeia(body, input.onomatopoeia)
  body = applyStyle(body, input.style)
  body = applyColloquial(body, input.colloquial)
  body = removeAI(body, input.antiAI)
  body = applyLineBreaks(body, input.lineBreak)
  body = applyEmoji(body, input.emoji)

  if (input.hasQuestion) {
    body += '\n\n' + pick(QUESTIONS_BANK, seed + 'q')
  }
  if (input.hasCommentPrompt) {
    body += '\n' + pick(COMMENT_PROMPTS, seed + 'cp')
  }
  if (input.hasFollowPrompt) {
    body += '\n' + pick(FOLLOW_PROMPTS, seed + 'fp')
  }
  if (input.hasBlogGuide) {
    body += '\n' + pick(BLOG_PROMPTS, seed + 'blog')
  }

  // Scary level adjustment
  if (input.scaryLevel === '軽い') {
    body = body.replace(/ガチで怖い/g, 'ちょっと不思議な').replace(/死/g, '消えた')
  } else if (input.scaryLevel === 'ガチ怖') {
    body = body.replace(/不思議/g, '恐ろしい').replace(/変/g, '異常')
  }

  body = enforceCharCount(body, minC, maxC)

  const tips: string[] = []
  if (body.length < 50) tips.push('文字数が少ないです。キーワードを追加するとより詳細な投稿が生成されます。')
  if (!input.hasHook) tips.push('冒頭フックをONにするとエンゲージメントが上がります。')
  if (!input.hasQuestion) tips.push('最後の問いかけでコメントが増えます。')

  return {
    text: body.trim(),
    charCount: body.trim().length,
    hookUsed,
    tips,
  }
}

export function generateHooks(keyword: string = '', postType: string = ''): HookOutput[] {
  const seed = keyword + postType
  return Object.entries(HOOK_TEMPLATES).map(([category, hooks]) => {
    const selected = hooks.map((h, i) => {
      let result = h
      if (keyword) {
        result = result.replace('この画像', keyword.length < 10 ? keyword : 'この投稿')
        result = result.replace('この謎', keyword.length < 10 ? `${keyword}の謎` : 'この謎')
      }
      return result
    })
    return { category, hooks: selected }
  })
}

export function generateIdeas(keyword: string = '', genre: string = ''): IdeaOutput {
  const seed = keyword + genre
  const horror = [...IDEA_TEMPLATES.horror]
  const manga = [...IDEA_TEMPLATES.manga]
  const consideration = [...IDEA_TEMPLATES.consideration]
  const meaningScary = [...IDEA_TEMPLATES.meaningScary]
  const twoImage = [...IDEA_TEMPLATES.twoImage]
  const xArticle = [...IDEA_TEMPLATES.xArticle]

  if (keyword) {
    horror.unshift(`${keyword}にまつわる未解明の怪現象`)
    horror.unshift(`${keyword}で起きた、誰も信じてくれない出来事`)
    manga.unshift(`${keyword}を舞台にしたホラー短編漫画`)
    consideration.unshift(`${keyword}の都市伝説：本当のことを知っている人がいる`)
    meaningScary.unshift(`「${keyword}」という言葉を聞くたびに、背筋が凍る理由`)
    twoImage.unshift(`1枚目：昼の${keyword}。2枚目：夜の${keyword}、何かが違う`)
    xArticle.unshift(`${keyword}の怪異完全解説：知ってはいけない5つの事実`)
  }

  return {
    horror: horror.slice(0, 10),
    manga: manga.slice(0, 5),
    consideration: consideration.slice(0, 3),
    meaningScary: meaningScary.slice(0, 3),
    twoImage: twoImage.slice(0, 5),
    xArticle: xArticle.slice(0, 3),
  }
}

export function reviewPost(text: string): ReviewOutput {
  const charCount = text.length
  const hasQuestion = /？|ですか|ますか|でしょうか/.test(text)
  const hasHook = /絶対|これ|見て|聞いて|実は|注意/.test(text.slice(0, 30))
  const onomatopoeia = (text.match(/ぞわ|ひゅ|じわ|ぞぞ|ぞく|ぞっ|ひた|ざわ/g) || []).length
  const emotionCount = EMOTION_WORDS.filter(w => text.includes(w)).length

  const weakPoints: string[] = []
  if (!hasHook) weakPoints.push('冒頭フックが弱い。最初の15文字で読者を掴めていない')
  if (charCount < 50) weakPoints.push('文字数が短すぎる。具体的なエピソードを追加してください')
  if (charCount > 280) weakPoints.push('文字数が長い。Xでは280字以内が推奨です')
  if (!hasQuestion) weakPoints.push('最後に問いかけがない。コメントを誘発するために追加を推奨')
  if (onomatopoeia === 0) weakPoints.push('オノマトペがない。ぞわっ・ぞくっなどで臨場感アップ')
  if (emotionCount === 0) weakPoints.push('感情語がない。「こわい」「やばい」「無理」などを追加')
  if (weakPoints.length === 0) weakPoints.push('全体的にバランスが取れています')

  const improvements: string[] = [
    '具体的な時間・場所・状況を加えると説得力が増す',
    '短い文を多用すると読みやすくなる',
    '改行を増やしてスマホで見やすくする',
    '最初の一文で「何が起きるか」を予感させる',
  ]

  const revised = [
    text.slice(0, 15) + '……' + text.slice(15).replace(/。$/, '') + '\n\nこれ、どう思いますか？',
    pick(HOOK_TEMPLATES['違和感系'], text.slice(0, 3)) + '\n\n' + text,
    text.replace(/です。/g, 'だった。\n').replace(/ます。/g, 'た。\n') + '\n\nコメントで教えてください',
  ]

  const buzzScore = Math.min(100, Math.max(10,
    (hasHook ? 20 : 0) +
    (hasQuestion ? 15 : 0) +
    (onomatopoeia * 5) +
    (emotionCount * 5) +
    (charCount >= 50 && charCount <= 280 ? 20 : 5) +
    15
  ))

  const hookSuggestions = pickN(HOOK_TEMPLATES['違和感系'].concat(HOOK_TEMPLATES['命令系']), 3, text.slice(0, 5))
  const commentPrompts = pickN(COMMENT_PROMPTS, 3, text.slice(0, 5))
  const imageSuggestion = `この投稿に合う画像案：${pick(LOCATIONS, text.slice(0, 3))}を舞台にした暗い雰囲気の写真。${pick(ENTITIES, text.slice(3, 6))}が写り込んでいると効果的。`

  return { weakPoints, improvements, revised, buzzScore, hookSuggestions, commentPrompts, imageSuggestion }
}

export function generateArticle(keyword: string = '', style: StyleType = 'ぼそっと怖い'): ArticleOutput {
  const seed = keyword || 'article'
  const topic = keyword || pick(IDEA_TEMPLATES.xArticle, seed)

  const titles = [
    `【閲覧注意】${topic}：知ってはいけない真実`,
    `${topic}の全貌を暴く`,
    `誰も教えてくれない${topic}の怖い話`,
    `${topic}について本気で調べた結果が怖すぎた`,
    `【保存版】${topic}完全解説`,
  ]

  const hooks = [
    `この記事を読んだ後、${topic}について何も知らなかったことを後悔するかもしれません。`,
    `長年${topic}について調べてきた。やっとまとめる気になった。`,
    `${topic}。一度気になったら止まらない。そういう話をします。`,
  ]

  const headings = [
    '■ はじめに：なぜこの話をするのか',
    '■ 事の発端',
    '■ 調べてわかったこと',
    '■ 証言と記録',
    '■ 考察：本当のことは何か',
    '■ まとめ：この先どうなるか',
  ]

  const loc = pick(LOCATIONS, seed)
  const time = pick(TIMES, seed + 't')
  const entity = pick(ENTITIES, seed + 'e')

  const body = `${headings[0]}

${topic}について話すのは、これが初めてではない。
でも、これだけ証拠が揃ったいま、黙っていられなくなった。

${headings[1]}

最初に気になったのは、ある投稿がきっかけだった。
「${loc}で${entity}を見た」という報告が、短期間に複数上がっていた。
偶然かもしれない。でも、細かい部分が一致しすぎていた。

${headings[2]}

調べると、同様の報告は10年以上前から存在することがわかった。
場所は違うが、共通点がある。
・${time}に目撃される
・${entity}が関係している
・目撃者は「現実とは思えなかった」と証言する

${headings[3]}

複数の証言者に共通しているのは、「あれは現実だった」という確信だ。
記録として残っているものは少ないが、細部が一致する。

${headings[4]}

では、これは何なのか。
いくつかの仮説が考えられる。

1. 単なる集団心理の産物
2. 実際に何らかの現象が起きている
3. 誰かが意図的に情報を操作している

3番目の可能性が一番怖い。

${headings[5]}

${topic}は、これからも報告が増えていくだろう。
気になる方は、フォローしておいてください。
次の情報が入ったとき、またここで報告します。`

  const closing = `以上が現時点でわかっていることです。\nまだ解明されていない部分が多く、引き続き調査していきます。\nこの話を知っている方、情報をお持ちの方はコメントで教えてください。`

  const commentPrompt = `この話について、あなたはどう思いますか？\n同じような体験をした方、考察できる方、ぜひコメントを。`

  const announcement = `【新記事】${titles[0]}\n\n${hooks[0]}\n\n詳細はスレッドで↓`

  return { titles, hooks, headings, body, closing, commentPrompt, announcement }
}

export function generateManga(
  keyword: string = '',
  panelCount: number = 4,
  mangaType: string = '意味怖漫画',
  hasNarration: boolean = true,
  punchlineStrength: string = '強',
  dialogueLevel: string = '普通',
): MangaOutput {
  const seed = keyword + mangaType + panelCount
  const loc = keyword || pick(LOCATIONS, seed)
  const entity = pick(ENTITIES, seed + 'e')
  const time = pick(TIMES, seed + 't')

  const sceneTemplates = MANGA_SCENE_TEMPLATES[mangaType]
    || MANGA_SCENE_TEMPLATES['意味怖漫画']
  const baseScenes = pick(sceneTemplates, seed)

  const panels: MangaPanel[] = Array.from({ length: panelCount }, (_, i) => {
    const sceneBase = baseScenes[i % baseScenes.length]
    const isLast = i === panelCount - 1
    const isMid = i === Math.floor(panelCount / 2)

    const scene = isLast
      ? `【オチ】${loc}で${entity}の正体が明かされる。${punchlineStrength === '強' ? '衝撃的な真実' : '静かな余韻'}。`
      : isMid
      ? `【転】${sceneBase}。${entity}の違和感が強まる。`
      : i === 0
      ? `【起】${loc}の日常シーン。${time}の静かな雰囲気。`
      : `【承/展開 ${i + 1}】${sceneBase}`

    const dialogue = dialogueLevel === '多'
      ? [
        `「${pick(['なんか変だな', 'ここおかしくない？', 'え、何これ', 'ちょっと待って'], seed + i)}」`,
        `「${pick(['気のせいじゃない？', 'どういうこと？', 'まじか……', '見て、これ'], seed + i + 'b')}」`,
      ]
      : dialogueLevel === '少'
      ? [`「${pick(['……', 'え？', 'あ', '待って'], seed + i)}」`]
      : [`「${pick(['これ、おかしくないか', 'え、見て', 'なんで？', '……ねえ'], seed + i)}」`]

    const narration = hasNarration
      ? isLast
        ? `そのとき、すべての謎が繋がった。`
        : i === 0
        ? `${time}、${loc}で——`
        : `違和感は、少しずつ確かなものになっていた。`
      : ''

    const imagePrompt = `${loc}, ${isLast ? 'climax reveal shot' : i === 0 ? 'establishing shot, normal atmosphere' : 'building tension'}, ${entity}, dark horror manga panel, high contrast ink, ${time} atmosphere, creepy subtle horror`

    const composition = isLast
      ? 'クローズアップ。表情や小道具にフォーカス。'
      : i === 0
      ? 'ロングショット。場所全体を見せる。'
      : 'ミディアムショット。キャラクターと環境の両方を見せる。'

    const uncanny = isLast
      ? '完全な違和感の開示。見返すと1コマ目から伏線があったことがわかる。'
      : isMid
      ? '画面の端に小さな異変。気づかない人が多い程度の違和感。'
      : i === 0
      ? 'ほぼ正常。よく見ると微妙にどこかがおかしい。'
      : '前コマの異変が少し大きくなっている。'

    return { panelNum: i + 1, scene, dialogue, narration, imagePrompt, composition, uncanny }
  })

  const title = keyword
    ? `${keyword}の怪異`
    : `${loc}で起きたこと`

  const postText = `${title}\n\n${panels[0].scene.replace(/【.*?】/, '').trim()}\n\n${panels[panels.length - 1].uncanny}`

  const punchline = punchlineStrength === '強'
    ? `最後のコマで全てが繋がる。1コマ目を見返してください。`
    : punchlineStrength === '中'
    ? `読み返すと気づくことがある。`
    : `余韻を残す終わり方。`

  return {
    title,
    postText,
    commentPrompt: `このオチ、わかりましたか？\nコメントで感想を教えてください`,
    panels,
    punchline,
  }
}

const IMAGE_CHANGE_PATTERNS = [
  '位置が変わっている', '数が増えている', '視線が変わっている',
  '影が追加されている', '背景が変化している', '表情が変わっている',
  '文字が変化している', '人影が追加されている', '反射に違和感がある', '時計や鏡が異常',
]

export function generateImagePrompts(
  keyword: string = '',
  imageCount: number = 2,
  imageType: string = '2枚構成',
  tools: string[] = ['Midjourney', 'Stable Diffusion', 'DALL·E', 'Grok', 'GPT'],
): ImagePromptOutput[] {
  const seed = keyword + imageType + imageCount
  const loc = keyword || pick(LOCATIONS, seed)
  const entity = pick(ENTITIES, seed + 'e')
  const changePattern = pick(IMAGE_CHANGE_PATTERNS, seed + 'cp')
  const style = pick(IMAGE_STYLES, seed + 's')

  const baseEn = `${loc.replace(/\s/g, '_')}, ${entity}, ${style}, japanese horror, unsettling atmosphere, dark`
  const baseJa = `${loc}、${entity}、ホラー漫画風、不気味な雰囲気、暗い`

  const results: ImagePromptOutput[] = []

  for (let i = 0; i < imageCount; i++) {
    const isFirst = i === 0
    const isTwoSet = imageType === '2枚構成' && imageCount === 2

    tools.forEach(tool => {
      let enPrompt = ''
      let jaPrompt = ''
      let composition = ''
      let uncanny = ''

      if (isTwoSet) {
        if (isFirst) {
          enPrompt = `${baseEn}, normal scene, subtle unease, first impression looks safe, detailed background`
          jaPrompt = `${baseJa}、一見普通のシーン、微妙な違和感、詳細な背景`
          composition = '全体を映したロングショット。主体は画面中央。'
          uncanny = '一見普通だが、端に小さな違和感が隠れている。'
        } else {
          enPrompt = `${baseEn}, ${changePattern}, horror reveal, same scene but something is WRONG, shocking detail`
          jaPrompt = `${baseJa}、${changePattern}、ホラーの真相、同じシーンだが何かがおかしい`
          composition = '1枚目と同じ構図。変化した部分が自然に目立つ配置。'
          uncanny = `${changePattern}。見比べると明らかにわかる。`
        }
      } else {
        enPrompt = `${baseEn}, panel ${i + 1} of ${imageCount}, horror manga sequence, building tension`
        jaPrompt = `${baseJa}、${imageCount}枚構成の${i + 1}枚目、緊張感の高まり`
        composition = `${imageCount}枚構成の${i + 1}枚目。${isFirst ? 'ロングショット' : i === imageCount - 1 ? 'クローズアップ' : 'ミディアムショット'}。`
        uncanny = isFirst ? '設定の提示。わずかな不安感。' : i === imageCount - 1 ? '最大の違和感・オチ。' : '緊張感の高まり。'
      }

      // Tool-specific adjustments
      if (tool === 'Midjourney') {
        enPrompt += ' --ar 1:1 --style raw --q 2'
      } else if (tool === 'Grok') {
        enPrompt = `[X viral horror content] ${enPrompt}, comment-worthy composition, slightly humorous scary`
        jaPrompt = `[Xバズり向け] ${jaPrompt}、コメントしたくなる構図、少し笑える怖さ`
      } else if (tool === 'GPT') {
        enPrompt = `Generate a horror image with the following specifications:\nSubject: ${loc}, ${entity}\nStyle: dark horror manga\nMood: unsettling\nComposition: ${composition}\nKey element: ${uncanny}`
        jaPrompt = `以下の仕様でホラー画像を生成してください：\n被写体：${loc}、${entity}\nスタイル：ダークホラー漫画風\n雰囲気：不気味\n構図：${composition}\n重要要素：${uncanny}`
      }

      results.push({
        type: isTwoSet ? `${tool} - 画像${i + 1}（${isFirst ? 'フック' : 'オチ'}）` : `${tool} - 画像${i + 1}`,
        jaPrompt,
        enPrompt,
        negativePrompt: 'bright colors, cute, cheerful, low quality, blurry, text watermark, unrealistic anatomy',
        composition,
        uncanny,
        textIdea: isFirst ? '' : `「${changePattern}」または「気づきましたか？」`,
      })
    })
  }

  return results
}

export function generateVideoPrompts(
  keyword: string = '',
  tools: string[] = ['Runway', 'Pika', 'Grok', 'GPT'],
): VideoPromptOutput[] {
  const seed = keyword || 'video'
  const loc = keyword || pick(LOCATIONS, seed)
  const entity = pick(ENTITIES, seed + 'e')
  const cameraWork = pick(VIDEO_CAMERA_WORKS, seed + 'cam')

  return tools.map(tool => {
    const durationSec = tool === 'Runway' ? 16 : tool === 'Pika' ? 8 : 10

    let jaPrompt = `${loc}、${cameraWork}、${entity}が徐々に現れる、夜間、静寂、ホラー雰囲気`
    let enPrompt = `${loc}, ${cameraWork}, ${entity} slowly appearing, night, silence, horror atmosphere`
    let camera = `${cameraWork}。最初は静止、徐々に動き始める。`
    let movement = `${entity}が画面の端から中央に向かってゆっくり移動。`
    let sound = '最初は無音。低い風の音。終盤に金属音か子供の声。'
    let atmosphere = '恐怖感よりも不安感。何かがおかしい感じ。'
    let finalUncanny = `最後のフレームで${entity}が画面を直視する。`

    if (tool === 'Grok') {
      jaPrompt = `[Xバズり向け動画] ${jaPrompt}、コメントしたくなるラスト、少し笑える怖さも許可`
      enPrompt = `[X viral video] ${enPrompt}, comment-worthy ending, slight dark humor allowed`
      finalUncanny = `最後に${entity}がカメラに向かって動く。思わずコメントしたくなる構成。`
    } else if (tool === 'GPT') {
      jaPrompt = `以下の仕様でホラー動画プロンプトを生成してください：\n舞台：${loc}\n要素：${entity}\nカメラ：${cameraWork}\n尺：${durationSec}秒\n雰囲気：不安感・ホラー`
      enPrompt = `Generate a horror video prompt:\nSetting: ${loc}\nElement: ${entity}\nCamera: ${cameraWork}\nDuration: ${durationSec}s\nMood: unease and horror`
    }

    return {
      tool,
      jaPrompt,
      enPrompt,
      camera,
      movement,
      sound,
      atmosphere,
      finalUncanny,
      durationSec,
    }
  })
}

export function analyzeBuzzPost(text: string): BuzzAnalysis {
  const charCount = text.length
  const lineBreakCount = (text.match(/\n/g) || []).length
  const hasQuestion = /？|ですか|ますか|でしょうか/.test(text)
  const onomatopoeiaList = text.match(/ぞわ|ひゅ|じわ|ぞぞ|ぞく|ぞっ|ひた|ざわ|ふぅ|ぐら/g) || []
  const onomatopoeiaCount = onomatopoeiaList.length
  const emotionWords = EMOTION_WORDS.filter(w => text.includes(w))
  const hasCommentPrompt = /コメント|教えて|どう思|感想/.test(text)
  const hasFollowPrompt = /フォロー|プロフィール|リンク/.test(text)

  const hookArea = text.slice(0, 30)
  const hookType = /絶対|注意|禁止/.test(hookArea) ? '命令系'
    : /これ|画像|写真/.test(hookArea) ? '違和感系'
    : /体験|実際|昨日/.test(hookArea) ? '体験系'
    : /いる？|ある？|ない？/.test(hookArea) ? '共感系'
    : '通常'

  const features = []
  if (charCount <= 140) features.push('短文')
  else if (charCount <= 280) features.push('標準文字数')
  else features.push('長文')
  if (lineBreakCount >= 5) features.push('改行多め')
  if (onomatopoeiaCount >= 2) features.push('オノマトペ豊富')
  if (hasQuestion) features.push('問いかけあり')
  if (emotionWords.length >= 2) features.push('感情語多め')

  return {
    hook: hookArea,
    charCount,
    lineBreakCount,
    hasQuestion,
    onomatopoeiaCount,
    emotionWords,
    hasCommentPrompt,
    hasFollowPrompt,
    styleSummary: `${hookType}フック / ${features.join('、')}`,
  }
}

export function analyzeStyle(texts: string[]): Record<string, unknown> {
  if (texts.length === 0) return {}

  const avgCharCount = Math.round(texts.reduce((a, t) => a + t.length, 0) / texts.length)
  const avgLineBreaks = Math.round(texts.reduce((a, t) => a + (t.match(/\n/g) || []).length, 0) / texts.length)
  const questionFreq = texts.filter(t => /？|ですか/.test(t)).length / texts.length
  const emojiFreq = texts.filter(t => /[\u{1F300}-\u{1F9FF}]/u.test(t)).length / texts.length

  const openers = texts.map(t => t.split('\n')[0].slice(0, 20))
  const closers = texts.map(t => t.split('\n').pop()?.slice(-20) || '')

  return {
    avgCharCount,
    avgLineBreaks,
    questionFreq: Math.round(questionFreq * 100) + '%',
    emojiFreq: Math.round(emojiFreq * 100) + '%',
    commonOpeners: [...new Set(openers)].slice(0, 3),
    commonClosers: [...new Set(closers)].slice(0, 3),
    summary: `平均${avgCharCount}字、改行${avgLineBreaks}回、問いかけ${Math.round(questionFreq * 100)}%`,
  }
}

export function applyPatterns(text: string, patterns: { type: string; value: string; weight: number }[]): string {
  if (!patterns || patterns.length === 0) return text

  const openers = patterns.filter(p => p.type === 'opener').sort((a, b) => b.weight - a.weight)
  const closers = patterns.filter(p => p.type === 'closer').sort((a, b) => b.weight - a.weight)

  let result = text
  if (openers.length > 0 && !text.startsWith(openers[0].value.slice(0, 5))) {
    result = openers[0].value + '\n\n' + result
  }
  if (closers.length > 0 && !text.endsWith(closers[0].value.slice(-5))) {
    result = result + '\n\n' + closers[0].value
  }

  return result
}

// ─────────────────── Scene Extraction ───────────────────

export interface SceneData {
  primary: string
  location: string
  entity: string
  time: string
  action: string
  atmosphere: string
  enAtmosphere: string
  isUncanny: boolean
}

export function extractSceneFromPost(text: string, keyword: string = ''): SceneData {
  // Find the first matching word from each bank in the generated text
  const location =
    LOCATIONS.find(l => text.includes(l)) ||
    (keyword && keyword.length < 15 ? keyword : '') ||
    pick(LOCATIONS, text.slice(0, 8))

  const entity =
    ENTITIES.find(e => text.includes(e)) ||
    pick(ENTITIES, text.slice(0, 8))

  const time =
    TIMES.find(t => text.includes(t)) ||
    pick(TIMES, text.slice(0, 8))

  const action =
    HORROR_VERBS.find(v => text.includes(v)) || '現れた'

  // primary = keyword if given, else extracted location
  const primary = keyword && keyword.length < 20 ? keyword : location

  const isUncanny = /意味怖|気づいた|わかった|実は|見返|数え|同じ/.test(text)

  const isHeavy = /ガチ怖|恐ろし|死|血|震え|叫/.test(text)
  const isLight = /笑え|ちょっと|まあ|慣れ/.test(text)

  const atmosphere = isHeavy
    ? 'ガチ怖・強烈なホラー'
    : isLight
    ? '軽めのホラー・笑える怖さ'
    : '不気味・心理ホラー'

  const enAtmosphere = isHeavy
    ? 'extreme horror, visceral, deeply disturbing'
    : isLight
    ? 'mild horror, slightly comedic, unsettling'
    : 'psychological horror, subtle unease, uncanny'

  return { primary, location, entity, time, action, atmosphere, enAtmosphere, isUncanny }
}

// ─────────────────── AllGenerationOutput ───────────────────

export interface AllGenerationOutput {
  post: PostOutput
  hooks: HookOutput[]
  review: ReviewOutput
  images: ImagePromptOutput[]
  videos: VideoPromptOutput[]
  scene: SceneData
  // Phase-1 additions
  score: ScoreOutput
  hookVariants: HookVariantsOutput
  oddities: OddityIdea[]
}

// ─────────────────── Image Prompts from Scene ───────────────────

const IMAGE_CHANGE_PATTERNS_SCENE = [
  '位置が変わっている', '数が増えている', '視線が変わっている',
  '影が追加されている', '表情が変わっている', '人影が追加されている',
  '反射に違和感がある', '背景が微妙に変化している',
]

export function generateImagePromptsFromScene(
  scene: SceneData,
  postType: PostType,
  tools: string[] = ['Midjourney', 'Stable Diffusion', 'DALL·E', 'Grok', 'GPT'],
): ImagePromptOutput[] {
  const results: ImagePromptOutput[] = []
  const isTwo = postType === '画像付き投稿'
  const isManga = postType === '漫画構成'
  const imageCount = isManga ? 4 : isTwo ? 2 : 1

  const changePattern = pick(IMAGE_CHANGE_PATTERNS_SCENE, scene.primary)
  const styleBase = 'dark horror manga style, high contrast, ink illustration'

  for (let i = 0; i < imageCount; i++) {
    const isFirst = i === 0
    const isLast = i === imageCount - 1

    tools.forEach(tool => {
      let jaPrompt = ''
      let enPrompt = ''
      let composition = ''
      let uncanny = ''
      let label = ''

      if (isTwo) {
        if (isFirst) {
          label = `${tool} — 画像1（フック）`
          jaPrompt = `${scene.location}、${scene.time}、${scene.entity}がかろうじて見える程度の違和感、一見普通のシーン、${scene.atmosphere}`
          enPrompt = `${scene.location}, ${scene.time}, ${scene.entity} barely visible, looks almost normal, subtle wrongness, ${scene.enAtmosphere}, ${styleBase}`
          composition = 'ロングショット。主体は中央。画面の端に小さな違和感。'
          uncanny = `${scene.entity}の存在を感じさせる程度。気づかない人が多いレベル。`
        } else {
          label = `${tool} — 画像2（オチ）`
          jaPrompt = `${scene.location}、${scene.time}、${scene.entity}が${scene.action}、${changePattern}、ホラーの真相、同じ構図だが何かが明らかに変、${scene.atmosphere}`
          enPrompt = `${scene.location}, ${scene.time}, ${scene.entity} ${scene.action.replace('た','ing')}, ${changePattern}, horror reveal, same composition as image 1 but WRONG, ${scene.enAtmosphere}, ${styleBase}`
          composition = '1枚目と同じ構図。変化が自然に目立つ配置。クローズアップ気味。'
          uncanny = `${changePattern}。1枚目と見比べると明らかに違う。`
        }
      } else if (isManga) {
        const panelLabels = ['導入', '展開', '転', 'オチ']
        label = `${tool} — コマ${i + 1}（${panelLabels[i] || '展開'}）`
        const isClimaxPanel = isLast
        jaPrompt = isFirst
          ? `${scene.location}、${scene.time}、日常シーン、かすかな違和感、${scene.atmosphere}、漫画コマ1枚目`
          : isClimaxPanel
          ? `${scene.location}、${scene.entity}が${scene.action}、クライマックス、全てが明かされる、${scene.atmosphere}、漫画コマ最終枚`
          : `${scene.location}、${scene.entity}の存在感が増す、緊張感、${scene.atmosphere}、漫画コマ${i + 1}枚目`
        enPrompt = isFirst
          ? `${scene.location}, ${scene.time}, establishing shot, almost normal, hint of wrongness, ${scene.enAtmosphere}, manga panel style, ${styleBase}`
          : isClimaxPanel
          ? `${scene.location}, ${scene.entity} ${scene.action.replace('た','')}, climax reveal, everything becomes clear, ${scene.enAtmosphere}, manga panel style, ${styleBase}`
          : `${scene.location}, ${scene.entity} presence grows, building tension, panel ${i + 1}, ${scene.enAtmosphere}, manga panel style, ${styleBase}`
        composition = isFirst ? 'ロングショット。場所全体を見せる。' : isLast ? 'クローズアップ。決定的な一場面。' : 'ミディアムショット。'
        uncanny = isFirst ? 'わずかな違和感のみ。' : isLast ? '全ての謎が解ける。' : `${scene.entity}の違和感が大きくなっている。`
      } else {
        label = `${tool} — 単一画像`
        jaPrompt = `${scene.location}、${scene.time}、${scene.entity}が${scene.action}、${scene.atmosphere}、ホラー漫画風、高コントラスト`
        enPrompt = `${scene.location}, ${scene.time}, ${scene.entity} ${scene.action.replace('た','')}, ${scene.enAtmosphere}, ${styleBase}`
        composition = 'ミディアムショット。主体と背景の両方が見える。'
        uncanny = `${scene.entity}が${scene.action}瞬間。見た人がゾクっとする構図。`
      }

      // Tool-specific overrides
      if (tool === 'Midjourney') {
        enPrompt += ' --ar 1:1 --style raw --q 2'
      } else if (tool === 'Grok') {
        jaPrompt = `[Xバズり向け] ${jaPrompt}、コメントしたくなる構図、少し笑える怖さも許可`
        enPrompt = `[X viral horror] ${enPrompt}, comment-worthy composition, slight dark humor allowed`
      } else if (tool === 'GPT') {
        jaPrompt = `以下の仕様でホラー画像を生成してください：\n被写体：${scene.location}、${scene.entity}\nテーマ：${scene.primary}\n時間帯：${scene.time}\nスタイル：ダークホラー漫画風\n雰囲気：${scene.atmosphere}\n構図：${composition}\n重要要素：${uncanny}`
        enPrompt = `Generate a horror image:\nSubject: ${scene.location}, ${scene.entity}\nTheme: ${scene.primary}\nTime: ${scene.time}\nStyle: dark horror manga\nMood: ${scene.enAtmosphere}\nComposition: ${composition}\nKey element: ${uncanny}`
      }

      results.push({
        type: label,
        jaPrompt,
        enPrompt,
        negativePrompt: 'bright colors, cute, cheerful, low quality, blurry, text watermark, unrealistic anatomy, over-saturated',
        composition,
        uncanny,
        textIdea: (isTwo && !isFirst) ? `「${changePattern}」または「気づきましたか？」` : '',
      })
    })
  }

  return results
}

// ─────────────────── Video Prompts from Scene ───────────────────

export function generateVideoPromptsFromScene(
  scene: SceneData,
  tools: string[] = ['Runway', 'Pika', 'Grok', 'GPT'],
): VideoPromptOutput[] {
  const cameraWork = pick(VIDEO_CAMERA_WORKS, scene.primary)

  return tools.map(tool => {
    const durationSec = tool === 'Runway' ? 16 : tool === 'Pika' ? 8 : 10

    const movement = `${scene.entity}が${scene.time}の${scene.location}で${scene.action}。画面の端から中央に向かってゆっくり移動。`
    const camera = `${cameraWork}。最初は${scene.location}の全景。徐々に${scene.entity}にズームイン。`
    const sound = `最初は${scene.location}の環境音のみ。中盤から低音の風音。終盤に${scene.entity}に関連する不気味な音。`
    const atmosphere = `${scene.atmosphere}。${scene.time}の闇の中に${scene.entity}が溶け込んでいる。`
    const finalUncanny = scene.isUncanny
      ? `最後のフレームで${scene.entity}が視聴者を直視する。または「気づきましたか？」という画面テキスト。`
      : `最後のフレームで${scene.entity}が突然${scene.action}。一瞬だけ映る。`

    let jaPrompt = `${scene.location}、${scene.time}、${scene.entity}が${scene.action}シーン、${cameraWork}、${scene.atmosphere}、${durationSec}秒`
    let enPrompt = `${scene.location}, ${scene.time}, ${scene.entity} ${scene.action.replace('た','')}, ${cameraWork}, ${scene.enAtmosphere}, ${durationSec} seconds`

    if (tool === 'Grok') {
      jaPrompt = `[Xバズり向け動画] ${jaPrompt}、ラストにコメントしたくなる仕掛け、少し笑える怖さも許可`
      enPrompt = `[X viral horror video] ${enPrompt}, comment-worthy ending twist, slight dark humor allowed`
    } else if (tool === 'GPT') {
      jaPrompt = `以下の仕様でホラー動画プロンプトを生成してください：\n舞台：${scene.location}\nテーマ：${scene.primary}\n要素：${scene.entity}\nカメラ：${cameraWork}\n動き：${movement}\n音：${sound}\n雰囲気：${scene.atmosphere}\n尺：${durationSec}秒\nラスト：${finalUncanny}`
      enPrompt = `Generate a horror video prompt:\nSetting: ${scene.location}\nTheme: ${scene.primary}\nElement: ${scene.entity}\nCamera: ${cameraWork}\nMood: ${scene.enAtmosphere}\nDuration: ${durationSec}s\nEnding: ${finalUncanny}`
    }

    return {
      tool,
      jaPrompt,
      enPrompt,
      camera,
      movement,
      sound,
      atmosphere,
      finalUncanny,
      durationSec,
    }
  })
}

// ─────────────────── Unified Generation ───────────────────

export function generateAllFromPost(
  input: PostInput,
  patterns: { type: string; value: string; weight: number }[] = [],
): AllGenerationOutput {
  // 1. Generate post
  const post = generatePost(input)
  if (patterns.length > 0) {
    post.text = applyPatterns(post.text, patterns)
    post.charCount = post.text.length
  }

  // 2. Extract scene from the actual generated text → ensures content matching
  const scene = extractSceneFromPost(post.text, input.keyword || '')

  // 3. Generate hooks seeded by scene
  const hooks = generateHooks(scene.primary, input.postType)

  // 4. Review the generated post
  const review = reviewPost(post.text)

  // 5. Image prompts derived from scene
  const images = generateImagePromptsFromScene(
    scene,
    input.postType,
    ['Midjourney', 'Stable Diffusion', 'DALL·E', 'Grok', 'GPT'],
  )

  // 6. Video prompts derived from same scene
  const videos = generateVideoPromptsFromScene(
    scene,
    ['Runway', 'Pika', 'Grok', 'GPT'],
  )

  const score        = scorePost(post.text)
  const hookVariants = generateHookVariants(post.text)
  const oddities     = generateOddityIdeas(post.text)

  return { post, hooks, review, images, videos, scene, score, hookVariants, oddities }
}

// ═══════════════════════════════════════════════════════════════
// ─── Win Rate Functions ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// ─── 1. Post Scoring ─────────────────────────────────────────

// ── Score constants (exported for UI rendering) ─────────────────
export interface ScoreBreakdown {
  hook: number         // 0-15: フック力
  uncanny: number      // 0-15: 違和感
  specificity: number  // 0-15: 具体性
  emotion: number      // 0-15: 感情の強さ
  saveability: number  // 0-15: 保存性
  commentLead: number  // 0-15: コメント誘導
  followLead: number   // 0-10: フォロー導線
  // max total: 15×6 + 10 = 100
}

export const SCORE_MAX: Record<keyof ScoreBreakdown, number> = {
  hook: 15, uncanny: 15, specificity: 15,
  emotion: 15, saveability: 15, commentLead: 15, followLead: 10,
}

export const SCORE_LABELS: Record<keyof ScoreBreakdown, string> = {
  hook: 'フック力', uncanny: '違和感', specificity: '具体性',
  emotion: '感情の強さ', saveability: '保存性',
  commentLead: 'コメント誘導', followLead: 'フォロー導線',
}

export interface ScoreOutput {
  total: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  breakdown: ScoreBreakdown
  verdict: string
  improvements: string[]
  revised: string
}

// ── Score word banks ─────────────────────────────────────────

// フック：スクロールを止める強度で2段階
const STRONG_HOOK_WORDS = ['絶対', '注意', '閲覧', '読まないで', '見ないで', '夜中に']
const MILD_HOOK_WORDS   = [
  '実は', '本当', 'これ', 'え、', 'うわ', 'ちょっと待って',
  'まじで', '信じ', '見て', '聞いて', 'ちょっと', 'やばい',
]

// 違和感トリガー
const UNCANNY_TRIGGERS = [
  'のに', 'はずが', 'はずなのに', 'なのに', 'いるはず', 'いないはず',
  'あるはず', 'ないはず', 'なのにいた', 'なのに消え',
]

// 具体的な物・モノ辞書
const SPECIFIC_OBJECTS = [
  '人形', '写真', '鏡', '窓', '扉', 'スマホ', '時計', '影', '足音',
  '声', '手', '子供', '老人', '廊下', '押し入れ', '玄関', '地下室',
]

// 感情語：強度で3段階（漢字・変化形を含む）
const STRONG_EMOTION_WORDS  = ['背筋が凍', '鳥肌', 'ぞわぞわ', '震え', '恐怖', '悪寒']
const MEDIUM_EMOTION_WORDS  = [
  'こわい', 'やばい', '無理', '気持ち悪い', '嫌な感じ', 'ぞっと',
  '怖', '恐ろし', 'おかし', 'ぞわっ',
]
const MILD_EMOTION_WORDS    = ['なんか変', '不思議', '違和感', '気になる', 'なんか嫌']

export function scorePost(text: string): ScoreOutput {
  const first20   = text.slice(0, 20)
  const allLines  = text.split('\n').filter(Boolean)
  // 最後から最大2行を「末尾エリア」として扱う
  const tailArea  = allLines.slice(-2).join(' ')
  const charCount = text.length

  // ────────────────── フック力 (0-15) ──────────────────
  // ルール:
  //   強フック 1つ目 → 9pt
  //   弱フック 1つ目（強なし） → 5pt
  //   2つ目のフック（同エリア） → +3pt
  //   最初の20字以内に「？」→ +3pt
  //   フックが何もない → 0pt（底上げなし）

  const strongHitsFirst20 = STRONG_HOOK_WORDS.filter(w => first20.includes(w))
  const mildHitsFirst20   = MILD_HOOK_WORDS.filter(w => first20.includes(w))
  const hasStrongHook = strongHitsFirst20.length > 0
  const hasMildHook   = mildHitsFirst20.length > 0
  const hasQFirst     = /？/.test(first20)
  const hookBase      = hasStrongHook ? 9 : hasMildHook ? 5 : 0
  const hookSecond    = (hasStrongHook && (strongHitsFirst20.length >= 2 || hasMildHook)) ||
                        (hasMildHook   && mildHitsFirst20.length >= 2) ? 3 : 0
  const hookScore = Math.min(15, hookBase + hookSecond + (hasQFirst ? 3 : 0))

  // ────────────────── 違和感 (0-15) ──────────────────
  // ルール:
  //   オノマトペ各 +4（最大2個まで = 8pt）
  //   未完了感トリガー各 +3（最大3個まで = 9pt）
  //   オノマトペ AND トリガーが両方ある → +2ボーナス

  const onoHits     = (text.match(/ぞわ|ひゅ|じわ|ぞぞ|ぞく|ぞっ|ひた|ざわ/g) ?? []).length
  const triggerHits = UNCANNY_TRIGGERS.filter(w => text.includes(w)).length
  const hasBothUncanny = onoHits > 0 && triggerHits > 0
  const uncannyScore = Math.min(15,
    Math.min(2, onoHits) * 4 +
    Math.min(3, triggerHits) * 3 +
    (hasBothUncanny ? 2 : 0),
  )

  // ────────────────── 具体性 (0-15) ──────────────────
  // ルール:
  //   場所・時間・物・数字、各要素 +3pt
  //   2要素揃う → +1ボーナス
  //   3要素揃う → +2ボーナス（累積）
  //   4要素全揃い → +3ボーナス（累積）

  const hasLocation = LOCATIONS.some(l => text.includes(l))
  const hasTime     = TIMES.some(t => text.includes(t))
  const hasObject   = SPECIFIC_OBJECTS.some(o => text.includes(o))
  const hasNumber   = /[0-9０-９一二三四五六七八九十百千]/.test(text)
  const elemCount   = [hasLocation, hasTime, hasObject, hasNumber].filter(Boolean).length
  const specBonus   = elemCount >= 4 ? 3 : elemCount >= 3 ? 2 : elemCount >= 2 ? 1 : 0
  const specificityScore = Math.min(15, elemCount * 3 + specBonus)

  // ────────────────── 感情の強さ (0-15) ──────────────────
  // ルール:
  //   強感情語（背筋が凍る等） +6pt
  //   中感情語（こわい・怖・やばい等） +4pt ← 漢字・変化形も検出
  //   弱感情語（なんか変等） +2pt
  //   最大15pt

  const strongEmotionCount  = STRONG_EMOTION_WORDS.filter(w => text.includes(w)).length
  const mediumEmotionCount  = MEDIUM_EMOTION_WORDS.filter(w => text.includes(w)).length
  const mildEmotionCount    = MILD_EMOTION_WORDS.filter(w => text.includes(w)).length
  const emotionScore = Math.min(15,
    strongEmotionCount  * 6 +
    mediumEmotionCount  * 4 +
    mildEmotionCount    * 2,
  )

  // ────────────────── 保存性 (0-15) ──────────────────
  // ルール（"普通の長さ"への無条件加点を廃止）:
  //   末尾エリアに疑問文「？」→ +7pt
  //   本文中にCTAワード（コメント・シェア等）→ +5pt
  //   60〜280字の最適長（加点は小さく）→ +3pt
  //   長すぎ（>500字）または短すぎ（<30字）→ ボーナスなし

  const hasEndQ     = /？|ですか|ますか|でしょうか/.test(tailArea)
  const hasAnyCTA   = /コメント|教えて|シェア|拡散|保存|ブックマーク/.test(text)
  const isGoodLen   = charCount >= 60 && charCount <= 280
  const saveabilityScore = Math.min(15,
    (hasEndQ   ? 7 : 0) +
    (hasAnyCTA ? 5 : 0) +
    (isGoodLen ? 3 : 0),
  )

  // ────────────────── コメント誘導 (0-15) ──────────────────
  // ルール:
  //   明確なコメント招待フレーズ → +9pt（曖昧な「教えて」単独は対象外）
  //   体験・経験共有の招待 → +3pt
  //   疑問文（？）が本文中にある（上記なし時のみ） → +3pt

  const hasExplicitCommentInvite = /コメント.*ください|コメントで教え|コメント待|みんなはどう/.test(text)
  const hasExperienceInvite      = /経験|体験|同じ.*いる/.test(text)
  const hasAnyQ                  = /？/.test(text)
  const commentLeadScore = Math.min(15,
    (hasExplicitCommentInvite ? 9 : 0) +
    (hasExperienceInvite      ? 3 : 0) +
    (hasAnyQ && !hasExplicitCommentInvite ? 3 : 0),
  )

  // ────────────────── フォロー導線 (0-10) ──────────────────
  const hasFollowWord = /フォロー/.test(text)
  const hasProfileRef = /プロフ|リンク/.test(text)
  const hasSeries     = /続き|第[0-9０-９一二三]/.test(text)
  const followLeadScore = (hasFollowWord ? 5 : 0) + (hasProfileRef ? 3 : 0) + (hasSeries ? 2 : 0)

  // ────────────────── 集計 ──────────────────
  const breakdown: ScoreBreakdown = {
    hook:        hookScore,
    uncanny:     uncannyScore,
    specificity: specificityScore,
    emotion:     emotionScore,
    saveability: saveabilityScore,
    commentLead: commentLeadScore,
    followLead:  followLeadScore,
  }

  const rawTotal = Object.values(breakdown).reduce((a, b) => a + b, 0)
  // フック・感情・違和感がすべて 0 なら「バイラル要素なし」でペナルティ
  const noViralElements = hookScore === 0 && emotionScore === 0 && uncannyScore === 0
  const total = Math.max(0, rawTotal - (noViralElements ? 8 : 0))

  // グレード基準（厳格化）
  // S≥80 / A≥60 / B≥42 / C≥22 / D<22
  const grade: ScoreOutput['grade'] =
    total >= 80 ? 'S' : total >= 60 ? 'A' : total >= 42 ? 'B' : total >= 22 ? 'C' : 'D'

  const verdicts: Record<ScoreOutput['grade'], string> = {
    S: 'バズ確度が非常に高い。このまま投稿してOK。',
    A: '十分な質。あと一手で S ランクに届く。',
    B: '平均的。フック・感情のどちらか1つ強化すればA圏内。',
    C: 'バイラル要素が足りない。下の改善ポイントを必ず適用して。',
    D: '構造的な問題。フック・感情・違和感の3要素を見直して。',
  }

  // 弱い順に3項目を選んで具体的なアドバイスを生成
  const areaAdvice: Record<keyof ScoreBreakdown, string> = {
    hook: hookBase === 0
      ? `冒頭フックがない。「絶対に」「注意」「これ」など最初の15字以内に1語入れるだけで大幅改善。`
      : `フックはあるが弱め。「絶対に読まないでください」など命令系に差し替えると強くなる。`,
    uncanny: onoHits === 0 && triggerHits === 0
      ? `不気味さの演出がゼロ。「ぞわっ」や「のに誰もいなかった」を1箇所追加するだけで差が出る。`
      : `違和感演出が不十分。オノマトペ＋「〜はずが〜」の組み合わせで最大効果。`,
    specificity: elemCount === 0
      ? `具体描写がない。「${pick(LOCATIONS, text.slice(0, 3))}」「${pick(TIMES, text.slice(0, 3))}」など場所・時間を1つ入れる。`
      : `具体描写が1要素のみ。場所・時間・物・数字を2つ以上組み合わせると信憑性が上がる。`,
    emotion: emotionScore === 0
      ? `感情語がない。「こわい」「やばい」「無理」など1語あるだけで読者の感情を引き込める。`
      : `感情語が弱め。「背筋が凍った」「鳥肌が立った」など強感情語に昇格させる。`,
    saveability: !hasEndQ && !hasAnyCTA
      ? `末尾に疑問文もCTAもない。「同じ経験した人いますか？」1行で保存・コメント率が上がる。`
      : hasEndQ
      ? `疑問文はある。「保存推奨」「シェアしてね」など保存トリガーも加えるとさらに効果的。`
      : `CTAはある。末尾を「？」で締めると疑問文+CTA の両立でエンゲージが最大化する。`,
    commentLead: !hasExplicitCommentInvite
      ? `コメント誘導がない。「コメントで教えてください」を末尾に1行追加するだけでコメント数が増える。`
      : `コメント誘導はあるが体験共有の招待がない。「同じ経験した人いる？」を加えると反応が増える。`,
    followLead: followLeadScore === 0
      ? `フォロー導線がない。「フォローすると毎日ホラー投稿が届きます」を末尾に1行追加する。`
      : `フォロー誘導はある。プロフィールリンクへの誘導も加えるとブログ流入が増える。`,
  }

  const sorted = (Object.keys(breakdown) as (keyof ScoreBreakdown)[])
    .sort((a, b) => breakdown[a] / SCORE_MAX[a] - breakdown[b] / SCORE_MAX[b])
  const improvements = sorted.slice(0, 3).map(k => areaAdvice[k])

  // 修正版：最も弱い3要素を自動補完
  let revised = text
  if (hookScore < 6) {
    const strongHook = STRONG_HOOK_WORDS[0]
    revised = `${strongHook}、\n\n` + revised
  }
  if (uncannyScore < 5) {
    const ono = pick(ONOMATOPOEIA_BANK['中'], text.slice(0, 3))
    const lines = revised.split('\n')
    lines.splice(Math.max(1, Math.floor(lines.length / 2)), 0, ono)
    revised = lines.join('\n')
  }
  if (commentLeadScore < 6 && !hasExplicitCommentInvite) {
    revised = revised.trimEnd() + '\n\n' + pick(QUESTIONS_BANK, text.slice(0, 3))
  }

  return { total, grade, breakdown, verdict: verdicts[grade], improvements, revised }
}

// ─── generateOddityIdeas ──────────────────────────────────────

export interface OddityIdea {
  short: string      // 一行の違和感案
  imageNote: string  // 画像での使い方
  mangaNote: string  // 漫画での使い方
}

const ODDITY_TEMPLATES: Array<{
  short: (entity: string, location: string) => string
  imageNote: string
  mangaNote: string
}> = [
  {
    short: (e) => `${e}の影が1つ多い`,
    imageNote: '1枚目と2枚目で影の数を1つ変える。気づきにくい位置に置く。',
    mangaNote: '1コマ目に影の数を明示 → 最終コマで増えている。読者が自然に数える構造。',
  },
  {
    short: (e) => `${e}の視線だけ変わっている`,
    imageNote: '1枚目：横向き。2枚目：カメラ目線に変化。他は一切変えない。',
    mangaNote: '各コマで視線の方向が少しずつ読者側に向いていく。',
  },
  {
    short: (e, l) => `${l}の鏡の中だけ${e}が別の表情`,
    imageNote: '鏡の反射部分にだけ異常を入れる。本体は完全に正常。',
    mangaNote: '主人公が鏡を見るコマで、鏡内の自分だけ表情が違う。',
  },
  {
    short: (_e, l) => `${l}の時計の針が逆向き`,
    imageNote: '画面の端・背景に時計を配置し、針を逆向きにする。目立たせすぎない。',
    mangaNote: '1コマ目で時刻を示す → 最終コマで針が逆転。前後の時刻矛盾で読み返させる。',
  },
  {
    short: (_e, l) => `${l}の背景に知らない人影`,
    imageNote: '画面奥・ドア越し・窓の外に人影を薄く入れる。メインより暗く処理。',
    mangaNote: '1コマ目には誰もいない背景 → 最終コマだけ人影が増えている。',
  },
]

export function generateOddityIdeas(text: string): OddityIdea[] {
  const scene = extractSceneFromPost(text, '')
  const entity = scene.entity || '人形'
  const location = scene.location || '部屋'

  return ODDITY_TEMPLATES.map(t => ({
    short: t.short(entity, location),
    imageNote: t.imageNote,
    mangaNote: t.mangaNote,
  }))
}

// ─── 2. Hook A/B/C ───────────────────────────────────────────

export interface HookVariant {
  type: '安全' | '強め' | '攻め'
  hook: string
  reason: string
}

export interface HookVariantsOutput {
  variants: HookVariant[]
  subject: string
}

const SAFE_HOOKS = [
  '少し不思議な話をしてもいいですか',
  '気になってずっと考えていることがあって',
  'これ、どういう意味かわかりますか？',
  'ちょっと聞いてほしいことがあります',
  'ずっと言えなかったことを書きます',
  '信じるかどうかはあなた次第ですが',
]
const STRONG_HOOKS = [
  'これ、最後まで読まないと後悔します',
  '今すぐブックマークしてください',
  'これだけは本当のことです',
  '一人で読まないでください',
  '絶対に夜中に見ないでください',
  'これを知ってから変わってしまいました',
]
const AGGRESSIVE_HOOKS = [
  '夜中に読んでしまったら申し訳ない',
  'これ見てしまったら後悔するかもしれない',
  '本当に消えるかもしれないので今のうちに',
  'ここまで書いていいのかわからないけど',
  '誰も信じないだろうけど記録として残します',
  'これ以上スクロールするのは自己責任で',
]

export function generateHookVariants(text: string): HookVariantsOutput {
  const scene = extractSceneFromPost(text, '')
  const subject = scene.primary

  const safe = pick(SAFE_HOOKS, text.slice(0, 5)) + `\n\n${text}`
  const strong = pick(STRONG_HOOKS, text.slice(0, 5)) + `\n\n${text}`
  const aggressive = pick(AGGRESSIVE_HOOKS, text.slice(0, 5)) + `\n\n${text}`

  return {
    subject,
    variants: [
      {
        type: '安全',
        hook: safe,
        reason: '好奇心だけで引き込む。フォロワーが少ない段階でも安定してクリックされやすい。',
      },
      {
        type: '強め',
        hook: strong,
        reason: '命令系・緊急感で読む手を止める。インプレッションが多い投稿向き。',
      },
      {
        type: '攻め',
        hook: aggressive,
        reason: '強い感情喚起。バズるか無視されるかの二極化。数十万フォロワー向け。',
      },
    ],
  }
}

// ─── 3. Uncanniness Engine ───────────────────────────────────

export interface UncannyItem {
  id: number
  title: string
  description: string
  imageUse: string
  mangaUse: string
  copyText: string
}

export interface UncanninessOutput {
  items: UncannyItem[]
  subject: string
}

const UNCANNY_PATTERNS = [
  {
    title: '数の違和感',
    template: (s: string) => `${s}の数を数えたら、最初と違っていた。でも確認したとき、やっぱり合っている。`,
    imageUse: '1枚目と2枚目で要素の個数を変える（1個増やすか減らす）',
    mangaUse: '1コマ目でカウント → 最終コマで数が違う。読者も数える構成。',
  },
  {
    title: '視線の違和感',
    template: (s: string) => `${s}が、さっきまでこっちを見ていなかった。気のせいかもしれない。でも今は……。`,
    imageUse: '1枚目：正面を向いていない。2枚目：カメラ目線になっている。',
    mangaUse: '1コマ目は横向き。最終コマで読者に視線を向ける。',
  },
  {
    title: '位置の違和感',
    template: (s: string) => `${s}の位置が、最初と違う気がする。動いた形跡もないのに。`,
    imageUse: '1枚目と2枚目で主体の位置をわずかにずらす。',
    mangaUse: '各コマで少しずつ位置が変化。最終コマで元の場所に戻っている。',
  },
  {
    title: '鏡・反射の違和感',
    template: (s: string) => `鏡に映る${s}が、少しだけ遅れて動いている気がした。`,
    imageUse: '鏡の反射だけに異常を入れる。鏡以外は正常。',
    mangaUse: '主人公と鏡の中の自分が、1コマずつ動きがずれていく。',
  },
  {
    title: '時間の違和感',
    template: (s: string) => `${s}のそばを通るたびに、時間が数秒止まる気がする。時計を確認すると、正確に動いている。`,
    imageUse: '1枚目：時計が普通。2枚目：針が逆方向を向いている。',
    mangaUse: '1コマ目に時刻明示 → 最終コマで時刻が矛盾。',
  },
]

export function generateUncanniness(text: string): UncanninessOutput {
  const scene = extractSceneFromPost(text, '')
  const subject = scene.entity || scene.primary

  const items: UncannyItem[] = UNCANNY_PATTERNS.map((p, i) => ({
    id: i + 1,
    title: p.title,
    description: p.template(subject),
    imageUse: p.imageUse,
    mangaUse: p.mangaUse,
    copyText: p.template(subject),
  }))

  return { items, subject }
}

// ─── 4. Post Feedback Analyzer ───────────────────────────────

export type PerformanceLevel = 'バズ' | '好調' | '普通' | '低調'

export interface FeedbackOutput {
  engagementRate: number
  level: PerformanceLevel
  levelLabel: string
  strengths: string[]
  weaknesses: string[]
  nextAction: string
  nextPostHint: string
}

export function analyzeFeedback(
  text: string,
  likes: number,
  impressions: number,
): FeedbackOutput {
  const rate = impressions > 0 ? (likes / impressions) * 100 : 0
  const rounded = Math.round(rate * 100) / 100

  const level: PerformanceLevel =
    rate >= 5 ? 'バズ' : rate >= 2 ? '好調' : rate >= 0.8 ? '普通' : '低調'

  const levelLabels: Record<PerformanceLevel, string> = {
    バズ: `いいね率 ${rounded}% — バズ圏内`,
    好調: `いいね率 ${rounded}% — 好調（X平均の2倍以上）`,
    普通: `いいね率 ${rounded}% — 平均的`,
    低調: `いいね率 ${rounded}% — 改善が必要`,
  }

  // Analyze text features present
  const hasHook = [...STRONG_HOOK_WORDS, ...MILD_HOOK_WORDS].some(w => text.slice(0, 30).includes(w))
  const hasOnomatopoeia = /ぞわ|ひゅ|じわ|ぞぞ|ぞく/.test(text)
  const hasQuestion = /？|ですか/.test(text)
  const hasSpecific = LOCATIONS.some(l => text.includes(l)) || TIMES.some(t => text.includes(t))
  const charCount = text.length
  const isOptimalLength = charCount >= 50 && charCount <= 280

  const strengths: string[] = []
  const weaknesses: string[] = []

  if (level === 'バズ' || level === '好調') {
    if (hasHook) strengths.push('冒頭フックが機能した。最初の15字で読者を止めることができた。')
    if (hasOnomatopoeia) strengths.push('オノマトペが臨場感を生み出した。体験型の読書感が再生数を伸ばした。')
    if (hasQuestion) strengths.push('問いかけがコメントを誘発した。コメント数が多いと次回の表示も増える。')
    if (hasSpecific) strengths.push('具体的な描写が信憑性を高めた。「実話感」がシェアを促進した。')
    if (isOptimalLength) strengths.push('文字数が適切だった。スマホでスクロールせずに読める長さ。')
    if (strengths.length === 0) strengths.push('投稿全体のバランスが良かった。')
  } else {
    if (!hasHook) weaknesses.push('冒頭フックがなく、タイムラインで止まらなかった可能性。')
    if (!hasOnomatopoeia) weaknesses.push('臨場感が不足。ぞわっ・ぞくっなどで体験型にするとエンゲージ改善。')
    if (!hasQuestion) weaknesses.push('問いかけがなくコメントが生まれにくかった。最後の一行を疑問文に。')
    if (!hasSpecific) weaknesses.push('抽象的すぎる表現。具体的な場所・時間・物を入れると信憑性が上がる。')
    if (!isOptimalLength) weaknesses.push(charCount < 50 ? '文字数が少なすぎる。最低80字は書く。' : '文字数が長すぎてスキップされた可能性。')
    if (weaknesses.length === 0) weaknesses.push('テキスト品質は問題なし。投稿タイミングや競合投稿の影響かもしれない。')
  }

  const nextActions: Record<PerformanceLevel, string> = {
    バズ: '同じ構造でシリーズ化する。「続きを読みたい」コメントがあれば必ず続編を出す。',
    好調: '同テーマで追加投稿を3本作る。この構造を文体プリセットとして保存する。',
    普通: '弱点に挙げた箇所を1つだけ直して再投稿（リポストではなく新規投稿で）。',
    低調: '投稿を削除して再構成。フック・オノマトペ・問いかけを全て入れて書き直す。',
  }

  const nextPostHints: Record<PerformanceLevel, string> = {
    バズ: '「前回の続き」または「同じ場所で別の怪異」を書く。シリーズ効果でさらに伸びる。',
    好調: '同テーマをやや視点を変えて書く。「実は〇〇だった」型の考察編。',
    普通: '別テーマで試す。または今回の内容を2枚画像構成に変換。',
    低調: '人気アカウントのバズ投稿構造を参考にして同テーマで再挑戦。',
  }

  return {
    engagementRate: rounded,
    level,
    levelLabel: levelLabels[level],
    strengths,
    weaknesses,
    nextAction: nextActions[level],
    nextPostHint: nextPostHints[level],
  }
}

// ─── 5. Template Extractor ───────────────────────────────────

export interface TemplateStructure {
  hook: string
  body: string
  twist: string
  cta: string
  abstract: string
  tags: string[]
}

export interface TemplateExtractOutput {
  name: string
  structure: TemplateStructure
  score: number
}

const TEMPLATE_PATTERNS = [
  { name: '体験談型', tags: ['体験', '日常', 'ぼそっと'], hook: '日常の一場面から始まり、', body: '出来事を順番に描写し、', twist: '最後に意味が反転する', },
  { name: '命令系フック型', tags: ['命令', 'フック', '注意喚起'], hook: '強い命令・注意で始まり、', body: '理由を後から説明し、', twist: '「見てしまった人へ」で締める', },
  { name: '考察誘導型', tags: ['考察', '謎', '伏線'], hook: '謎めいた問いかけで始まり、', body: '断片的な情報を積み上げ、', twist: '答えを明示しないまま終わる', },
  { name: '意味怖型', tags: ['意味怖', '二重意味', '読み返し'], hook: '普通の出来事として始まり、', body: '細部の描写を積み重ね、', twist: '最後の一行で全ての意味が変わる', },
  { name: '画像誘導型', tags: ['画像', '2枚構成', '見比べ'], hook: '「この画像を見てください」で始まり、', body: '普通に見える説明をし、', twist: '「2枚目に気づきましたか？」で締める', },
]

export function extractTemplate(text: string): TemplateExtractOutput {
  const lines = text.split('\n').filter(Boolean)
  const firstLine = lines[0] ?? ''
  const lastLine = lines[lines.length - 1] ?? ''
  const midLines = lines.slice(1, -1)

  // Detect which pattern this matches
  const hasCommandHook = [...STRONG_HOOK_WORDS, ...MILD_HOOK_WORDS].some(w => firstLine.includes(w))
  const hasQuestion = /？|ですか/.test(lastLine)
  const hasUncanny = UNCANNY_TRIGGERS.some(w => text.includes(w))
  const hasImageRef = /画像|写真|2枚|見て/.test(text)

  let matched = TEMPLATE_PATTERNS[0]
  if (hasImageRef) matched = TEMPLATE_PATTERNS[4]
  else if (hasCommandHook) matched = TEMPLATE_PATTERNS[1]
  else if (hasUncanny && hasQuestion) matched = TEMPLATE_PATTERNS[3]
  else if (!hasCommandHook && hasQuestion) matched = TEMPLATE_PATTERNS[2]

  // Build abstract template (replace specifics with {})
  let abstract = text
  LOCATIONS.forEach(l => { abstract = abstract.replace(new RegExp(l, 'g'), '{場所}') })
  TIMES.forEach(t => { abstract = abstract.replace(new RegExp(t, 'g'), '{時間}') })
  ENTITIES.forEach(e => { abstract = abstract.replace(new RegExp(e, 'g'), '{存在}') })
  HORROR_VERBS.forEach(v => { abstract = abstract.replace(new RegExp(v, 'g'), '{動詞}') })

  const score = scorePost(text).total

  const structure: TemplateStructure = {
    hook: firstLine,
    body: midLines.join('\n') || '（本文なし）',
    twist: lastLine,
    cta: hasQuestion ? lastLine : '',
    abstract,
    tags: matched.tags,
  }

  return {
    name: matched.name,
    structure,
    score,
  }
}
