mod commands;
mod db;
mod scheduler;
mod state;
mod tray;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::show_main(app);
        }))
        .setup(|app| {
            // Persistência local (SQLite) em %APPDATA%\com.tempoa.desktop
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("tempoa.db");
            let conn =
                db::open(&db_path.to_string_lossy()).map_err(|e| format!("abrir db: {e}"))?;
            let state = state::AppState::new(conn);

            // Bandeja do Windows
            tray::setup(app)?;

            // Fechar a janela esconde na bandeja (nunca sai)
            if let Some(main) = app.get_webview_window("main") {
                let main_for_event = main.clone();
                main.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = main_for_event.hide();
                    }
                });
            }

            // Agendador em background (continua com a janela fechada)
            let state_for_scheduler = state.clone();
            let handle = app.handle().clone();
            std::thread::spawn(move || scheduler::run(handle, state_for_scheduler));

            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_tasks_for_date,
            commands::get_days_in_month,
            commands::create_task,
            commands::update_task,
            commands::delete_task,
            commands::complete_task,
            commands::reopen_task,
            commands::get_autostart,
            commands::set_autostart,
            commands::get_pending_activity_alerts,
            commands::dismiss_activity_alert,
            commands::complete_activity_alert,
            commands::get_pending_reminder,
            commands::close_reminder_window
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Tempoa");
}