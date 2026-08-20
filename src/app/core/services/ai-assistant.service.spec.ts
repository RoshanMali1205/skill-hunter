import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AiAssistantService } from './ai-assistant.service';

describe('AiAssistantService', () => {
  let service: AiAssistantService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AiAssistantService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts messages and context with the application token', async () => {
    const messages = [{ role: 'user' as const, content: 'Explain signals' }];
    const result = firstValueFrom(service.sendMessage(messages, { topicTitle: 'Signals' }));
    const request = http.expectOne('/api/ai-chat');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ messages, context: { topicTitle: 'Signals' } });
    expect(request.request.headers.get('x-app-token')).toBeTruthy();
    request.flush({ reply: 'Signals are reactive values.' });
    expect(await result).toBe('Signals are reactive values.');
  });

  it('describes unreachable and backend-reported failures', async () => {
    const unreachable = firstValueFrom(service.sendMessage([])).catch((error: Error) => error);
    http.expectOne('/api/ai-chat').error(new ProgressEvent('network'), { status: 0 });
    expect(((await unreachable) as Error).message).toContain('Could not reach the AI backend');

    const backend = firstValueFrom(service.sendMessage([])).catch((error: Error) => error);
    http
      .expectOne('/api/ai-chat')
      .flush({ error: 'Quota exceeded' }, { status: 429, statusText: 'Too Many Requests' });
    expect(((await backend) as Error).message).toBe('Quota exceeded');
  });

  it('falls back to the HTTP status when no backend message exists', async () => {
    const result = firstValueFrom(service.sendMessage([])).catch((error: Error) => error);
    http.expectOne('/api/ai-chat').flush(null, { status: 500, statusText: 'Error' });
    expect(((await result) as Error).message).toContain('HTTP 500');
  });
});
