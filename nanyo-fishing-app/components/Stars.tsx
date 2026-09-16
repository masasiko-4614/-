export default function Stars({ n, size = "text-2xl" }: { n: number; size?: string }) {
  return (
    <span className={`${size} tracking-wide`} aria-label={`おすすめ度 ${n} / 5`}>
      <span className="text-amber-400">{"★".repeat(n)}</span>
      <span className="text-slate-400 dark:text-slate-600">{"★".repeat(5 - n)}</span>
    </span>
  );
}
