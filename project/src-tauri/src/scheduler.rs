use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::db;
use crate::state::AppState;

const TICK_MS: u64 = 1000;

const REM_W: f64 = 360.0;
const REM_H: f64 = 190.0;
const REM_MARGIN: f64 = 14.0;
const REM_GAP: f64 = 10.0;

/// Loop principal dos agendamentos. Corre em background mesmo com a janela
/// principal fechada.
pub fn run(app: AppHandle, state: AppState) {
    loop {
        if let Err(e) = tick(&app, &state) {
            eprintln!("[tempoa] agendador: {e}");
        }
        thread::sleep(Duration::from_millis(TICK_MS));
    }
}

fn tick(app: &AppHandle, state: &AppState) -> Result<(), String> {
    let now = chrono::Local::now().timestamp();

    // ---------- 1. Alertas prioritários (ecrã completo + som) ----------
    let due_alerts = {
        let conn = state.db.lock().map_err(lock_err)?;
        db::due_activity_alerts(&conn, now)?
    };

    for task in due_alerts {
        {
            let mut pending = state.pending_alerts.lock().map_err(lock_err)?;
            if pending.contains_key(&task.id) {
                continue;
            }
            pending.insert(task.id, db::PendingAlert::from_task(&task));
        }

        // repetição: próximo disparo em now + intervalo (se configurado)
        let next_at = task.repeat_interval_minutes.map(|m| now + m * 60);
        {
            let conn = state.db.lock().map_err(lock_err)?;
            db::mark_alert_fired(&conn, task.id, now, next_at)?;
        }

        ensure_alert_window(app)?;
        app.emit_to("activity-alert", "activity-alert-ping", ())
            .map_err(|e| e.to_string())?;
    }

    // ---------- 2. Lembretes (canto inferior direito) ----------
    let due_reminders = {
        let conn = state.db.lock().map_err(lock_err)?;
        db::due_reminders(&conn, now)?
    };

    for task in due_reminders {
        let label = format!("reminder-{}", task.id);
        {
            let reminders = state.reminders.lock().map_err(lock_err)?;
            if reminders.contains_key(&label) {
                continue;
            }
        }
        if app.get_webview_window(&label).is_some() {
            continue;
        }
        {
            let conn = state.db.lock().map_err(lock_err)?;
            db::mark_reminder_fired(&conn, task.id, now)?;
        }
        create_reminder_window(app, state, &label, &task)?;
    }

    Ok(())
}

fn lock_err<T>(_e: std::sync::PoisonError<T>) -> String {
    "estado de lock corrompido".to_string()
}

/// Garante que existe uma janela de alerta em ecrã completo sempre no topo.
fn ensure_alert_window(app: &AppHandle) -> Result<(), String> {
    if app.get_webview_window("activity-alert").is_none() {
        WebviewWindowBuilder::new(app, "activity-alert", WebviewUrl::App("index.html".into()))
            .title("Tempoa — Alerta")
            .decorations(false)
            .resizable(false)
            .fullscreen(true)
            .always_on_top(true)
            .build()
            .map_err(|e| e.to_string())?;
    }
    if let Some(w) = app.get_webview_window("activity-alert") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
    Ok(())
}

/// Janela de lembrete posicionada no canto inferior direito, empilhável.
fn create_reminder_window(
    app: &AppHandle,
    state: &AppState,
    label: &str,
    task: &db::Task,
) -> Result<(), String> {
    let payload = db::PendingReminder::from_task(task);
    state
        .reminders
        .lock()
        .map_err(|e| e.to_string())?
        .insert(label.to_string(), payload);

    let idx = {
        let mut open = state.open_reminders.lock().map_err(|e| e.to_string())?;
        let idx = open.len();
        open.push(label.to_string());
        idx
    };

    let (mw, mh, scale) = app
        .primary_monitor()
        .ok()
        .flatten()
        .map(|m| {
            let s = m.size();
            let scale = m.scale_factor().max(1.0);
            (s.width as f64, s.height as f64, scale)
        })
        .unwrap_or((1920.0, 1080.0, 1.0));

    // coordenadas lógicas para que `inner_size` e `position` coincidam (HiDPI)
    let lw = mw / scale;
    let lh = mh / scale;
    let x = lw - REM_W - REM_MARGIN;
    let y = lh - REM_MARGIN - REM_H - idx as f64 * (REM_H + REM_GAP);

    WebviewWindowBuilder::new(app, label, WebviewUrl::App("index.html".into()))
        .title("Tempoa — Lembrete")
        .decorations(false)
        .resizable(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .shadow(false)
        .transparent(true)
        .inner_size(REM_W, REM_H)
        .position(x, y)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}