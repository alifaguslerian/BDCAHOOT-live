import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0B0E14] text-[#F5F7FA]">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#F5F7FA] font-mono">
            BDCAHOOT
          </h1>
          <p className="text-[#8B93A1] text-sm sm:text-base font-medium">
            Stage & Arena Quiz Platform
          </p>
        </div>

        <div className="flex flex-col gap-4 pt-4">
          <Link
            id="landing-start-btn"
            href="/host/library"
            className="w-full py-4 px-6 rounded-lg bg-[#F5A623] hover:bg-[#d98f16] text-[#0B0E14] font-bold text-lg tracking-wide transition duration-150 shadow-md flex items-center justify-center"
          >
            START (HOST)
          </Link>

          <Link
            id="landing-join-btn"
            href="/player/join"
            className="w-full py-4 px-6 rounded-lg bg-[#151A22] hover:bg-[#1E2530] text-[#F5F7FA] border border-[#2B3545] font-bold text-lg tracking-wide transition duration-150 flex items-center justify-center"
          >
            MASUK (PESERTA)
          </Link>
        </div>
      </div>
    </main>
  );
}
