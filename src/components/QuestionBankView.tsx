import { useCallback, useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Plus, Search, Trash2, X } from 'lucide-react';
import {
  BibleQuestion,
  CATEGORY_GROUPS,
  DIFFICULTY_LABELS,
  Difficulty,
  QuestionGroup,
} from '../shared/types';

export function QuestionBankView() {
  const [questions, setQuestions] = useState<BibleQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('');
  const [search, setSearch] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newGroup, setNewGroup] = useState<QuestionGroup>('Antiguo Testamento');
  const [newCategory, setNewCategory] = useState<string>(
    CATEGORY_GROUPS['Antiguo Testamento'][0]
  );
  const [newDifficulty, setNewDifficulty] = useState<Difficulty>('intermedio');
  const [newPrompt, setNewPrompt] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [newCorrectIndex, setNewCorrectIndex] = useState(0);
  const [newReference, setNewReference] = useState('');
  const [newExplanation, setNewExplanation] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (group) params.set('group', group);
      if (category) params.set('category', category);
      if (difficulty) params.set('difficulty', difficulty);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/questions?${params.toString()}`);
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [group, category, difficulty, search]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const availableCategories = group
    ? CATEGORY_GROUPS[group as QuestionGroup] || []
    : [
        ...CATEGORY_GROUPS['Antiguo Testamento'],
        ...CATEGORY_GROUPS['Nuevo Testamento'],
        ...CATEGORY_GROUPS['Categorías Especiales'],
      ];

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const cleanedOptions = newOptions.map((o) => o.trim()).filter(Boolean);
    if (cleanedOptions.length < 2) {
      setFormError('Ingresa al menos 2 opciones de respuesta.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group: newGroup,
          category: newCategory,
          difficulty: newDifficulty,
          prompt: newPrompt.trim(),
          options: cleanedOptions,
          correctIndex: newCorrectIndex,
          reference: newReference.trim(),
          explanation: newExplanation.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Error guardando pregunta.');
        setSaving(false);
        return;
      }
      setNewPrompt('');
      setNewOptions(['', '', '', '']);
      setNewCorrectIndex(0);
      setNewReference('');
      setNewExplanation('');
      setShowAddForm(false);
      await loadQuestions();
    } catch {
      setFormError('No se pudo conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/questions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadQuestions();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white">
            Banco de Preguntas Bíblicas
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Biblioteca verificada por libros, categorías y niveles con su cita
            bíblica correspondiente.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
        >
          {showAddForm ? (
            <>
              <X className="w-4 h-4" />
              Cerrar formulario
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Agregar pregunta bíblica
            </>
          )}
        </button>
      </div>

      {/* Add Custom Question Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddQuestion}
          className="bg-[#111A2E] border border-amber-400/40 rounded-2xl p-6 space-y-4"
        >
          <h2 className="font-display text-lg font-bold text-white">
            Nueva pregunta personalizada
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Sección
              </label>
              <select
                value={newGroup}
                onChange={(e) => {
                  const g = e.target.value as QuestionGroup;
                  setNewGroup(g);
                  setNewCategory(CATEGORY_GROUPS[g][0]);
                }}
                className="w-full bg-[#080E1E] border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white"
              >
                {(Object.keys(CATEGORY_GROUPS) as QuestionGroup[]).map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Categoría
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-[#080E1E] border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white"
              >
                {CATEGORY_GROUPS[newGroup].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Dificultad
              </label>
              <select
                value={newDifficulty}
                onChange={(e) => setNewDifficulty(e.target.value as Difficulty)}
                className="w-full bg-[#080E1E] border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white"
              >
                <option value="facil">Fácil</option>
                <option value="intermedio">Intermedio</option>
                <option value="dificil">Difícil</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Enunciado bíblico
            </label>
            <input
              type="text"
              required
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="Escribe la pregunta bíblica..."
              className="w-full bg-[#080E1E] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {newOptions.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correctOpt"
                  checked={newCorrectIndex === idx}
                  onChange={() => setNewCorrectIndex(idx)}
                  aria-label={`Marcar opción ${idx + 1} como correcta`}
                  className="accent-emerald-400 w-4 h-4 cursor-pointer"
                />
                <input
                  type="text"
                  required={idx < 2}
                  value={opt}
                  onChange={(e) => {
                    const copy = [...newOptions];
                    copy[idx] = e.target.value;
                    setNewOptions(copy);
                  }}
                  placeholder={`Opción ${idx + 1} ${
                    newCorrectIndex === idx ? '(Correcta)' : ''
                  }`}
                  className="flex-1 bg-[#080E1E] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Cita / Referencia bíblica (obligatoria)
              </label>
              <input
                type="text"
                required
                value={newReference}
                onChange={(e) => setNewReference(e.target.value)}
                placeholder="Ej: Salmos 23:1"
                className="w-full bg-[#080E1E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Nota explicativa (opcional)
              </label>
              <input
                type="text"
                value={newExplanation}
                onChange={(e) => setNewExplanation(e.target.value)}
                placeholder="Contexto breve del pasaje..."
                className="w-full bg-[#080E1E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white"
              />
            </div>
          </div>

          {formError && (
            <p className="text-sm text-rose-400">{formError}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar en el Banco'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pregunta o cita..."
            className="w-full bg-[#080E1E] border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
          />
        </div>

        <select
          value={group}
          onChange={(e) => {
            setGroup(e.target.value);
            setCategory('');
          }}
          className="bg-[#080E1E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white"
        >
          <option value="">Todas las secciones</option>
          {(Object.keys(CATEGORY_GROUPS) as QuestionGroup[]).map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-[#080E1E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white"
        >
          <option value="">Todas las categorías ({availableCategories.length})</option>
          {availableCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="bg-[#080E1E] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white"
        >
          <option value="">Todas las dificultades</option>
          <option value="facil">Fácil</option>
          <option value="intermedio">Intermedio</option>
          <option value="dificil">Difícil</option>
        </select>
      </div>

      {/* Results Count */}
      <div className="text-xs text-slate-400 font-mono-num">
        Mostrando {questions.length} preguntas bíblicas verificadas
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Cargando biblioteca bíblica...
        </div>
      ) : questions.length === 0 ? (
        <div className="py-12 text-center bg-[#111A2E] border border-slate-800 rounded-2xl text-slate-400 text-sm">
          No se encontraron preguntas con esos filtros.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {questions.map((q) => (
            <article
              key={q.id}
              className="bg-[#111A2E] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sky-300 font-medium">{q.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{DIFFICULTY_LABELS[q.difficulty]}</span>
                    {q.isCustom && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-300 font-semibold">
                          Personalizada
                        </span>
                      </>
                    )}
                  </div>
                  {q.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDelete(q.id)}
                      className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
                      title="Eliminar pregunta personalizada"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <h3 className="font-display font-bold text-base sm:text-lg text-white leading-snug">
                  {q.prompt}
                </h3>

                <ul className="space-y-1.5">
                  {q.options.map((opt, idx) => {
                    const isRight = idx === q.correctIndex;
                    return (
                      <li
                        key={idx}
                        className={`text-xs sm:text-sm px-3 py-2 rounded-lg flex items-center gap-2 ${
                          isRight
                            ? 'bg-emerald-500/15 text-emerald-300 font-semibold'
                            : 'bg-[#080E1E] text-slate-300'
                        }`}
                      >
                        {isRight && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                        <span>{opt}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
                <p className="text-amber-300 font-semibold inline-flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  {q.reference}
                </p>
                {q.explanation && <p>{q.explanation}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
