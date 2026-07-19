import Link from "next/link";

export default function DriveBlackCoffeePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Link href="/cases" className="text-[#6b6b6b] hover:text-white text-sm mb-8 inline-block">← Back to cases</Link>

        {/* Header */}
        <div className="border-b border-[#2a2a2a] pb-8 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Drive</h1>
          <p className="text-[#a1a1a1] text-lg mt-1">Black Coffee ft. David Guetta &amp; Delilah Montagu</p>

          <div className="flex flex-wrap gap-3 mt-4">
            <span className="text-xs border border-[#2a2a2a] rounded-full px-3 py-1 text-[#a1a1a1]">Deep House</span>
            <span className="text-xs border border-[#2a2a2a] rounded-full px-3 py-1 text-[#a1a1a1]">2017</span>
            <span className="text-xs border border-[#2a2a2a] rounded-full px-3 py-1 text-[#a1a1a1]">Soulistic Music</span>
            <span className="text-xs border border-[#2a2a2a] rounded-full px-3 py-1 text-[#a1a1a1]">ISRC: GBUM71700765</span>
          </div>
        </div>

        {/* Section 1: Presence in Dataset */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">1. Presence in Training Data</h2>
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-2xl font-bold text-white">190</div>
                <div className="text-sm text-[#6b6b6b]">Black Coffee tracks in LAION-DISCO-12M</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">75%</div>
                <div className="text-sm text-[#6b6b6b]">Of catalog included (190 / 253 recordings)</div>
              </div>
            </div>
            <div className="text-sm text-[#a1a1a1] space-y-1">
              <p><span className="text-[#6b6b6b]">Dataset:</span> LAION-DISCO-12M (12,320,916 tracks)</p>
              <p><span className="text-[#6b6b6b]">Source:</span> <a href="https://huggingface.co/datasets/laion/LAION-DISCO-12M" target="_blank" rel="noopener noreferrer nofollow" className="text-white underline underline-offset-2">huggingface.co/datasets/laion/LAION-DISCO-12M</a></p>
              <p><span className="text-[#6b6b6b]">Status:</span> Publicly circulated, downloaded 691+ times as of July 2026</p>
            </div>
          </div>
        </section>

        {/* Section 2: The Original Work */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">2. The Original Work</h2>
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-[#6b6b6b] uppercase tracking-wide">Key</span>
                <p className="text-white mt-0.5">B♭ minor</p>
              </div>
              <div>
                <span className="text-xs text-[#6b6b6b] uppercase tracking-wide">Tempo</span>
                <p className="text-white mt-0.5">~122 BPM</p>
              </div>
              <div>
                <span className="text-xs text-[#6b6b6b] uppercase tracking-wide">Signature Elements</span>
                <p className="text-white mt-0.5">Delilah Montagu vocal, arpeggiated synth, deep house groove</p>
              </div>
              <div>
                <span className="text-xs text-[#6b6b6b] uppercase tracking-wide">Writers</span>
                <p className="text-white mt-0.5">N. Maphumulo, D. Guetta, G. Tuinfort, D. Montagu</p>
              </div>
            </div>
            <div className="pt-3 border-t border-[#2a2a2a]">
              <span className="text-xs text-[#6b6b6b] uppercase tracking-wide">Reference Links</span>
              <div className="flex gap-4 mt-2">
                <a href="https://open.spotify.com/track/7rNWlIGaREi1HmB99lxGim" target="_blank" rel="noopener noreferrer" className="text-sm text-white underline underline-offset-2 hover:text-white/70">Spotify</a>
                <a href="https://www.youtube.com/watch?v=MKJQiWXk0xk" target="_blank" rel="noopener noreferrer" className="text-sm text-white underline underline-offset-2 hover:text-white/70">YouTube</a>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: AI Reproduction Test */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">3. AI Reproduction Test</h2>
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 space-y-4">
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
              <p className="text-xs text-amber-200/80">
                Following the methodology established by GEMA (Germany) in their January 2025 lawsuit against Suno AI.
                The test documents whether the AI system can output content substantially similar to the original work.
              </p>
            </div>

            <div>
              <span className="text-xs text-[#6b6b6b] uppercase tracking-wide">Platform Tested</span>
              <p className="text-white mt-0.5">Suno AI</p>
            </div>

            <div>
              <span className="text-xs text-[#6b6b6b] uppercase tracking-wide">Prompt Used</span>
              <div className="mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
                <p className="text-sm text-[#a1a1a1] italic">— To be documented —</p>
              </div>
            </div>

            <div>
              <span className="text-xs text-[#6b6b6b] uppercase tracking-wide">AI Output</span>
              <div className="mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
                <p className="text-sm text-[#a1a1a1] italic">— Pending test results —</p>
              </div>
            </div>

            <div>
              <span className="text-xs text-[#6b6b6b] uppercase tracking-wide">Musicological Comparison</span>
              <div className="mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
                <p className="text-sm text-[#a1a1a1] italic">— Leadsheet comparison pending —</p>
                <p className="text-xs text-[#6b6b6b] mt-2">
                  Will compare: melody, harmony, rhythm, tempo, key, vocal style, production elements
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Methodology */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">4. Methodology</h2>
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 space-y-3 text-sm text-[#a1a1a1]">
            <p><span className="text-white font-medium">Step 1:</span> Establish presence — confirm the artist&apos;s works exist in the training dataset via metadata analysis of LAION-DISCO-12M.</p>
            <p><span className="text-white font-medium">Step 2:</span> Reproduction test — use the AI platform (Suno) with prompts that reference the musical elements of the work. Document exact prompts and timestamps.</p>
            <p><span className="text-white font-medium">Step 3:</span> Musicological analysis — commissioned comparison of original and AI output, documenting similarities in melody, harmony, rhythm, and vocal characteristics.</p>
            <p><span className="text-white font-medium">Step 4:</span> Evidence package — compiled record including dataset provenance, reproduction evidence, and expert analysis.</p>
            <p className="pt-3 border-t border-[#2a2a2a] text-xs text-[#6b6b6b]">
              This methodology follows the approach established by GEMA (Gesellschaft für musikalische Aufführungs- und mechanische Vervielfältigungsrechte) in their January 2025 lawsuit against Suno Inc., which documented AI reproductions of works by Alphaville, Kristina Bach, Lou Bega, Frank Farian, and Modern Talking.
            </p>
          </div>
        </section>

        {/* Section 5: Legal Context */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">5. Legal Context</h2>
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 space-y-3 text-sm text-[#a1a1a1]">
            <p>This case study documents the availability of South African musical works in AI training datasets. Under South African copyright law (Copyright Act 98 of 1978, as amended), musical works and sound recordings are protected.</p>
            <p>The documentation establishes:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>The work exists in a publicly circulating training dataset</li>
              <li>The dataset was distributed to AI developers (691+ downloads)</li>
              <li>AI systems trained on this data can reproduce elements of the work</li>
            </ul>
            <div className="mt-4 pt-3 border-t border-[#2a2a2a]">
              <p className="text-xs text-[#6b6b6b]">
                <strong className="text-[#a1a1a1]">Disclaimer:</strong> Presence in a training dataset establishes availability and circulation — evidence of access, not proof of use by any specific AI company or model. This is research documentation, not legal advice.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-8 text-center">
          <h2 className="text-xl font-semibold">Is your music in the dataset?</h2>
          <p className="text-[#a1a1a1] text-sm mt-2 max-w-md mx-auto">
            We are documenting the presence of South African artists&apos; works in AI training datasets. If you are a rights holder, we can prepare an evidence pack for your catalogue.
          </p>
          <a href="mailto:nandi@augentik.com" className="inline-block mt-4 px-6 py-2.5 bg-white text-black rounded-lg font-medium text-sm hover:bg-white/90 transition-colors">
            Contact us
          </a>
        </section>
      </div>
    </main>
  );
}
