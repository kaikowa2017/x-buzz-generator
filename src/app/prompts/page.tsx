'use client'

import { useState } from 'react'
import { CopyButton } from '@/components/ui/CopyButton'
import { SaveButton } from '@/components/ui/SaveButton'
import { Collapsible } from '@/components/ui/Collapsible'
import { OddityIdeas } from '@/components/ui/OddityIdeas'
import type { PromptsOutput, OddityIdea } from '@/lib/generator'

const IMAGE_TYPES = ['単一画像', '2枚構成', '3枚構成', '漫画構成']
const IMAGE_TOOLS = ['Midjourney', 'Stable Diffusion', 'DALL·E', 'Grok', 'GPT']
const VIDEO_TOOLS = ['Runway', 'Pika', 'Grok', 'GPT']

export default function PromptsPage() {
  const [keyword, setKeyword] = useState('')
  const [imageCount, setImageCount] = useState(2)
  const [imageType, setImageType] = useState('2枚構成')
  const [imageTools, setImageTools] = useState(['Midjourney', 'Grok'])
  const [videoTools, setVideoTools] = useState(['Runway', 'Grok'])
  const [result, setResult] = useState<PromptsOutput | null>(null)
  const [oddities, setOddities] = useState<OddityIdea[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image')
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const [activeVideoIdx, setActiveVideoIdx] = useState(0)

  const toggleTool = (tool: string, arr: string[], setArr: (v: string[]) => void) => {
    setArr(arr.includes(tool) ? arr.filter(t => t !== tool) : [...arr, tool])
  }

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, imageCount, imageType, imageTools, videoTools }),
      })
      const json = await res.json()
      if (json.success) {
        setResult(json.data)
        setActiveTab('image')
        setActiveImageIdx(0)
        setActiveVideoIdx(0)
        // fetch oddities based on keyword
        if (keyword.trim()) {
          const oddRes = await fetch('/api/win/oddities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: keyword }),
          })
          const oddJson = await oddRes.json()
          if (oddJson.success) setOddities(oddJson.data)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="horror-title text-2xl font-bold text-red-500 mb-4">🎨 画像・動画プロンプト生成</h1>

      <div className="space-y-4 mb-4">
        <div>
          <label className="label-horror">テーマ・キーワード</label>
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="例：廃病院、森の中の人影、呪いの写真…"
            className="input-horror"
          />
        </div>

        <div>
          <label className="label-horror">画像タイプ</label>
          <div className="flex gap-2 flex-wrap">
            {IMAGE_TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setImageType(t)
                  if (t === '単一画像') setImageCount(1)
                  else if (t === '2枚構成') setImageCount(2)
                  else if (t === '3枚構成') setImageCount(3)
                }}
                className={`text-sm px-3 py-1.5 rounded border transition-colors ${
                  imageType === t
                    ? 'border-red-500 text-red-400 bg-red-900/20'
                    : 'border-horror-border text-gray-400 hover:border-gray-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label className="label-horror">画像枚数</label>
            <input
              type="number"
              min={1}
              max={10}
              value={imageCount}
              onChange={e => setImageCount(Math.min(10, Math.max(1, Number(e.target.value))))}
              className="input-horror w-20"
            />
          </div>
          <p className="text-xs text-gray-500 mt-4">1〜10枚対応</p>
        </div>

        <Collapsible title="生成ツール選択">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-2">画像生成ツール</p>
              <div className="flex gap-2 flex-wrap">
                {IMAGE_TOOLS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTool(t, imageTools, setImageTools)}
                    className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                      imageTools.includes(t)
                        ? 'border-red-500 text-red-400 bg-red-900/20'
                        : 'border-horror-border text-gray-500'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">動画生成ツール</p>
              <div className="flex gap-2 flex-wrap">
                {VIDEO_TOOLS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTool(t, videoTools, setVideoTools)}
                    className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                      videoTools.includes(t)
                        ? 'border-red-500 text-red-400 bg-red-900/20'
                        : 'border-horror-border text-gray-500'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Collapsible>

        <button onClick={generate} disabled={loading} className="w-full btn-red py-3">
          {loading ? '生成中…' : 'プロンプトを生成する'}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('image')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === 'image' ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400'
              }`}
            >
              画像 ({result.images.length})
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === 'video' ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400'
              }`}
            >
              動画 ({result.videos.length})
            </button>
            <SaveButton
              type="prompts"
              title={`プロンプト ${keyword || '無題'}`}
              input={{ keyword, imageCount, imageType }}
              output={result}
            />
          </div>

          {activeTab === 'image' && (
            <div>
              <div className="flex gap-1 flex-wrap mb-3">
                {result.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIdx(i)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      activeImageIdx === i ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400'
                    }`}
                  >
                    {img.type.split(' - ')[0]}
                  </button>
                ))}
              </div>
              {result.images[activeImageIdx] && (() => {
                const img = result.images[activeImageIdx]
                return (
                  <div className="space-y-3">
                    <p className="text-xs text-red-400">{img.type}</p>
                    <div className="card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">日本語プロンプト</span>
                        <CopyButton text={img.jaPrompt} />
                      </div>
                      <p className="text-sm text-gray-200">{img.jaPrompt}</p>
                    </div>
                    <div className="card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">英語プロンプト</span>
                        <CopyButton text={img.enPrompt} />
                      </div>
                      <p className="text-xs font-mono text-green-400 bg-[#0a1a0a] p-2 rounded leading-relaxed">{img.enPrompt}</p>
                    </div>
                    <div className="card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">ネガティブプロンプト</span>
                        <CopyButton text={img.negativePrompt} />
                      </div>
                      <p className="text-xs text-red-300">{img.negativePrompt}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="card">
                        <p className="text-xs text-gray-500 mb-1">構図</p>
                        <p className="text-xs text-gray-300">{img.composition}</p>
                      </div>
                      <div className="card">
                        <p className="text-xs text-gray-500 mb-1">違和感ポイント</p>
                        <p className="text-xs text-red-300">{img.uncanny}</p>
                      </div>
                    </div>
                    {img.textIdea && (
                      <div className="card">
                        <p className="text-xs text-gray-500 mb-1">画像内テキスト案</p>
                        <p className="text-sm text-yellow-400">{img.textIdea}</p>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* 違和感案 */}
              {oddities.length > 0 && (
                <div className="border-t border-horror-border pt-3 mt-3">
                  <OddityIdeas oddities={oddities} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'video' && (
            <div>
              <div className="flex gap-1 flex-wrap mb-3">
                {result.videos.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveVideoIdx(i)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      activeVideoIdx === i ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400'
                    }`}
                  >
                    {v.tool}
                  </button>
                ))}
              </div>
              {result.videos[activeVideoIdx] && (() => {
                const v = result.videos[activeVideoIdx]
                return (
                  <div className="space-y-3">
                    <p className="text-xs text-red-400">{v.tool} / {v.durationSec}秒目安</p>
                    <div className="card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">日本語プロンプト</span>
                        <CopyButton text={v.jaPrompt} />
                      </div>
                      <p className="text-sm text-gray-200">{v.jaPrompt}</p>
                    </div>
                    <div className="card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">英語プロンプト</span>
                        <CopyButton text={v.enPrompt} />
                      </div>
                      <p className="text-xs font-mono text-green-400 bg-[#0a1a0a] p-2 rounded leading-relaxed">{v.enPrompt}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="card">
                        <p className="text-xs text-gray-500 mb-1">カメラワーク</p>
                        <p className="text-xs text-gray-300">{v.camera}</p>
                      </div>
                      <div className="card">
                        <p className="text-xs text-gray-500 mb-1">動き</p>
                        <p className="text-xs text-gray-300">{v.movement}</p>
                      </div>
                      <div className="card">
                        <p className="text-xs text-gray-500 mb-1">音</p>
                        <p className="text-xs text-gray-300">{v.sound}</p>
                      </div>
                      <div className="card">
                        <p className="text-xs text-gray-500 mb-1">雰囲気</p>
                        <p className="text-xs text-gray-300">{v.atmosphere}</p>
                      </div>
                    </div>
                    <div className="card border-red-900">
                      <p className="text-xs text-gray-500 mb-1">ラストの違和感</p>
                      <p className="text-sm text-red-300">{v.finalUncanny}</p>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
