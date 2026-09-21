let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(c: AudioContext, freq: number, start: number, dur: number, vol: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, c.currentTime + start);
  gain.gain.linearRampToValueAtTime(vol, c.currentTime + start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.05);
}

/** Som de alerta prioritário (ecrã completo). */
export function playAlertChime() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  [659.25, 523.25, 659.25, 523.25].forEach((f, i) => tone(c, f, t + i * 0.22, 0.28, 0.18));
}

/** Som suave de lembrete (notificação no canto). */
export function playReminderBlip() {
  const c = ac();
  if (!c) return;
  tone(c, 783.99, c.currentTime, 0.18, 0.1);
  tone(c, 987.77, c.currentTime + 0.14, 0.2, 0.1);
}