export default function Home() {
  return (
    <div style={{ padding: 20 }}>
      <h1>バズ投稿分析アプリ</h1>
      <p>起動成功 🎉</p>

      <ul>
        <li><a href="/accounts">アカウント</a></li>
        <li><a href="/buzz">分析</a></li>
        <li><a href="/generate">生成</a></li>
      </ul>
    </div>
  );
}