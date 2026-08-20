import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CodeRunnerService } from './code-runner.service';

class WorkerDouble {
  static latest: WorkerDouble;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor(_url: string) {
    WorkerDouble.latest = this;
  }
}

describe('CodeRunnerService', () => {
  let originalCreate: typeof URL.createObjectURL | undefined;
  let originalRevoke: typeof URL.revokeObjectURL | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('Worker', WorkerDouble);
    originalCreate = URL.createObjectURL;
    originalRevoke = URL.revokeObjectURL;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:test'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreate });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevoke });
  });

  it('posts code to a worker and resolves successful output', async () => {
    const result = new CodeRunnerService().run('console.log(1)');
    expect(WorkerDouble.latest.postMessage).toHaveBeenCalledWith({ code: 'console.log(1)' });
    WorkerDouble.latest.onmessage?.({
      data: { logs: [{ level: 'log', text: '1' }], error: null, ms: 2 },
    } as MessageEvent);
    await expect(result).resolves.toEqual({
      logs: [{ level: 'log', text: '1' }],
      error: null,
      ms: 2,
      timedOut: false,
    });
    expect(WorkerDouble.latest.terminate).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('reports worker errors', async () => {
    const result = new CodeRunnerService().run('bad code');
    WorkerDouble.latest.onerror?.({ message: 'Worker failed' } as ErrorEvent);
    await expect(result).resolves.toMatchObject({ error: 'Worker failed', timedOut: false });
  });

  it('terminates execution after four seconds and ignores later results', async () => {
    const result = new CodeRunnerService().run('while (true) {}');
    vi.advanceTimersByTime(4_000);
    await expect(result).resolves.toMatchObject({
      timedOut: true,
      ms: 4000,
      error: expect.stringContaining('timed out'),
    });
    expect(WorkerDouble.latest.terminate).toHaveBeenCalledOnce();
  });
});
