import { Component, input, output } from '@angular/core';
import { QuestionBlock } from '../../../core/models';
import { CodeBlockComponent } from '../code-block/code-block';
import { AnswerRevealComponent } from '../answer-reveal/answer-reveal';
import { BookmarkButtonComponent } from '../bookmark-button/bookmark-button';
import { IconComponent } from '../icon/icon';
import { MarkdownInlinePipe } from '../../pipes/markdown-inline.pipe';

const TYPE_LABELS: Record<QuestionBlock['type'], string> = {
  'output-question': 'Code Output Question',
  'interview-question': 'Interview Question',
  'tricky-question': 'Tricky Question',
  'scenario-question': 'Scenario Question',
};

const TYPE_ICONS: Record<QuestionBlock['type'], string> = {
  'output-question': 'code',
  'interview-question': 'target',
  'tricky-question': 'flame',
  'scenario-question': 'flag',
};

@Component({
  selector: 'app-question-card',
  imports: [
    CodeBlockComponent,
    AnswerRevealComponent,
    BookmarkButtonComponent,
    IconComponent,
    MarkdownInlinePipe,
  ],
  templateUrl: './question-card.html',
  styleUrl: './question-card.scss',
})
export class QuestionCardComponent {
  question = input.required<QuestionBlock>();
  autoReveal = input<boolean>(false);
  bookmarked = input<boolean>(false);
  showBookmark = input<boolean>(true);
  showSelfAssessment = input<boolean>(false);

  bookmarkToggled = output<void>();
  assessed = output<'correct' | 'incorrect' | 'needs-revision'>();

  readonly typeLabels = TYPE_LABELS;
  readonly typeIcons = TYPE_ICONS;
}
