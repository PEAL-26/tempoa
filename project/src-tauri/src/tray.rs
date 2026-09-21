use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Emitter, Manager,
};

pub fn setup(app: &mut App) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Abrir Tempoa", true, None::<&str>)?;
    let new_task = MenuItem::with_id(app, "new_task", "Nova tarefa", true, None::<&str>)?;
    let today = MenuItem::with_id(app, "today", "Tarefas de hoje", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &open,
            &new_task,
            &PredefinedMenuItem::separator(app)?,
            &today,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;

    TrayIconBuilder::with_id("tempoa-tray")
        .icon(app.default_window_icon().expect("ícone da bandeja").clone())
        .tooltip("Tempoa — Agendamentos e alertas")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => show_main(app),
            "new_task" => {
                show_main(app);
                let _ = app.emit_to("main", "open-new-task", ());
            }
            "today" => {
                show_main(app);
                let today = chrono::Local::now().format("%Y-%m-%d").to_string();
                let _ = app.emit_to("main", "navigate-to-date", today);
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

pub fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}