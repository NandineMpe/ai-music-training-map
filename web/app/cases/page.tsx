import Link from "next/link";

export default function CasesPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Link href="/" className="text-[#6b6b6b] hover:text-white text-sm mb-8 inline-block">← Back to map</Link>

        <h1 className="text-3xl font-semibold tracking-tight">Case Studies</h1>
        <p className="text-[#a1a1a1] mt-2 max-w-xl">
          Documenting the reproduction of South African musical works by AI systems trained on publicly circulating datasets.
        </p>

        <div className="mt-12 space-y-4">
          <Link href="/cases/drive-black-coffee" className="block bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#444] transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Drive</h2>
                <p className="text-[#a1a1a1] text-sm mt-0.5">Black Coffee ft. David Guetta &amp; Delilah Montagu</p>
              </div>
              <span className="text-xs text-[#6b6b6b] border border-[#2a2a2a] rounded-full px-3 py-1">In progress</span>
            </div>
            <p className="text-[#6b6b6b] text-sm mt-3">
              Deep house · 2017 · Soulistic Music · Present in LAION-DISCO-12M (190 tracks by Black Coffee)
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
