import { useEffect, useState } from "react";
import { api } from "./api";
import type { PendingReminder } from "./types";
import { IconBell, IconClock } from "./icons";
import { playReminderBlip } from "./sound";

/**
 * Janela de lembrete (canto inferior direito, empilhável, sem abrir a app).
 */
export default function ReminderView({ label }: { label: string }) {
  const [rem, setRem] = useState<PendingReminder | null>(null);

  useEffect(() => {
    let tries = 0;
    const timer = setInterval(async () => {
      try {
        const data = await api.getPendingReminder(label);
        if (data) {
          clearInterval(timer);
          setRem(data);
          playReminderBlip();
        } else if (++tries >= 5) {
          clearInterval(timer);
          void api.closeReminderWindow(label);
        }
      } catch {
        clearInterval(timer);
        void api.closeReminderWindow(label);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [label]);

  if (!rem) return <div className="h-screen w-screen bg-transparent" />;

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-transparent p-3">
      <div className="animate-reminder-in w-full rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xl shadow-zinc-900/10">
        <div className="flex items-center gap-2 text-indigo-600">
          <IconBell className="h-4 w-4" />
          <span className="text-[11px] font-bold uppercase tracking-wider">Lembrete</span>
          <span className="flex items-center gap-1 font-mono text-xs text-zinc-500">
            <IconClock className="h-3 w-3" />
            {rem.time}
          </span>
        </div>
        <p className="mt-2 truncate text-[15px] font-semibold text-zinc-800">{rem.title}</p>
        {rem.note && <p className="mt-0.5 truncate text-sm text-zinc-500">{rem.note}</p>}
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => void api.closeReminderWindow(label)}
            className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-200"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}