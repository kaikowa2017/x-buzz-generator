'use client'

import { useState } from 'react'
import { CopyButton } from '@/components/ui/CopyButton'
import { SaveButton } from '@/components/ui/SaveButton'
import { Collapsible } from '@/components/ui/Collapsible'
import { OddityIdeas } from '@/components/ui/OddityIdeas'
import type { MangaOutput, OddityIdea } from '@/lib/generator'

const PANEL_PRESETS = [
  { label: '1枚', value: 1 },
  { label: '2枚', value: 2 },
  { label: '3枚', value: 3 },
  { label: '4コマ', value: 4 },
  { label: '6枚', value: 6 },
  { label: '10枚', value: 10 },
]

const MANGA_TYPES = ['意味怖漫画', '4コマ', 'ショート漫画', 'ギャグホラー漫画', '考察型漫画']

export default function MangaPage() {
  const [keyword, setKeyword] = useState('')
  const [panelCount, setPanelCount] = useState(4)
  const [mangaType, setMangaType] = useState('意味怖漫画')
  const [hasNarration, setHasNarration] = useState(true)
  const [punchlineStrength, setPunchlineStrength] = useState('強')
  const [dialogueLevel, setDialogueLevel] = useState('普通')
  const [result, setResult] = useState<MangaOutput | null>(null)
  const [oddities, setOddities] = useState<OddityIdea[]>([])
  const [loading, setLoading] = useState(false)
  const [activePanel, setActivePanel] = useState(0)
  const [activeTab, setActiveTab] = useState<'overview' | 'panels' | 'prompts' | 'oddities'>('overview')

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/manga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, panelCount, mangaType, hasNarration, punchlineStrength, dialogueLevel }),
      })
      const json = await res.json()
      if (json.success) {
        setResult(json.data)
        setActiveTab('overview')
        setActivePanel(0)
        // fetch oddities using generated post text
        const oddRes = await fetch('/api/win/oddities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: json.data.postText }),
        })
        const oddJson = await oddRes.json()
        if (oddJson.success) setOddities(oddJson.data)
      }
    } finally {
      setLoading(false)
    }
  }

  const fullText = result
    ? `【${result.title}】\n\n${result.postText}\n\n${result.commentPrompt}`
    : ''

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="horror-title text-2xl font-bold text-red-500 mb-4">📚 漫画構成生成</h1>

      <div className="space-y-4 mb-4">
        <div>
          <label className="label-horror">テーマ・キーワード</label>
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="例：廃病院、呪われた日記、謎の隣人…"
            className="input-horror"
          />
        </div>

        <div>
          <label className="label-horror">コマ数プリセット</label>
          <div className="flex gap-2 flex-wrap">
            {PANEL_PRESETS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPanelCount(p.value)}
                className={`text-sm px-3 py-1.5 rounded border transition-colors ${
                  panelCount === p.value
                    ? 'border-red-500 text-red-400 bg-red-900/20'
                    : 'border-horror-border text-gray-400 hover:border-gray-500'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <label className="label-horror mb-0">カスタム:</label>
            <input
              type="number"
              min={1}
              max={10}
              value={panelCount}
              onChange={e => setPanelCount(Math.min(10, Math.max(1, Number(e.target.value))))}
              className="input-horror w-20"
            />
            <span className="text-xs text-gray-500">1〜10コマ</span>
          </div>
        </div>

        <div>
          <label className="label-horror">漫画タイプ</label>
          <select value={mangaType} onChange={e => setMangaType(e.target.value)} className="input-horror">
            {MANGA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <Collapsible title="詳細設定">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-horror">オチの強さ</label>
              <select value={punchlineStrength} onChange={e => setPunchlineStrength(e.target.value)} className="input-horror">
                {['弱','中','強'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label-horror">セリフ量</label>
              <select value={dialogueLevel} onChange={e => setDialogueLevel(e.target.value)} className="input-horror">
                {['少','普通','多'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer mt-3">
            <input type="checkbox" checked={hasNarration} onChange={e => setHasNarration(e.target.checked)} className="accent-red-500" />
            ナレーションあり
          </label>
        </Collapsible>

        <button onClick={generate} disabled={loading} className="w-full btn-red py-3">
          {loading ? '生成中…' : `${panelCount}コマ構成を生成する`}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="card border-red-900">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-red-400 font-bold">【{result.title}】</h2>
              <div className="flex gap-2">
                <CopyButton text={fullText} label="全コピー" />
                <SaveButton
                  type="manga"
                  title={result.title}
                  input={{ keyword, panelCount, mangaType }}
                  output={result}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-1">オチ: {result.punchline}</p>
          </div>

          <div className="flex gap-1 flex-wrap">
            {(['overview', 'panels', 'prompts', 'oddities'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs px-3 py-1 rounded transition-colors ${
                  activeTab === tab ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222]'
                }`}
              >
                {tab === 'overview' ? '投稿文' : tab === 'panels' ? 'コマ詳細' : tab === 'prompts' ? '画像プロンプト' : '違和感案'}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-3">
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">投稿文</span>
                  <CopyButton text={result.postText} />
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans">{result.postText}</pre>
              </div>
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">コメント誘導</span>
                  <CopyButton text={result.commentPrompt} />
                </div>
                <p className="text-sm text-gray-200">{result.commentPrompt}</p>
              </div>
            </div>
          )}

          {activeTab === 'panels' && (
            <div className="space-y-3">
              <div className="flex gap-1 flex-wrap">
                {result.panels.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePanel(i)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      activePanel === i ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400'
                    }`}
                  >
                    {p.panelNum}コマ目
                  </button>
                ))}
              </div>
              {result.panels[activePanel] && (() => {
                const panel = result.panels[activePanel]
                return (
                  <div className="card space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-red-400 font-medium">コマ{panel.panelNum}</span>
                      <CopyButton text={[panel.scene, ...panel.dialogue, panel.narration].filter(Boolean).join('\n')} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">シーン説明</p>
                      <p className="text-sm text-gray-200">{panel.scene}</p>
                    </div>
                    {panel.dialogue.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">セリフ</p>
                        {panel.dialogue.map((d, i) => (
                          <p key={i} className="text-sm text-yellow-300">{d}</p>
                        ))}
                      </div>
                    )}
                    {panel.narration && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">ナレーション</p>
                        <p className="text-sm text-blue-300 italic">{panel.narration}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">構図</p>
                      <p className="text-sm text-gray-300">{panel.composition}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">違和感ポイント</p>
                      <p className="text-sm text-red-300">{panel.uncanny}</p>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {activeTab === 'prompts' && (
            <div className="space-y-3">
              {result.panels.map((panel, i) => (
                <div key={i} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">コマ{panel.panelNum} 画像プロンプト</span>
                    <CopyButton text={panel.imagePrompt} />
                  </div>
                  <p className="text-xs font-mono text-green-400 bg-[#0a1a0a] p-2 rounded">{panel.imagePrompt}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'oddities' && oddities.length > 0 && (
            <div className="card">
              <OddityIdeas oddities={oddities} />
            </div>
          )}
          {activeTab === 'oddities' && oddities.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-4">生成後に違和感案が表示されます</p>
          )}
        </div>
      )}
    </div>
  )
}
