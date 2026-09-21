import { invoke } from "@tauri-apps/api/core";
import type { PendingAlert, PendingReminder, Task, TaskInput } from "./types";

export const api = {
  getTasksForDate: (date: string) => invoke<Task[]>("get_tasks_for_date", { date }),
  getDaysInMonth: (year: number, month: number) =>
    invoke<string[]>("get_days_in_month", { year, month }),

  createTask: (input: TaskInput) => invoke<Task>("create_task", { input }),
  updateTask: (id: number, input: TaskInput) => invoke<Task>("update_task", { id, input }),
  deleteTask: (id: number) => invoke<void>("delete_task", { id }),
  completeTask: (id: number) => invoke<void>("complete_task", { id }),
  reopenTask: (id: number) => invoke<void>("reopen_task", { id }),

  getAutostart: () => invoke<boolean>("get_autostart"),
  setAutostart: (enabled: boolean) => invoke<boolean>("set_autostart", { enabled }),

  getPendingActivityAlerts: () => invoke<PendingAlert[]>("get_pending_activity_alerts"),
  dismissActivityAlert: (taskId: number) => invoke<void>("dismiss_activity_alert", { taskId }),
  completeActivityAlert: (taskId: number) => invoke<void>("complete_activity_alert", { taskId }),

  getPendingReminder: (label: string) =>
    invoke<PendingReminder | null>("get_pending_reminder", { label }),
  closeReminderWindow: (label: string) => invoke<void>("close_reminder_window", { label }),
};