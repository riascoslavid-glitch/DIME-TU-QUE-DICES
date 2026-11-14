import { useState } from 'react';
import { ArrowLeft, Check, Play, Sliders, Sparkles } from 'lucide-react';
import {
  ALL_CATEGORIES,
  CATEGORY_GROUPS,
  DifficultySetting,
  GAME_MODE_INFO,
  GameMode,
  QuestionGroup,
} from '../shared/types';

interface CreateGameViewProps {
  onCreated: (code: string, presenterToken: string) => void;
  onCancel: () => void;
}

const MODES: GameMode[] = [
  'clasico',
  'velocidad',
  'equipos',
  'eliminacion',
  'supervivencia',
  'torneo',
];

export function CreateGameView({ onCreated, onCancel }: CreateGameViewProps) {
  const [title, setTitle] = useState('Gran Concurso Bíblico en Vivo');
  const [customCode, setCustomCode] = useState('');
  const [mode, setMode] = useState<GameMode>('clasico');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    ...ALL_CATEGORIES,
  ]);
  const [difficulty, setDifficulty] = useState<DifficultySetting>('combinado');
  const [questionCount, setQuestionCount] = useState(12);
  const [timeLimitSec, setTimeLimitSec] = useState(20);
  const [maxParticipants, setMaxParticipants] = useState(100);
  const [basePoints, setBasePoints] = useState(1000);
  const [speedBonusMax, setSpeedBonusMax] = useState(500);
  const [specialEveryN, setSpecialEveryN] = useState(5);
  const [eliminationLives, setEliminationLives] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleGroup = (group: QuestionGroup) => {
    const groupCats = CATEGORY_GROUPS[group];
    const allSelected = groupCats.every((c) => selectedCategories.includes(c));
    if (allSelected) {
      setSelectedCategories((prev) =>
        prev.filter((c) => !groupCats.includes(c))
      );
    } else {
      setSelectedCategories((prev) =>
        Array.from(new Set([...prev, ...groupCats]))
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (selectedCategories.length === 0) {
      setError('Selecciona al menos una categoría bíblica para la partida.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Concurso Bíblico en Vivo',
          code: customCode.trim(),
          mode,
          categories: selectedCategories,
          difficulty,
          questionCount,
          timeLimitSec,
          maxParticipants,
          basePoints,
          speedBonusMax: mode === 'velocidad' ? Math.max(speedBonusMax, 1000) : speedBonusMax,
          specialEveryN,
          eliminationLives,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo crear la partida.');
        setSubmitting(false);
        return;
      }
      onCreated(data.code, data.presenterToken);
    } catch {
      setError('Error de conexión con el servidor.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al inicio
      </button>

      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white text-balance">
          Configurar Nuevo Concurso Bíblico
        </h1>
        <p className="text-slate-400 mt-2 text-sm sm:text-base">
          Personaliza las categorías, el modo de juego y los tiempos. Al crear
          la sala recibirás el código único, enlace directo y código QR.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="bg-[#111A2E] border border-slate-800 rounded-2xl p-6 space-y-5">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            Datos del concurso
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="contest-title"
                className="block text-sm font-medium text-slate-300 mb-1.5"
              >
                Nombre del concurso
              </label>
              <input
                id="contest-title"
                type="text"
                required
                maxLength={80}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Noche Juvenil Bíblica 2026"
                className="w-full bg-[#080E1E] border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label
                htmlFor="contest-code"
                className="block text-sm font-medium text-slate-300 mb-1.5"
              >
                Código de partida (opcional)
              </label>
              <input
                id="contest-code"
                type="text"
                maxLength={14}
                value={customCode}
                onChange={(e) =>
                  setCustomCode(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                  )
                }
                placeholder="Ej: BIBLIA2026 (vacío = automático)"
                className="w-full bg-[#080E1E] border border-slate-700 rounded-xl px-4 py-3 text-amber-300 font-mono-num font-bold placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </section>

        {/* Game Modes */}
        <section className="bg-[#111A2E] border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-400" />
            Modalidad de juego
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MODES.map((m) => {
              const info = GAME_MODE_INFO[m];
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    active
                      ? 'bg-sky-500/15 border-sky-400 text-white'
                      : 'bg-[#0B1224] border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-base">
                      {info.name}
                    </span>
                    {active && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {info.rulesSummary}
                  </p>
                </button>
              );
            })}
          </div>

          {mode === 'eliminacion' && (
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <span className="text-sm text-slate-300">
                Fallos permitidos antes de eliminar:
              </span>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((lives) => (
                  <button
                    key={lives}
                    type="button"
                    onClick={() => setEliminationLives(lives)}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${
                      eliminationLives === lives
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {lives === 1 ? '1 fallo (eliminación directa)' : `${lives} fallos`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Parameters & Scoring */}
        <section className="bg-[#111A2E] border border-slate-800 rounded-2xl p-6 space-y-5">
          <h2 className="font-display text-lg font-bold text-white">
            Dificultad, tiempos y puntuación
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Nivel de dificultad
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultySetting)}
                className="w-full bg-[#080E1E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-sky-400"
              >
                <option value="combinado">Combinado (Todos los niveles)</option>
                <option value="facil">Fácil (Conocimientos generales)</option>
                <option value="intermedio">Intermedio (Historias y detalles)</option>
                <option value="dificil">Difícil (Profundidad y profecías)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Cantidad de preguntas
              </label>
              <input
                type="number"
                min={3}
                max={50}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full bg-[#080E1E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono-num text-sm focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Tiempo por pregunta (seg)
              </label>
              <select
                value={timeLimitSec}
                onChange={(e) => setTimeLimitSec(Number(e.target.value))}
                className="w-full bg-[#080E1E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono-num text-sm focus:outline-none focus:border-sky-400"
              >
                <option value={10}>10 segundos</option>
                <option value={15}>15 segundos</option>
                <option value={20}>20 segundos</option>
                <option value={30}>30 segundos</option>
                <option value={45}>45 segundos</option>
                <option value={60}>60 segundos</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Máximo de participantes
              </label>
              <input
                type="number"
                min={2}
                max={500}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
                className="w-full bg-[#080E1E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono-num text-sm focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Puntos base por acierto
              </label>
              <input
                type="number"
                min={100}
                max={5000}
                step={100}
                value={basePoints}
                onChange={(e) => setBasePoints(Number(e.target.value))}
                className="w-full bg-[#080E1E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono-num text-sm focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Bonificación máxima por rapidez
              </label>
              <input
                type="number"
                min={0}
                max={2000}
                step={100}
                value={speedBonusMax}
                onChange={(e) => setSpeedBonusMax(Number(e.target.value))}
                className="w-full bg-[#080E1E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono-num text-sm focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Preguntas especiales (doble puntaje)
              </label>
              <select
                value={specialEveryN}
                onChange={(e) => setSpecialEveryN(Number(e.target.value))}
                className="w-full bg-[#080E1E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-sky-400"
              >
                <option value={0}>Desactivadas</option>
                <option value={3}>Cada 3 preguntas (x2)</option>
                <option value={5}>Cada 5 preguntas (x2)</option>
                <option value={10}>Cada 10 preguntas (x2)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Biblical Categories */}
        <section className="bg-[#111A2E] border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Categorías bíblicas ({selectedCategories.length}/
                {ALL_CATEGORIES.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Elige libros del Antiguo y Nuevo Testamento o categorías
                especiales.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategories([...ALL_CATEGORIES])}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
              >
                Seleccionar todas
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategories([])}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer whitespace-nowrap"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {(Object.keys(CATEGORY_GROUPS) as QuestionGroup[]).map((group) => {
              const cats = CATEGORY_GROUPS[group];
              const allChecked = cats.every((c) =>
                selectedCategories.includes(c)
              );
              return (
                <div key={group} className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-amber-300">{group}</h3>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group)}
                      className="text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
                    >
                      {allChecked ? 'Desmarcar grupo' : 'Marcar grupo'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {cats.map((cat) => {
                      const active = selectedCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className={`px-3 py-2.5 rounded-xl border text-left text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                            active
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                              : 'bg-[#080E1E] border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className="truncate">{cat}</span>
                          {active && (
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/50 text-rose-200 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-7 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-base inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Play className="w-5 h-5 fill-current" />
            {submitting ? 'Creando partida...' : 'Crear Partida en Vivo'}
          </button>
        </div>
      </form>
    </div>
  );
}
