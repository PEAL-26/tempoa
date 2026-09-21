import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { MONTHS, parseKey, todayKey, toKey } from "./date";
import { IconChevronLeft, IconChevronRight, IconPlus } from "./icons";
import { Modal } from "./Modal";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function CalendarModal({
  selected,
  onSelect,
  onAdd,
  onClose,
}: {
  selected: string;
  onSelect: (date: string) => void;
  onAdd: (date: string) => void;
  onClose: () => void;
}) {
  const base = parseKey(selected);
  const [view, setView] = useState({ year: base.getFullYear(), month: base.getMonth() });
  const [days, setDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void api.getDaysInMonth(view.year, view.month + 1).then((list) => {
      if (!cancelled) setDays(new Set(list));
    });
    return () => {
      cancelled = true;
    };
  }, [view]);

  const firstDay = new Date(view.year, view.month, 1).getDay();
  const totalDays = new Date(view.year, view.month + 1, 0).getDate();

  const cells = useMemo(() => {
    const list: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) list.push(null);
    for (let d = 1; d <= totalDays; d++) list.push(d);
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [firstDay, totalDays]);

  const move = (delta: number) =>
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const keyOf = (day: number) => toKey(new Date(view.year, view.month, day));

  const goToday = () => {
    const t = todayKey();
    const d = parseKey(t);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">
          {MONTHS[view.month]} {view.year}
        </h2>
        <div className="flex items-center gap-1">
          <button className="icon-btn" onClick={() => move(-1)} title="Mês anterior">
            <IconChevronLeft className="h-5 w-5" />
          </button>
          <button className="icon-btn" onClick={() => move(1)} title="Mês seguinte">
            <IconChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-zinc-400">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const key = keyOf(day);
          const isSelected = key === selected;
          const isToday = key === todayKey();
          const hasTasks = days.has(key);
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              title={key}
              className={`relative flex aspect-square items-center justify-center rounded-xl text-sm font-medium transition ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                  : isToday
                    ? "text-zinc-900 ring-1 ring-indigo-300 hover:bg-indigo-50"
                    : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {day}
              {hasTasks && (
                <span
                  className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                    isSelected ? "bg-white" : "bg-indigo-500"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4">
        <button
          onClick={goToday}
          className="rounded-xl px-3 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100"
        >
          Hoje
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Selecionado: {selected}</span>
          <button
            onClick={() => onAdd(selected)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <IconPlus className="h-4 w-4" />
            Adicionar tarefa
          </button>
        </div>
      </div>
    </Modal>
  );
}