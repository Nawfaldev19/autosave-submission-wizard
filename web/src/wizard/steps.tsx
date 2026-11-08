/** Steps 1 to 4 of the wizard. Each validates with its shared schema before saving. */

import {
  aboutSchema,
  basicsSchema,
  FORM_LABEL,
  FORMS,
  manuscriptDetailsSchema,
  MAX_UPLOAD_BYTES,
  scheduleSchema,
  SEASON_LABEL,
  SEASONS,
} from '@submission-wizard/shared';
import { FileText, Upload } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Notice } from '../components/ui';
import { Field, StepActions } from './fields';
import type { StepProps, UploadOutcome } from './types';
import { useStepForm } from './useStepForm';

/** Step 1: title, kind of work and synopsis. */
export function BasicsStep(props: StepProps) {
  const { submission } = props;
  const form = useStepForm(
    basicsSchema,
    {
      title: submission?.title ?? '',
      form: submission?.form ?? undefined,
      synopsis: submission?.synopsis ?? '',
    },
    props,
  );
  const { errors } = form.formState;
  return (
    <form
      className="k-stack"
      noValidate
      onSubmit={(e) =>
        void form.handleSubmit((values) => {
          props.onSave(values);
        })(e)
      }
    >
      <Field label="Title" error={errors.title?.message}>
        {({ id, describedBy, invalid }) => (
          <input
            id={id}
            className="k-input"
            maxLength={120}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            {...form.register('title')}
          />
        )}
      </Field>
      <Field label="Kind of work" error={errors.form?.message}>
        {({ id, describedBy, invalid }) => (
          <select
            id={id}
            className="k-select"
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            {...form.register('form')}
          >
            <option value="">Choose…</option>
            {FORMS.map((f) => (
              <option key={f} value={f}>
                {FORM_LABEL[f]}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field
        label="Synopsis"
        hint="50 to 2,000 characters. What is it about, and why now?"
        error={errors.synopsis?.message}
      >
        {({ id, describedBy, invalid }) => (
          <textarea
            id={id}
            className="k-textarea prose"
            maxLength={2000}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            {...form.register('synopsis')}
          />
        )}
      </Field>
      <StepActions onBack={props.onBack} busy={props.busy} />
    </form>
  );
}

/** "8,400", "8 400" and "8'400" all mean 8400; anything else is left for the schema to reject. */
function parseWordCount(value: string): number | undefined {
  const digits = value.replace(/[\s,'_\u00a0\u202f]/g, '');
  return digits === '' ? undefined : Number(digits);
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Step 2: the manuscript upload and the word count.
 *
 * @param props - The step props, plus `onUpload`, which resolves to how the upload ended.
 * @remarks
 * The upload result is announced in a live region and focus returns to the file
 * input; an unsaved word count survives the upload.
 * @see docs/reference/features.md (F-06)
 */
export function ManuscriptStep(props: StepProps & { onUpload: (file: File) => Promise<UploadOutcome> }) {
  const { submission } = props;
  const fileInputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // Kept in the page, so screen readers hear how the upload ended, not just that it began.
  const [uploadStatus, setUploadStatus] = useState('');
  const refocus = useRef(false);

  // The input is disabled while uploading, which drops focus; put it back once it is enabled again.
  useEffect(() => {
    if (uploading || !refocus.current) return;
    refocus.current = false;
    fileInput.current?.focus();
  }, [uploading]);
  const form = useStepForm(manuscriptDetailsSchema, { wordCount: submission?.wordCount ?? undefined }, props);
  const { errors } = form.formState;

  useEffect(() => {
    if (props.focusField === 'file') fileInput.current?.focus();
  }, [props.focusField]);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('Manuscripts can be up to 5 MB.');
      return;
    }
    setUploading(true);
    setUploadStatus(`Uploading ${file.name}…`);
    const outcome = await props.onUpload(file);
    setUploading(false);
    setUploadError(outcome.ok ? null : outcome.error);
    setUploadStatus(outcome.ok ? `Uploaded ${file.name}.` : `${file.name} was not uploaded.`);
    refocus.current = true;
  };

  const manuscript = submission?.manuscript;
  return (
    <form
      className="k-stack"
      noValidate
      onSubmit={(e) =>
        void form.handleSubmit((values) => {
          props.onSave(values);
        })(e)
      }
    >
      <div className="k-field">
        <label htmlFor={fileInputId}>Manuscript file</label>
        {manuscript && (
          <p className="file-chip">
            <FileText size={18} aria-hidden="true" /> {manuscript.fileName}{' '}
            <span className="k-muted">({formatSize(manuscript.sizeBytes)})</span>
          </p>
        )}
        <div className="upload-line">
          <input
            ref={fileInput}
            id={fileInputId}
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            className="k-input"
            aria-describedby={`${fileInputId}-hint`}
            disabled={uploading}
            onChange={(e) => {
              void choose(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <span className="k-muted k-cluster" role="status">
            {uploading && <Upload size={16} aria-hidden="true" />}
            {uploadStatus}
          </span>
        </div>
        <span id={`${fileInputId}-hint`} className="k-field-hint">
          PDF or plain text, up to 5 MB. {manuscript ? 'Choosing a new file replaces the current one.' : ''}
        </span>
        {uploadError && <Notice tone="error">{uploadError}</Notice>}
      </div>
      <Field label="Word count" hint="Between 500 and 120,000 words." error={errors.wordCount?.message}>
        {({ id, describedBy, invalid }) => (
          <input
            id={id}
            className="k-input narrow"
            inputMode="numeric"
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            {...form.register('wordCount', {
              setValueAs: (value: string | number | undefined) =>
                typeof value === 'string' ? parseWordCount(value) : value,
            })}
          />
        )}
      </Field>
      <StepActions onBack={props.onBack} busy={props.busy || uploading} />
    </form>
  );
}

/** Step 3: the publishing list, whether the work is tied to a date, and a timing note. */
export function ScheduleStep(props: StepProps) {
  const { submission } = props;
  const form = useStepForm(
    scheduleSchema,
    {
      season: submission?.season ?? undefined,
      timeSensitive: submission?.timeSensitive ?? false,
      scheduleNote: submission?.scheduleNote ?? '',
    },
    props,
  );
  const { errors } = form.formState;
  const legendId = useId();
  return (
    <form
      className="k-stack"
      noValidate
      onSubmit={(e) =>
        void form.handleSubmit((values) => {
          props.onSave(values);
        })(e)
      }
    >
      <fieldset className="choice-group" aria-describedby={errors.season ? `${legendId}-error` : undefined}>
        <legend id={legendId}>Which list would suit it?</legend>
        {SEASONS.map((season) => (
          <label key={season} className="choice">
            <input type="radio" value={season} {...form.register('season')} />
            {SEASON_LABEL[season]}
          </label>
        ))}
        {errors.season && (
          <span id={`${legendId}-error`} className="k-field-error">
            {errors.season.message}
          </span>
        )}
      </fieldset>
      <label className="choice">
        <input type="checkbox" {...form.register('timeSensitive')} />
        The work is tied to a date (an anniversary or a season)
      </label>
      <Field label="Anything we should know about timing? (optional)" error={errors.scheduleNote?.message}>
        {({ id, describedBy, invalid }) => (
          <textarea
            id={id}
            className="k-textarea prose short"
            maxLength={400}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            {...form.register('scheduleNote')}
          />
        )}
      </Field>
      <StepActions onBack={props.onBack} busy={props.busy} />
    </form>
  );
}

/** Step 4: pen name, biography and the rights confirmation. */
export function AboutStep(props: StepProps) {
  const { submission } = props;
  const form = useStepForm(
    aboutSchema,
    {
      penName: submission?.penName ?? '',
      bio: submission?.bio ?? '',
      rightsConfirmed: submission?.rightsConfirmed ?? false,
    },
    props,
  );
  const { errors } = form.formState;
  return (
    <form
      className="k-stack"
      noValidate
      onSubmit={(e) =>
        void form.handleSubmit((values) => {
          props.onSave(values);
        })(e)
      }
    >
      <Field
        label="Pen name (optional)"
        hint="Leave blank to publish under your own name."
        error={errors.penName?.message}
      >
        {({ id, describedBy, invalid }) => (
          <input
            id={id}
            className="k-input"
            maxLength={80}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            {...form.register('penName')}
          />
        )}
      </Field>
      <Field
        label="Short biography"
        hint="20 to 600 characters, written in the third person."
        error={errors.bio?.message}
      >
        {({ id, describedBy, invalid }) => (
          <textarea
            id={id}
            className="k-textarea prose short"
            maxLength={600}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            {...form.register('bio')}
          />
        )}
      </Field>
      <label className="choice">
        <input type="checkbox" {...form.register('rightsConfirmed')} />I wrote this work and hold the rights
        to offer it for publication
      </label>
      <StepActions onBack={props.onBack} busy={props.busy} />
    </form>
  );
}
