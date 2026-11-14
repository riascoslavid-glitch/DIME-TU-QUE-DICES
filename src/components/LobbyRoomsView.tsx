import { useEffect, useState } from 'react';
import { LogIn, PlusCircle, RefreshCw, Tv, Users } from 'lucide-react';
import { GAME_MODE_INFO, PublicGameListing } from '../shared/types';

interface LobbyRoomsViewProps {
  onJoinCode: (code: string) => void;
  onCreateGame: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  waiting: 'En sala de espera',
  question_active: 'Pregunta en curso',
  question_locked: 'Pregunta cerrada',
  answer_revealed: 'Mostrando resultados',
  paused: 'En pausa',
};

export function LobbyRoomsView({
  onJoinCode,
  onCreateGame,
}: LobbyRoomsViewProps) {
  const [games, setGames] = useState<PublicGameListing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/games');
      const data = await res.json();
      setGames(data.games || []);
    } catch {
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
    const timer = window.setInterval(fetchGames, 8000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white">
            Sala de Juegos en Vivo
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Salas activas en este momento. Únete con un clic o abre la pantalla
            de proyección.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchGames}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          <button
            type="button"
            onClick={onCreateGame}
            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva Partida
          </button>
        </div>
      </div>

      {loading && games.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Buscando salas activas...
        </div>
      ) : games.length === 0 ? (
        <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-10 text-center space-y-4">
          <p className="text-lg font-display font-bold text-white">
            No hay concursos en curso en este instante
          </p>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Crea una nueva partida como presentador para generar un código único
            e invitar a tu grupo en segundos.
          </p>
          <button
            type="button"
            onClick={onCreateGame}
            className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm cursor-pointer"
          >
            Crear Primera Partida
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {games.map((g) => (
            <div
              key={g.code}
              className="bg-[#111A2E] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span className="font-mono-num font-bold text-amber-300 text-sm">
                    {g.code}
                  </span>
                  <span>{STATUS_LABELS[g.status] || g.status}</span>
                </div>
                <h2 className="font-display font-bold text-xl text-white">
                  {g.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="text-sky-300 font-medium">
                    {GAME_MODE_INFO[g.mode].name}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{g.questionCount} preguntas</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-mono-num">
                    <Users className="w-3.5 h-3.5" />
                    {g.participantCount}/{g.maxParticipants}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => onJoinCode(g.code)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <LogIn className="w-4 h-4" />
                  Unirme
                </button>
                <a
                  href={`/?projector=${encodeURIComponent(g.code)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Tv className="w-4 h-4" />
                  Proyectar
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
