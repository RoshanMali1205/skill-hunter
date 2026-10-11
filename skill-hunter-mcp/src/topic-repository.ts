import type { SkillLevel, SkillTopic, SkillTopicSummary } from './topics.js';
import { toTopicSummary, topics } from './topics.js';

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
  search(query: TopicQuery): Promise<SkillTopicSummary[]>;
  findById(id: string): Promise<SkillTopic | null>;
  findBySubject(subject: string): Promise<SkillTopicSummary[]>;
}

export class InMemoryTopicRepository implements TopicRepository {
  constructor(private readonly records: readonly SkillTopic[] = topics) {}

  async search({ query, level, limit }: TopicQuery): Promise<SkillTopicSummary[]> {
    const normalizedQuery = query.toLowerCase();

    return this.records
      .filter((topic) => {
        const searchableText = [topic.title, topic.subject, topic.summary].join(' ').toLowerCase();

        return searchableText.includes(normalizedQuery) && (!level || topic.level === level);
      })
      .slice(0, limit)
      .map(toTopicSummary);
  }

  async findById(id: string): Promise<SkillTopic | null> {
    return this.records.find((topic) => topic.id === id) ?? null;
  }

  async findBySubject(subject: string): Promise<SkillTopicSummary[]> {
    return this.records.filter((topic) => topic.subject === subject).map(toTopicSummary);
  }
}
