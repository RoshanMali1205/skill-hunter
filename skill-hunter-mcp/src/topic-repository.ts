import type { SkillLevel, SkillTopic } from './topics.js';
import { topics } from './topics.js';

export interface TopicQuery {
  query: string;
  level?: SkillLevel;
  limit: number;
}

/**
 * Business-layer access for Skill Hunter topics.
 * MCP handlers call this instead of reaching into storage (JSON files, Supabase, etc.).
 */
export interface TopicRepository {
  search(query: TopicQuery): Promise<SkillTopic[]>;
  findById(id: string): Promise<SkillTopic | null>;
  findBySubject(subject: string): Promise<SkillTopic[]>;
}

export class InMemoryTopicRepository implements TopicRepository {
  constructor(private readonly records: readonly SkillTopic[] = topics) {}

  async search({ query, level, limit }: TopicQuery): Promise<SkillTopic[]> {
    const normalizedQuery = query.toLowerCase();

    return this.records
      .filter((topic) => {
        const searchableText = [topic.title, topic.subject, topic.summary].join(' ').toLowerCase();

        return searchableText.includes(normalizedQuery) && (!level || topic.level === level);
      })
      .slice(0, limit);
  }

  async findById(id: string): Promise<SkillTopic | null> {
    return this.records.find((topic) => topic.id === id) ?? null;
  }

  async findBySubject(subject: string): Promise<SkillTopic[]> {
    return this.records.filter((topic) => topic.subject === subject);
  }
}
