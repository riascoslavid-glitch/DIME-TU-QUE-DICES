export type QuestionGroup =
  | 'Antiguo Testamento'
  | 'Nuevo Testamento'
  | 'Categorías Especiales';

export type Difficulty = 'facil' | 'intermedio' | 'dificil';

export type DifficultySetting = Difficulty | 'combinado';

export type GameMode =
  | 'clasico'
  | 'eliminacion'
  | 'velocidad'
  | 'equipos'
  | 'supervivencia'
  | 'torneo';

export type GameStatus =
  | 'waiting'
  | 'question_active'
  | 'question_locked'
  | 'answer_revealed'
  | 'paused'
  | 'finished';

export type TeamId = 'leones' | 'aguilas' | 'olivos' | 'estrellas';

export interface TeamDefinition {
  id: TeamId;
  name: string;
  color: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

export const TEAMS: TeamDefinition[] = [
  {
    id: 'leones',
    name: 'Leones de Judá',
    color: '#F59E0B',
    bgClass: 'bg-amber-500/15',
    borderClass: 'border-amber-400/50',
    textClass: 'text-amber-300',
  },
  {
    id: 'aguilas',
    name: 'Águilas de Sion',
    color: '#0EA5E9',
    bgClass: 'bg-sky-500/15',
    borderClass: 'border-sky-400/50',
    textClass: 'text-sky-300',
  },
  {
    id: 'olivos',
    name: 'Olivos de Paz',
    color: '#10B981',
    bgClass: 'bg-emerald-500/15',
    borderClass: 'border-emerald-400/50',
    textClass: 'text-emerald-300',
  },
  {
    id: 'estrellas',
    name: 'Estrellas de Belén',
    color: '#EC4899',
    bgClass: 'bg-pink-500/15',
    borderClass: 'border-pink-400/50',
    textClass: 'text-pink-300',
  },
];

export interface AvatarDefinition {
  id: string;
  label: string;
  bg: string;
  fg: string;
  symbol: string;
}

export const AVATARS: AvatarDefinition[] = [
  { id: 'crown', label: 'Corona', bg: '#F59E0B', fg: '#0F172A', symbol: '♛' },
  { id: 'dove', label: 'Paloma', bg: '#0EA5E9', fg: '#0F172A', symbol: '✦' },
  { id: 'flame', label: 'Llama', bg: '#EF4444', fg: '#FFFFFF', symbol: '▲' },
  { id: 'olive', label: 'Olivo', bg: '#10B981', fg: '#0F172A', symbol: '❖' },
  { id: 'scroll', label: 'Pergamino', bg: '#D97706', fg: '#FFFFFF', symbol: '§' },
  { id: 'star', label: 'Estrella', bg: '#6366F1', fg: '#FFFFFF', symbol: '★' },
  { id: 'anchor', label: 'Ancla', bg: '#0284C7', fg: '#FFFFFF', symbol: '⚓' },
  { id: 'harp', label: 'Arpa', bg: '#EC4899', fg: '#FFFFFF', symbol: '♪' },
  { id: 'shield', label: 'Escudo', bg: '#14B8A6', fg: '#0F172A', symbol: '⛨' },
  { id: 'lamp', label: 'Lámpara', bg: '#EAB308', fg: '#0F172A', symbol: '◈' },
  { id: 'sun', label: 'Sol', bg: '#F97316', fg: '#FFFFFF', symbol: '☀' },
  { id: 'mountain', label: 'Monte', bg: '#3B82F6', fg: '#FFFFFF', symbol: '⛰' },
  { id: 'compass', label: 'Brújula', bg: '#8B5CF6', fg: '#FFFFFF', symbol: '✧' },
  { id: 'trumpet', label: 'Trompeta', bg: '#06B6D4', fg: '#0F172A', symbol: '♫' },
  { id: 'fish', label: 'Pez', bg: '#22C55E', fg: '#0F172A', symbol: '◈' },
  { id: 'chalice', label: 'Cáliz', bg: '#E11D48', fg: '#FFFFFF', symbol: '♦' },
];

export const CATEGORY_GROUPS: Record<QuestionGroup, string[]> = {
  'Antiguo Testamento': [
    'Génesis',
    'Éxodo',
    'Levítico',
    'Números',
    'Deuteronomio',
    'Historia de Israel',
    'Jueces y reyes',
    'Profetas mayores',
    'Profetas menores',
    'Personajes bíblicos',
  ],
  'Nuevo Testamento': [
    'Vida de Jesús',
    'Parábolas de Jesús',
    'Milagros de Jesús',
    'Los doce discípulos',
    'Hechos de los apóstoles',
    'Cartas de Pablo',
    'Cartas generales',
    'Apocalipsis',
  ],
  'Categorías Especiales': [
    '¿Quién dijo estas palabras?',
    '¿Quién soy según la Biblia?',
    '¿Dónde sucedió?',
    '¿Qué personaje hizo esto?',
    'Completa el versículo',
    'Encuentra el personaje',
    'Ordena los acontecimientos bíblicos',
    'Verdadero o falso',
    'Mujeres de la Biblia',
    'Hombres de la Biblia',
    'Lugares bíblicos',
    'Reyes y profetas',
    'Genealogías bíblicas',
    'Preguntas difíciles',
    'Historias poco conocidas',
    'Santuarios y profecías bíblicas',
  ],
};

export const ALL_CATEGORIES: string[] = [
  ...CATEGORY_GROUPS['Antiguo Testamento'],
  ...CATEGORY_GROUPS['Nuevo Testamento'],
  ...CATEGORY_GROUPS['Categorías Especiales'],
];

export const GAME_MODE_INFO: Record<
  GameMode,
  { name: string; shortDesc: string; rulesSummary: string }
> = {
  clasico: {
    name: 'Modo Clásico',
    shortDesc: 'Todos responden simultáneamente',
    rulesSummary:
      'Todos los participantes responden las mismas preguntas al mismo tiempo. Acumula puntos por acierto y rapidez.',
  },
  eliminacion: {
    name: 'Modo Eliminación',
    shortDesc: 'Un fallo puede dejarte fuera',
    rulesSummary:
      'Quienes fallen más veces de las permitidas quedan eliminados de las siguientes rondas y pasan a modo espectador.',
  },
  velocidad: {
    name: 'Modo Velocidad',
    shortDesc: 'Bonificación máxima por rapidez',
    rulesSummary:
      'La rapidez en responder correctamente otorga una bonificación extra mayor sin penalizar a los demás aciertos.',
  },
  equipos: {
    name: 'Modo Por Equipos',
    shortDesc: 'Compite sumando puntos grupales',
    rulesSummary:
      'Los participantes se unen a uno de los 4 equipos bíblicos y acumulan puntos tanto individuales como para su equipo.',
  },
  supervivencia: {
    name: 'Supervivencia Bíblica',
    shortDesc: 'Dificultad progresiva',
    rulesSummary:
      'Las preguntas escalan progresivamente de Fácil a Intermedio y culminan con desafíos Difíciles.',
  },
  torneo: {
    name: 'Modo Torneo',
    shortDesc: 'Rondas clasificatorias y Gran Final',
    rulesSummary:
      'Dividido en Clasificatoria, Semifinal y Gran Final con preguntas especiales de doble puntaje al cierre.',
  },
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  facil: 'Fácil',
  intermedio: 'Intermedio',
  dificil: 'Difícil',
};

export interface BibleQuestion {
  id: string;
  group: QuestionGroup;
  category: string;
  difficulty: Difficulty;
  prompt: string;
  options: string[];
  correctIndex: number;
  reference: string;
  explanation?: string;
  isCustom?: boolean;
}

export interface SanitizedQuestion {
  id: string;
  group: QuestionGroup;
  category: string;
  difficulty: Difficulty;
  prompt: string;
  options: string[];
  isSpecialMultiplier: number;
  roundStage?: string;
  // Only included after answer reveal or for presenter preview
  correctIndex?: number;
  reference?: string;
  explanation?: string;
}

export interface GameConfig {
  title: string;
  code: string;
  mode: GameMode;
  categories: string[];
  difficulty: DifficultySetting;
  questionCount: number;
  timeLimitSec: number;
  maxParticipants: number;
  basePoints: number;
  speedBonusMax: number;
  specialEveryN: number; // 0 = none, or every N questions worth 2x
  eliminationLives: number; // 1 or 2 mistakes allowed before elimination
}

export interface Participant {
  id: string;
  name: string;
  avatarId: string;
  teamId?: TeamId;
  score: number;
  correctCount: number;
  answeredCount: number;
  streak: number;
  mistakes: number;
  eliminated: boolean;
  online: boolean;
  totalResponseMs: number;
  joinedAt: number;
}

export interface QuestionAnswerSummary {
  participantId: string;
  participantName: string;
  avatarId: string;
  teamId?: TeamId;
  selectedIndex: number | null;
  selectedLabel: string;
  isCorrect: boolean;
  pointsEarned: number;
  responseTimeMs: number | null;
}

export interface QuestionResultStats {
  questionIndex: number;
  totalParticipants: number;
  totalAnswered: number;
  correctCount: number;
  incorrectCount: number;
  correctPercent: number;
  incorrectPercent: number;
  optionCounts: number[];
  optionPercents: number[];
  rows: QuestionAnswerSummary[];
}

export interface LeaderboardEntry {
  rank: number;
  participantId: string;
  name: string;
  avatarId: string;
  teamId?: TeamId;
  score: number;
  correctCount: number;
  answeredCount: number;
  accuracyPercent: number;
  avgResponseMs: number;
  eliminated: boolean;
  online: boolean;
}

export interface TeamScoreEntry {
  teamId: TeamId;
  name: string;
  color: string;
  score: number;
  memberCount: number;
  correctCount: number;
}

export interface GameRoomClientState {
  gameId: string;
  code: string;
  invitePath: string;
  config: GameConfig;
  status: GameStatus;
  previousStatusBeforePause?: GameStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: SanitizedQuestion | null;
  questionStartedAt: number | null;
  questionEndsAt: number | null;
  remainingSec: number;
  serverNow: number;
  participants: Participant[];
  answeredParticipantIds: string[];
  questionStats: QuestionResultStats | null;
  leaderboard: LeaderboardEntry[];
  teamLeaderboard: TeamScoreEntry[];
  myParticipant?: Participant | null;
  myCurrentAnswer?: {
    selectedIndex: number;
    isCorrect?: boolean;
    pointsEarned?: number;
  } | null;
  createdAt: number;
  finishedAt?: number | null;
}

export interface InviteValidationInfo {
  gameId: string;
  code: string;
  title: string;
  mode: GameMode;
  status: GameStatus;
  participantCount: number;
  maxParticipants: number;
  questionCount: number;
  signature: string;
}

export interface PublicGameListing {
  code: string;
  title: string;
  mode: GameMode;
  status: GameStatus;
  participantCount: number;
  maxParticipants: number;
  questionCount: number;
  currentQuestionIndex: number;
  createdAt: number;
}

export interface GameHistorySummary {
  id: string;
  code: string;
  title: string;
  mode: GameMode;
  questionCount: number;
  participantCount: number;
  winnerName: string;
  winnerAvatarId: string;
  winnerScore: number;
  topThree: Array<{
    rank: number;
    name: string;
    avatarId: string;
    score: number;
    correctCount: number;
    accuracyPercent: number;
  }>;
  finishedAt: number;
}
