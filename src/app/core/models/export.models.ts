export interface TopicExportOptions {
  /** Include interview answers and explanations. */
  includeAnswers: boolean;
  /** Include code samples and language labels. */
  includeCode: boolean;
  /** Append the learner's note for each topic when present. */
  includeNotes: boolean;
}

export interface TopicExportRef {
  subjectId: string;
  topicId: string;
}

export const DEFAULT_TOPIC_EXPORT_OPTIONS: TopicExportOptions = {
  includeAnswers: true,
  includeCode: true,
  includeNotes: false,
};

/** Soft warning threshold — large packs can be slow to print. */
export const TOPIC_EXPORT_WARN_COUNT = 20;
