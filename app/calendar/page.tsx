"use client";
import { useEffect, useState } from "react";
import { useAccount } from "@/contexts/AccountContext";

type CalPost = {
  id:         string;
  content:    string;
  postType:   string | null;
  status:     string;
  isTemplate: boolean;
  createdAt:  string;
  postedAt:   string | null;
  genre:      { name: string } | null;
  account:    { name: string };
  metrics:    { likes: number; impressions: number }[];
};

const POST_TYPE_COLOR: Record<string, string> = {
  "バズ":   "bg-orange-500",
  "考察":   "bg-blue-500",
  "刺さる": "bg-purple-500",
};
const STATUS_COLOR: Record<string, string> = {
  posted:   "border-green-600",
  draft:    "border-zinc-600",
  archived: "border-zinc-700",
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function CalendarPage() {
  const { account } = useAccount();
  const now   = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [posts, setPosts]  = useState<CalPost[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    setLoading(true);
    setSelected(null);
    const qs = new URLSearchParams({ year: String(year), month: String(month) });
    if (account?.id) qs.set("accountId", account.id);
    fetch(`/api/calendar?${qs}`)
      .then((r) => r.json())
      .then((data: CalPost[]) => { setPosts(Array.isArray(data) ? data : []); })
      .finally(() => setLoading(false));
  }, [year, month, account?.id]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  const daysInMonth  = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();

  // Group posts by day
  const byDay: Record<number, CalPost[]> = {};
  for (const p of posts) {
    const d = new Date(p.createdAt).getDate();
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(p);
  }

  const selectedPosts = selected !== null ? (byDay[selected] ?? []) : [];

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayDate = now.getFullYear() === year && now.getMonth() + 1 === month ? now.getDate() : -1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">投稿カレンダー</h1>
        <div className="text-xs text-zinc-500">{posts.length}件 / {year}年{month}月</div>
      </div>

      {/* Month navigation */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <button onClick={prevMonth} className="text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-zinc-800 transition-colors">‹ 前月</button>
          <span className="font-semibold text-sm">{year}年{month}月</span>
          <button onClick={nextMonth} className="text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-zinc-800 transition-colors">翌月 ›</button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-zinc-800">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={`text-center text-xs py-2 font-medium ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-zinc-500"}`}>
              {w}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-600">読み込み中...</div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              const dayPosts = day ? (byDay[day] ?? []) : [];
              const isToday  = day === todayDate;
              const isSel    = day === selected;
              const weekday  = idx % 7;
              return (
                <button
                  key={idx}
                  disabled={!day}
                  onClick={() => day && setSelected(day === selected ? null : day)}
                  className={`min-h-[72px] p-2 border-b border-r border-zinc-800 text-left transition-colors ${
                    !day ? "bg-zinc-900/30 cursor-default" :
                    isSel ? "bg-blue-900/20" :
                    "hover:bg-zinc-800/50"
                  }`}
                >
                  {day && (
                    <>
                      <div className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday ? "bg-blue-600 text-white" :
                        weekday === 0 ? "text-red-400" :
                        weekday === 6 ? "text-blue-400" :
                        "text-zinc-400"
                      }`}>{day}</div>
                      <div className="flex flex-wrap gap-0.5">
                        {dayPosts.slice(0, 5).map((p) => (
                          <span
                            key={p.id}
                            className={`w-2 h-2 rounded-full ${POST_TYPE_COLOR[p.postType ?? ""] ?? "bg-zinc-500"}`}
                            title={p.postType ?? "投稿"}
                          />
                        ))}
                        {dayPosts.length > 5 && (
                          <span className="text-zinc-600 text-xs">+{dayPosts.length - 5}</span>
                        )}
                      </div>
                      {dayPosts.length > 0 && (
                        <div className="text-xs text-zinc-600 mt-0.5">{dayPosts.length}件</div>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-zinc-500">
        {[["バズ", "bg-orange-500"], ["考察", "bg-blue-500"], ["刺さる", "bg-purple-500"], ["その他", "bg-zinc-500"]].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${color}`} />{label}
          </span>
        ))}
      </div>

      {/* Selected day posts */}
      {selected !== null && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-300">
            {year}年{month}月{selected}日 — {selectedPosts.length}件
          </h2>
          {selectedPosts.length === 0 ? (
            <p className="text-xs text-zinc-600">この日の投稿はありません</p>
          ) : (
            selectedPosts.map((p) => (
              <div key={p.id} className={`bg-zinc-900 border rounded-lg p-4 ${STATUS_COLOR[p.status] ?? "border-zinc-800"}`}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {p.postType && (
                    <span className={`text-xs px-2 py-0.5 rounded-full text-white ${POST_TYPE_COLOR[p.postType] ?? "bg-zinc-600"}`}>
                      {p.postType}
                    </span>
                  )}
                  {p.genre && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{p.genre.name}</span>
                  )}
                  {p.isTemplate && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-400">★ テンプレート</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === "posted" ? "bg-green-900/40 text-green-400" :
                    p.status === "archived" ? "bg-zinc-800 text-zinc-500" :
                    "bg-yellow-900/40 text-yellow-400"
                  }`}>
                    {p.status === "posted" ? "投稿済" : p.status === "archived" ? "アーカイブ" : "下書き"}
                  </span>
                  <span className="text-xs text-zinc-600 ml-auto">
                    {new Date(p.createdAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap line-clamp-4">{p.content}</p>
                {p.metrics[0] && (
                  <div className="mt-2 text-xs text-zinc-500 flex gap-3">
                    <span>♥ {p.metrics[0].likes.toLocaleString()}</span>
                    <span>👁 {p.metrics[0].impressions.toLocaleString()}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
