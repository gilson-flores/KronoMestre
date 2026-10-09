export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#f8fafc] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111827] border border-[#1e293b] rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
        <h2 className="text-2xl font-bold text-[#f8fafc] mb-2">404 - Não Encontrado</h2>
        <p className="text-sm text-[#94a3b8] mb-6">A página solicitada não foi encontrada ou foi movida.</p>
        <a
          href="/"
          className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
        >
          Voltar ao KronoMestre
        </a>
      </div>
    </div>
  );
}
