import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { api } from "./api";
import type { Task, TaskInput } from "./types";
import { Modal } from "./Modal";

const REPEAT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Não repetir alerta" },
  { value: "5", label: "A cada 5 minutos" },
  { value: "10", label: "A cada 10 minutos" },
  { value: "15", label: "A cada 15 minutos" },
  { value: "30", label: "A cada 30 minutos" },
  { value: "60", label: "A cada 1 hora" },
];

const REMINDER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Sem lembrete" },
  { value: "-30", label: "30 min antes" },
  { value: "-15", label: "15 min antes" },
  { value: "-10", label: "10 min antes" },
  { value: "-5", label: "5 min antes" },
  { value: "5", label: "5 min depois" },
  { value: "10", label: "10 min depois" },
  { value: "15", label: "15 min depois" },
  { value: "30", label: "30 min depois" },
];

function defaultTime(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(0);
  d.setHours(d.getHours() + 1);
  return `${String(d.getHours()).padStart(2, "0")}:00`;
}

export default function TaskModal({
  initialDate,
  editing,
  onClose,
  onSaved,
}: {
  initialDate: string;
  editing: Task | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [date, setDate] = useState(editing?.date ?? initialDate);
  const [time, setTime] = useState(editing?.time ?? defaultTime());
  const [note, setNote] = useState(editing?.note ?? "");
  const [repeat, setRepeat] = useState(
    editing?.repeatIntervalMinutes != null ? String(editing.repeatIntervalMinutes) : ""
  );
  const [reminder, setReminder] = useState(
    editing?.reminderOffsetMinutes != null ? String(editing.reminderOffsetMinutes) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) {
      setError("Indica um título para a tarefa.");
      titleRef.current?.focus();
      return;
    }
    if (!date || !time) {
      setError("Indica a data e a hora.");
      return;
    }
    const input: TaskInput = {
      title: title.trim(),
      date,
      time,
      note: note.trim(),
      repeatIntervalMinutes: repeat ? Number(repeat) : null,
      reminderOffsetMinutes: reminder !== "" ? Number(reminder) : null,
    };
    setSaving(true);
    setError(null);
    try {
      if (editing) await api.updateTask(editing.id, input);
      else await api.createTask(input);
      onSaved();
    } catch (err) {
      setError(typeof err === "string" ? err : "Não foi possível guardar a tarefa.");
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">
        {editing ? "Editar tarefa" : "Nova tarefa"}
      </h2>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Título</span>
          <input
            ref={titleRef}
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="O que vais fazer?"
            className="input"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Data</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Hora</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="input"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Observação <span className="font-normal normal-case text-zinc-400">(opcional)</span>
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Local, detalhes, etc."
            className="input resize-none"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Alerta repetido
            </span>
            <select value={repeat} onChange={(e) => setRepeat(e.target.value)} className="input">
              {REPEAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Lembrete
            </span>
            <select value={reminder} onChange={(e) => setReminder(e.target.value)} className="input">
              {REMINDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-xs leading-relaxed text-zinc-400">
          O alerta abre em ecrã completo à hora marcada. Se repetires, volta a tocar a cada intervalo
          até dispensares ou concluíres. O lembrete aparece no canto do ecrã e não interrompe o que
          estás a fazer.
        </p>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving ? "A guardar…" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}