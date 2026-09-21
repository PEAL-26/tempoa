import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { api } from "./api";
import type { PendingAlert } from "./types";
import { IconBell, IconClock, IconRepeat } from "./icons";
import { playAlertChime } from "./sound";

/**
 * Janela de alerta prioritário (ecrã completo, sempre no topo).
 * Mostra todos os alertas de atividade ativos e toca o som.
 */
export default function AlertView() {
  const [alerts, setAlerts] = useState<PendingAlert[] | null>(null);

  const pull = useCallback(async () => {
    try {
      const list = await api.getPendingActivityAlerts();
      setAlerts(list);
      if (list.length > 0) playAlertChime();
    } catch {
      /* o Rust fecha a janela se não houver alertas */
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void pull(), 250);
    const un = listen("activity-alert-ping", () => void pull());
    return () => {
      clearTimeout(t);
      void un.then((f) => f());
    };
  }, [pull]);

  const dismiss = useCallback(
    async (id: number) => {
      await api.dismissActivityAlert(id);
      void pull();
    },
    [pull]
  );

  const complete = useCallback(
    async (id: number) => {
      await api.completeActivityAlert(id);
      void pull();
    },
    [pull]
  );

  if (alerts === null) {
    return <div className="h-screen w-screen bg-zinc-950" />;
  }

  if (alerts.length === 0) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-sm text-zinc-500">
        Sem alertas ativos
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-6 overflow-y-auto bg-gradient-to-br from-zinc-950 via-indigo-950 to-zinc-950 px-8 py-10">
      {alerts.map((a, i) => (
        <AlertCard
          key={a.taskId}
          alert={a}
          index={i}
          onDismiss={() => void dismiss(a.taskId)}
          onComplete={() => void complete(a.taskId)}
        />
      ))}
    </div>
  );
}

function AlertCard({
  alert,
  index,
  onDismiss,
  onComplete,
}: {
  alert: PendingAlert;
  index: number;
  onDismiss: () => void;
  onComplete: () => void;
}) {
  return (
    <div
      className="animate-alert-pop relative flex w-full max-w-xl flex-col items-center gap-4 rounded-3xl border border-white/15 bg-white/10 px-10 py-10 text-center shadow-2xl backdrop-blur-md"
      style={{ animationDelay: `${index * 0.12}s` }}
    >
      <span className="animate-soft-pulse absolute left-1/2 top-10 h-32 w-32 -translate-x-1/2 rounded-full bg-indigo-500/25 blur-2xl" />
      <IconBell className="relative h-14 w-14 text-indigo-300" />

      <div className="relative flex items-center gap-2 font-mono text-3xl font-bold text-amber-300">
        <IconClock className="h-7 w-7" />
        {alert.time}
      </div>

      <h1 className="relative max-w-full text-4xl font-extrabold leading-tight text-white drop-shadow">
        {alert.title}
      </h1>

      {alert.note && (
        <p className="relative max-w-md text-base text-white/70">{alert.note}</p>
      )}

      {alert.repeatIntervalMinutes != null && (
        <p className="relative inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-200">
          <IconRepeat className="h-4 w-4" />
          Repete a cada {alert.repeatIntervalMinutes} min até dispensares
        </p>
      )}

      <div className="relative mt-3 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onDismiss}
          className="rounded-xl border border-white/25 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10 active:scale-95"
        >
          Dispensar
        </button>
        <button
          onClick={onComplete}
          className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 active:scale-95"
        >
          Concluir
        </button>
      </div>
    </div>
  );
}