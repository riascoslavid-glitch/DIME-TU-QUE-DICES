import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Flag,
  Pause,
  Play,
  PlusCircle,
  RotateCcw,
  Share2,
  Tv,
  UserX,
  Users,
} from 'lucide-react';
import { useGameSocket } from '../hooks/useGameSocket';
import { DIFFICULTY_LABELS, GAME_MODE_INFO, TEAMS } from '../shared/types';
import { AvatarBadge } from './AvatarBadge';
import { CountdownTimer } from './CountdownTimer';
import { QrCodeCard } from './QrCodeCard';
import {
  LeaderboardTable,
  PodiumDisplay,
  QuestionDistributionChart,
  QuestionResultsTable,
  TeamLeaderboardStrip,
} from './ScoreboardViews';

interface PresenterViewProps {
  code: string;
  token: string;
  onNewGame: () => void;
  onExit: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export function PresenterView({
  code,
  token,
  onNewGame,
  onExit,
}: PresenterViewProps) {
  const { state, connected, error, clockOffsetMs, sendPresenterAction } =
    useGameSocket({
      code,
      role: 'presenter',
      token,
    });

  const [showPrivateAnswer, setShowPrivateAnswer] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    'reset' | 'end' | null
  >(null);

  if (!state) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-8">
          <p className="text-white font-semibold">
            {error || 'Cargando Panel del Presentador...'}
          </p>
          <button
            type="button"
            onClick={onExit}
            className="mt-4 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm cursor-pointer"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const q = state.currentQuestion;
  const isRevealed =
    state.status === 'answer_revealed' || state.status === 'finished';
  const onlineCount = state.participants.filter((p) => p.online).length;

  const shareFinalWhatsApp = () => {
    const top = state.leaderboard
      .slice(0, 3)
      .map(
        (e) =>
          `${e.rank}. ${e.name} — ${e.score.toLocaleString('es-CO')} pts (${e.correctCount}/${e.answeredCount})`
      )
      .join('\n');
    const text = encodeURIComponent(
      `Resultados finales de "${state.config.title}" (${state.code}) en DIME TÚ QUÉ DICES:\n\n${top}\n\n¡Gracias por participar!`
    );
    return `https://wa.me/?text=${text}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Presenter Control Header */}
      <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="text-amber-300 font-semibold">
              Panel del Presentador
            </span>
            <span aria-hidden="true">·</span>
            <span>{GAME_MODE_INFO[state.config.mode].name}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">Código: {state.code}</span>
            <span aria-hidden="true">·</span>
            <span className={connected ? 'text-emerald-400' : 'text-rose-400'}>
              {connected ? 'Sincronizado en vivo' : 'Reconectando...'}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            {state.config.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`/?projector=${encodeURIComponent(state.code)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Tv className="w-4 h-4" />
            Pantalla de Proyección
          </a>

          {state.status !== 'waiting' && state.status !== 'finished' && (
            <>
              {state.status === 'paused' ? (
                <button
                  type="button"
                  onClick={() => sendPresenterAction('resume_game')}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Reanudar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => sendPresenterAction('pause_game')}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Pause className="w-4 h-4" />
                  Pausar
                </button>
              )}

              <button
                type="button"
                onClick={() => setConfirmAction('end')}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Flag className="w-4 h-4" />
                Finalizar
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setConfirmAction('reset')}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            Reiniciar
          </button>
        </div>
      </div>

      {/* Inline confirmation banner (no window.confirm) */}
      {confirmAction && (
        <div className="bg-amber-500/15 border border-amber-400/60 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-amber-100 font-medium">
            {confirmAction === 'reset'
              ? '¿Reiniciar la partida? Todos los puntajes volverán a 0 y regresarás a la sala de espera.'
              : '¿Finalizar el concurso ahora? Se mostrará la clasificación definitiva y se guardará en el historial.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                sendPresenterAction(
                  confirmAction === 'reset' ? 'reset_game' : 'end_game'
                );
                setConfirmAction(null);
              }}
              className="px-4 py-2 rounded-lg bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

      {/* WAITING ROOM */}
      {state.status === 'waiting' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-5">
            <QrCodeCard
              code={state.code}
              title={state.config.title}
              showProjectorLink={false}
            />

            <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Preguntas preparadas</span>
                <strong className="font-mono-num text-white">
                  {state.totalQuestions}
                </strong>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Tiempo por pregunta</span>
                <strong className="font-mono-num text-white">
                  {state.config.timeLimitSec}s
                </strong>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Límite de jugadores</span>
                <strong className="font-mono-num text-white">
                  {state.config.maxParticipants}
                </strong>
              </div>

              <button
                type="button"
                onClick={() => sendPresenterAction('start_game')}
                className="w-full py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-extrabold text-lg inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                INICIAR CONCURSO
              </button>
              {state.participants.length === 0 && (
                <p className="text-xs text-slate-400 text-center">
                  Comparte el código QR o el enlace de invitación para que los
                  jugadores entren directamente en la sala de espera.
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#111A2E] border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-400" />
                Sala de Espera en Vivo
              </h2>
              <span className="font-mono-num text-sm text-slate-300">
                {onlineCount} conectados · {state.participants.length}{' '}
                registrados
              </span>
            </div>

            {state.participants.length === 0 ? (
              <div className="py-14 text-center border border-dashed border-slate-800 rounded-xl text-slate-400 text-sm">
                Esperando que los primeros participantes se unan...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[480px] overflow-y-auto pr-1">
                {state.participants.map((p) => {
                  const team = p.teamId
                    ? TEAMS.find((t) => t.id === p.teamId)
                    : undefined;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 bg-[#080E1E] border border-slate-800 rounded-xl px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AvatarBadge avatarId={p.avatarId} size="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-white truncate">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {p.online ? 'En línea' : 'Desconectado'}
                            {team ? ` · ${team.name}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          sendPresenterAction('kick_participant', {
                            participantId: p.id,
                          })
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title={`Expulsar a ${p.name}`}
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LIVE QUESTION CONTROL */}
      {(state.status === 'question_active' ||
        state.status === 'question_locked' ||
        state.status === 'answer_revealed' ||
        state.status === 'paused') &&
        q && (
          <div className="space-y-6">
            {state.teamLeaderboard.length > 0 && (
              <TeamLeaderboardStrip teams={state.teamLeaderboard} />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Question & Primary Controls */}
              <div className="lg:col-span-7 space-y-5">
                <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="font-semibold text-sky-300">
                      Pregunta {state.currentQuestionIndex + 1} de{' '}
                      {state.totalQuestions}
                    </span>
                    <div className="flex items-center gap-2">
                      <span>{q.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{DIFFICULTY_LABELS[q.difficulty]}</span>
                      {q.isSpecialMultiplier > 1 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-300 font-bold">
                            Especial x{q.isSpecialMultiplier}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <CountdownTimer
                    status={state.status}
                    questionEndsAt={state.questionEndsAt}
                    timeLimitSec={state.config.timeLimitSec}
                    remainingSecFallback={state.remainingSec}
                    clockOffsetMs={clockOffsetMs}
                  />

                  <h2 className="font-display text-2xl font-bold text-white leading-snug">
                    {q.prompt}
                  </h2>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-400">
                      Vista previa de opciones
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPrivateAnswer((v) => !v)}
                      className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
                    >
                      {showPrivateAnswer ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          Ocultar respuesta guía
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          Ver respuesta guía
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt, idx) => {
                      const markCorrect =
                        (isRevealed || showPrivateAnswer) &&
                        q.correctIndex === idx;
                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-sm ${
                            markCorrect
                              ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200 font-semibold'
                              : 'bg-[#080E1E] border-slate-800 text-slate-300'
                          }`}
                        >
                          <span className="font-mono-num font-bold w-6 h-6 rounded-md bg-slate-800 text-white flex items-center justify-center shrink-0">
                            {OPTION_LETTERS[idx]}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {markCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {(isRevealed || showPrivateAnswer) && q.reference && (
                    <p className="text-xs text-amber-300 font-medium">
                      Referencia bíblica: {q.reference}
                      {q.explanation ? ` — ${q.explanation}` : ''}
                    </p>
                  )}

                  {/* Presenter Action Bar */}
                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800">
                    {!isRevealed && state.status !== 'paused' && (
                      <button
                        type="button"
                        onClick={() => sendPresenterAction('reveal_answer')}
                        className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Mostrar Respuesta Correcta
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => sendPresenterAction('next_question')}
                      className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-sm inline-flex items-center gap-2 cursor-pointer ml-auto"
                    >
                      {state.currentQuestionIndex + 1 >= state.totalQuestions
                        ? 'Ver Resultados Finales'
                        : 'Siguiente Pregunta'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Live Distribution & Results Table */}
                <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-6 space-y-5">
                  <h3 className="font-display font-bold text-lg text-white">
                    Resultados de la pregunta
                  </h3>

                  <QuestionDistributionChart
                    options={q.options}
                    correctIndex={q.correctIndex}
                    stats={state.questionStats}
                    isRevealed={isRevealed}
                  />

                  <div className="pt-3 border-t border-slate-800">
                    <QuestionResultsTable stats={state.questionStats} />
                  </div>
                </div>
              </div>

              {/* Right: Live Leaderboard + Connected Management */}
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-lg text-white">
                      Clasificación en Vivo
                    </h3>
                    <span className="font-mono-num text-xs text-slate-400">
                      {state.answeredParticipantIds.length}/
                      {state.participants.length} respondieron
                    </span>
                  </div>
                  <LeaderboardTable entries={state.leaderboard} />
                </div>

                <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h3 className="font-display font-bold text-sm text-slate-300">
                    Gestión de participantes ({state.participants.length})
                  </h3>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {state.participants.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-[#080E1E]"
                      >
                        <span className="text-slate-200 truncate">
                          {p.name}{' '}
                          <span className="text-slate-500">
                            ({p.online ? 'en línea' : 'offline'})
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            sendPresenterAction('kick_participant', {
                              participantId: p.id,
                            })
                          }
                          className="text-rose-400 hover:text-rose-300 font-medium cursor-pointer ml-2 shrink-0"
                        >
                          Expulsar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* FINISHED */}
      {state.status === 'finished' && (
        <div className="space-y-6">
          <div className="bg-[#111A2E] border border-amber-400/50 rounded-2xl p-6 sm:p-8 text-center space-y-4">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
              ¡Concurso Finalizado!
            </h2>
            <p className="text-slate-300 text-sm sm:text-base">
              Resultados guardados automáticamente en el historial de partidas.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href={`/api/games/${encodeURIComponent(state.code)}/export?format=csv`}
                download
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Descargar CSV
              </a>
              <a
                href={`/api/games/${encodeURIComponent(state.code)}/export?format=json`}
                download
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Descargar JSON
              </a>
              <a
                href={shareFinalWhatsApp()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Compartir clasificación
              </a>
              <button
                type="button"
                onClick={onNewGame}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Crear nueva partida
              </button>
            </div>
          </div>

          <PodiumDisplay entries={state.leaderboard} />

          {state.teamLeaderboard.length > 0 && (
            <TeamLeaderboardStrip teams={state.teamLeaderboard} />
          )}

          <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-display font-bold text-xl text-white">
              Clasificación Completa y Estadísticas
            </h3>
            <LeaderboardTable entries={state.leaderboard} />
          </div>
        </div>
      )}
    </div>
  );
}
