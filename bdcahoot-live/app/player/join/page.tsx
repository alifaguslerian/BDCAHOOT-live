import Link from 'next/link';

export default function PlayerJoinPage() {
  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F5F7FA] flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">MASUK KE ROOM</h1>
          <p className="text-sm text-[#8B93A1]">Masukkan 6 digit kode room dari layar proyektor</p>
        </div>

        <div className="bg-[#151A22] border border-[#1E2530] p-6 rounded-xl space-y-4">
          <div>
            <label htmlFor="room-code" className="block text-xs font-semibold text-[#8B93A1] mb-2 uppercase">
              Kode Room
            </label>
            <input
              id="room-code"
              type="text"
              placeholder="MISAL: BDA729"
              maxLength={6}
              className="w-full uppercase text-center font-mono text-2xl tracking-widest bg-[#0B0E14] border border-[#2B3545] rounded-lg p-3 text-[#F5F7FA] focus:outline-none focus:border-[#F5A623]"
            />
          </div>

          <button
            id="btn-submit-code"
            type="button"
            className="w-full py-3 bg-[#F5A623] hover:bg-[#d98f16] text-[#0B0E14] font-bold rounded-lg transition"
          >
            LANJUT
          </button>
        </div>

        <div className="text-center">
          <Link href="/" className="text-xs text-[#8B93A1] hover:text-[#F5F7FA]">
            ← Kembali ke Landing
          </Link>
        </div>
      </div>
    </div>
  );
}
