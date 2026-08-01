import { TestBed } from '@angular/core/testing';
import { AiChatStore } from './ai-chat.store';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';

describe('AiChatStore', () => {
  let store: AiChatStore;
  let memory: Record<string, unknown>;

  beforeEach(() => {
    memory = {};
    TestBed.configureTestingModule({
      providers: [
        AiChatStore,
        {
          provide: StorageService,
          useValue: {
            get: <T>(_key: string, fallback: T) => (memory[STORAGE_KEYS.aiChats] as T) ?? fallback,
            set: <T>(key: string, value: T) => {
              memory[key] = value;
            },
          },
        },
      ],
    });
    store = TestBed.inject(AiChatStore);
  });

  it('creates and persists an active conversation', () => {
    const conversation = store.createConversation({ topicTitle: 'Closures', subjectTitle: 'JavaScript' });
    expect(store.activeId()).toBe(conversation.id);
    expect(store.activeConversation()?.title).toContain('Closures');
    expect(memory[STORAGE_KEYS.aiChats]).toBeTruthy();
  });

  it('titles the chat from the first user message', () => {
    store.createConversation();
    store.setActiveMessages([
      { role: 'user', content: 'Explain event loop in interviews' },
      { role: 'assistant', content: 'Sure…' },
    ]);
    expect(store.activeConversation()?.title).toBe('Explain event loop in interviews');
  });

  it('resumes the latest conversation for a topic', () => {
    const first = store.createConversation({ topicId: 't1', topicTitle: 'Signals' });
    store.setActiveMessages([{ role: 'user', content: 'hello' }]);
    store.createConversation({ topicId: 't2', topicTitle: 'Other' });

    const resumed = store.openForTopic({ topicId: 't1', topicTitle: 'Signals' });
    expect(resumed.id).toBe(first.id);
    expect(store.activeId()).toBe(first.id);
  });

  it('reuses an empty active chat for startNewChat', () => {
    const empty = store.createConversation();
    const again = store.startNewChat({ topicTitle: 'Hooks' });
    expect(again.id).toBe(empty.id);
    expect(again.title).toBe('Hooks');
  });
});
