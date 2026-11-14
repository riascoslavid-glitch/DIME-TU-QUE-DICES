import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, LogIn, Users } from 'lucide-react';
import {
  AVATARS,
  GAME_MODE_INFO,
  InviteValidationInfo,
  TEAMS,
  TeamId,
} from '../shared/types';
import { AvatarBadge } from './AvatarBadge';

export interface DirectInviteParams {
  identifier: string;
  signature?: string;
}

interface JoinViewProps {
  initialCode?: string;
  directInvite?: DirectInviteParams | null;
  onJoined: (
    code: string,
    participantToken: string,
    participantId: string,
    gameId?: string
  ) => void;
  onBack: () => void;
}

export function JoinView({
  initialCode = '',
  directInvite = null,
  onJoined,
  onBack,
}: JoinViewProps) {
  const isDirectMode = Boolean(directInvite?.identifier);
  const [code, setCode] = useState(
    (directInvite?.identifier || initialCode).toUpperCase()
  );
  const [gameInfo, setGameInfo] = useState<InviteValidationInfo | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [checking, setChecking] = useState(isDirectMode);

  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState(AVATARS[0].id);
  const [teamId, setTeamId] = useState<TeamId | undefined>(undefined);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const validateDirectInvite = async (
    identifier: string,
    signature?: string
  ) => {
    setChecking(true);
    setLookupError(null);
    try {
      const qs = signature ? `?s=${encodeURIComponent(signature)}` : '';
      const res = await fetch(
        `/api/invite/${encodeURIComponent(identifier.trim().toUpperCase())}${qs}`
      );
      const data = await res.json();
      if (!res.ok) {
        setGameInfo(null);
        setLookupError(
          data.error || 'El enlace de invitación no es válido o expiró.'
        );
      } else {
        setGameInfo(data);
        setCode(data.code);
      }
    } catch {
      setLookupError('Error de conexión al validar la invitación.');
    } finally {
      setChecking(false);
    }
  };

  const checkGameByCode = async (targetCode: string) => {
    const clean = targetCode.trim().toUpperCase();
    if (!clean) return;
    setChecking(true);
    setLookupError(null);
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(clean)}/exists`);
      const data = await res.json();
      if (!res.ok) {
        setGameInfo(null);
        setLookupError(data.error || 'Partida no encontrada.');
      } else {
        setGameInfo(data);
        setCode(data.code);
      }
    } catch {
      setLookupError('No pudimos verificar el código en este momento.');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (directInvite?.identifier) {
      validateDirectInvite(directInvite.identifier, directInvite.signature);
    } else if (initialCode) {
      checkGameByCode(initialCode);
    }
  }, [directInvite?.identifier, directInvite?.signature, initialCode]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameInfo) return;
    setJoinError(null);

    if (name.trim().length < 2) {
      setJoinError('Escribe tu nombre (mínimo 2 caracteres).');
      return;
    }

    setJoining(true);
    try {
      const targetIdentifier = gameInfo.gameId || gameInfo.code;
      const res = await fetch(
        `/api/games/${encodeURIComponent(targetIdentifier)}/join`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            avatarId,
            teamId: gameInfo.mode === 'equipos' ? teamId : undefined,
            gameId: gameInfo.gameId,
            signature: gameInfo.signature,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error || 'No pudimos unirte a la partida.');
        setJoining(false);
        return;
      }
      onJoined(
        data.code || gameInfo.code,
        data.participantToken,
        data.participantId,
        data.gameId || gameInfo.gameId
      );
    } catch {
      setJoinError('Error de red al intentar entrar al juego.');
      setJoining(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
      {!isDirectMode && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
      )}

      <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            {isDirectMode ? 'Invitación al Concurso' : 'Unirme a una Partida'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isDirectMode
              ? 'Escribe tu nombre y presiona entrar para conectarte al instante.'
              : 'No necesitas crear cuenta ni contraseña. Elige tu nombre y avatar.'}
          </p>
        </div>

        {/* Manual code entry only shown when NOT arriving from a direct QR/invite link */}
        {!isDirectMode && (
          <div className="space-y-2">
            <label
              htmlFor="join-code"
              className="block text-sm font-medium text-slate-300"
            >
              Código de la partida
            </label>
            <div className="flex gap-2">
              <input
                id="join-code"
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                  );
                  if (gameInfo) setGameInfo(null);
                }}
                placeholder="Ej: BIBLIA2026"
                className="flex-1 bg-[#080E1E] border border-slate-700 rounded-xl px-4 py-3 text-amber-300 font-mono-num font-bold text-lg tracking-wider placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                disabled={checking || !code.trim()}
                onClick={() => checkGameByCode(code)}
                className="px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {checking ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            {lookupError && (
              <p className="text-sm text-rose-400 pt-1">{lookupError}</p>
            )}
          </div>
        )}

        {/* Direct Invite Loading / Error State */}
        {isDirectMode && checking && (
          <div className="py-10 text-center text-slate-300 text-sm">
            Conectando con la partida...
          </div>
        )}

        {isDirectMode && !checking && lookupError && (
          <div className="bg-rose-500/15 border border-rose-500/50 rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3 text-rose-200">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              <div className="space-y-1">
                <p className="font-semibold text-sm">
                  No se pudo validar esta invitación
                </p>
                <p className="text-xs sm:text-sm text-rose-200/90">
                  {lookupError}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
            >
              Ir al inicio
            </button>
          </div>
        )}

        {/* Game Found -> Finished Notice OR Direct Name & Enter */}
        {gameInfo && gameInfo.status === 'finished' && (
          <div className="bg-amber-500/15 border border-amber-400/50 rounded-2xl p-6 space-y-4 text-center">
            <h2 className="font-display text-xl font-bold text-white">
              {gameInfo.title}
            </h2>
            <p className="text-sm text-amber-200">
              Este concurso ya ha finalizado y ya no se aceptan nuevos
              participantes.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
            >
              Volver al inicio
            </button>
          </div>
        )}

        {gameInfo && gameInfo.status !== 'finished' && (
          <form
            onSubmit={handleJoin}
            className={`space-y-6 ${
              !isDirectMode ? 'pt-4 border-t border-slate-800' : ''
            }`}
          >
            <div className="bg-[#080E1E] border border-slate-800 rounded-xl p-4 space-y-1">
              <p className="font-display font-bold text-lg text-white">
                {gameInfo.title}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="font-mono-num text-amber-300 font-bold">
                  {gameInfo.code}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-sky-300 font-medium">
                  {GAME_MODE_INFO[gameInfo.mode].name}
                </span>
                <span aria-hidden="true">·</span>
                <span>{gameInfo.questionCount} preguntas</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-mono-num">
                  <Users className="w-3.5 h-3.5" />
                  {gameInfo.participantCount}/{gameInfo.maxParticipants} jugadores
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="player-name"
                className="block text-sm font-medium text-slate-300 mb-1.5"
              >
                Tu nombre para el concurso
              </label>
              <input
                id="player-name"
                type="text"
                autoFocus
                required
                maxLength={28}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Escribe tu nombre aquí..."
                className="w-full bg-[#080E1E] border border-slate-700 rounded-xl px-4 py-3.5 text-white text-base placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <span className="block text-sm font-medium text-slate-300 mb-2">
                Elige tu avatar
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                {AVATARS.map((av) => {
                  const selected = avatarId === av.id;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setAvatarId(av.id)}
                      className={`p-1.5 rounded-xl border flex flex-col items-center justify-center transition-transform cursor-pointer ${
                        selected
                          ? 'border-amber-400 bg-amber-400/15 scale-105'
                          : 'border-slate-800 bg-[#080E1E] hover:border-slate-600'
                      }`}
                      title={av.label}
                    >
                      <AvatarBadge avatarId={av.id} size="sm" />
                    </button>
                  );
                })}
              </div>
            </div>

            {gameInfo.mode === 'equipos' && (
              <div>
                <span className="block text-sm font-medium text-slate-300 mb-2">
                  Elige tu equipo (o deja asignación automática)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TEAMS.map((t) => {
                    const selected = teamId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setTeamId(selected ? undefined : t.id)
                        }
                        className={`px-3.5 py-2.5 rounded-xl border text-left text-sm font-semibold transition-colors cursor-pointer ${
                          selected
                            ? `${t.bgClass} ${t.borderClass} text-white`
                            : 'bg-[#080E1E] border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <span style={{ color: t.color }}>{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {joinError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/50 text-rose-200 text-sm">
                {joinError}
              </div>
            )}

            <button
              type="submit"
              disabled={joining}
              className="w-full py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-extrabold text-lg inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 min-h-[56px]"
            >
              <LogIn className="w-5 h-5" />
              {joining ? 'Entrando...' : 'ENTRAR A JUGAR'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
