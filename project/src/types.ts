export type TaskStatus = "pending" | "done";

export interface Task {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  note: string;
  status: TaskStatus;
  repeatIntervalMinutes: number | null;
  reminderOffsetMinutes: number | null;
}

export interface TaskInput {
  title: string;
  date: string;
  time: string;
  note: string;
  repeatIntervalMinutes: number | null;
  reminderOffsetMinutes: number | null;
}

export interface PendingAlert {
  taskId: number;
  title: string;
  time: string;
  note: string;
  repeatIntervalMinutes: number | null;
}

export interface PendingReminder {
  taskId: number;
  title: string;
  time: string;
  note: string;
  reminderOffsetMinutes: number | null;
}