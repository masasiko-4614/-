export default function WarningBanner({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <div
      role="alert"
      className="rounded-xl border-2 border-red-500 bg-red-50 p-4 text-red-800 dark:bg-red-950 dark:text-red-200"
    >
      <p className="mb-1 text-lg font-bold">⚠️ 危険な気象条件</p>
      <ul className="list-disc space-y-1 pl-5 text-base font-medium">
        {warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
