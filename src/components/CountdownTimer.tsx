import { useEffect, useState } from 'react';
import { GameStatus } from '../shared/types';
import { soundFX } from '../utils/sound';

interface CountdownTimerProps {
  status: GameStatus;
  questionEndsAt: number | null;
  timeLimitSec: number;
  remainingSecFallback: number;
  clockOffsetMs: number;
  large?: boolean;
  playAudioTicks?: boolean;
}

export function CountdownTimer({
  status,
  questionEndsAt,
  timeLimitSec,
  remainingSecFallback,
  clockOffsetMs,
  large = false,
  playAudioTicks = false,
}: CountdownTimerProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [lastBeepSec, setLastBeepSec] = useState<number | null>(null);

  useEffect(() => {
    if (status !== 'question_active') return;
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 100);
    return () => window.clearInterval(interval);
  }, [status]);

  let remainingMs = remainingSecFallback * 1000;
  if (status === 'question_active' && questionEndsAt) {
    const serverAdjustedNow = nowMs + clockOffsetMs;
    remainingMs = Math.max(0, questionEndsAt - serverAdjustedNow);
  } else if (status === 'question_locked' || status === 'answer_revealed') {
    remainingMs = 0;
  }

  const secondsLeft = Math.ceil(remainingMs / 1000);
  const totalMs = Math.max(1000, timeLimitSec * 1000);
  const progressPct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));

  useEffect(() => {
    if (
      playAudioTicks &&
      status === 'question_active' &&
      secondsLeft > 0 &&
      secondsLeft <= 5 &&
      secondsLeft !== lastBeepSec
    ) {
      setLastBeepSec(secondsLeft);
      soundFX.playTick();
    }
    if (status !== 'question_active') {
      setLastBeepSec(null);
    }
  }, [playAudioTicks, status, secondsLeft, lastBeepSec]);

  const isUrgent = status === 'question_active' && secondsLeft <= 5;
  const barColor = isUrgent
    ? 'bg-rose-500'
    : secondsLeft <= Math.ceil(timeLimitSec * 0.4)
      ? 'bg-amber-400'
      : 'bg-sky-400';

  const textColor = isUrgent
    ? 'text-rose-400'
    : status === 'paused'
      ? 'text-amber-300'
      : 'text-white';

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs font-medium text-slate-400">
          {status === 'paused'
            ? 'Concurso en pausa'
            : status === 'question_active'
              ? 'Tiempo restante'
              : status === 'question_locked'
                ? 'Tiempo finalizado'
                : 'Respuesta revelada'}
        </span>
        <span
          className={`font-mono-num font-bold ${textColor} ${
            large ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl'
          }`}
        >
          {secondsLeft}s
        </span>
      </div>
      <div
        className={`w-full ${
          large ? 'h-4' : 'h-2.5'
        } rounded-full bg-slate-800 overflow-hidden`}
      >
        <div
          className={`h-full ${barColor} transition-all duration-100 ease-linear rounded-full`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}
