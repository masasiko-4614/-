export default function SampleBadge({ show = true }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
      サンプル
    </span>
  );
}
