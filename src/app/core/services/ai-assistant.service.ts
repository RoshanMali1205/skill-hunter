import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { AiChatContext, AiChatError, AiChatMessage, AiChatResponse } from '../models';

// Ships in the built JS bundle, so it is not a real secret — it only stops
// casual bots/scrapers from hitting /api/ai-chat directly and burning the
// shared free-tier quota. It must match APP_SHARED_TOKEN in Netlify's
// environment variables (see netlify/functions/ai-chat.js).
const APP_SHARED_TOKEN = 'OmFrAQPhkXtNYAdLfC35UCP--Th-sEVY';

@Injectable({ providedIn: 'root' })
export class AiAssistantService {
  private readonly http = inject(HttpClient);

  sendMessage(messages: AiChatMessage[], context?: AiChatContext): Observable<string> {
    const headers = new HttpHeaders({ 'x-app-token': APP_SHARED_TOKEN });
    return this.http.post<AiChatResponse>('/api/ai-chat', { messages, context }, { headers }).pipe(
      map((res) => res.reply),
      catchError((err: HttpErrorResponse) => throwError(() => new Error(this.describeError(err)))),
    );
  }

  private describeError(err: HttpErrorResponse): string {
    if (err.status === 0 || err.status === 404) {
      return 'Could not reach the AI backend. Locally, run `npm start` (starts the AI API stand-in + ng serve; proxy.conf.json forwards /api/**), or use `npm run dev` (`netlify dev`). On a deployed site, check that the Netlify function deployed successfully.';
    }
    const body = err.error as AiChatError | undefined;
    return body?.error ?? `AI request failed (HTTP ${err.status}).`;
  }
}
