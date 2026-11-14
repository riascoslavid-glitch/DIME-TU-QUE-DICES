import { useEffect, useState } from 'react';
import { Calendar, Crown, Medal, Trophy, Users } from 'lucide-react';
import { GAME_MODE_INFO, GameHistorySummary } from '../shared/types';
import { AvatarBadge } from './AvatarBadge';

interface HistoryLeaderboardViewProps {
  initialTab?: 'clasificacion' | 'historial';
}

export function HistoryLeaderboardView({
  initialTab = 'clasificacion',
}: HistoryLeaderboardViewProps) {
  const [tab, setTab] = useState<'clasificacion' | 'historial'>(initialTab);
  const [history, setHistory] = useState<GameHistorySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then((d) => setHistory(d.history || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  // Build global hall of fame from real completed matches
  const globalRecords = history
    .flatMap((h) =>
      h.topThree.map((entry) => ({
        ...entry,
        gameTitle: h.title,
        code: h.code,
        finishedAt: h.finishedAt,
      }))
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white">
            {tab === 'clasificacion'
              ? 'Clasificación y Puntuaciones'
              : 'Historial de Partidas'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Registros reales guardados automáticamente al finalizar cada
            concurso.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#111A2E] border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setTab('clasificacion')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'clasificacion'
                ? 'bg-amber-400 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Mejores Puntuaciones
          </button>
          <button
            type="button"
            onClick={() => setTab('historial')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'historial'
                ? 'bg-amber-400 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Historial de Concursos
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Cargando registros...
        </div>
      ) : history.length === 0 ? (
        <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-10 text-center space-y-2">
          <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="font-display font-bold text-lg text-white">
            Aún no hay concursos finalizados
          </p>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Cuando finalices una partida desde el Panel del Presentador, los
            ganadores, puntajes y estadísticas aparecerán aquí.
          </p>
        </div>
      ) : tab === 'clasificacion' ? (
        <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-6 space-y-3">
          <h2 className="font-display text-lg font-bold text-white mb-2">
            Cuadro de Honor Histórico
          </h2>
          <div className="space-y-2.5">
            {globalRecords.map((rec, idx) => (
              <div
                key={`${rec.code}-${rec.name}-${idx}`}
                className="flex items-center justify-between gap-4 bg-[#080E1E] border border-slate-800 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg font-mono-num font-bold text-sm flex items-center justify-center shrink-0 ${
                      idx === 0
                        ? 'bg-amber-400 text-slate-950'
                        : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : idx === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {idx === 0 ? <Crown className="w-4 h-4" /> : idx + 1}
                  </div>
                  <AvatarBadge avatarId={rec.avatarId} size="sm" />
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">
                      {rec.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {rec.gameTitle} · {rec.correctCount} correctas (
                      {rec.accuracyPercent}%)
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono-num font-bold text-lg text-amber-300">
                    {rec.score.toLocaleString('es-CO')}
                  </p>
                  <p className="text-[11px] text-slate-400">pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {history.map((h) => (
            <div
              key={h.id}
              className="bg-[#111A2E] border border-slate-800 rounded-2xl p-5 space-y-4"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono-num text-amber-300 font-bold">
                    {h.code}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(h.finishedAt).toLocaleDateString('es-CO', {
                      dateStyle: 'medium',
                    })}
                  </span>
                </div>
                <h2 className="font-display font-bold text-xl text-white">
                  {h.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>{GAME_MODE_INFO[h.mode].name}</span>
                  <span aria-hidden="true">·</span>
                  <span>{h.questionCount} preguntas</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-mono-num">
                    <Users className="w-3.5 h-3.5" />
                    {h.participantCount} participantes
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                {h.topThree.map((t) => (
                  <div
                    key={t.rank}
                    className="flex items-center justify-between text-sm bg-[#080E1E] px-3 py-2 rounded-xl"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Medal
                        className={`w-4 h-4 shrink-0 ${
                          t.rank === 1
                            ? 'text-amber-400'
                            : t.rank === 2
                              ? 'text-slate-300'
                              : 'text-amber-600'
                        }`}
                      />
                      <AvatarBadge avatarId={t.avatarId} size="sm" />
                      <span className="font-medium text-white truncate">
                        {t.name}
                      </span>
                    </div>
                    <span className="font-mono-num font-bold text-amber-300 shrink-0">
                      {t.score.toLocaleString('es-CO')} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
