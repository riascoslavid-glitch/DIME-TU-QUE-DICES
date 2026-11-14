import {
  CheckCircle2,
  Crown,
  Medal,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import {
  LeaderboardEntry,
  QuestionResultStats,
  TEAMS,
  TeamScoreEntry,
} from '../shared/types';
import { AvatarBadge } from './AvatarBadge';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const OPTION_BAR_COLORS = [
  'bg-sky-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-rose-500',
];

export function QuestionDistributionChart({
  options,
  correctIndex,
  stats,
  isRevealed,
}: {
  options: string[];
  correctIndex?: number;
  stats: QuestionResultStats | null;
  isRevealed: boolean;
}) {
  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-300">
        <span>
          Respondieron{' '}
          <strong className="font-mono-num text-white">
            {stats.totalAnswered} / {stats.totalParticipants}
          </strong>
        </span>
        {isRevealed && (
          <div className="flex items-center gap-4">
            <span className="text-emerald-400 font-semibold font-mono-num">
              Correctas: {stats.correctPercent}% ({stats.correctCount})
            </span>
            <span className="text-slate-500" aria-hidden="true">
              ·
            </span>
            <span className="text-rose-400 font-semibold font-mono-num">
              Incorrectas: {stats.incorrectPercent}% ({stats.incorrectCount})
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        {options.map((opt, idx) => {
          const count = stats.optionCounts[idx] ?? 0;
          const pct = stats.optionPercents[idx] ?? 0;
          const isWinner = isRevealed && correctIndex === idx;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`font-mono-num font-bold w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                      isWinner
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    {OPTION_LETTERS[idx]}
                  </span>
                  <span
                    className={`truncate ${
                      isWinner ? 'text-emerald-300 font-semibold' : 'text-slate-200'
                    }`}
                  >
                    {opt}
                  </span>
                  {isWinner && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                </div>
                <span className="font-mono-num text-slate-300 shrink-0 ml-3">
                  {pct}% ({count})
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-800/90 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isWinner
                      ? 'bg-emerald-400'
                      : OPTION_BAR_COLORS[idx % OPTION_BAR_COLORS.length]
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function QuestionResultsTable({
  stats,
  maxRows = 25,
}: {
  stats: QuestionResultStats | null;
  maxRows?: number;
}) {
  if (!stats || stats.rows.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4 text-center">
        Aún no hay respuestas registradas para esta pregunta.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-800 text-xs text-slate-400">
            <th className="py-2.5 pr-3 font-medium">Participante</th>
            <th className="py-2.5 px-3 font-medium">Respuesta</th>
            <th className="py-2.5 px-3 font-medium">Resultado</th>
            <th className="py-2.5 pl-3 text-right font-medium">Puntos</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-sm">
          {stats.rows.slice(0, maxRows).map((row) => (
            <tr key={row.participantId} className="hover:bg-slate-800/30">
              <td className="py-2.5 pr-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AvatarBadge avatarId={row.avatarId} size="sm" />
                  <span className="font-medium text-white truncate max-w-[160px]">
                    {row.participantName}
                  </span>
                </div>
              </td>
              <td className="py-2.5 px-3 text-slate-300 max-w-[220px] truncate">
                {row.selectedLabel}
              </td>
              <td className="py-2.5 px-3">
                {row.isCorrect ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium whitespace-nowrap">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Correcta
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-rose-400 font-medium whitespace-nowrap">
                    <XCircle className="w-4 h-4 shrink-0" />
                    Incorrecta
                  </span>
                )}
              </td>
              <td className="py-2.5 pl-3 text-right font-mono-num font-bold text-amber-300">
                +{row.pointsEarned.toLocaleString('es-CO')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LeaderboardTable({
  entries,
  highlightParticipantId,
  compact = false,
}: {
  entries: LeaderboardEntry[];
  highlightParticipantId?: string;
  compact?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400 text-sm">
        Todavía no hay participantes en la tabla de clasificación.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isMe = entry.participantId === highlightParticipantId;
        const team = entry.teamId
          ? TEAMS.find((t) => t.id === entry.teamId)
          : undefined;

        const rankStyle =
          entry.rank === 1
            ? 'bg-amber-400 text-slate-950'
            : entry.rank === 2
              ? 'bg-slate-300 text-slate-950'
              : entry.rank === 3
                ? 'bg-amber-700 text-white'
                : 'bg-slate-800 text-slate-300';

        return (
          <div
            key={entry.participantId}
            className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border transition-colors ${
              isMe
                ? 'bg-sky-500/15 border-sky-400/60'
                : entry.rank <= 3
                  ? 'bg-[#152038] border-slate-700/80'
                  : 'bg-[#0F172A] border-slate-800/80'
            } ${entry.eliminated ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg font-mono-num font-bold text-sm flex items-center justify-center shrink-0 ${rankStyle}`}
              >
                {entry.rank === 1 ? (
                  <Crown className="w-4 h-4" />
                ) : (
                  entry.rank
                )}
              </div>
              <AvatarBadge avatarId={entry.avatarId} size="sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white truncate">
                    {entry.name}
                  </span>
                  {isMe && (
                    <span className="text-xs font-semibold text-sky-300 whitespace-nowrap">
                      (Tú)
                    </span>
                  )}
                  {entry.eliminated && (
                    <span className="text-xs text-rose-400 whitespace-nowrap">
                      · Eliminado
                    </span>
                  )}
                </div>
                {!compact && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>
                      {entry.correctCount}/{entry.answeredCount} correctas
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">
                      {entry.accuracyPercent}% precisión
                    </span>
                    {team && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span style={{ color: team.color }}>{team.name}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="font-mono-num font-bold text-base sm:text-lg text-amber-300">
                {entry.score.toLocaleString('es-CO')}
              </div>
              <div className="text-[11px] text-slate-400">pts</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TeamLeaderboardStrip({
  teams,
}: {
  teams: TeamScoreEntry[];
}) {
  if (!teams || teams.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {teams.map((t, idx) => (
        <div
          key={t.teamId}
          className="bg-[#111A2E] border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>#{idx + 1}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {t.memberCount}
              </span>
            </div>
            <p
              className="font-display font-bold text-base truncate mt-0.5"
              style={{ color: t.color }}
            >
              {t.name}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono-num font-bold text-xl text-white">
              {t.score.toLocaleString('es-CO')}
            </p>
            <p className="text-xs text-slate-400">pts</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PodiumDisplay({ entries }: { entries: LeaderboardEntry[] }) {
  const first = entries[0];
  const second = entries[1];
  const third = entries[2];

  if (!first) {
    return (
      <div className="text-center py-10 text-slate-400">
        No hubo participantes puntuando en esta partida.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end max-w-4xl mx-auto pt-4">
      {/* 2nd Place */}
      <div className="order-2 md:order-1 bg-[#131D35] border border-slate-700 rounded-2xl p-5 text-center flex flex-col items-center gap-3 md:min-h-[210px] justify-center">
        {second ? (
          <>
            <div className="flex items-center gap-1.5 text-slate-300 text-sm font-semibold">
              <Medal className="w-4 h-4 text-slate-300" />
              2.º Puesto
            </div>
            <AvatarBadge avatarId={second.avatarId} size="lg" />
            <div>
              <p className="font-display font-bold text-lg text-white">
                {second.name}
              </p>
              <p className="font-mono-num text-2xl font-bold text-slate-200 mt-1">
                {second.score.toLocaleString('es-CO')} pts
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {second.correctCount} correctas · {second.accuracyPercent}%
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">2.º puesto vacante</p>
        )}
      </div>

      {/* 1st Place */}
      <div className="order-1 md:order-2 bg-[#1A2644] border border-amber-400/70 rounded-2xl p-6 text-center flex flex-col items-center gap-3 md:min-h-[250px] justify-center shadow-lg shadow-amber-500/10">
        <div className="flex items-center gap-2 text-amber-300 text-base font-bold">
          <Trophy className="w-5 h-5 text-amber-400" />
          Campeón del Concurso
        </div>
        <AvatarBadge avatarId={first.avatarId} size="xl" />
        <div>
          <p className="font-display font-extrabold text-2xl text-white">
            {first.name}
          </p>
          <p className="font-mono-num text-3xl font-extrabold text-amber-300 mt-1">
            {first.score.toLocaleString('es-CO')} pts
          </p>
          <p className="text-xs text-slate-300 mt-1">
            {first.correctCount} correctas · {first.accuracyPercent}% precisión
          </p>
        </div>
      </div>

      {/* 3rd Place */}
      <div className="order-3 bg-[#131D35] border border-slate-700 rounded-2xl p-5 text-center flex flex-col items-center gap-3 md:min-h-[190px] justify-center">
        {third ? (
          <>
            <div className="flex items-center gap-1.5 text-amber-500 text-sm font-semibold">
              <Medal className="w-4 h-4 text-amber-500" />
              3.º Puesto
            </div>
            <AvatarBadge avatarId={third.avatarId} size="lg" />
            <div>
              <p className="font-display font-bold text-lg text-white">
                {third.name}
              </p>
              <p className="font-mono-num text-2xl font-bold text-amber-200 mt-1">
                {third.score.toLocaleString('es-CO')} pts
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {third.correctCount} correctas · {third.accuracyPercent}%
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">3.º puesto vacante</p>
        )}
      </div>
    </div>
  );
}
