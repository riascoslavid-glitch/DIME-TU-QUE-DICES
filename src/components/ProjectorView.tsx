import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { BookOpen, CheckCircle2, Trophy, Users } from 'lucide-react';
import { useGameSocket } from '../hooks/useGameSocket';
import { DIFFICULTY_LABELS, GAME_MODE_INFO } from '../shared/types';
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

interface ProjectorViewProps {
  code: string;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const OPTION_CARD_CLASSES = [
  'bg-sky-600/25 border-sky-400/50 text-white',
  'bg-amber-600/25 border-amber-400/50 text-white',
  'bg-emerald-600/25 border-emerald-400/50 text-white',
  'bg-rose-600/25 border-rose-400/50 text-white',
];

export function ProjectorView({ code }: ProjectorViewProps) {
  const { state, connected, error, clockOffsetMs } = useGameSocket({
    code,
    role: 'projector',
  });

  const celebratedRef = useRef(false);

  useEffect(() => {
    if (state?.status === 'finished' && !celebratedRef.current) {
      celebratedRef.current = true;
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
    }
    if (state?.status === 'waiting') {
      celebratedRef.current = false;
    }
  }, [state?.status]);

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-10 text-center max-w-lg w-full">
          <h1 className="font-display text-2xl font-extrabold text-white">
            Pantalla de Proyección
          </h1>
          <p className="text-slate-400 mt-2">
            {error || `Conectando a la sala ${code}...`}
          </p>
        </div>
      </div>
    );
  }

  const q = state.currentQuestion;
  const isRevealed =
    state.status === 'answer_revealed' || state.status === 'finished';

  return (
    <div className="min-h-screen bg-[#080E1E] text-white px-6 sm:px-10 py-6 flex flex-col gap-6 max-w-[1440px] mx-auto">
      {/* Broadcast Top Strip */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-4">
          <span className="font-display font-extrabold text-xl sm:text-2xl tracking-tight text-amber-400">
            DIME TÚ QUÉ DICES
          </span>
          <span className="text-slate-600" aria-hidden="true">
            |
          </span>
          <span className="font-display font-semibold text-lg text-white">
            {state.config.title}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-300">
          <span>{GAME_MODE_INFO[state.config.mode].name}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-num font-bold text-amber-300">
            Código: {state.code}
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5 font-mono-num">
            <Users className="w-4 h-4 text-sky-400" />
            {state.participants.length} jugadores
          </span>
          {!connected && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-rose-400">Reconectando...</span>
            </>
          )}
        </div>
      </header>

      {/* WAITING LOBBY FOR PROJECTION */}
      {state.status === 'waiting' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1 py-4">
          <div className="lg:col-span-5 space-y-5">
            <div className="space-y-2">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white text-balance">
                ¡Escanea el QR o entra con el código para participar!
              </h2>
              <p className="text-slate-300 text-base">
                Participa en vivo desde tu celular o tableta. No necesitas
                contraseñas ni registro.
              </p>
            </div>
            <QrCodeCard
              code={state.code}
              title={state.config.title}
              showProjectorLink={false}
            />
          </div>

          <div className="lg:col-span-7 bg-[#111A2E] border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-bold text-white">
                Participantes en Sala de Espera
              </h3>
              <span className="font-mono-num text-xl font-bold text-sky-300">
                {state.participants.length} conectados
              </span>
            </div>

            {state.participants.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-lg border border-dashed border-slate-800 rounded-2xl">
                Esperando a los primeros concursantes...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {state.participants.map((p) => (
                  <div
                    key={p.id}
                    className="bg-[#080E1E] border border-slate-800 rounded-xl p-3 flex items-center gap-3"
                  >
                    <AvatarBadge avatarId={p.avatarId} size="md" />
                    <span className="font-semibold text-sm sm:text-base text-white truncate">
                      {p.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAUSED */}
      {state.status === 'paused' && (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="bg-[#111A2E] border border-amber-400/50 rounded-3xl p-12 text-center max-w-xl space-y-3">
            <h2 className="font-display text-4xl font-extrabold text-amber-300">
              Concurso en Pausa
            </h2>
            <p className="text-slate-300 text-lg">
              En unos instantes continuamos con la competencia.
            </p>
          </div>
        </div>
      )}

      {/* LIVE QUESTION & REVEAL */}
      {(state.status === 'question_active' ||
        state.status === 'question_locked' ||
        state.status === 'answer_revealed') &&
        q && (
          <div className="space-y-6 flex-1">
            {state.teamLeaderboard.length > 0 && (
              <TeamLeaderboardStrip teams={state.teamLeaderboard} />
            )}

            <div className="bg-[#111A2E] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 text-sm sm:text-base text-slate-300">
                  <span className="font-mono-num font-bold text-sky-300 text-lg">
                    Pregunta {state.currentQuestionIndex + 1} /{' '}
                    {state.totalQuestions}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{q.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{DIFFICULTY_LABELS[q.difficulty]}</span>
                  {q.isSpecialMultiplier > 1 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-bold text-amber-300">
                        Pregunta Especial x{q.isSpecialMultiplier}
                      </span>
                    </>
                  )}
                </div>

                <div className="font-mono-num text-base sm:text-lg text-slate-200">
                  Han respondido:{' '}
                  <strong className="text-amber-300">
                    {state.answeredParticipantIds.length} /{' '}
                    {state.participants.length}
                  </strong>
                </div>
              </div>

              <CountdownTimer
                status={state.status}
                questionEndsAt={state.questionEndsAt}
                timeLimitSec={state.config.timeLimitSec}
                remainingSecFallback={state.remainingSec}
                clockOffsetMs={clockOffsetMs}
                large
                playAudioTicks
              />

              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white leading-tight text-balance">
                {q.prompt}
              </h2>

              <div
                className={`grid gap-4 pt-2 ${
                  q.options.length === 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1 sm:grid-cols-2'
                }`}
              >
                {q.options.map((opt, idx) => {
                  const isCorrect = isRevealed && q.correctIndex === idx;
                  const cardStyle = isRevealed
                    ? isCorrect
                      ? 'bg-emerald-600 border-emerald-300 text-white ring-2 ring-emerald-300'
                      : 'bg-slate-900/70 border-slate-800 text-slate-400 opacity-55'
                    : OPTION_CARD_CLASSES[idx % OPTION_CARD_CLASSES.length];

                  return (
                    <div
                      key={idx}
                      className={`p-5 rounded-2xl border flex items-center gap-4 transition-all ${cardStyle}`}
                    >
                      <span className="w-11 h-11 rounded-xl bg-black/30 font-mono-num font-bold text-xl flex items-center justify-center shrink-0">
                        {OPTION_LETTERS[idx]}
                      </span>
                      <span className="font-display font-bold text-lg sm:text-2xl leading-snug flex-1">
                        {opt}
                      </span>
                      {isCorrect && (
                        <CheckCircle2 className="w-7 h-7 text-white shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {isRevealed && q.reference && (
                <div className="bg-[#080E1E] border border-emerald-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-amber-300 font-semibold text-base">
                    <BookOpen className="w-5 h-5 shrink-0" />
                    <span>Cita bíblica: {q.reference}</span>
                  </div>
                  {q.explanation && (
                    <p className="text-slate-300 text-sm">{q.explanation}</p>
                  )}
                </div>
              )}
            </div>

            {isRevealed && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 bg-[#111A2E] border border-slate-800 rounded-2xl p-6 space-y-5">
                  <h3 className="font-display font-bold text-xl text-white">
                    Distribución y Resultados de la Pregunta
                  </h3>
                  <QuestionDistributionChart
                    options={q.options}
                    correctIndex={q.correctIndex}
                    stats={state.questionStats}
                    isRevealed
                  />
                  <div className="pt-3 border-t border-slate-800">
                    <QuestionResultsTable
                      stats={state.questionStats}
                      maxRows={12}
                    />
                  </div>
                </div>

                <div className="lg:col-span-5 bg-[#111A2E] border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="font-display font-bold text-xl text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    Top Clasificación en Vivo
                  </h3>
                  <LeaderboardTable
                    entries={state.leaderboard.slice(0, 8)}
                    compact={false}
                  />
                </div>
              </div>
            )}
          </div>
        )}

      {/* FINAL CELEBRATION SCREEN */}
      {state.status === 'finished' && (
        <div className="space-y-8 py-4">
          <div className="text-center space-y-2">
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold text-white">
              ¡Resultados Finales del Concurso!
            </h2>
            <p className="text-slate-300 text-lg">
              {state.config.title} · {state.totalQuestions} preguntas completadas
            </p>
          </div>

          <PodiumDisplay entries={state.leaderboard} />

          {state.teamLeaderboard.length > 0 && (
            <TeamLeaderboardStrip teams={state.teamLeaderboard} />
          )}

          <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-6 max-w-4xl mx-auto space-y-4">
            <h3 className="font-display font-bold text-2xl text-white">
              Tabla Final de Posiciones
            </h3>
            <LeaderboardTable entries={state.leaderboard} />
          </div>
        </div>
      )}
    </div>
  );
}
