import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  LogOut,
  Users,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useGameSocket } from '../hooks/useGameSocket';
import { DIFFICULTY_LABELS, GAME_MODE_INFO, TEAMS } from '../shared/types';
import { soundFX } from '../utils/sound';
import { AvatarBadge } from './AvatarBadge';
import { CountdownTimer } from './CountdownTimer';
import { LeaderboardTable, PodiumDisplay } from './ScoreboardViews';

interface PlayerViewProps {
  code: string;
  token: string;
  onExit: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const OPTION_STYLES = [
  'bg-sky-600 hover:bg-sky-500 border-sky-400/50 text-white',
  'bg-amber-600 hover:bg-amber-500 border-amber-400/50 text-white',
  'bg-emerald-600 hover:bg-emerald-500 border-emerald-400/50 text-white',
  'bg-rose-600 hover:bg-rose-500 border-rose-400/50 text-white',
];

export function PlayerView({ code, token, onExit }: PlayerViewProps) {
  const {
    state,
    connected,
    error,
    kickedMessage,
    clockOffsetMs,
    submitAnswer,
  } = useGameSocket({
    code,
    role: 'participant',
    token,
  });

  const [muted, setMuted] = useState(soundFX.muted);
  const lastSoundKeyRef = useRef<string>('');

  const toggleMute = () => {
    soundFX.muted = !soundFX.muted;
    setMuted(soundFX.muted);
  };

  useEffect(() => {
    if (!state) return;
    const key = `${state.status}-${state.currentQuestionIndex}`;
    if (key === lastSoundKeyRef.current) return;

    if (state.status === 'answer_revealed' && state.myCurrentAnswer) {
      lastSoundKeyRef.current = key;
      if (state.myCurrentAnswer.isCorrect) {
        soundFX.playCorrect();
      } else {
        soundFX.playWrong();
      }
    } else if (state.status === 'finished') {
      lastSoundKeyRef.current = key;
      soundFX.playVictory();
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    }
  }, [state]);

  if (kickedMessage) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-5">
        <div className="bg-[#111A2E] border border-rose-500/50 rounded-2xl p-8 space-y-4">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="font-display text-2xl font-bold text-white">
            Has salido de la partida
          </h2>
          <p className="text-slate-300 text-sm">{kickedMessage}</p>
          <button
            type="button"
            onClick={onExit}
            className="w-full py-3 rounded-xl bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (!state || !state.myParticipant) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-8">
          <p className="text-white font-semibold">
            {error || 'Conectando en tiempo real a la partida...'}
          </p>
          <button
            type="button"
            onClick={onExit}
            className="mt-5 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  const me = state.myParticipant;
  const myRank =
    state.leaderboard.find((e) => e.participantId === me.id)?.rank ?? 1;
  const myTeam = me.teamId
    ? TEAMS.find((t) => t.id === me.teamId)
    : undefined;
  const q = state.currentQuestion;
  const myAns = state.myCurrentAnswer;

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-12 space-y-5">
      {/* Top Player HUD */}
      <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AvatarBadge avatarId={me.avatarId} size="md" />
          <div className="min-w-0">
            <p className="font-display font-bold text-white truncate">
              {me.name}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{code}</span>
              <span aria-hidden="true">·</span>
              <span>Puesto #{myRank}</span>
              {myTeam && (
                <>
                  <span aria-hidden="true">·</span>
                  <span style={{ color: myTeam.color }}>{myTeam.name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="font-mono-num font-extrabold text-xl text-amber-300">
              {me.score.toLocaleString('es-CO')}
            </p>
            <p className="text-[11px] text-slate-400">
              {connected ? 'Conectado' : 'Reconectando...'}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleMute}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            aria-label={muted ? 'Activar sonido' : 'Silenciar'}
          >
            {muted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onExit}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            title="Salir de la partida"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Eliminated Banner */}
      {me.eliminated && state.status !== 'finished' && (
        <div className="bg-rose-500/15 border border-rose-500/50 rounded-2xl p-4 text-rose-200 text-sm">
          Has quedado eliminado en esta partida de Modo Eliminación. Puedes
          seguir viendo el progreso de la competencia en vivo.
        </div>
      )}

      {/* WAITING ROOM */}
      {state.status === 'waiting' && (
        <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/15 text-amber-300 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl font-extrabold text-white">
              {state.config.title}
            </h2>
            <p className="text-sm text-slate-400">
              {GAME_MODE_INFO[state.config.mode].name} ·{' '}
              {state.totalQuestions} preguntas
            </p>
          </div>

          <div className="bg-[#080E1E] border border-slate-800 rounded-xl p-4">
            <p className="text-base font-semibold text-sky-300">
              ¡Ya estás dentro! Esperando que el presentador inicie el concurso.
            </p>
            <p className="text-xs text-slate-400 mt-1.5 inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {state.participants.length} participantes en sala de espera
            </p>
          </div>
        </div>
      )}

      {/* PAUSED */}
      {state.status === 'paused' && (
        <div className="bg-[#111A2E] border border-amber-400/50 rounded-2xl p-8 text-center space-y-3">
          <h2 className="font-display text-2xl font-bold text-amber-300">
            Concurso en Pausa
          </h2>
          <p className="text-sm text-slate-300">
            El presentador ha pausado temporalmente la partida. Tu puntaje está
            seguro.
          </p>
        </div>
      )}

      {/* ACTIVE / LOCKED / REVEALED QUESTION */}
      {(state.status === 'question_active' ||
        state.status === 'question_locked' ||
        state.status === 'answer_revealed') &&
        q && (
          <div className="space-y-5">
            <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-5 space-y-4">
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
                        Puntaje x{q.isSpecialMultiplier}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {q.roundStage && (
                <p className="text-xs font-semibold text-amber-300">
                  {q.roundStage}
                </p>
              )}

              <CountdownTimer
                status={state.status}
                questionEndsAt={state.questionEndsAt}
                timeLimitSec={state.config.timeLimitSec}
                remainingSecFallback={state.remainingSec}
                clockOffsetMs={clockOffsetMs}
              />

              <h2 className="font-display text-xl sm:text-2xl font-bold text-white leading-snug pt-1">
                {q.prompt}
              </h2>
            </div>

            {/* Answer Buttons */}
            <div
              className={`grid gap-3 ${
                q.options.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {q.options.map((opt, idx) => {
                const isSelected = myAns?.selectedIndex === idx;
                const isRevealed = state.status === 'answer_revealed';
                const isCorrectOpt = isRevealed && q.correctIndex === idx;
                const canTap =
                  state.status === 'question_active' && !myAns && !me.eliminated;

                let btnClass = OPTION_STYLES[idx % OPTION_STYLES.length];
                if (isRevealed) {
                  if (isCorrectOpt) {
                    btnClass =
                      'bg-emerald-600 border-emerald-300 text-white ring-2 ring-emerald-300';
                  } else if (isSelected && !isCorrectOpt) {
                    btnClass =
                      'bg-rose-700 border-rose-400 text-white opacity-90';
                  } else {
                    btnClass =
                      'bg-slate-800/80 border-slate-700 text-slate-400 opacity-55';
                  }
                } else if (myAns) {
                  btnClass = isSelected
                    ? 'bg-sky-600 border-white text-white ring-2 ring-white'
                    : 'bg-slate-800/70 border-slate-700 text-slate-400 opacity-50';
                } else if (state.status === 'question_locked' || me.eliminated) {
                  btnClass =
                    'bg-slate-800/70 border-slate-700 text-slate-400 opacity-60';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={!canTap}
                    onClick={() => {
                      soundFX.playLock();
                      submitAnswer(state.currentQuestionIndex, idx);
                    }}
                    className={`w-full min-h-[60px] p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all ${
                      canTap ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'
                    } ${btnClass}`}
                  >
                    <span className="w-9 h-9 rounded-xl bg-black/25 font-mono-num font-bold text-base flex items-center justify-center shrink-0">
                      {OPTION_LETTERS[idx]}
                    </span>
                    <span className="font-semibold text-base sm:text-lg leading-snug flex-1">
                      {opt}
                    </span>
                    {isRevealed && isCorrectOpt && (
                      <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
                    )}
                    {isRevealed && isSelected && !isCorrectOpt && (
                      <XCircle className="w-6 h-6 text-white shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Locked Feedback */}
            {state.status === 'question_active' && myAns && (
              <div className="bg-sky-500/15 border border-sky-400/50 rounded-xl p-4 text-center text-sky-200 text-sm font-medium">
                ¡Respuesta registrada! Esperando a que termine el tiempo o el
                presentador revele la respuesta correcta.
              </div>
            )}

            {state.status === 'question_locked' && !myAns && !me.eliminated && (
              <div className="bg-amber-500/15 border border-amber-400/50 rounded-xl p-4 text-center text-amber-200 text-sm font-medium">
                Tiempo finalizado. Esperando que el presentador muestre la
                respuesta correcta.
              </div>
            )}

            {/* Revealed Feedback + Reference */}
            {state.status === 'answer_revealed' && (
              <div className="bg-[#111A2E] border border-slate-700 rounded-2xl p-5 space-y-3">
                {myAns ? (
                  myAns.isCorrect ? (
                    <div className="flex items-center justify-between gap-3 text-emerald-300">
                      <span className="font-display font-bold text-lg flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6" />
                        ¡Respuesta Correcta!
                      </span>
                      <span className="font-mono-num font-extrabold text-xl text-amber-300">
                        +{(myAns.pointsEarned ?? 0).toLocaleString('es-CO')} pts
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-rose-300 font-display font-bold text-lg">
                      <XCircle className="w-6 h-6" />
                      Respuesta Incorrecta (+0 pts)
                    </div>
                  )
                ) : (
                  <p className="text-slate-300 font-semibold">
                    No enviaste respuesta a tiempo (+0 pts)
                  </p>
                )}

                {q.reference && (
                  <div className="pt-2 border-t border-slate-800 text-sm text-slate-300 space-y-1">
                    <p className="font-semibold text-amber-300 inline-flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      Cita bíblica: {q.reference}
                    </p>
                    {q.explanation && (
                      <p className="text-slate-400 text-xs sm:text-sm">
                        {q.explanation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {/* FINISHED */}
      {state.status === 'finished' && (
        <div className="space-y-6">
          <div className="bg-[#111A2E] border border-amber-400/50 rounded-2xl p-6 text-center space-y-3">
            <Award className="w-10 h-10 text-amber-400 mx-auto" />
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              ¡Concurso Finalizado!
            </h2>
            <p className="text-slate-300 text-sm">
              Terminaste en el puesto{' '}
              <strong className="text-amber-300 font-mono-num">#{myRank}</strong>{' '}
              con{' '}
              <strong className="text-amber-300 font-mono-num">
                {me.score.toLocaleString('es-CO')} puntos
              </strong>{' '}
              ({me.correctCount}/{me.answeredCount} correctas).
            </p>
          </div>

          <PodiumDisplay entries={state.leaderboard} />

          <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-display font-bold text-lg text-white">
              Clasificación General
            </h3>
            <LeaderboardTable
              entries={state.leaderboard}
              highlightParticipantId={me.id}
            />
          </div>
        </div>
      )}
    </div>
  );
}
