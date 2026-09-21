use std::sync::{MutexGuard, PoisonError};

use tauri::{AppHandle, Manager, State};

use crate::db;
use crate::db::{DbResult, Task, TaskInput};
use crate::state::AppState;

pub type CmdResult<T> = Result<T, String>;

fn lock_db(state: &AppState) -> Result<MutexGuard<'_, rusqlite::Connection>, String> {
    state.db.lock().map_err(to_string)
}

fn to_string<T>(_e: PoisonError<T>) -> String {
    "estado de lock corrompido".to_string()
}

/// Limpa janelas e estado transitório de uma tarefa (ao editar, concluir ou eliminar).
fn cleanup_for_task(state: &AppState, app: &AppHandle, task_id: i64) {
    state
        .pending_alerts
        .lock()
        .map_err(to_string)
        .map(|mut p| p.remove(&task_id))
        .ok();

    let alerts_empty = state
        .pending_alerts
        .lock()
        .map(|p| p.is_empty())
        .unwrap_or(true);
    if alerts_empty {
        if let Some(w) = app.get_webview_window("activity-alert") {
            let _ = w.destroy();
        }
    }

    let label = format!("reminder-{task_id}");
    state
        .reminders
        .lock()
        .map_err(to_string)
        .map(|mut r| r.remove(&label))
        .ok();
    state
        .open_reminders
        .lock()
        .map_err(to_string)
        .map(|mut o| o.retain(|l| l != &label))
        .ok();
    if let Some(w) = app.get_webview_window(&label) {
        let _ = w.destroy();
    }
}

// ---------------------------------------------------------------- tarefas

#[tauri::command]
pub fn get_tasks_for_date(state: State<'_, AppState>, date: String) -> CmdResult<Vec<Task>> {
    let conn = lock_db(&state)?;
    db::query_tasks(&conn, &date)
}

#[tauri::command]
pub fn get_days_in_month(
    state: State<'_, AppState>,
    year: i32,
    month: i32,
) -> CmdResult<Vec<String>> {
    let conn = lock_db(&state)?;
    db::days_with_tasks(&conn, year, month)
}

#[tauri::command]
pub fn create_task(state: State<'_, AppState>, input: TaskInput) -> CmdResult<Task> {
    let conn = lock_db(&state)?;
    db::create_task(&conn, &input)
}

#[tauri::command]
pub fn update_task(
    state: State<'_, AppState>,
    app: AppHandle,
    id: i64,
    input: TaskInput,
) -> CmdResult<Task> {
    let result = {
        let conn = lock_db(&state)?;
        db::update_task(&conn, id, &input)
    };
    if result.is_ok() {
        cleanup_for_task(&state, &app, id);
    }
    result
}

#[tauri::command]
pub fn complete_task(state: State<'_, AppState>, app: AppHandle, id: i64) -> CmdResult<()> {
    {
        let conn = lock_db(&state)?;
        db::complete_task(&conn, id)?;
    }
    cleanup_for_task(&state, &app, id);
    Ok(())
}

#[tauri::command]
pub fn reopen_task(state: State<'_, AppState>, id: i64) -> CmdResult<()> {
    let conn = lock_db(&state)?;
    db::reopen_task(&conn, id)
}

#[tauri::command]
pub fn delete_task(state: State<'_, AppState>, app: AppHandle, id: i64) -> CmdResult<()> {
    {
        let conn = lock_db(&state)?;
        db::delete_task(&conn, id)?;
    }
    cleanup_for_task(&state, &app, id);
    Ok(())
}

// ---------------------------------------------------------------- autostart

#[tauri::command]
pub fn get_autostart(app: AppHandle) -> CmdResult<bool> {
    use tauri_plugin_autostart::ManagerExt;
    Ok(app.autolaunch().is_enabled().unwrap_or(false))
}

#[tauri::command]
pub fn set_autostart(app: AppHandle, enabled: bool) -> CmdResult<bool> {
    use tauri_plugin_autostart::ManagerExt;
    if enabled {
        app.autolaunch().enable().map_err(|e| e.to_string())?;
    } else {
        app.autolaunch().disable().map_err(|e| e.to_string())?;
    }
    Ok(enabled)
}

// ---------------------------------------------------------------- alertas

#[tauri::command]
pub fn get_pending_activity_alerts(state: State<'_, AppState>) -> CmdResult<Vec<db::PendingAlert>> {
    let pending = state.pending_alerts.lock().map_err(to_string)?;
    Ok(pending.values().cloned().collect())
}

#[tauri::command]
pub fn dismiss_activity_alert(
    state: State<'_, AppState>,
    app: AppHandle,
    task_id: i64,
) -> CmdResult<()> {
    let now = chrono::Local::now().timestamp();
    {
        let conn = lock_db(&state)?;
        db::dismiss_alert(&conn, task_id, now)?;
    }
    close_alert_if_empty(&state, &app, task_id);
    Ok(())
}

#[tauri::command]
pub fn complete_activity_alert(
    state: State<'_, AppState>,
    app: AppHandle,
    task_id: i64,
) -> CmdResult<()> {
    {
        let conn = lock_db(&state)?;
        db::complete_task(&conn, task_id)?;
    }
    close_alert_if_empty(&state, &app, task_id);
    Ok(())
}

fn close_alert_if_empty(state: &AppState, app: &AppHandle, task_id: i64) {
    state
        .pending_alerts
        .lock()
        .map_err(to_string)
        .map(|mut p| p.remove(&task_id))
        .ok();
    let empty = state
        .pending_alerts
        .lock()
        .map(|p| p.is_empty())
        .unwrap_or(true);
    if empty {
        if let Some(w) = app.get_webview_window("activity-alert") {
            let _ = w.destroy();
        }
    }
}

// ---------------------------------------------------------------- lembretes

#[tauri::command]
pub fn get_pending_reminder(
    state: State<'_, AppState>,
    label: String,
) -> CmdResult<Option<db::PendingReminder>> {
    let reminders = state.reminders.lock().map_err(to_string)?;
    Ok(reminders.get(&label).cloned())
}

#[tauri::command]
pub fn close_reminder_window(
    state: State<'_, AppState>,
    app: AppHandle,
    label: String,
) -> CmdResult<()> {
    state
        .reminders
        .lock()
        .map_err(to_string)?
        .remove(&label);
    state
        .open_reminders
        .lock()
        .map_err(to_string)?
        .retain(|l| l != &label);
    if let Some(w) = app.get_webview_window(&label) {
        let _ = w.destroy();
    }
    Ok(())
}

// usado por clareza em assinaturas que exigem DbResult explícito
#[allow(dead_code)]
fn _check_db(_: DbResult<()>) {}