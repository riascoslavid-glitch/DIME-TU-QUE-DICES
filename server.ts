import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { BIBLE_QUESTION_BANK } from './src/shared/questionBank.js';
import {
  BibleQuestion,
  Difficulty,
  GameConfig,
  GameHistorySummary,
  GameRoomClientState,
  GameStatus,
  LeaderboardEntry,
  Participant,
  PublicGameListing,
  QuestionAnswerSummary,
  QuestionResultStats,
  SanitizedQuestion,
  TEAMS,
  TeamId,
  TeamScoreEntry,
} from './src/shared/types.js';

interface StoredAnswer {
  participantId: string;
  selectedIndex: number;
  isCorrect: boolean;
  pointsEarned: number;
  responseTimeMs: number;
  submittedAt: number;
}

interface GameQuestionInstance extends BibleQuestion {
  isSpecialMultiplier: number;
  roundStage?: string;
}

interface StoredParticipant extends Participant {
  token: string;
}

interface StoredGame {
  id: string;
  inviteSignature: string;
  code: string;
  presenterToken: string;
  config: GameConfig;
  status: GameStatus;
  previousStatusBeforePause?: GameStatus;
  pausedRemainingMs?: number;
  questions: GameQuestionInstance[];
  currentQuestionIndex: number;
  questionStartedAt: number | null;
  questionEndsAt: number | null;
  participants: Record<string, StoredParticipant>;
  answers: Record<number, Record<string, StoredAnswer>>;
  evaluatedEliminations: number[];
  createdAt: number;
  finishedAt: number | null;
}

interface PersistedDatabase {
  serverSecret: string;
  customQuestions: BibleQuestion[];
  games: Record<string, StoredGame>;
  archivedGames: Record<string, StoredGame>;
  history: GameHistorySummary[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'dime_tu_db.json');
const SERVER_SERVICE_ID = 'dime-tu-que-dices';

let db: PersistedDatabase = {
  serverSecret: crypto.randomBytes(32).toString('hex'),
  customQuestions: [],
  games: {},
  archivedGames: {},
  history: [],
};

function computeInviteSignature(gameId: string, code: string): string {
  return crypto
    .createHmac('sha256', db.serverSecret)
    .update(`${gameId}:${code}`)
    .digest('hex')
    .slice(0, 10);
}

function verifyInviteSignature(game: StoredGame, sig: string): boolean {
  const expected = computeInviteSignature(game.id, game.code);
  const a = Buffer.from(expected, 'utf-8');
  const b = Buffer.from(sig.trim(), 'utf-8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function loadDatabase(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistedDatabase>;
      db = {
        serverSecret:
          typeof parsed.serverSecret === 'string' && parsed.serverSecret.length >= 16
            ? parsed.serverSecret
            : crypto.randomBytes(32).toString('hex'),
        customQuestions: Array.isArray(parsed.customQuestions) ? parsed.customQuestions : [],
        games: parsed.games && typeof parsed.games === 'object' ? parsed.games : {},
        archivedGames:
          parsed.archivedGames && typeof parsed.archivedGames === 'object'
            ? parsed.archivedGames
            : {},
        history: Array.isArray(parsed.history) ? parsed.history : [],
      };
      // Reset online flags and ensure permanent IDs on fresh server start
      for (const game of [...Object.values(db.games), ...Object.values(db.archivedGames)]) {
        if (!game.id) {
          game.id = `${game.code}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        }
        if (!game.inviteSignature) {
          game.inviteSignature = computeInviteSignature(game.id, game.code);
        }
        for (const p of Object.values(game.participants)) {
          p.online = false;
        }
        if (!Array.isArray(game.evaluatedEliminations)) {
          game.evaluatedEliminations = [];
        }
      }
    }
  } catch (err) {
    console.error('Error cargando base de datos:', err);
  }
}

let saveTimer: NodeJS.Timeout | null = null;
function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpPath = `${DB_PATH}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
      fs.renameSync(tmpPath, DB_PATH);
    } catch (err) {
      console.error('Error guardando base de datos:', err);
    }
  }, 150);
}

loadDatabase();

function randomToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

function isLocalOrPrivateHost(host: string): boolean {
  const hostname = host.replace(/^\[|\]$/g, '').split(':')[0].toLowerCase();
  return (
    !hostname ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.startsWith('ais-dev-') ||
    hostname === 'aistudio.google.com' ||
    hostname.endsWith('.aistudio.google.com')
  );
}

function validatePublicUrlString(rawUrl: string): string | null {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    if (isLocalOrPrivateHost(parsed.host)) {
      return null;
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

type PublicOriginReason =
  | 'OK'
  | 'AI_STUDIO_PRIVATE_PREVIEW'
  | 'LOCALHOST_ONLY'
  | 'AUTH_REQUIRED'
  | 'UNREACHABLE_OR_NOT_DEPLOYED'
  | 'UNCONFIGURED';

interface PublicOriginResolution {
  origin: string | null;
  reason: PublicOriginReason;
  detectedHost: string;
}

interface ProbeCacheEntry {
  accessible: boolean;
  reason: PublicOriginReason;
  expiresAt: number;
}

const publicProbeCache = new Map<string, ProbeCacheEntry>();

async function verifyOriginPublicAccess(
  origin: string,
  bypassCache = false
): Promise<{ accessible: boolean; reason: PublicOriginReason }> {
  const normalized = validatePublicUrlString(origin);
  if (!normalized) {
    return { accessible: false, reason: 'LOCALHOST_ONLY' };
  }

  const now = Date.now();
  if (!bypassCache) {
    const cached = publicProbeCache.get(normalized);
    if (cached && cached.expiresAt > now) {
      return { accessible: cached.accessible, reason: cached.reason };
    }
  }

  const saveCache = (accessible: boolean, reason: PublicOriginReason) => {
    publicProbeCache.set(normalized, {
      accessible,
      reason,
      expiresAt: Date.now() + (accessible ? 60_000 : 10_000),
    });
    return { accessible, reason };
  };

  try {
    const res = await fetch(`${normalized}/api/health`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(4000),
    });

    if (res.status === 200) {
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        service?: string;
      } | null;
      if (data?.ok === true && data?.service === SERVER_SERVICE_ID) {
        return saveCache(true, 'OK');
      }
      return saveCache(false, 'UNREACHABLE_OR_NOT_DEPLOYED');
    }

    if (res.status >= 300 && res.status < 400) {
      const location = String(res.headers.get('location') || '').toLowerCase();
      if (location.includes('__cookie_check.html')) {
        // Test past cookie-check interstitial to see if AI Studio auth bridge gates it
        try {
          const resWithCookie = await fetch(`${normalized}/api/health`, {
            redirect: 'manual',
            headers: {
              Cookie: '__SECURE-aistudio_auth_flow_may_set_cookies=true',
            },
            signal: AbortSignal.timeout(4000),
          });
          const loc2 = String(
            resWithCookie.headers.get('location') || ''
          ).toLowerCase();
          if (
            loc2.includes('aistudio.google.com') ||
            loc2.includes('applet-auth-bridge') ||
            loc2.includes('accounts.google.com') ||
            resWithCookie.status === 401 ||
            resWithCookie.status === 403
          ) {
            return saveCache(false, 'AI_STUDIO_PRIVATE_PREVIEW');
          }
        } catch {
          return saveCache(false, 'AI_STUDIO_PRIVATE_PREVIEW');
        }
        return saveCache(false, 'AI_STUDIO_PRIVATE_PREVIEW');
      }
      if (
        location.includes('aistudio.google.com') ||
        location.includes('applet-auth-bridge')
      ) {
        return saveCache(false, 'AI_STUDIO_PRIVATE_PREVIEW');
      }
      return saveCache(false, 'AUTH_REQUIRED');
    }

    if (res.status === 401 || res.status === 403) {
      return saveCache(false, 'AUTH_REQUIRED');
    }

    return saveCache(false, 'UNREACHABLE_OR_NOT_DEPLOYED');
  } catch {
    return saveCache(false, 'UNREACHABLE_OR_NOT_DEPLOYED');
  }
}

async function resolvePublicOriginInfo(
  req: express.Request,
  bypassCache = false
): Promise<PublicOriginResolution> {
  const forwardedHost = String(req.headers['x-forwarded-host'] || '')
    .split(',')[0]
    .trim();
  const hostHeader = String(req.headers.host || '').trim();
  const reqHost = forwardedHost || hostHeader;
  const protoHeader =
    String(req.headers['x-forwarded-proto'] || '')
      .split(',')[0]
      .trim() || 'https';
  const queryOrigin = String(req.query.origin || '').trim();

  const rawCandidates: string[] = [];
  if (forwardedHost) rawCandidates.push(`${protoHeader}://${forwardedHost}`);
  if (hostHeader) rawCandidates.push(`${protoHeader}://${hostHeader}`);
  if (queryOrigin) rawCandidates.push(queryOrigin);
  if (process.env.PUBLIC_APP_URL) rawCandidates.push(String(process.env.PUBLIC_APP_URL));
  if (process.env.APP_URL) rawCandidates.push(String(process.env.APP_URL));

  const seen = new Set<string>();
  let sawAiStudio = false;
  let sawLocalhost = false;
  let lastFailureReason: PublicOriginReason = 'UNCONFIGURED';

  for (const raw of rawCandidates) {
    const trimmed = raw.trim().replace(/\/+$/, '');
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();
    if (lower.includes('ais-dev-') || lower.includes('aistudio.google.com')) {
      sawAiStudio = true;
      continue;
    }

    const validFormat = validatePublicUrlString(trimmed);
    if (!validFormat) {
      if (
        lower.includes('localhost') ||
        lower.includes('127.0.0.1') ||
        lower.includes('0.0.0.0')
      ) {
        sawLocalhost = true;
      }
      continue;
    }

    if (seen.has(validFormat)) continue;
    seen.add(validFormat);

    const probe = await verifyOriginPublicAccess(validFormat, bypassCache);
    if (probe.accessible) {
      return {
        origin: validFormat,
        reason: 'OK',
        detectedHost: reqHost || new URL(validFormat).host,
      };
    }

    if (probe.reason === 'AI_STUDIO_PRIVATE_PREVIEW') {
      sawAiStudio = true;
    }
    lastFailureReason = probe.reason;
  }

  if (sawAiStudio) {
    return {
      origin: null,
      reason: 'AI_STUDIO_PRIVATE_PREVIEW',
      detectedHost: reqHost || String(process.env.APP_URL || ''),
    };
  }

  if (sawLocalhost && lastFailureReason === 'UNCONFIGURED') {
    return {
      origin: null,
      reason: 'LOCALHOST_ONLY',
      detectedHost: reqHost,
    };
  }

  return {
    origin: null,
    reason: lastFailureReason,
    detectedHost: reqHost,
  };
}

function findGameByIdentifier(identifier: string): StoredGame | undefined {
  const upper = identifier.trim().toUpperCase();
  if (!upper) return undefined;
  if (db.archivedGames[upper]) return db.archivedGames[upper];
  const activeById = Object.values(db.games).find((g) => g.id === upper);
  if (activeById) return activeById;
  return db.games[upper];
}

function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt++) {
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    const candidate = `BIBLIA${suffix}`;
    if (!db.games[candidate] || db.games[candidate].status === 'finished') {
      return candidate;
    }
  }
  return `BIBLIA${Date.now().toString().slice(-4)}`;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function prepareQuestionInstance(
  q: BibleQuestion,
  index: number,
  total: number,
  config: GameConfig
): GameQuestionInstance {
  let options = [...q.options];
  let correctIndex = q.correctIndex;

  // Shuffle options unless it's True/False
  const isTrueFalse =
    q.category === 'Verdadero o falso' ||
    (options.length === 2 &&
      options[0].toLowerCase() === 'verdadero' &&
      options[1].toLowerCase() === 'falso');

  if (!isTrueFalse && options.length > 1) {
    const tagged = options.map((text, idx) => ({
      text,
      isCorrect: idx === q.correctIndex,
    }));
    const shuffled = shuffleArray(tagged);
    options = shuffled.map((t) => t.text);
    correctIndex = shuffled.findIndex((t) => t.isCorrect);
  }

  let isSpecialMultiplier = 1;
  if (config.specialEveryN > 0 && (index + 1) % config.specialEveryN === 0) {
    isSpecialMultiplier = 2;
  }

  let roundStage: string | undefined;
  if (config.mode === 'torneo') {
    const progress = (index + 1) / total;
    if (progress <= 0.4) {
      roundStage = 'Ronda 1 · Clasificatoria';
    } else if (progress <= 0.75) {
      roundStage = 'Ronda 2 · Semifinal';
    } else {
      roundStage = 'Gran Final · Doble Puntaje';
      isSpecialMultiplier = 2;
    }
  }

  return {
    ...q,
    options,
    correctIndex,
    isSpecialMultiplier,
    roundStage,
  };
}

function selectQuestionsForGame(config: GameConfig): GameQuestionInstance[] {
  const allQuestions = [...BIBLE_QUESTION_BANK, ...db.customQuestions];
  let pool = allQuestions.filter((q) => {
    const catMatch =
      config.categories.length === 0 || config.categories.includes(q.category);
    const diffMatch =
      config.difficulty === 'combinado' || q.difficulty === config.difficulty;
    return catMatch && diffMatch;
  });

  // Fallback if user selected very narrow combination with fewer than needed
  if (pool.length === 0) {
    pool = allQuestions.filter(
      (q) => config.categories.length === 0 || config.categories.includes(q.category)
    );
  }
  if (pool.length === 0) {
    pool = [...allQuestions];
  }

  let selected: BibleQuestion[] = [];
  if (config.mode === 'supervivencia') {
    const easy = shuffleArray(pool.filter((q) => q.difficulty === 'facil'));
    const mid = shuffleArray(pool.filter((q) => q.difficulty === 'intermedio'));
    const hard = shuffleArray(pool.filter((q) => q.difficulty === 'dificil'));
    const ordered = [...easy, ...mid, ...hard];
    selected = ordered.slice(0, Math.min(config.questionCount, ordered.length));
  } else {
    selected = shuffleArray(pool).slice(0, Math.min(config.questionCount, pool.length));
  }

  return selected.map((q, idx) =>
    prepareQuestionInstance(q, idx, selected.length, config)
  );
}

function buildLeaderboard(game: StoredGame): LeaderboardEntry[] {
  const list = Object.values(game.participants).map((p) => {
    const accuracyPercent =
      p.answeredCount > 0 ? Math.round((p.correctCount / p.answeredCount) * 100) : 0;
    const avgResponseMs =
      p.answeredCount > 0 ? Math.round(p.totalResponseMs / p.answeredCount) : 0;
    return {
      rank: 0,
      participantId: p.id,
      name: p.name,
      avatarId: p.avatarId,
      teamId: p.teamId,
      score: p.score,
      correctCount: p.correctCount,
      answeredCount: p.answeredCount,
      accuracyPercent,
      avgResponseMs,
      eliminated: p.eliminated,
      online: p.online,
    };
  });

  list.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    return a.avgResponseMs - b.avgResponseMs;
  });

  return list.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
}

function buildTeamLeaderboard(game: StoredGame): TeamScoreEntry[] {
  if (game.config.mode !== 'equipos') return [];
  const map: Record<TeamId, TeamScoreEntry> = {
    leones: {
      teamId: 'leones',
      name: TEAMS[0].name,
      color: TEAMS[0].color,
      score: 0,
      memberCount: 0,
      correctCount: 0,
    },
    aguilas: {
      teamId: 'aguilas',
      name: TEAMS[1].name,
      color: TEAMS[1].color,
      score: 0,
      memberCount: 0,
      correctCount: 0,
    },
    olivos: {
      teamId: 'olivos',
      name: TEAMS[2].name,
      color: TEAMS[2].color,
      score: 0,
      memberCount: 0,
      correctCount: 0,
    },
    estrellas: {
      teamId: 'estrellas',
      name: TEAMS[3].name,
      color: TEAMS[3].color,
      score: 0,
      memberCount: 0,
      correctCount: 0,
    },
  };

  for (const p of Object.values(game.participants)) {
    if (p.teamId && map[p.teamId]) {
      map[p.teamId].score += p.score;
      map[p.teamId].memberCount += 1;
      map[p.teamId].correctCount += p.correctCount;
    }
  }

  return Object.values(map)
    .filter((t) => t.memberCount > 0)
    .sort((a, b) => b.score - a.score);
}

function buildQuestionStats(
  game: StoredGame,
  questionIndex: number,
  includeDetails: boolean
): QuestionResultStats | null {
  if (questionIndex < 0 || questionIndex >= game.questions.length) return null;
  const q = game.questions[questionIndex];
  const answersMap = game.answers[questionIndex] || {};
  const participants = Object.values(game.participants);

  const optionCounts = q.options.map(() => 0);
  let correctCount = 0;
  let incorrectCount = 0;

  const rows: QuestionAnswerSummary[] = participants.map((p) => {
    const ans = answersMap[p.id];
    if (!ans) {
      incorrectCount += 1;
      return {
        participantId: p.id,
        participantName: p.name,
        avatarId: p.avatarId,
        teamId: p.teamId,
        selectedIndex: null,
        selectedLabel: 'Sin responder',
        isCorrect: false,
        pointsEarned: 0,
        responseTimeMs: null,
      };
    }
    if (ans.selectedIndex >= 0 && ans.selectedIndex < optionCounts.length) {
      optionCounts[ans.selectedIndex] += 1;
    }
    if (ans.isCorrect) correctCount += 1;
    else incorrectCount += 1;

    return {
      participantId: p.id,
      participantName: p.name,
      avatarId: p.avatarId,
      teamId: p.teamId,
      selectedIndex: ans.selectedIndex,
      selectedLabel: q.options[ans.selectedIndex] ?? 'Opción',
      isCorrect: ans.isCorrect,
      pointsEarned: ans.pointsEarned,
      responseTimeMs: ans.responseTimeMs,
    };
  });

  rows.sort((a, b) => {
    if (b.pointsEarned !== a.pointsEarned) return b.pointsEarned - a.pointsEarned;
    return (a.responseTimeMs ?? 999999) - (b.responseTimeMs ?? 999999);
  });

  const totalAnswered = Object.keys(answersMap).length;
  const totalParticipants = participants.length;
  const optionPercents = optionCounts.map((c) =>
    totalAnswered > 0 ? Math.round((c / totalAnswered) * 100) : 0
  );

  return {
    questionIndex,
    totalParticipants,
    totalAnswered,
    correctCount: includeDetails ? correctCount : 0,
    incorrectCount: includeDetails ? incorrectCount : 0,
    correctPercent:
      includeDetails && totalParticipants > 0
        ? Math.round((correctCount / totalParticipants) * 100)
        : 0,
    incorrectPercent:
      includeDetails && totalParticipants > 0
        ? Math.round((incorrectCount / totalParticipants) * 100)
        : 0,
    optionCounts: includeDetails ? optionCounts : q.options.map(() => 0),
    optionPercents: includeDetails ? optionPercents : q.options.map(() => 0),
    rows: includeDetails ? rows : [],
  };
}

function buildClientState(
  game: StoredGame,
  role: 'presenter' | 'projector' | 'participant',
  participantId?: string
): GameRoomClientState {
  const now = Date.now();
  const qIdx = game.currentQuestionIndex;
  const rawQ =
    qIdx >= 0 && qIdx < game.questions.length ? game.questions[qIdx] : null;

  const isRevealed =
    game.status === 'answer_revealed' || game.status === 'finished';

  // SECURITY: Never send correctIndex or explanation to participants or projector while active!
  const showAnswerFields = isRevealed || role === 'presenter';

  let currentQuestion: SanitizedQuestion | null = null;
  if (rawQ) {
    currentQuestion = {
      id: rawQ.id,
      group: rawQ.group,
      category: rawQ.category,
      difficulty: rawQ.difficulty,
      prompt: rawQ.prompt,
      options: rawQ.options,
      isSpecialMultiplier: rawQ.isSpecialMultiplier,
      roundStage: rawQ.roundStage,
      ...(showAnswerFields
        ? {
            correctIndex: rawQ.correctIndex,
            reference: rawQ.reference,
            explanation: rawQ.explanation,
          }
        : {}),
    };
  }

  let remainingSec = 0;
  if (game.status === 'question_active' && game.questionEndsAt) {
    remainingSec = Math.max(0, Math.ceil((game.questionEndsAt - now) / 1000));
  } else if (game.status === 'paused' && game.pausedRemainingMs) {
    remainingSec = Math.max(0, Math.ceil(game.pausedRemainingMs / 1000));
  }

  const publicParticipants: Participant[] = Object.values(game.participants).map(
    ({ token: _t, ...rest }) => rest
  );

  const answersMap = game.answers[qIdx] || {};
  const answeredParticipantIds = Object.keys(answersMap);

  const includeStatsDetails = isRevealed || role === 'presenter';
  const questionStats =
    qIdx >= 0 ? buildQuestionStats(game, qIdx, includeStatsDetails) : null;

  let myParticipant: Participant | null = null;
  let myCurrentAnswer: GameRoomClientState['myCurrentAnswer'] = null;
  if (participantId && game.participants[participantId]) {
    const { token: _t, ...rest } = game.participants[participantId];
    myParticipant = rest;
    const ans = answersMap[participantId];
    if (ans) {
      myCurrentAnswer = {
        selectedIndex: ans.selectedIndex,
        ...(isRevealed
          ? {
              isCorrect: ans.isCorrect,
              pointsEarned: ans.pointsEarned,
            }
          : {}),
      };
    }
  }

  return {
    gameId: game.id,
    code: game.code,
    invitePath: `/partida/${encodeURIComponent(game.id)}?s=${encodeURIComponent(game.inviteSignature)}`,
    config: game.config,
    status: game.status,
    previousStatusBeforePause: game.previousStatusBeforePause,
    currentQuestionIndex: game.currentQuestionIndex,
    totalQuestions: game.questions.length,
    currentQuestion,
    questionStartedAt: game.questionStartedAt,
    questionEndsAt: game.questionEndsAt,
    remainingSec,
    serverNow: now,
    participants: publicParticipants,
    answeredParticipantIds,
    questionStats,
    leaderboard: buildLeaderboard(game),
    teamLeaderboard: buildTeamLeaderboard(game),
    myParticipant,
    myCurrentAnswer,
    createdAt: game.createdAt,
    finishedAt: game.finishedAt,
  };
}

function evaluateEliminationsForQuestion(game: StoredGame, qIdx: number): void {
  if (game.config.mode !== 'eliminacion') return;
  if (qIdx < 0 || qIdx >= game.questions.length) return;
  if (game.evaluatedEliminations.includes(qIdx)) return;

  game.evaluatedEliminations.push(qIdx);
  const answersMap = game.answers[qIdx] || {};
  const lives = Math.max(1, game.config.eliminationLives || 1);

  for (const p of Object.values(game.participants)) {
    if (p.eliminated) continue;
    const ans = answersMap[p.id];
    if (!ans || !ans.isCorrect) {
      p.mistakes += 1;
      if (p.mistakes >= lives) {
        p.eliminated = true;
      }
    }
  }
}

function recordGameHistory(game: StoredGame): void {
  const existingIdx = db.history.findIndex((h) => h.id === `${game.code}-${game.createdAt}`);
  const lb = buildLeaderboard(game);
  const winner = lb[0];
  const summary: GameHistorySummary = {
    id: `${game.code}-${game.createdAt}`,
    code: game.code,
    title: game.config.title,
    mode: game.config.mode,
    questionCount: game.questions.length,
    participantCount: lb.length,
    winnerName: winner ? winner.name : 'Sin participantes',
    winnerAvatarId: winner ? winner.avatarId : 'crown',
    winnerScore: winner ? winner.score : 0,
    topThree: lb.slice(0, 3).map((e) => ({
      rank: e.rank,
      name: e.name,
      avatarId: e.avatarId,
      score: e.score,
      correctCount: e.correctCount,
      accuracyPercent: e.accuracyPercent,
    })),
    finishedAt: game.finishedAt || Date.now(),
  };

  if (existingIdx >= 0) {
    db.history[existingIdx] = summary;
  } else {
    db.history.unshift(summary);
  }
  db.history = db.history.slice(0, 100);
}

interface ClientMeta {
  ws: WebSocket;
  code: string;
  role: 'presenter' | 'projector' | 'participant';
  participantId?: string;
}

const roomSockets = new Map<string, Set<ClientMeta>>();
const socketMetaMap = new WeakMap<WebSocket, ClientMeta>();

function broadcastRoom(code: string): void {
  const game = db.games[code];
  const clients = roomSockets.get(code);
  if (!game || !clients) return;

  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      const payload = buildClientState(game, client.role, client.participantId);
      client.ws.send(JSON.stringify({ type: 'state', payload }));
    }
  }
}

function startQuestionAt(game: StoredGame, index: number): void {
  const now = Date.now();
  game.currentQuestionIndex = index;
  game.status = 'question_active';
  game.previousStatusBeforePause = undefined;
  game.pausedRemainingMs = undefined;
  game.questionStartedAt = now;
  game.questionEndsAt = now + game.config.timeLimitSec * 1000;
}

function finishGame(game: StoredGame): void {
  if (game.currentQuestionIndex >= 0) {
    evaluateEliminationsForQuestion(game, game.currentQuestionIndex);
  }
  game.status = 'finished';
  game.finishedAt = Date.now();
  recordGameHistory(game);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Authoritative Timer Loop
  setInterval(() => {
    const now = Date.now();
    for (const game of Object.values(db.games)) {
      if (
        game.status === 'question_active' &&
        game.questionEndsAt !== null &&
        now >= game.questionEndsAt
      ) {
        game.status = 'question_locked';
        evaluateEliminationsForQuestion(game, game.currentQuestionIndex);
        scheduleSave();
        broadcastRoom(game.code);
      }
    }
  }, 250);

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'subscribe') {
          const code = String(msg.code || '').trim().toUpperCase();
          const role = msg.role as 'presenter' | 'projector' | 'participant';
          const token = String(msg.token || '');
          const game = db.games[code];

          if (!game) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'No se encontró ninguna partida con ese código.',
              })
            );
            return;
          }

          // Clean previous subscription if re-subscribing
          const oldMeta = socketMetaMap.get(ws);
          if (oldMeta) {
            roomSockets.get(oldMeta.code)?.delete(oldMeta);
          }

          let verifiedRole: 'presenter' | 'projector' | 'participant' = 'projector';
          let participantId: string | undefined;

          if (role === 'presenter') {
            if (token && token === game.presenterToken) {
              verifiedRole = 'presenter';
            } else {
              ws.send(
                JSON.stringify({
                  type: 'error',
                  message: 'Credencial de presentador no válida.',
                })
              );
              return;
            }
          } else if (role === 'participant') {
            const found = Object.values(game.participants).find(
              (p) => p.token === token
            );
            if (!found) {
              ws.send(
                JSON.stringify({
                  type: 'kicked',
                  message: 'Tu sesión en esta partida ya no está activa.',
                })
              );
              return;
            }
            verifiedRole = 'participant';
            participantId = found.id;
            found.online = true;
            scheduleSave();
          } else {
            verifiedRole = 'projector';
          }

          const meta: ClientMeta = {
            ws,
            code,
            role: verifiedRole,
            participantId,
          };
          socketMetaMap.set(ws, meta);
          if (!roomSockets.has(code)) {
            roomSockets.set(code, new Set());
          }
          roomSockets.get(code)!.add(meta);

          broadcastRoom(code);
          return;
        }

        if (msg.type === 'presenter_action') {
          const code = String(msg.code || '').trim().toUpperCase();
          const token = String(msg.token || '');
          const action = String(msg.action || '');
          const game = db.games[code];

          if (!game || token !== game.presenterToken) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'No autorizado para controlar esta partida.',
              })
            );
            return;
          }

          if (action === 'start_game') {
            if (game.questions.length === 0) {
              game.questions = selectQuestionsForGame(game.config);
            }
            startQuestionAt(game, 0);
          } else if (action === 'pause_game') {
            if (
              game.status === 'question_active' ||
              game.status === 'question_locked' ||
              game.status === 'answer_revealed'
            ) {
              game.previousStatusBeforePause = game.status;
              if (game.status === 'question_active' && game.questionEndsAt) {
                game.pausedRemainingMs = Math.max(
                  1000,
                  game.questionEndsAt - Date.now()
                );
              }
              game.status = 'paused';
            }
          } else if (action === 'resume_game') {
            if (game.status === 'paused') {
              const prev = game.previousStatusBeforePause || 'question_active';
              game.status = prev;
              if (prev === 'question_active') {
                const rem =
                  game.pausedRemainingMs ?? game.config.timeLimitSec * 1000;
                game.questionEndsAt = Date.now() + rem;
                game.questionStartedAt =
                  game.questionEndsAt - game.config.timeLimitSec * 1000;
              }
              game.previousStatusBeforePause = undefined;
              game.pausedRemainingMs = undefined;
            }
          } else if (action === 'reveal_answer') {
            if (
              game.status === 'question_active' ||
              game.status === 'question_locked'
            ) {
              evaluateEliminationsForQuestion(game, game.currentQuestionIndex);
              game.status = 'answer_revealed';
            }
          } else if (action === 'next_question') {
            if (game.currentQuestionIndex >= 0) {
              evaluateEliminationsForQuestion(game, game.currentQuestionIndex);
            }
            const nextIdx = game.currentQuestionIndex + 1;
            if (nextIdx >= game.questions.length) {
              finishGame(game);
            } else {
              // Check if in Elimination mode everyone is eliminated or 1 left? Let presenter continue or end naturally
              startQuestionAt(game, nextIdx);
            }
          } else if (action === 'end_game') {
            finishGame(game);
          } else if (action === 'reset_game') {
            game.status = 'waiting';
            game.previousStatusBeforePause = undefined;
            game.pausedRemainingMs = undefined;
            game.currentQuestionIndex = -1;
            game.questionStartedAt = null;
            game.questionEndsAt = null;
            game.answers = {};
            game.evaluatedEliminations = [];
            game.finishedAt = null;
            game.questions = selectQuestionsForGame(game.config);
            for (const p of Object.values(game.participants)) {
              p.score = 0;
              p.correctCount = 0;
              p.answeredCount = 0;
              p.streak = 0;
              p.mistakes = 0;
              p.eliminated = false;
              p.totalResponseMs = 0;
            }
          } else if (action === 'kick_participant') {
            const targetId = String(msg.participantId || '');
            if (game.participants[targetId]) {
              delete game.participants[targetId];
              for (const qAnswers of Object.values(game.answers)) {
                delete qAnswers[targetId];
              }
              const clients = roomSockets.get(code);
              if (clients) {
                for (const c of clients) {
                  if (c.participantId === targetId) {
                    c.ws.send(
                      JSON.stringify({
                        type: 'kicked',
                        message: 'El presentador te ha retirado de la partida.',
                      })
                    );
                    clients.delete(c);
                  }
                }
              }
            }
          }

          scheduleSave();
          broadcastRoom(code);
          return;
        }

        if (msg.type === 'submit_answer') {
          const code = String(msg.code || '').trim().toUpperCase();
          const token = String(msg.token || '');
          const questionIndex = Number(msg.questionIndex);
          const selectedIndex = Number(msg.selectedIndex);
          const game = db.games[code];

          if (!game) return;
          const participant = Object.values(game.participants).find(
            (p) => p.token === token
          );
          if (!participant) return;

          if (participant.eliminated) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Fuiste eliminado en una ronda anterior. Estás en modo espectador.',
              })
            );
            return;
          }

          if (
            game.status !== 'question_active' ||
            questionIndex !== game.currentQuestionIndex
          ) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'El tiempo para esta pregunta ha finalizado.',
              })
            );
            return;
          }

          const now = Date.now();
          if (game.questionEndsAt && now > game.questionEndsAt + 500) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Tiempo agotado.',
              })
            );
            return;
          }

          if (!game.answers[questionIndex]) {
            game.answers[questionIndex] = {};
          }
          // Duplicate answer protection
          if (game.answers[questionIndex][participant.id]) {
            return;
          }

          const q = game.questions[questionIndex];
          if (!q || selectedIndex < 0 || selectedIndex >= q.options.length) {
            return;
          }

          const startedAt = game.questionStartedAt || now;
          const totalMs = Math.max(1000, game.config.timeLimitSec * 1000);
          const elapsedMs = Math.max(0, Math.min(totalMs, now - startedAt));

          const isCorrect = selectedIndex === q.correctIndex;
          let pointsEarned = 0;

          if (isCorrect) {
            const mult = q.isSpecialMultiplier || 1;
            const base = game.config.basePoints * mult;
            const speedBonusCap =
              game.config.mode === 'velocidad'
                ? Math.max(game.config.speedBonusMax, 1000)
                : game.config.speedBonusMax;
            const speedRatio = Math.max(0, Math.min(1, 1 - elapsedMs / totalMs));
            const speedBonus = Math.round(speedBonusCap * mult * speedRatio);
            pointsEarned = base + speedBonus;

            participant.score += pointsEarned;
            participant.correctCount += 1;
            participant.streak += 1;
          } else {
            participant.streak = 0;
          }

          participant.answeredCount += 1;
          participant.totalResponseMs += elapsedMs;

          game.answers[questionIndex][participant.id] = {
            participantId: participant.id,
            selectedIndex,
            isCorrect,
            pointsEarned,
            responseTimeMs: elapsedMs,
            submittedAt: now,
          };

          // Auto-lock if all online non-eliminated participants have answered
          const activeOnline = Object.values(game.participants).filter(
            (p) => p.online && !p.eliminated
          );
          const answeredCountForOnline = activeOnline.filter(
            (p) => Boolean(game.answers[questionIndex][p.id])
          ).length;

          if (activeOnline.length > 0 && answeredCountForOnline === activeOnline.length) {
            game.status = 'question_locked';
            evaluateEliminationsForQuestion(game, questionIndex);
          }

          scheduleSave();
          broadcastRoom(code);
        }
      } catch (err) {
        console.error('Error procesando mensaje WS:', err);
      }
    });

    ws.on('close', () => {
      const meta = socketMetaMap.get(ws);
      if (meta) {
        const set = roomSockets.get(meta.code);
        set?.delete(meta);
        if (meta.role === 'participant' && meta.participantId) {
          const game = db.games[meta.code];
          const p = game?.participants[meta.participantId];
          if (p) {
            // Check if participant has another open socket
            const stillConnected = Array.from(set || []).some(
              (c) => c.participantId === meta.participantId
            );
            if (!stillConnected) {
              p.online = false;
              scheduleSave();
              broadcastRoom(meta.code);
            }
          }
        }
      }
    });
  });

  // ---------------- REST API ROUTES ----------------
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: SERVER_SERVICE_ID,
      gamesCount: Object.keys(db.games).length,
    });
  });

  app.get('/api/questions', (req, res) => {
    const group = String(req.query.group || '');
    const category = String(req.query.category || '');
    const difficulty = String(req.query.difficulty || '');
    const search = String(req.query.search || '').trim().toLowerCase();

    const combined = [...db.customQuestions, ...BIBLE_QUESTION_BANK];
    const filtered = combined.filter((q) => {
      if (group && q.group !== group) return false;
      if (category && q.category !== category) return false;
      if (difficulty && q.difficulty !== difficulty) return false;
      if (
        search &&
        !q.prompt.toLowerCase().includes(search) &&
        !q.reference.toLowerCase().includes(search) &&
        !q.category.toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    });

    res.json({ total: filtered.length, questions: filtered });
  });

  app.post('/api/questions', (req, res) => {
    const body = req.body || {};
    const prompt = String(body.prompt || '').trim();
    const category = String(body.category || '').trim();
    const group = body.group;
    const difficulty = body.difficulty as Difficulty;
    const options = Array.isArray(body.options)
      ? body.options.map((o: unknown) => String(o || '').trim()).filter(Boolean)
      : [];
    const correctIndex = Number(body.correctIndex);
    const reference = String(body.reference || '').trim();
    const explanation = String(body.explanation || '').trim();

    if (!prompt || !category || !group || options.length < 2 || !reference) {
      res.status(400).json({
        error: 'Completa el enunciado, categoría, opciones y referencia bíblica.',
      });
      return;
    }
    if (isNaN(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      res.status(400).json({ error: 'Índice de respuesta correcta inválido.' });
      return;
    }

    const newQ: BibleQuestion = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      group,
      category,
      difficulty: difficulty || 'intermedio',
      prompt,
      options,
      correctIndex,
      reference,
      explanation: explanation || undefined,
      isCustom: true,
    };

    db.customQuestions.unshift(newQ);
    scheduleSave();
    res.status(201).json({ question: newQ });
  });

  app.delete('/api/questions/:id', (req, res) => {
    const id = req.params.id;
    const before = db.customQuestions.length;
    db.customQuestions = db.customQuestions.filter((q) => q.id !== id);
    if (db.customQuestions.length === before) {
      res.status(404).json({ error: 'Solo se pueden eliminar preguntas personalizadas.' });
      return;
    }
    scheduleSave();
    res.json({ deleted: true });
  });

  app.get('/api/games', (_req, res) => {
    const listings: PublicGameListing[] = Object.values(db.games)
      .filter((g) => g.status !== 'finished')
      .map((g) => ({
        code: g.code,
        title: g.config.title,
        mode: g.config.mode,
        status: g.status,
        participantCount: Object.keys(g.participants).length,
        maxParticipants: g.config.maxParticipants,
        questionCount: g.questions.length,
        currentQuestionIndex: g.currentQuestionIndex,
        createdAt: g.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);

    res.json({ games: listings });
  });

  app.get('/api/history', (_req, res) => {
    // Also compute global top scores across history and active finished games
    res.json({ history: db.history });
  });

  app.post('/api/games', async (req, res) => {
    const body = req.body || {};
    const title = String(body.title || '').trim() || 'Concurso Bíblico en Vivo';
    const rawCode = String(body.code || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    let code = rawCode.length >= 4 && rawCode.length <= 14 ? rawCode : generateGameCode();
    if (db.games[code] && db.games[code].status !== 'finished') {
      res.status(409).json({
        error: `El código "${code}" ya está activo en otra partida. Elige otro código o déjalo vacío para generar uno automático.`,
      });
      return;
    }

    // Preserve previous finished game under its permanent ID so old QR links remain bound to it
    if (db.games[code] && db.games[code].status === 'finished') {
      const oldGame = db.games[code];
      db.archivedGames[oldGame.id] = oldGame;
    }

    const config: GameConfig = {
      title,
      code,
      mode: body.mode || 'clasico',
      categories: Array.isArray(body.categories) ? body.categories : [],
      difficulty: body.difficulty || 'combinado',
      questionCount: Math.max(3, Math.min(50, Number(body.questionCount) || 10)),
      timeLimitSec: Math.max(5, Math.min(120, Number(body.timeLimitSec) || 20)),
      maxParticipants: Math.max(2, Math.min(500, Number(body.maxParticipants) || 100)),
      basePoints: Math.max(100, Math.min(5000, Number(body.basePoints) || 1000)),
      speedBonusMax: Math.max(0, Math.min(2000, Number(body.speedBonusMax ?? 500))),
      specialEveryN: Math.max(0, Math.min(20, Number(body.specialEveryN ?? 5))),
      eliminationLives: Math.max(1, Math.min(3, Number(body.eliminationLives ?? 1))),
    };

    const questions = selectQuestionsForGame(config);
    const presenterToken = randomToken();
    const gameId = `${code}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const inviteSignature = computeInviteSignature(gameId, code);

    const newGame: StoredGame = {
      id: gameId,
      inviteSignature,
      code,
      presenterToken,
      config,
      status: 'waiting',
      questions,
      currentQuestionIndex: -1,
      questionStartedAt: null,
      questionEndsAt: null,
      participants: {},
      answers: {},
      evaluatedEliminations: [],
      createdAt: Date.now(),
      finishedAt: null,
    };

    db.games[code] = newGame;
    scheduleSave();

    const pub = await resolvePublicOriginInfo(req);
    const inviteUrl = pub.origin
      ? `${pub.origin}/partida/${encodeURIComponent(gameId)}?s=${encodeURIComponent(inviteSignature)}`
      : null;

    res.status(201).json({
      gameId,
      code,
      presenterToken,
      inviteSignature,
      hasPublicUrl: Boolean(pub.origin),
      publicUrlReason: pub.reason,
      inviteUrl,
      questionCount: questions.length,
    });
  });

  app.get('/api/public-url', async (req, res) => {
    const bypassCache = req.query.refresh === '1';
    const pub = await resolvePublicOriginInfo(req, bypassCache);
    res.json({
      hasPublicUrl: Boolean(pub.origin),
      publicOrigin: pub.origin,
      reason: pub.reason,
      detectedHost: pub.detectedHost,
    });
  });

  app.get('/api/games/:identifier/invite-info', async (req, res) => {
    const game = findGameByIdentifier(req.params.identifier);
    if (!game || !game.id || !game.inviteSignature) {
      res.status(404).json({ error: 'No existe ninguna partida válida con ese identificador.' });
      return;
    }
    const bypassCache = req.query.refresh === '1';
    const pub = await resolvePublicOriginInfo(req, bypassCache);
    const inviteUrl = pub.origin
      ? `${pub.origin}/partida/${encodeURIComponent(game.id)}?s=${encodeURIComponent(game.inviteSignature)}`
      : null;
    const projectorUrl = pub.origin
      ? `${pub.origin}/?projector=${encodeURIComponent(game.code)}`
      : `/?projector=${encodeURIComponent(game.code)}`;

    res.json({
      gameId: game.id,
      code: game.code,
      title: game.config.title,
      status: game.status,
      signature: game.inviteSignature,
      hasPublicUrl: Boolean(pub.origin),
      publicOrigin: pub.origin,
      publicUrlReason: pub.reason,
      detectedHost: pub.detectedHost,
      inviteUrl,
      projectorUrl,
    });
  });

  app.get('/api/invite/:identifier', (req, res) => {
    const identifier = String(req.params.identifier || '').trim().toUpperCase();
    const sig = String(req.query.s || '').trim();
    const game = findGameByIdentifier(identifier);

    if (!game) {
      res.status(404).json({
        error: 'La partida solicitada no existe o el código ya no es válido.',
      });
      return;
    }

    // Strict anti-tampering validation when accessed by permanent ID or with signature
    const accessedByPermanentId = identifier === game.id;
    if (accessedByPermanentId || sig) {
      if (!sig || !verifyInviteSignature(game, sig)) {
        res.status(403).json({
          error:
            'El enlace de invitación fue manipulado o no es válido. Escanea nuevamente el código QR del presentador.',
        });
        return;
      }
    }

    res.json({
      gameId: game.id,
      code: game.code,
      title: game.config.title,
      mode: game.config.mode,
      status: game.status,
      participantCount: Object.keys(game.participants).length,
      maxParticipants: game.config.maxParticipants,
      questionCount: game.questions.length,
      signature: game.inviteSignature,
    });
  });

  app.get('/api/games/:code/exists', (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    const game = db.games[code];
    if (!game) {
      res.status(404).json({ error: 'No existe ninguna partida con ese código.' });
      return;
    }
    res.json({
      gameId: game.id,
      code: game.code,
      title: game.config.title,
      mode: game.config.mode,
      status: game.status,
      participantCount: Object.keys(game.participants).length,
      maxParticipants: game.config.maxParticipants,
      questionCount: game.questions.length,
      signature: game.inviteSignature,
    });
  });

  app.post('/api/games/:identifier/join', (req, res) => {
    const identifier = String(req.params.identifier || '').trim().toUpperCase();
    const game = findGameByIdentifier(identifier);
    if (!game) {
      res.status(404).json({ error: 'No se encontró la partida solicitada.' });
      return;
    }

    // Verify invite integrity when joining via permanent ID or signature
    const reqGameId = String(req.body?.gameId || '').trim().toUpperCase();
    const reqSig = String(req.body?.signature || '').trim();
    if (identifier === game.id || reqGameId || reqSig) {
      if ((reqGameId && reqGameId !== game.id) || !reqSig || !verifyInviteSignature(game, reqSig)) {
        res.status(403).json({
          error: 'Enlace de invitación inválido o alterado.',
        });
        return;
      }
    }

    if (game.status === 'finished') {
      res.status(400).json({
        error: 'Este concurso ya ha finalizado y ya no acepta participantes.',
      });
      return;
    }

    const name = String(req.body?.name || '').trim();
    const avatarId = String(req.body?.avatarId || 'crown').trim();
    const requestedTeam = req.body?.teamId as TeamId | undefined;

    if (name.length < 2 || name.length > 28) {
      res.status(400).json({
        error: 'Escribe un nombre válido de entre 2 y 28 caracteres.',
      });
      return;
    }

    const currentCount = Object.keys(game.participants).length;
    if (currentCount >= game.config.maxParticipants) {
      res.status(400).json({
        error: 'La partida ha alcanzado el número máximo de participantes.',
      });
      return;
    }

    // Prevent duplicate names in same game
    const normalized = name.toLowerCase();
    const duplicate = Object.values(game.participants).some(
      (p) => p.name.trim().toLowerCase() === normalized
    );
    if (duplicate) {
      res.status(409).json({
        error: `El nombre "${name}" ya está ocupado en esta partida. Agrega tu apellido o un número (ej. "${name} 2").`,
      });
      return;
    }

    let teamId: TeamId | undefined;
    if (game.config.mode === 'equipos') {
      const validIds: TeamId[] = ['leones', 'aguilas', 'olivos', 'estrellas'];
      if (requestedTeam && validIds.includes(requestedTeam)) {
        teamId = requestedTeam;
      } else {
        // Auto-balance team with fewest players
        const counts: Record<TeamId, number> = {
          leones: 0,
          aguilas: 0,
          olivos: 0,
          estrellas: 0,
        };
        for (const p of Object.values(game.participants)) {
          if (p.teamId && counts[p.teamId] !== undefined) {
            counts[p.teamId] += 1;
          }
        }
        teamId = validIds.sort((a, b) => counts[a] - counts[b])[0];
      }
    }

    const id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const token = randomToken();

    const participant: StoredParticipant = {
      id,
      token,
      name,
      avatarId,
      teamId,
      score: 0,
      correctCount: 0,
      answeredCount: 0,
      streak: 0,
      mistakes: 0,
      eliminated: false,
      online: true,
      totalResponseMs: 0,
      joinedAt: Date.now(),
    };

    game.participants[id] = participant;
    scheduleSave();
    broadcastRoom(game.code);

    res.status(201).json({
      participantId: id,
      participantToken: token,
      code: game.code,
      gameId: game.id,
    });
  });

  app.get('/api/games/:code/export', (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    const game = db.games[code];
    if (!game) {
      res.status(404).json({ error: 'Partida no encontrada.' });
      return;
    }

    const format = String(req.query.format || 'csv').toLowerCase();
    const lb = buildLeaderboard(game);

    if (format === 'json') {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="resultados-${code}.json"`
      );
      res.json({
        code: game.code,
        title: game.config.title,
        mode: game.config.mode,
        finishedAt: game.finishedAt,
        leaderboard: lb,
        teamLeaderboard: buildTeamLeaderboard(game),
      });
      return;
    }

    const lines = [
      'Puesto,Participante,Equipo,Puntaje,Correctas,Respondidas,Precision %,Tiempo Promedio (ms)',
      ...lb.map((e) =>
        [
          e.rank,
          `"${e.name.replace(/"/g, '""')}"`,
          e.teamId || 'Individual',
          e.score,
          e.correctCount,
          e.answeredCount,
          `${e.accuracyPercent}%`,
          e.avgResponseMs,
        ].join(',')
      ),
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="resultados-${code}.csv"`
    );
    res.send('\uFEFF' + lines.join('\n'));
  });

  // ---------------- VITE / STATIC SERVING ----------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Dime Tú Qué Dices ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer();
