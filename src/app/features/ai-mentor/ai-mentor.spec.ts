import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiConversation, AiChatMessage } from '../../core/models';
import { AiAssistantService } from '../../core/services/ai-assistant.service';
import { AiChatStore } from '../../core/services/ai-chat.store';
import { NoteService } from '../../core/services/note.service';
import { AiMentorComponent } from './ai-mentor';

describe('AiMentorComponent', () => {
  const now = '2026-08-20T10:00:00.000Z';
  const conversation: AiConversation = {
    id: 'chat-1',
    title: 'Signals',
    createdAt: now,
    updatedAt: now,
    messages: [],
    subjectId: 'angular',
    subjectTitle: 'Angular',
    topicId: 'signals',
    topicTitle: 'Signals',
  };
  const conversations = signal<AiConversation[]>([conversation]);
  const activeConversation = signal<AiConversation | undefined>(conversation);
  const messages = signal<AiChatMessage[]>([]);
  const activeId = signal<string | null>('chat-1');
  const sendMessage = vi.fn();
  const appendToActive = vi.fn((message: AiChatMessage) =>
    messages.update((all) => [...all, message]),
  );
  const setActiveMessages = vi.fn((value: AiChatMessage[]) => messages.set(value));
  const appendToNote = vi.fn();
  const navigate = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    messages.set([]);
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [AiMentorComponent],
      providers: [
        { provide: AiAssistantService, useValue: { sendMessage } },
        {
          provide: AiChatStore,
          useValue: {
            conversations,
            activeConversation,
            activeMessages: messages,
            activeId,
            ensureActive: vi.fn(() => conversation),
            openForTopic: vi.fn(() => conversation),
            startNewChat: vi.fn(() => conversation),
            selectConversation: vi.fn(),
            deleteConversation: vi.fn(),
            appendToActive,
            setActiveMessages,
          },
        },
        { provide: NoteService, useValue: { appendToNote } },
        { provide: Location, useValue: { back: vi.fn() } },
        { provide: Router, useValue: { navigate } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  function create() {
    const fixture = TestBed.createComponent(AiMentorComponent);
    fixture.componentRef.setInput('subjectId', 'angular');
    fixture.componentRef.setInput('topicId', 'signals');
    fixture.componentRef.setInput('subject', 'Angular');
    fixture.componentRef.setInput('topic', 'Signals');
    TestBed.flushEffects();
    return fixture.componentInstance;
  }

  it('derives topic context and conversation previews', () => {
    const component = create();
    expect(component.contextLabel()).toContain('Angular');
    expect(component.hasTopicContext()).toBe(true);
    expect(component.groupedConversations()[0]!.label).toBe('Today');
    expect(component.previewText({ ...conversation, messages: [] })).toBe('No messages yet');
  });

  it('sends a trimmed draft and appends the AI reply', () => {
    sendMessage.mockReturnValue(of('Reactive values notify consumers.'));
    const component = create();
    component.draft.set('  Explain signals  ');
    component.sendDraft();
    expect(sendMessage).toHaveBeenCalled();
    expect(messages().map((message) => message.role)).toEqual(['user', 'assistant']);
    expect(messages()[1]!.content).toContain('Reactive values');
    expect(component.loading()).toBe(false);
  });

  it('rolls back the user turn and restores the draft on errors', () => {
    sendMessage.mockReturnValue(throwError(() => new Error('Offline')));
    const component = create();
    component.draft.set('Retry me');
    component.sendDraft();
    expect(messages()).toEqual([]);
    expect(component.draft()).toBe('Retry me');
    expect(component.errorMessage()).toBe('Offline');
  });

  it('saves assistant content to topic notes and clears feedback later', () => {
    const component = create();
    component.saveToNotes(2, 'Useful answer');
    expect(appendToNote).toHaveBeenCalledWith('signals', 'angular', 'Useful answer');
    expect(component.savedIndex()).toBe(2);
    vi.advanceTimersByTime(1500);
    expect(component.savedIndex()).toBeNull();
  });

  it('handles Enter submission and topic-aware back navigation', () => {
    sendMessage.mockReturnValue(of('Answer'));
    const component = create();
    component.draft.set('Question');
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    component.onComposerKeydown(event);
    expect(preventDefault).toHaveBeenCalled();
    component.goBack();
    expect(navigate).toHaveBeenCalledWith(['/subjects', 'angular', 'topics', 'signals']);
  });
});
