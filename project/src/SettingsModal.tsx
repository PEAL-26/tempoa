import { useEffect, useState } from "react";
import { api } from "./api";
import { Modal } from "./Modal";

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [auto, setAuto] = useState<boolean | null>(null);

  useEffect(() => {
    void api.getAutostart().then(setAuto);
  }, []);

  const toggle = async () => {
    if (auto === null) return;
    setAuto(await api.setAutostart(!auto));
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold text-zinc-900">Definições</h2>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-zinc-200 p-4">
        <div>
          <p className="text-sm font-medium text-zinc-800">Iniciar com o Windows</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Abre o Tempoa em segundo plano quando inicia sessão no Windows.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={auto === true}
          onClick={toggle}
          disabled={auto === null}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
            auto ? "bg-indigo-600" : "bg-zinc-300"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              auto ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-zinc-400">
        Ao fechar a janela, o Tempoa continua a correr na bandeja do Windows e mantém os alertas e
        lembretes sempre ativos.
      </p>

      <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4">
        <span className="text-xs text-zinc-400">Tempoa v0.1.0</span>
        <button
          onClick={onClose}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
        >
          Fechar
        </button>
      </div>
    </Modal>
  );
}