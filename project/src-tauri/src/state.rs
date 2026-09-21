use std::collections::{BTreeMap, HashMap};
use std::sync::{Arc, Mutex};

use rusqlite::Connection;

use crate::db;

/// Estado partilhado entre os comandos IPC e o agendador em background.
#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
    /// Alertas prioritários ativos (task_id → alerta), por ordem de disparo.
    pub pending_alerts: Arc<Mutex<BTreeMap<i64, db::PendingAlert>>>,
    /// Lembretes pendentes (label da janela → conteúdo).
    pub reminders: Arc<Mutex<HashMap<String, db::PendingReminder>>>,
    /// Etiquetas das janelas de lembrete abertas (para empilhar no canto).
    pub open_reminders: Arc<Mutex<Vec<String>>>,
}

impl AppState {
    pub fn new(conn: Connection) -> Self {
        Self {
            db: Arc::new(Mutex::new(conn)),
            pending_alerts: Arc::new(Mutex::new(BTreeMap::new())),
            reminders: Arc::new(Mutex::new(HashMap::new())),
            open_reminders: Arc::new(Mutex::new(Vec::new())),
        }
    }
}