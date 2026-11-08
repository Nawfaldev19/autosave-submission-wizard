/** The texts of decision messages to authors, and recording them inside the decision's transaction. */

import { formatCalendarDate } from '@submission-wizard/shared';
import type { Executor } from '../db/client';
import { notifications, type SubmissionRecord } from '../db/schema';

interface Message {
  readonly subject: string;
  readonly body: string;
}

function title(submission: SubmissionRecord): string {
  return submission.title ?? 'your submission';
}

/**
 * The message an author receives when their work is accepted.
 *
 * @param submission - The accepted submission (its release date is set).
 * @param pressName - Shown in the body.
 */
export function acceptedMessage(submission: SubmissionRecord, pressName: string): Message {
  return {
    subject: `Accepted: ${title(submission)}`,
    body: [
      `We would love to publish ${title(submission)}.`,
      `It is scheduled for release on ${formatCalendarDate(submission.releaseDate ?? '')}.`,
      `An editor from ${pressName} will be in touch about the next steps.`,
    ].join('\n\n'),
  };
}

/**
 * The message an author receives when their work is declined, quoting the editor's note.
 *
 * @param submission - The declined submission (its decision note is set).
 * @param pressName - Shown in the body.
 */
export function declinedMessage(submission: SubmissionRecord, pressName: string): Message {
  return {
    subject: `Our decision on ${title(submission)}`,
    body: [
      `Thank you for sending ${title(submission)} to ${pressName}. We have decided not to take it forward this time.`,
      `A note from the editor:\n${submission.decisionNote ?? ''}`,
      'You can revise the submission and send it again from your submissions page.',
    ].join('\n\n'),
  };
}

/**
 * Records a message for the submission's author.
 *
 * @param tx - The open transaction of the decision, so a decision never goes unannounced.
 * @param submission - The submission the message is about.
 * @param message - Subject and body, from {@link acceptedMessage} or {@link declinedMessage}.
 */
export async function notifyAuthor(
  tx: Executor,
  submission: SubmissionRecord,
  message: Message,
): Promise<void> {
  await tx.insert(notifications).values({
    recipientId: submission.authorId,
    submissionId: submission.id,
    subject: message.subject,
    body: message.body,
  });
}
