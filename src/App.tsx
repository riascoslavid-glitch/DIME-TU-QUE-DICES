import { useEffect, useState } from 'react';
import { CreateGameView } from './components/CreateGameView';
import { HistoryLeaderboardView } from './components/HistoryLeaderboardView';
import { AppRoute, HomeView } from './components/HomeView';
import { DirectInviteParams, JoinView } from './components/JoinView';
import { LobbyRoomsView } from './components/LobbyRoomsView';
import { PlayerView } from './components/PlayerView';
import { PresenterView } from './components/PresenterView';
import { ProjectorView } from './components/ProjectorView';
import { QuestionBankView } from './components/QuestionBankView';

function getSavedPresenterToken(code: string): string | null {
  try {
    return localStorage.getItem(`dtqd_presenter_${code.toUpperCase()}`);
  } catch {
    return null;
  }
}

function savePresenterToken(code: string, token: string): void {
  try {
    localStorage.setItem(`dtqd_presenter_${code.toUpperCase()}`, token);
    localStorage.setItem('dtqd_last_presenter_code', code.toUpperCase());
  } catch {
    // ignore
  }
}

function getSavedPlayerToken(identifier: string): string | null {
  try {
    return localStorage.getItem(`dtqd_player_${identifier.toUpperCase()}`);
  } catch {
    return null;
  }
}

function savePlayerToken(
  code: string,
  token: string,
  gameId?: string
): void {
  try {
    localStorage.setItem(`dtqd_player_${code.toUpperCase()}`, token);
    if (gameId) {
      localStorage.setItem(`dtqd_player_${gameId.toUpperCase()}`, token);
      localStorage.setItem(`dtqd_code_for_${gameId.toUpperCase()}`, code.toUpperCase());
    }
  } catch {
    // ignore
  }
}

function getCodeForSavedId(identifier: string): string {
  try {
    return (
      localStorage.getItem(`dtqd_code_for_${identifier.toUpperCase()}`) ||
      identifier.toUpperCase()
    );
  } catch {
    return identifier.toUpperCase();
  }
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>('home');
  const [activeCode, setActiveCode] = useState<string>('');
  const [activeGameId, setActiveGameId] = useState<string>('');
  const [directInvite, setDirectInvite] = useState<DirectInviteParams | null>(
    null
  );
  const [presenterToken, setPresenterToken] = useState<string>('');
  const [playerToken, setPlayerToken] = useState<string>('');
  const [recentPresenterCode, setRecentPresenterCode] = useState<string | null>(
    () => {
      try {
        return localStorage.getItem('dtqd_last_presenter_code');
      } catch {
        return null;
      }
    }
  );

  // Sync URL paths (/unirse/:id?s=sig, /join/:id, /proyeccion/:code) and query params (?join=, ?projector=, ?presenter=)
  useEffect(() => {
    const pathname = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const sig = params.get('s') || undefined;

    const unirseMatch = pathname.match(/^\/(?:partida|unirse|join)\/([^/]+)\/?$/i);
    if (unirseMatch) {
      const identifier = decodeURIComponent(unirseMatch[1]).toUpperCase();
      const existingPlayerToken = getSavedPlayerToken(identifier);
      if (existingPlayerToken) {
        const resolvedCode = getCodeForSavedId(identifier);
        setActiveCode(resolvedCode);
        setActiveGameId(identifier);
        setPlayerToken(existingPlayerToken);
        setRoute('player');
      } else {
        setActiveCode(identifier);
        setActiveGameId(identifier);
        setDirectInvite({ identifier, signature: sig });
        setRoute('join');
      }
      return;
    }

    const projectorPathMatch = pathname.match(/^\/proyeccion\/([^/]+)\/?$/i);
    if (projectorPathMatch) {
      setActiveCode(decodeURIComponent(projectorPathMatch[1]).toUpperCase());
      setRoute('projector');
      return;
    }

    const joinCode = params.get('join');
    const projectorCode = params.get('projector');
    const presenterCode = params.get('presenter');

    if (projectorCode) {
      setActiveCode(projectorCode.toUpperCase());
      setRoute('projector');
      return;
    }

    if (presenterCode) {
      const upper = presenterCode.toUpperCase();
      const saved = getSavedPresenterToken(upper);
      if (saved) {
        setActiveCode(upper);
        setPresenterToken(saved);
        setRoute('presenter');
        return;
      }
    }

    if (joinCode) {
      const upper = joinCode.toUpperCase();
      const existingPlayerToken = getSavedPlayerToken(upper);
      setActiveCode(upper);
      if (existingPlayerToken) {
        setPlayerToken(existingPlayerToken);
        setRoute('player');
      } else {
        setDirectInvite({ identifier: upper, signature: sig });
        setRoute('join');
      }
    }
  }, []);

  const navigate = (nextRoute: AppRoute, code?: string) => {
    const upperCode = code ? code.toUpperCase() : '';

    if (nextRoute === 'projector' && upperCode) {
      setActiveCode(upperCode);
      setRoute('projector');
      window.history.replaceState(
        null,
        '',
        `/?projector=${encodeURIComponent(upperCode)}`
      );
      return;
    }

    if (nextRoute === 'presenter' && upperCode) {
      const saved = getSavedPresenterToken(upperCode);
      if (saved) {
        setActiveCode(upperCode);
        setPresenterToken(saved);
        setRoute('presenter');
        window.history.replaceState(
          null,
          '',
          `/?presenter=${encodeURIComponent(upperCode)}`
        );
        return;
      }
      setRoute('create');
      return;
    }

    if (nextRoute === 'join') {
      if (upperCode) {
        const existingPlayerToken = getSavedPlayerToken(upperCode);
        setActiveCode(upperCode);
        if (existingPlayerToken) {
          setPlayerToken(existingPlayerToken);
          setRoute('player');
          window.history.replaceState(
            null,
            '',
            `/partida/${encodeURIComponent(upperCode)}`
          );
          return;
        }
        setDirectInvite({ identifier: upperCode });
        window.history.replaceState(
          null,
          '',
          `/partida/${encodeURIComponent(upperCode)}`
        );
      } else {
        setActiveCode('');
        setDirectInvite(null);
        window.history.replaceState(null, '', '/');
      }
      setRoute('join');
      return;
    }

    setDirectInvite(null);
    setRoute(nextRoute);
    if (nextRoute === 'home') {
      window.history.replaceState(null, '', '/');
    }
  };

  // Dedicated full-screen projection route without standard header
  if (route === 'projector' && activeCode) {
    return <ProjectorView code={activeCode} />;
  }

  return (
    <div className="min-h-screen bg-[#080E1E] text-slate-100 flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="border-b border-slate-800/80 bg-[#080E1E]/95 sticky top-0 z-30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => navigate('home')}
            className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-amber-400 whitespace-nowrap shrink-0 cursor-pointer"
          >
            DIME TÚ QUÉ DICES
          </button>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <button
              type="button"
              onClick={() => navigate('home')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route === 'home' ? 'text-white underline underline-offset-8 decoration-amber-400' : ''
              }`}
            >
              Inicio
            </button>
            <button
              type="button"
              onClick={() => navigate('lobby')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route === 'lobby' ? 'text-white underline underline-offset-8 decoration-amber-400' : ''
              }`}
            >
              Sala de Juegos
            </button>
            <button
              type="button"
              onClick={() => navigate('bank')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route === 'bank' ? 'text-white underline underline-offset-8 decoration-amber-400' : ''
              }`}
            >
              Banco Bíblico
            </button>
            <button
              type="button"
              onClick={() => navigate('leaderboard')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route === 'leaderboard' ? 'text-white underline underline-offset-8 decoration-amber-400' : ''
              }`}
            >
              Clasificación
            </button>
            <button
              type="button"
              onClick={() => navigate('history')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                route === 'history' ? 'text-white underline underline-offset-8 decoration-amber-400' : ''
              }`}
            >
              Historial
            </button>
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => navigate('create')}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Crear Partida
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {route === 'home' && (
          <HomeView
            onNavigate={navigate}
            recentPresenterCode={recentPresenterCode}
          />
        )}

        {route === 'create' && (
          <CreateGameView
            onCreated={(code, token) => {
              savePresenterToken(code, token);
              setRecentPresenterCode(code);
              setActiveCode(code);
              setPresenterToken(token);
              setRoute('presenter');
              window.history.replaceState(
                null,
                '',
                `/?presenter=${encodeURIComponent(code)}`
              );
            }}
            onCancel={() => navigate('home')}
          />
        )}

        {route === 'join' && (
          <JoinView
            initialCode={activeCode}
            directInvite={directInvite}
            onJoined={(code, token, _pid, gameId) => {
              savePlayerToken(code, token, gameId);
              setActiveCode(code);
              if (gameId) setActiveGameId(gameId);
              setPlayerToken(token);
              setRoute('player');
              const targetId = gameId || code;
              const qs = window.location.search || '';
              window.history.replaceState(
                null,
                '',
                `/partida/${encodeURIComponent(targetId)}${qs}`
              );
            }}
            onBack={() => navigate('home')}
          />
        )}

        {route === 'presenter' && activeCode && presenterToken && (
          <PresenterView
            code={activeCode}
            token={presenterToken}
            onNewGame={() => navigate('create')}
            onExit={() => navigate('home')}
          />
        )}

        {route === 'player' && activeCode && playerToken && (
          <PlayerView
            code={activeCode}
            token={playerToken}
            onExit={() => {
              try {
                localStorage.removeItem(`dtqd_player_${activeCode}`);
                if (activeGameId) {
                  localStorage.removeItem(`dtqd_player_${activeGameId}`);
                }
              } catch {
                // ignore
              }
              navigate('home');
            }}
          />
        )}

        {route === 'lobby' && (
          <LobbyRoomsView
            onJoinCode={(code) => navigate('join', code)}
            onCreateGame={() => navigate('create')}
          />
        )}

        {route === 'bank' && <QuestionBankView />}

        {route === 'leaderboard' && (
          <HistoryLeaderboardView initialTab="clasificacion" />
        )}

        {route === 'history' && (
          <HistoryLeaderboardView initialTab="historial" />
        )}
      </main>
    </div>
  );
}
