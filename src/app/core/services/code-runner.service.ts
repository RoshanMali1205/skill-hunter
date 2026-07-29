import { Injectable } from '@angular/core';

export interface LogEntry {
  level: 'log' | 'warn' | 'error';
  text: string;
}

export interface RunResult {
  logs: LogEntry[];
  error: string | null;
  ms: number;
  timedOut: boolean;
}

const TIMEOUT_MS = 4000;

// Executed inside a Worker: its own thread, no DOM access, no access to the
// app's globals — a stuck `while (true)` in here can be terminated from the
// main thread without freezing the page.
const WORKER_SOURCE = `
function formatArg(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'undefined') return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'function') return value.toString();
  if (value instanceof Error) return value.stack || String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const logs = [];
console.log = (...args) => logs.push({ level: 'log', text: args.map(formatArg).join(' ') });
console.warn = (...args) => logs.push({ level: 'warn', text: args.map(formatArg).join(' ') });
console.error = (...args) => logs.push({ level: 'error', text: args.map(formatArg).join(' ') });

self.onmessage = (event) => {
  const start = performance.now();
  try {
    const result = new Function(event.data.code)();
    Promise.resolve(result)
      .then(() => {
        self.postMessage({ logs, error: null, ms: performance.now() - start });
      })
      .catch((err) => {
        self.postMessage({ logs, error: formatArg(err), ms: performance.now() - start });
      });
  } catch (err) {
    self.postMessage({ logs, error: formatArg(err), ms: performance.now() - start });
  }
};
`;

@Injectable({ providedIn: 'root' })
export class CodeRunnerService {
  run(code: string): Promise<RunResult> {
    return new Promise((resolve) => {
      const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);

      let settled = false;
      const finish = (result: RunResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        worker.terminate();
        URL.revokeObjectURL(url);
        resolve(result);
      };

      const timer = setTimeout(() => {
        finish({
          logs: [],
          error: 'Execution timed out after 4s — check for an infinite loop.',
          ms: TIMEOUT_MS,
          timedOut: true,
        });
      }, TIMEOUT_MS);

      worker.onmessage = (event) => {
        const data = event.data as { logs: LogEntry[]; error: string | null; ms: number };
        finish({ ...data, timedOut: false });
      };

      worker.onerror = (event) => {
        finish({ logs: [], error: event.message, ms: 0, timedOut: false });
      };

      worker.postMessage({ code });
    });
  }
}
