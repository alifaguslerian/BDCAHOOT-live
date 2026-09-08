import Link from 'next/link';

export default function PlayerNamePage() {
  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F5F7FA] flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">TENTUKAN NAMA</h1>
          <p className="text-sm text-[#8B93A1]">Hanya huruf (A-Z), tanpa spasi, angka, atau simbol</p>
        </div>

        <div className="bg-[#151A22] border border-[#1E2530] p-6 rounded-xl space-y-4">
          <div>
            <label htmlFor="player-name" className="block text-xs font-semibold text-[#8B93A1] mb-2 uppercase">
              Nama Panggilan
            </label>
            <input
              id="player-name"
              type="text"
              placeholder="Contoh: Budi"
              maxLength={20}
              className="w-full text-center font-bold text-xl bg-[#0B0E14] border border-[#2B3545] rounded-lg p-3 text-[#F5F7FA] focus:outline-none focus:border-[#F5A623]"
            />
            <p className="text-[11px] text-[#8B93A1] mt-1 text-center">
              Nama wajib unik di dalam room.
            </p>
          </div>

          <button
            id="btn-join-room"
            type="button"
            className="w-full py-3 bg-[#F5A623] hover:bg-[#d98f16] text-[#0B0E14] font-bold rounded-lg transition"
          >
            MASUK ROOM
          </button>
        </div>

        <div className="text-center">
          <Link href="/player/join" className="text-xs text-[#8B93A1] hover:text-[#F5F7FA]">
            ← Ganti Kode Room
          </Link>
        </div>
      </div>
    </div>
  );
}
