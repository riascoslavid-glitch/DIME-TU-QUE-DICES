import { useState } from 'react';
import {
  BookOpen,
  History,
  LogIn,
  MonitorPlay,
  Play,
  Sliders,
  Trophy,
  Tv,
  Users,
} from 'lucide-react';

export type AppRoute =
  | 'home'
  | 'create'
  | 'join'
  | 'lobby'
  | 'bank'
  | 'leaderboard'
  | 'history'
  | 'presenter'
  | 'player'
  | 'projector';

interface HomeViewProps {
  onNavigate: (route: AppRoute, code?: string) => void;
  recentPresenterCode?: string | null;
}

export function HomeView({
  onNavigate,
  recentPresenterCode,
}: HomeViewProps) {
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [projectorCodeInput, setProjectorCodeInput] = useState('');
  const [imgError, setImgError] = useState(false);

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCodeInput.trim().toUpperCase();
    onNavigate('join', clean);
  };

  const handleOpenProjector = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = projectorCodeInput.trim().toUpperCase();
    if (clean) {
      onNavigate('projector', clean);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-14">
      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-amber-300">
              Concursos Bíblicos Interactivos en Tiempo Real
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.08] tracking-tight text-balance">
              DIME TÚ QUÉ DICES
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
              Crea una partida en vivo, proyecta las preguntas en pantalla
              grande y deja que decenas o cientos de personas compitan
              simultáneamente desde sus celulares.
            </p>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('create')}
              className="px-6 py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-extrabold text-base inline-flex items-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Play className="w-5 h-5 fill-current" />
              Crear Partida
            </button>

            <button
              type="button"
              onClick={() => onNavigate('join')}
              className="px-6 py-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-display font-extrabold text-base inline-flex items-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-5 h-5" />
              Unirme a una Partida
            </button>
          </div>

          {/* Quick Code Entry */}
          <form
            onSubmit={handleQuickJoin}
            className="bg-[#111A2E] border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row gap-2.5 max-w-lg"
          >
            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) =>
                setJoinCodeInput(
                  e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                )
              }
              placeholder="Ingresa código de partida (ej: BIBLIA2026)"
              className="flex-1 bg-[#080E1E] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-mono-num font-bold placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Entrar ahora
            </button>
          </form>
        </div>

        <div className="lg:col-span-6">
          <div className="relative h-full min-h-[280px] sm:min-h-[360px] rounded-2xl overflow-hidden border border-slate-800 bg-[#111A2E]">
            {!imgError ? (
              <img
                src="/src/assets/images/hero_quiz_stage_1794687579504.jpg"
                alt="Escenario televisivo de concurso bíblico en vivo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#131F3A] to-[#080E1E]">
                <MonitorPlay className="w-14 h-14 text-amber-400 mb-3" />
                <p className="font-display font-bold text-xl text-white">
                  Escenario en Vivo
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Sincronización instantánea entre presentador, pantalla y
                  jugadores
                </p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080E1E]/90 via-[#080E1E]/25 to-transparent flex items-end p-6">
              <div className="space-y-1">
                <p className="font-display font-bold text-lg text-white">
                  Ideal para iglesias, jóvenes, campamentos y congresos
                </p>
                <p className="text-xs sm:text-sm text-slate-300">
                  6 modalidades de juego · 34 categorías bíblicas · Código QR
                  instantáneo
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Platform Access Grid */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              Espacios de la Plataforma
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Accede directamente a cada herramienta del concurso.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => onNavigate('lobby')}
            className="text-left bg-[#111A2E] hover:bg-[#16213B] border border-slate-800 rounded-2xl p-6 space-y-3 transition-colors cursor-pointer"
          >
            <Users className="w-7 h-7 text-sky-400" />
            <h3 className="font-display font-bold text-xl text-white">
              Sala de Juegos
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Explora las partidas activas en este momento y únete con un solo
              toque.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('bank')}
            className="text-left bg-[#111A2E] hover:bg-[#16213B] border border-slate-800 rounded-2xl p-6 space-y-3 transition-colors cursor-pointer"
          >
            <BookOpen className="w-7 h-7 text-amber-400" />
            <h3 className="font-display font-bold text-xl text-white">
              Banco de Preguntas Bíblicas
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Consulta preguntas del Antiguo y Nuevo Testamento con cita bíblica
              y agrega las tuyas.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('leaderboard')}
            className="text-left bg-[#111A2E] hover:bg-[#16213B] border border-slate-800 rounded-2xl p-6 space-y-3 transition-colors cursor-pointer"
          >
            <Trophy className="w-7 h-7 text-emerald-400" />
            <h3 className="font-display font-bold text-xl text-white">
              Clasificación y Puntuaciones
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Revisa los mejores puntajes históricos y el cuadro de honor de
              campeones.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="text-left bg-[#111A2E] hover:bg-[#16213B] border border-slate-800 rounded-2xl p-6 space-y-3 transition-colors cursor-pointer"
          >
            <History className="w-7 h-7 text-indigo-400" />
            <h3 className="font-display font-bold text-xl text-white">
              Historial de Partidas
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Consulta los podios, participantes y fechas de todos los concursos
              finalizados.
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              recentPresenterCode
                ? onNavigate('presenter', recentPresenterCode)
                : onNavigate('create')
            }
            className="text-left bg-[#111A2E] hover:bg-[#16213B] border border-slate-800 rounded-2xl p-6 space-y-3 transition-colors cursor-pointer"
          >
            <Sliders className="w-7 h-7 text-amber-300" />
            <h3 className="font-display font-bold text-xl text-white">
              Panel del Presentador
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {recentPresenterCode
                ? `Retomar control de tu partida activa (${recentPresenterCode}) o crear una nueva.`
                : 'Dirige las preguntas, controla el tiempo, revela respuestas y gestiona jugadores.'}
            </p>
          </button>

          <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-6 space-y-3">
            <Tv className="w-7 h-7 text-rose-400" />
            <h3 className="font-display font-bold text-xl text-white">
              Pantalla de Proyección
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Proyecta una sala en televisor o videobeam sin controles privados.
            </p>
            <form onSubmit={handleOpenProjector} className="flex gap-2 pt-1">
              <input
                type="text"
                value={projectorCodeInput}
                onChange={(e) =>
                  setProjectorCodeInput(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                  )
                }
                placeholder="Código"
                className="flex-1 min-w-0 bg-[#080E1E] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono-num font-bold placeholder-slate-500"
              />
              <button
                type="submit"
                disabled={!projectorCodeInput.trim()}
                className="px-3.5 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold cursor-pointer disabled:opacity-40 whitespace-nowrap"
              >
                Abrir
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
