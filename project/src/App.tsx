import { getCurrentWindow } from "@tauri-apps/api/window";
import MainApp from "./MainApp";
import AlertView from "./AlertView";
import ReminderView from "./ReminderView";

/**
 * Cada janela do Tempoa carrega o mesmo bundle; a rota é escolhida pela
 * etiqueta (label) da janela atual:
 *  - "main"            → aplicação principal
 *  - "activity-alert"  → alerta prioritário em ecrã completo
 *  - "reminder-{id}"   → lembrete no canto do ecrã
 */
export default function App() {
  const label = getCurrentWindow().label;

  if (label === "activity-alert") return <AlertView />;
  if (label.startsWith("reminder-")) return <ReminderView label={label} />;
  return <MainApp />;
}