export default function Loading() {
  return (
    <main className="min-h-screen p-4 md:p-6 pb-24 animate-fadeInUp">
      <div className="h-8 w-36 rounded-lg skeleton-glass mb-5" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="h-28 rounded-2xl skeleton-glass" />
        <div className="h-28 rounded-2xl skeleton-glass" />
        <div className="h-28 rounded-2xl skeleton-glass" />
        <div className="h-28 rounded-2xl skeleton-glass" />
      </div>
    </main>
  );
}
