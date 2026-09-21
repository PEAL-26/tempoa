use chrono::offset::LocalResult;
use chrono::{Local, NaiveDate, NaiveTime, TimeZone};
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

pub const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  repeat_interval_minutes INTEGER,
  reminder_offset_minutes INTEGER,
  scheduled_epoch INTEGER NOT NULL,
  next_alert_at INTEGER,
  last_alert_at INTEGER,
  alert_dismissed_at INTEGER,
  reminder_fired_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
CREATE INDEX IF NOT EXISTS idx_tasks_next_alert ON tasks(next_alert_at);
"#;

pub type DbResult<T> = Result<T, String>;

/// Abre (ou cria) a base de dados local.
pub fn open(path: &str) -> DbResult<Connection> {
    let conn = Connection::open(path).map_err(err)?;
    conn.execute_batch(SCHEMA).map_err(err)?;
    Ok(conn)
}

#[cfg(test)]
pub fn open_in_memory() -> DbResult<Connection> {
    let conn = Connection::open_in_memory().map_err(err)?;
    conn.execute_batch(SCHEMA).map_err(err)?;
    Ok(conn)
}

fn err(e: rusqlite::Error) -> String {
    format!("base de dados: {e}")
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub date: String,
    pub time: String,
    pub note: String,
    pub status: String,
    pub repeat_interval_minutes: Option<i64>,
    pub reminder_offset_minutes: Option<i64>,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TaskInput {
    pub title: String,
    pub date: String,
    pub time: String,
    pub note: String,
    pub repeat_interval_minutes: Option<i64>,
    pub reminder_offset_minutes: Option<i64>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PendingAlert {
    pub task_id: i64,
    pub title: String,
    pub time: String,
    pub note: String,
    pub repeat_interval_minutes: Option<i64>,
}

impl PendingAlert {
    pub fn from_task(t: &Task) -> Self {
        Self {
            task_id: t.id,
            title: t.title.clone(),
            time: t.time.clone(),
            note: t.note.clone(),
            repeat_interval_minutes: t.repeat_interval_minutes,
        }
    }
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PendingReminder {
    pub task_id: i64,
    pub title: String,
    pub time: String,
    pub note: String,
    pub reminder_offset_minutes: Option<i64>,
}

impl PendingReminder {
    pub fn from_task(t: &Task) -> Self {
        Self {
            task_id: t.id,
            title: t.title.clone(),
            time: t.time.clone(),
            note: t.note.clone(),
            reminder_offset_minutes: t.reminder_offset_minutes,
        }
    }
}

const SELECT_COLS: &str =
    "id, title, date, time, note, status, repeat_interval_minutes, reminder_offset_minutes";

fn row_to_task(row: &Row) -> rusqlite::Result<Task> {
    Ok(Task {
        id: row.get(0)?,
        title: row.get(1)?,
        date: row.get(2)?,
        time: row.get(3)?,
        note: row.get(4)?,
        status: row.get(5)?,
        repeat_interval_minutes: row.get(6)?,
        reminder_offset_minutes: row.get(7)?,
    })
}

/// Timestamp (epoch, hora local) a partir de data + hora.
pub fn compute_epoch(date: &str, time: &str) -> Option<i64> {
    let d = NaiveDate::parse_from_str(date, "%Y-%m-%d").ok()?;
    let t = NaiveTime::parse_from_str(time, "%H:%M").ok()?;
    let ndt = d.and_time(t);
    match Local.from_local_datetime(&ndt) {
        LocalResult::Single(dt) => Some(dt.timestamp()),
        _ => None,
    }
}

fn now_epoch() -> i64 {
    Local::now().timestamp()
}

// ---------------------------------------------------------------- consultas

pub fn query_tasks(conn: &Connection, date: &str) -> DbResult<Vec<Task>> {
    let sql = format!(
        "SELECT {SELECT_COLS} FROM tasks WHERE date = ?1 ORDER BY time ASC, id ASC"
    );
    let mut stmt = conn.prepare(&sql).map_err(err)?;
    let rows = stmt.query_map(params![date], row_to_task).map_err(err)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(err)
}

pub fn days_with_tasks(conn: &Connection, year: i32, month: i32) -> DbResult<Vec<String>> {
    let prefix = format!("{year:04}-{month:02}");
    let sql = "SELECT DISTINCT date FROM tasks WHERE substr(date, 1, 7) = ?1 ORDER BY date ASC";
    let mut stmt = conn.prepare(sql).map_err(err)?;
    let rows = stmt
        .query_map(params![prefix], |r| r.get::<_, String>(0))
        .map_err(err)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(err)
}

fn get_task(conn: &Connection, id: i64) -> DbResult<Option<Task>> {
    let sql = format!("SELECT {SELECT_COLS} FROM tasks WHERE id = ?1");
    let mut stmt = conn.prepare(&sql).map_err(err)?;
    let mut rows = stmt.query_map(params![id], row_to_task).map_err(err)?;
    rows.next().transpose().map_err(err)
}

// ---------------------------------------------------------------- escrita

pub fn create_task(conn: &Connection, input: &TaskInput) -> DbResult<Task> {
    let epoch = compute_epoch(&input.date, &input.time)
        .ok_or_else(|| "data ou hora inválida".to_string())?;
    conn.execute(
        "INSERT INTO tasks (title, date, time, note, status, repeat_interval_minutes, \
         reminder_offset_minutes, scheduled_epoch, next_alert_at, created_at) \
         VALUES (?1, ?2, ?3, ?4, 'pending', ?5, ?6, ?7, ?7, ?8)",
        params![
            input.title,
            input.date,
            input.time,
            input.note,
            input.repeat_interval_minutes,
            input.reminder_offset_minutes,
            epoch,
            now_epoch()
        ],
    )
    .map_err(err)?;
    let id = conn.last_insert_rowid();
    get_task(conn, id)?.ok_or_else(|| "tarefa não encontrada após criação".to_string())
}

pub fn update_task(conn: &Connection, id: i64, input: &TaskInput) -> DbResult<Task> {
    let epoch = compute_epoch(&input.date, &input.time)
        .ok_or_else(|| "data ou hora inválida".to_string())?;
    conn.execute(
        "UPDATE tasks SET title = ?1, date = ?2, time = ?3, note = ?4, \
         repeat_interval_minutes = ?5, reminder_offset_minutes = ?6, \
         scheduled_epoch = ?7, next_alert_at = ?7, last_alert_at = NULL, \
         alert_dismissed_at = NULL, reminder_fired_at = NULL WHERE id = ?8",
        params![
            input.title,
            input.date,
            input.time,
            input.note,
            input.repeat_interval_minutes,
            input.reminder_offset_minutes,
            epoch,
            id
        ],
    )
    .map_err(err)?;
    if conn.changes() == 0 {
        return Err("tarefa não encontrada".to_string());
    }
    get_task(conn, id)?.ok_or_else(|| "tarefa não encontrada após atualização".to_string())
}

pub fn complete_task(conn: &Connection, id: i64) -> DbResult<()> {
    conn.execute(
        "UPDATE tasks SET status = 'done', next_alert_at = NULL WHERE id = ?1",
        params![id],
    )
    .map_err(err)?;
    Ok(())
}

pub fn reopen_task(conn: &Connection, id: i64) -> DbResult<()> {
    conn.execute(
        "UPDATE tasks SET status = 'pending', alert_dismissed_at = NULL, \
         reminder_fired_at = NULL, next_alert_at = scheduled_epoch WHERE id = ?1",
        params![id],
    )
    .map_err(err)?;
    Ok(())
}

pub fn delete_task(conn: &Connection, id: i64) -> DbResult<()> {
    conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])
        .map_err(err)?;
    Ok(())
}

pub fn dismiss_alert(conn: &Connection, id: i64, at: i64) -> DbResult<()> {
    conn.execute(
        "UPDATE tasks SET alert_dismissed_at = ?1, next_alert_at = NULL WHERE id = ?2",
        params![at, id],
    )
    .map_err(err)?;
    Ok(())
}

// ---------------------------------------------------------------- agendador

/// Tarefas cujo alerta prioritário está a chegar (ou já passou) e ainda não
/// foi acionado/dispensado.
pub fn due_activity_alerts(conn: &Connection, now: i64) -> DbResult<Vec<Task>> {
    let sql = format!(
        "SELECT {SELECT_COLS} FROM tasks \
         WHERE status = 'pending' AND alert_dismissed_at IS NULL \
         AND next_alert_at IS NOT NULL AND next_alert_at <= ?1 \
         ORDER BY next_alert_at ASC, id ASC"
    );
    let mut stmt = conn.prepare(&sql).map_err(err)?;
    let rows = stmt.query_map(params![now], row_to_task).map_err(err)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(err)
}

/// Tarefas cujo lembrete (antes/depois da hora) já pode ser mostrado.
pub fn due_reminders(conn: &Connection, now: i64) -> DbResult<Vec<Task>> {
    let sql = format!(
        "SELECT {SELECT_COLS} FROM tasks \
         WHERE status = 'pending' AND reminder_fired_at IS NULL \
         AND reminder_offset_minutes IS NOT NULL \
         AND (scheduled_epoch + reminder_offset_minutes * 60) <= ?1 \
         ORDER BY scheduled_epoch ASC, id ASC"
    );
    let mut stmt = conn.prepare(&sql).map_err(err)?;
    let rows = stmt.query_map(params![now], row_to_task).map_err(err)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(err)
}

pub fn mark_alert_fired(conn: &Connection, id: i64, at: i64, next_at: Option<i64>) -> DbResult<()> {
    conn.execute(
        "UPDATE tasks SET last_alert_at = ?1, next_alert_at = ?2 WHERE id = ?3",
        params![at, next_at, id],
    )
    .map_err(err)?;
    Ok(())
}

pub fn mark_reminder_fired(conn: &Connection, id: i64, at: i64) -> DbResult<()> {
    conn.execute(
        "UPDATE tasks SET reminder_fired_at = ?1 WHERE id = ?2",
        params![at, id],
    )
    .map_err(err)?;
    Ok(())
}

// ---------------------------------------------------------------- testes

#[cfg(test)]
mod tests {
    use super::*;

    fn input(title: &str, date: &str, time: &str) -> TaskInput {
        TaskInput {
            title: title.to_string(),
            date: date.to_string(),
            time: time.to_string(),
            note: String::new(),
            repeat_interval_minutes: Some(5),
            reminder_offset_minutes: Some(-10),
        }
    }

    #[test]
    fn crud_e_datas() {
        let conn = open_in_memory().unwrap();

        let a = create_task(&conn, &input("Reunião", "2026-09-21", "10:00")).unwrap();
        let b = create_task(&conn, &input("Medicação", "2026-09-21", "14:30")).unwrap();
        let _c = create_task(&conn, &input("Outro dia", "2026-09-22", "09:00")).unwrap();

        let list = query_tasks(&conn, "2026-09-21").unwrap();
        assert_eq!(list.len(), 2);
        // ordenação cronológica
        assert_eq!(list[0].id, a.id);
        assert_eq!(list[1].id, b.id);

        let days = days_with_tasks(&conn, 2026, 9).unwrap();
        assert_eq!(days, vec!["2026-09-21".to_string(), "2026-09-22".to_string()]);

        // edição
        let mut edit = input("Reunião atualizada", "2026-09-21", "11:00");
        edit.note = "Sala B".into();
        let updated = update_task(&conn, a.id, &edit).unwrap();
        assert_eq!(updated.title, "Reunião atualizada");
        assert_eq!(updated.time, "11:00");
        assert_eq!(updated.note, "Sala B");

        // concluir
        complete_task(&conn, a.id).unwrap();
        let list = query_tasks(&conn, "2026-09-21").unwrap();
        assert!(list.iter().any(|t| t.id == a.id && t.status == "done"));
        assert!(list.iter().any(|t| t.id == b.id && t.status == "pending"));

        // reabrir
        reopen_task(&conn, a.id).unwrap();
        let list = query_tasks(&conn, "2026-09-21").unwrap();
        assert!(list.iter().any(|t| t.id == a.id && t.status == "pending"));

        // eliminar
        delete_task(&conn, b.id).unwrap();
        assert_eq!(query_tasks(&conn, "2026-09-21").unwrap().len(), 1);
    }

    #[test]
    fn agendamento_alertas_e_lembretes() {
        let conn = open_in_memory().unwrap();

        let now = now_epoch();
        let now_dt = Local::now();
        let futuro_dt = now_dt + chrono::Duration::hours(2);
        let futuro_date = futuro_dt.format("%Y-%m-%d").to_string();
        let futuro_time = futuro_dt.format("%H:%M").to_string();

        let _antigo = create_task(&conn, &input("Atividade vencida", "2000-01-01", "00:00")).unwrap();
        let t_futuro = create_task(
            &conn,
            &TaskInput {
                title: "Futura".into(),
                date: futuro_date.clone(),
                time: futuro_time.clone(),
                note: String::new(),
                repeat_interval_minutes: None,
                reminder_offset_minutes: None,
            },
        )
        .unwrap();
        let _ = t_futuro;

        // a tarefa antiga deve disparar alerta prioritário e lembrete
        let due_alert = due_activity_alerts(&conn, now).unwrap();
        assert_eq!(due_alert.len(), 1);
        assert_eq!(due_alert[0].title, "Atividade vencida");

        let due_rem = due_reminders(&conn, now).unwrap();
        assert_eq!(due_rem.len(), 1);
        assert_eq!(due_rem[0].title, "Atividade vencida");

        // marcar disparos
        mark_alert_fired(&conn, due_alert[0].id, now, Some(now + 300)).unwrap();
        mark_reminder_fired(&conn, due_rem[0].id, now).unwrap();

        // repetição: ainda deve aparecer daqui a 5 min
        let due_alert_again = due_activity_alerts(&conn, now + 500).unwrap();
        assert_eq!(due_alert_again.len(), 1);

        // dispensar elimina os próximos (a tarefa futura só fica devida às +7200s)
        dismiss_alert(&conn, due_alert[0].id, now).unwrap();
        let due_alert_none = due_activity_alerts(&conn, now + 10_000).unwrap();
        assert!(!due_alert_none.iter().any(|t| t.id == due_alert[0].id));

        // lembrete não repete
        let due_rem_none = due_reminders(&conn, now + 10_000).unwrap();
        assert!(due_rem_none.is_empty());

        // o passado (scheduled_epoch < now com data fixa 2000) não afeta o futuro
        assert!(compute_epoch(&futuro_date, &futuro_time).is_some());
    }
}