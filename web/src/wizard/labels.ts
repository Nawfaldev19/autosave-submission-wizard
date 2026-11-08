/** Human names for submission fields, as the forms label them. Used by Fix links and locked-field lists. */
const FIELD_LABEL: Readonly<Record<string, string>> = {
  title: 'Title',
  form: 'Kind of work',
  synopsis: 'Synopsis',
  file: 'Manuscript file',
  wordCount: 'Word count',
  season: 'List',
  timeSensitive: 'Tied to a date',
  scheduleNote: 'Timing note',
  penName: 'Pen name',
  bio: 'Short biography',
  rightsConfirmed: 'Rights confirmation',
};

/**
 * The label a person sees for a submission field.
 *
 * @param field - A field name such as `wordCount`.
 * @returns Its form label, or the name itself when unknown.
 */
export function fieldLabel(field: string): string {
  return FIELD_LABEL[field] ?? field;
}
