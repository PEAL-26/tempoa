import { useCallback, useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { api } from "./api";
import type { Task } from "./types";
import { formatLong, keyOffset, monthNameOf, parseKey, todayKey, weekdayName } from "./date";
import {
  IconCalendar,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCircle,
  IconClock,
  IconGear,
  IconPencil,
  IconPlus,
  IconRepeat,
  IconTrash,
} from "./icons";
import TaskModal from "./TaskModal";
import CalendarModal from "./CalendarModal";
import SettingsModal from "./SettingsModal";
import { Modal } from "./Modal";

type ModalState =
  | { kind: "task"; editing: Task | null }
  | { kind: "confirm-delete"; task: Task }
  | null;

function fmtOffset(offset: number): string {
  const abs = Math.abs(offset);
  const unit = abs === 60 ? "1 h" : `${abs} min`;
  return offset < 0 ? `${unit} antes` : `${unit} depois`;
}

export default function MainApp() {
  const [selected, setSelected] = useState(todayKey());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);

  const loadTasks = useCallback(async () => {
    const list = await api.getTasksForDate(selected);
    setTasks(list);
    setLoading(false);
  }, [selected]);

  useEffect(() => {
    setLoading(true);
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const un1 = listen("open-new-task", () => setModal({ kind: "task", editing: null }));
    const un2 = listen<string>("navigate-to-date", (e) => setSelected(e.payload));
    return () => {
      void un1.then((f) => f());
      void un2.then((f) => f());
    };
  }, []);

  const sortedPending = useMemo(
    () =>
      tasks
        .filter((t) => t.status === "pending")
        .sort((a, b) => a.time.localeCompare(b.time) || a.id - b.id),
    [tasks]
  );

  const sortedDone = useMemo(
    () =>
      tasks
        .filter((t) => t.status === "done")
        .sort((a, b) => a.time.localeCompare(b.time) || a.id - b.id),
    [tasks]
  );

  const nextUp = useMemo(() => {
    const now = Date.now();
    const upcoming = sortedPending.find((t) => new Date(`${t.date}T${t.time}`).getTime() >= now);
    return upcoming ?? sortedPending[0] ?? null;
  }, [sortedPending]);

  const handleSaved = useCallback(() => {
    setModal(null);
    void loadTasks();
  }, [loadTasks]);

  const handleToggle = useCallback(
    async (task: Task) => {
      if (task.status === "pending") await api.completeTask(task.id);
      else await api.reopenTask(task.id);
      void loadTasks();
    },
    [loadTasks]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      await api.deleteTask(id);
      setModal(null);
      void loadTasks();
    },
    [loadTasks]
  );

  const isToday = selected === todayKey();
  const pendingCount = sortedPending.length;
  const p = parseKey(selected);

  return (
    <div className="flex h-full flex-col">
      {/* ---------- Cabeçalho ---------- */}
      <header className="border-b border-zinc-200/70 bg-white/70 backdrop-blur">
        <div className="px-6 pb-4 pt-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="truncate text-2xl font-bold tracking-tight text-zinc-900">
                  {formatLong(selected)}
                </h1>
                {!isToday && (
                  <button
                    onClick={() => setSelected(todayKey())}
                    className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
                  >
                    Hoje
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                {pendingCount === 0
                  ? "Sem tarefas pendentes"
                  : `${pendingCount} tarefa${pendingCount === 1 ? "" : "s"} pendente${pendingCount === 1 ? "" : "s"}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button className="icon-btn" title="Calendário" onClick={() => setCalendarOpen(true)}>
                <IconCalendar className="h-5 w-5" />
              </button>
              <button className="icon-btn" title="Definições" onClick={() => setSettingsOpen(true)}>
                <IconGear className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button className="day-nav" onClick={() => setSelected(keyOffset(selected, -1))} title="Dia anterior">
              <IconChevronLeft className="h-4 w-4" />
            </button>
            <button className="day-nav" onClick={() => setSelected(keyOffset(selected, 1))} title="Dia seguinte">
              <IconChevronRight className="h-4 w-4" />
            </button>
            <span className="ml-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
              {weekdayName(selected)} · {p.getDate()} de {monthNameOf(selected)}
            </span>
          </div>
        </div>
      </header>

      {/* ---------- Lista ---------- */}
      <main className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            A carregar…
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState onAdd={() => setModal({ kind: "task", editing: null })} />
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {nextUp && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-indigo-200/70 bg-indigo-50/80 px-4 py-3">
                <IconClock className="h-4 w-4 shrink-0 text-indigo-600" />
                <p className="min-w-0 truncate text-sm text-indigo-900">
                  <span className="font-semibold">Próximo:</span>{" "}
                  <span className="font-mono font-medium">{nextUp.time}</span> · {nextUp.title}
                </p>
              </div>
            )}

            {sortedPending.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onToggle={() => handleToggle(t)}
                onEdit={() => setModal({ kind: "task", editing: t })}
                onDelete={() => setModal({ kind: "confirm-delete", task: t })}
              />
            ))}

            {sortedDone.length > 0 && (
              <>
                <div className="mt-2 flex items-center gap-2 px-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Concluídas
                  </span>
                  <span className="h-px flex-1 bg-zinc-200" />
                  <span className="text-xs text-zinc-400">{sortedDone.length}</span>
                </div>
                {sortedDone.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggle={() => handleToggle(t)}
                    onEdit={() => setModal({ kind: "task", editing: t })}
                    onDelete={() => setModal({ kind: "confirm-delete", task: t })}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </main>

      {/* ---------- CTA ---------- */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-end p-6">
        <button
          onClick={() => setModal({ kind: "task", editing: null })}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 active:scale-95"
        >
          <IconPlus className="h-4 w-4" />
          Nova tarefa
        </button>
      </div>

      {/* ---------- Modais ---------- */}
      {modal?.kind === "task" && (
        <TaskModal
          initialDate={selected}
          editing={modal.editing}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {modal?.kind === "confirm-delete" && (
        <Modal onClose={() => setModal(null)}>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-red-50 p-2.5 text-red-500">
              <IconTrash className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-zinc-900">Eliminar tarefa</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Vais eliminar <span className="font-medium text-zinc-700">“{modal.task.title}”</span>. Esta
                ação não pode ser anulada.
              </p>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setModal(null)}
              className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleDelete(modal.task.id)}
              className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500"
            >
              Eliminar
            </button>
          </div>
        </Modal>
      )}
      {calendarOpen && (
        <CalendarModal
          selected={selected}
          onSelect={(d) => {
            setSelected(d);
            setCalendarOpen(false);
          }}
          onAdd={(d) => {
            setSelected(d);
            setCalendarOpen(false);
            setModal({ kind: "task", editing: null });
          }}
          onClose={() => setCalendarOpen(false)}
        />
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const done = task.status === "done";
  return (
    <div
      className={`group flex items-start gap-3 rounded-2xl border bg-white p-3.5 shadow-sm transition ${
        done
          ? "border-zinc-200/60 bg-zinc-50/70"
          : "border-zinc-200/80 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-100/50"
      }`}
    >
      <button
        onClick={onToggle}
        title={done ? "Reabrir tarefa" : "Concluir tarefa"}
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
          done
            ? "bg-emerald-500 text-white"
            : "text-zinc-300 hover:border-emerald-400 hover:text-emerald-500"
        }`}
      >
        {done ? <IconCheck className="h-3.5 w-3.5" /> : <IconCircle className="h-6 w-6" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={`font-mono text-sm font-semibold ${done ? "text-zinc-400" : "text-indigo-600"}`}
          >
            {task.time}
          </span>
          <h3
            className={`truncate text-[15px] font-medium ${
              done ? "text-zinc-400 line-through" : "text-zinc-800"
            }`}
          >
            {task.title}
          </h3>
          {task.repeatIntervalMinutes != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              <IconRepeat className="h-3 w-3" />
              {task.repeatIntervalMinutes} min
            </span>
          )}
          {task.reminderOffsetMinutes != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
              <IconClock className="h-3 w-3" />
              {fmtOffset(task.reminderOffsetMinutes)}
            </span>
          )}
        </div>
        {task.note && (
          <p className={`mt-1 truncate text-sm ${done ? "text-zinc-400" : "text-zinc-500"}`}>
            {task.note}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
        <button
          onClick={onEdit}
          title="Editar"
          className="icon-btn p-2 text-zinc-400 hover:bg-zinc-100 hover:text-indigo-600"
        >
          <IconPencil className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          title="Eliminar"
          className="icon-btn p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
        >
          <IconTrash className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100/70 text-indigo-500">
        <IconCalendar className="h-7 w-7" />
      </div>
      <div>
        <p className="font-medium text-zinc-700">Sem tarefas para este dia</p>
        <p className="mt-0.5 text-sm text-zinc-400">Nada agendado — está tudo tranquilo.</p>
      </div>
      <button
        onClick={onAdd}
        className="mt-1 flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
      >
        <IconPlus className="h-4 w-4" />
        Adicionar tarefa
      </button>
    </div>
  );
}