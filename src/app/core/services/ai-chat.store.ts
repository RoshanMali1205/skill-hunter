import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { STORAGE_KEYS } from '../storage/storage-keys';
import {
  AI_CHAT_MAX_CONVERSATIONS,
  AiChatContext,
  AiChatMessage,
  AiConversation,
} from '../models';

interface AiChatPersistedState {
  conversations: AiConversation[];
  activeId: string | null;
}

const EMPTY_STATE: AiChatPersistedState = {
  conversations: [],
  activeId: null,
};

@Injectable({ providedIn: 'root' })
export class AiChatStore {
  private readonly storage = inject(StorageService);

  private readonly _state = signal<AiChatPersistedState>(
    this.storage.get(STORAGE_KEYS.aiChats, EMPTY_STATE),
  );

  readonly conversations = computed(() =>
    [...this._state().conversations].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
  );

  readonly activeId = computed(() => this._state().activeId);

  readonly activeConversation = computed(() => {
    const id = this._state().activeId;
    if (!id) return null;
    return this._state().conversations.find((c) => c.id === id) ?? null;
  });

  readonly activeMessages = computed(() => this.activeConversation()?.messages ?? []);

  /** Ensure there is an active conversation; create a blank one if needed. */
  ensureActive(context?: AiChatContext): AiConversation {
    const current = this.activeConversation();
    if (current) return current;
    return this.createConversation(context);
  }

  /**
   * Resume or create a conversation for a topic deep-link.
   * Prefers the most recently updated thread for that topicId.
   */
  openForTopic(context: AiChatContext): AiConversation {
    const topicId = context.topicId;
    if (topicId) {
      const existing = this.conversations().find((c) => c.topicId === topicId);
      if (existing) {
        this.selectConversation(existing.id);
        // Refresh context labels in case titles changed.
        this.patchActive({
          subjectTitle: context.subjectTitle ?? existing.subjectTitle,
          topicTitle: context.topicTitle ?? existing.topicTitle,
          subjectId: context.subjectId ?? existing.subjectId,
          topicId,
        });
        return this.activeConversation()!;
      }
    }
    return this.createConversation(context);
  }

  selectConversation(id: string): void {
    if (!this._state().conversations.some((c) => c.id === id)) return;
    this._state.update((state) => ({ ...state, activeId: id }));
    this.persist();
  }

  createConversation(context?: AiChatContext): AiConversation {
    const now = new Date().toISOString();
    const conversation: AiConversation = {
      id: crypto.randomUUID(),
      title: this.defaultTitle(context),
      createdAt: now,
      updatedAt: now,
      subjectTitle: context?.subjectTitle,
      topicTitle: context?.topicTitle,
      subjectId: context?.subjectId,
      topicId: context?.topicId,
      messages: [],
    };

    this._state.update((state) => {
      const conversations = [conversation, ...state.conversations].slice(
        0,
        AI_CHAT_MAX_CONVERSATIONS,
      );
      return { conversations, activeId: conversation.id };
    });
    this.persist();
    return conversation;
  }

  /**
   * Start a fresh chat. Reuses the current empty conversation when possible
   * so we don't spam blank threads in the sidebar.
   */
  startNewChat(context?: AiChatContext): AiConversation {
    const active = this.activeConversation();
    if (active && active.messages.length === 0) {
      this.patchActive({
        title: this.defaultTitle(context),
        subjectTitle: context?.subjectTitle,
        topicTitle: context?.topicTitle,
        subjectId: context?.subjectId,
        topicId: context?.topicId,
        updatedAt: new Date().toISOString(),
      });
      return this.activeConversation()!;
    }
    return this.createConversation(context);
  }

  setActiveMessages(messages: AiChatMessage[]): void {
    const active = this.activeConversation();
    if (!active) return;

    const title =
      active.messages.length === 0 && messages.length > 0
        ? this.titleFromMessages(messages, active)
        : active.title;

    this.patchActive({
      messages,
      title,
      updatedAt: new Date().toISOString(),
    });
  }

  appendToActive(message: AiChatMessage): void {
    const active = this.ensureActive();
    const messages = [...active.messages, message];
    this.setActiveMessages(messages);
  }

  deleteConversation(id: string): void {
    this._state.update((state) => {
      const conversations = state.conversations.filter((c) => c.id !== id);
      let activeId = state.activeId;
      if (activeId === id) {
        activeId = conversations[0]?.id ?? null;
      }
      return { conversations, activeId };
    });
    this.persist();
  }

  replaceAll(state: AiChatPersistedState): void {
    this._state.set({
      conversations: Array.isArray(state.conversations) ? state.conversations : [],
      activeId: state.activeId ?? null,
    });
    this.persist();
  }

  resetAll(): void {
    this._state.set(EMPTY_STATE);
    this.persist();
  }

  snapshot(): AiChatPersistedState {
    return this._state();
  }

  private patchActive(partial: Partial<AiConversation>): void {
    const id = this._state().activeId;
    if (!id) return;
    this._state.update((state) => ({
      ...state,
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...partial } : c,
      ),
    }));
    this.persist();
  }

  private defaultTitle(context?: AiChatContext): string {
    if (context?.topicTitle && context?.subjectTitle) {
      return `${context.subjectTitle} › ${context.topicTitle}`;
    }
    if (context?.topicTitle) return context.topicTitle;
    if (context?.subjectTitle) return context.subjectTitle;
    return 'New chat';
  }

  private titleFromMessages(messages: AiChatMessage[], fallback: AiConversation): string {
    const firstUser = messages.find((m) => m.role === 'user')?.content.trim();
    if (!firstUser) return fallback.title || 'New chat';
    const compact = firstUser.replace(/\s+/g, ' ');
    return compact.length > 48 ? `${compact.slice(0, 45)}…` : compact;
  }

  private persist(): void {
    this.storage.set(STORAGE_KEYS.aiChats, this._state());
  }
}
