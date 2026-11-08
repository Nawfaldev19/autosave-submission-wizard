/** The five-step submission wizard: save on advance, resume, conflict recovery and the unsaved-changes guard. */

import { STEPS, type StepSlug } from '@submission-wizard/shared';
import { Check } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router';
import { useClient, useMutation, useQuery } from 'urql';
import {
  createDraftMutation,
  saveDraftMutation,
  submissionQuery,
  submitMutation,
  uploadManuscriptMutation,
} from '../api/operations';
import { describeError, fieldProblems, isSuccess, type ErrorShape } from '../api/results';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useDocumentTitle } from '../components/pageHooks';
import { Button, Empty, Loading, Main, Notice } from '../components/ui';
import { useSession } from '../routes/session';
import { ReviewStep } from './ReviewStep';
import { AboutStep, BasicsStep, ManuscriptStep, ScheduleStep } from './steps';
import type { StepProps, Submission, UploadOutcome } from './types';

function isStep(value: string | undefined): value is StepSlug {
  return STEPS.some((step) => step.slug === value);
}

/**
 * The five-step submission wizard. It saves when the author moves forward,
 * guards unsaved edits, and recovers from a stale version by offering a reload.
 *
 * @remarks
 * Rendered for both `/submissions/new/edit/:step` and `/submissions/:id/edit/:step`,
 * so the first save swaps the id into the URL without remounting. A step's form
 * is keyed by the step and a reload counter only (ADR 0012).
 * @see docs/explanation/wizard-and-concurrency.md
 * @see docs/reference/features.md (F-02, F-04, F-05)
 */
export function Wizard() {
  const { key = 'new', step } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const client = useClient();
  const { me, press } = useSession();
  const isNew = key === 'new';

  const [{ data, fetching, error }, refetch] = useQuery({
    query: submissionQuery,
    variables: { id: key },
    pause: isNew,
    requestPolicy: 'cache-and-network',
  });
  const [latest, setLatest] = useState<Submission | null>(null);
  const [dirty, setDirty] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<{ text: string; conflict: boolean; signedOut?: boolean } | null>(
    null,
  );
  // Bumped only by "Reload latest version", to start the step form again from the saved values.
  const [formSeed, setFormSeed] = useState(0);
  const [reloading, setReloading] = useState(false);
  const allowNavigation = useRef(false);

  // Messages belong to the step they came from.
  const [shownStep, setShownStep] = useState(step);
  if (step !== shownStep) {
    setShownStep(step);
    setProblem(null);
    setServerErrors({});
  }

  const [createState, create] = useMutation(createDraftMutation);
  const [saveState, save] = useMutation(saveDraftMutation);
  const [, upload] = useMutation(uploadManuscriptMutation);
  const [submitState, submit] = useMutation(submitMutation);
  const busy = createState.fetching || saveState.fetching || submitState.fetching;

  const fromServer = data?.submission ?? null;
  // Prefer whichever copy is newer: a mutation result or a refetched query.
  const ownLatest = latest && (isNew || latest.id === key) ? latest : null;
  const submission =
    ownLatest && (!fromServer || ownLatest.version >= fromServer.version) ? ownLatest : fromServer;
  const current = STEPS.find((s) => s.slug === step) ?? STEPS[0];
  useDocumentTitle(`Step ${current.number} of ${STEPS.length}: ${current.title}`);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !allowNavigation.current && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!dirty) return;
    window.onbeforeunload = (unload) => {
      unload.preventDefault();
      return '';
    };
    return () => {
      window.onbeforeunload = null;
    };
  }, [dirty]);

  const onDirtyChange = useCallback((value: boolean) => {
    setDirty(value);
  }, []);

  if (me.role !== 'AUTHOR') return <Navigate to="/queue" replace />;
  // A new draft starts at step 1; the stepper offers nothing else until it is saved.
  if (!isStep(step) || (isNew && step !== 'basics'))
    return <Navigate to={`/submissions/${key}/edit/basics`} replace />;
  if (!isNew && fetching && !submission) {
    return (
      <Main>
        <Loading label="Loading your draft" />
      </Main>
    );
  }
  if (!isNew && !submission) {
    return (
      <Main>
        <Empty title={error ? 'Could not load this draft' : 'Draft not found'} level={1}>
          <Link to="/submissions">Back to your submissions</Link>
        </Empty>
      </Main>
    );
  }
  if (submission && submission.status !== 'DRAFT')
    return <Navigate to={`/submissions/${submission.id}`} replace />;

  const index = STEPS.findIndex((s) => s.slug === step);
  const stepPath = (slug: StepSlug, id = submission?.id ?? key) => `/submissions/${id}/edit/${slug}`;
  /** Forward, after a successful save: nothing is left unsaved, so the guard is skipped. */
  const go = (slug: StepSlug, id = submission?.id ?? 'new') => {
    allowNavigation.current = true;
    void Promise.resolve(navigate(stepPath(slug, id), { replace: id !== key })).finally(() => {
      allowNavigation.current = false;
    });
  };
  /** Back does not save, so the unsaved-changes guard still asks. */
  const back = (slug: StepSlug) => {
    void navigate(stepPath(slug));
  };
  const previous = index > 0 ? STEPS[index - 1] : undefined;
  const next = STEPS[index + 1];

  const handleFailure = (result: ErrorShape | undefined, transport: boolean) => {
    if (transport || !result) {
      setProblem({
        text: 'Could not reach the server. Your changes are still here; try again.',
        conflict: false,
      });
      return;
    }
    if (result.__typename === 'ConflictError') {
      setProblem({ text: describeError(result), conflict: true });
      return;
    }
    if (result.__typename === 'NotSignedInError') {
      setProblem({
        text: 'Your session has ended, so this step was not saved. Your edits are still here.',
        conflict: false,
        signedOut: true,
      });
      return;
    }
    setServerErrors(fieldProblems(result));
    setProblem({ text: describeError(result), conflict: false });
  };

  const onSave = async (values: Record<string, unknown>) => {
    setProblem(null);
    setServerErrors({});
    const result = submission
      ? await save({ id: submission.id, version: submission.version, input: values })
      : await create({ input: values });
    const payload = result.data
      ? 'saveDraft' in result.data
        ? result.data.saveDraft
        : result.data.createDraft
      : undefined;
    if (payload && isSuccess(payload) && 'data' in payload) {
      setLatest(payload.data);
      setDirty(false);
      if (next) go(next.slug, payload.data.id);
    } else {
      handleFailure(payload, Boolean(result.error));
    }
  };

  const onUpload = async (file: File): Promise<UploadOutcome> => {
    if (!submission) return { ok: false, error: 'Save the first step before uploading.' };
    const result = await upload({ id: submission.id, version: submission.version, file });
    const payload = result.data?.uploadManuscript;
    if (payload && 'data' in payload) {
      setLatest(payload.data);
      return { ok: true };
    }
    if (payload?.__typename === 'ConflictError') {
      // The page-level notice explains the conflict and offers the reload.
      setProblem({ text: describeError(payload), conflict: true });
      return { ok: false, error: null };
    }
    return {
      ok: false,
      error: result.error
        ? 'The upload failed. Check your connection and try again.'
        : describeError(payload),
    };
  };

  const reload = async () => {
    if (!submission) return;
    setReloading(true);
    const result = await client
      .query(submissionQuery, { id: submission.id }, { requestPolicy: 'network-only' })
      .toPromise();
    setReloading(false);
    const fresh = result.data?.submission;
    if (!fresh) {
      setProblem({
        text: 'Could not reload the draft. Check your connection and try again.',
        conflict: true,
      });
      return;
    }
    setLatest(fresh);
    setProblem(null);
    setServerErrors({});
    setDirty(false);
    setFormSeed((seed) => seed + 1);
  };

  const onSubmit = async () => {
    if (!submission) return;
    setProblem(null);
    const result = await submit({ id: submission.id, version: submission.version });
    const payload = result.data?.submitSubmission;
    if (payload && 'data' in payload) {
      allowNavigation.current = true;
      await navigate(`/submissions/${payload.data.id}`, {
        state: { flash: 'Submitted. We will let you know when an editor has read it.' },
      });
    } else if (payload?.__typename === 'IncompleteSubmissionError') {
      setProblem({ text: 'Some details are missing; see the list above.', conflict: false });
      refetch({ requestPolicy: 'network-only' });
    } else {
      handleFailure(payload, Boolean(result.error));
    }
  };

  const stepProps: StepProps = {
    submission,
    busy,
    serverErrors,
    focusField: searchParams.get('focus'),
    onSave: (values) => void onSave(values),
    onBack: previous
      ? () => {
          back(previous.slug);
        }
      : null,
    onDirtyChange,
  };

  return (
    <Main className="wizard">
      <div>
        <p className="eyebrow">{isNew ? 'New submission' : (submission?.title ?? 'Untitled draft')}</p>
        <h1 className="k-page-title">
          Step {current.number} of {STEPS.length}: {current.title}
        </h1>
      </div>
      <nav aria-label="Submission steps">
        <ol className="stepper">
          {STEPS.map((s, i) => {
            // A step is ticked when the server reports nothing missing from it.
            const done =
              submission !== null &&
              s.slug !== 'review' &&
              !submission.readiness.some((issue) => issue.step === s.slug);
            const reachable = !isNew || i === 0;
            return (
              <li key={s.slug} className={`${done ? 'done' : ''} ${s.slug === step ? 'current' : ''}`}>
                {reachable ? (
                  <Link to={stepPath(s.slug)} aria-current={s.slug === step ? 'step' : undefined}>
                    <span className="stepper-dot">
                      {done ? <Check size={14} aria-hidden="true" /> : s.number}
                    </span>
                    <span className="stepper-label">{s.title}</span>
                    {done && <span className="visually-hidden"> (complete)</span>}
                  </Link>
                ) : (
                  <span>
                    <span className="stepper-dot">{s.number}</span>
                    <span className="stepper-label">{s.title}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {problem && (
        <Notice tone="error">
          {problem.text}{' '}
          {problem.signedOut && (
            <>
              <a href="/" target="_blank" rel="noopener">
                Sign in again in a new tab
              </a>
              , then come back and save this step.
            </>
          )}
          {problem.conflict && (
            <>
              Your edits are still in the form below; reloading replaces them with the saved version.{' '}
              <Button variant="ghost" busy={reloading} onClick={() => void reload()}>
                Reload latest version
              </Button>
            </>
          )}
        </Notice>
      )}

      {/* A new step, or a reload, starts a fresh form. Saves and uploads on the same step do not. */}
      <div className="k-card" key={`${step}-${formSeed}`}>
        {step === 'basics' && <BasicsStep {...stepProps} />}
        {step === 'manuscript' && <ManuscriptStep {...stepProps} onUpload={onUpload} />}
        {step === 'schedule' && <ScheduleStep {...stepProps} />}
        {step === 'about' && <AboutStep {...stepProps} />}
        {step === 'review' && submission && (
          <ReviewStep
            submission={submission}
            pressName={press.name}
            busy={busy}
            onBack={() => {
              back('about');
            }}
            onSubmit={() => void onSubmit()}
          />
        )}
      </div>

      {blocker.state === 'blocked' && (
        <ConfirmDialog
          title="Leave without saving?"
          text="Your changes on this step have not been saved yet."
          cancelLabel="Stay on this step"
          confirmLabel="Leave without saving"
          onCancel={() => {
            blocker.reset();
          }}
          onConfirm={() => {
            blocker.proceed();
          }}
        />
      )}
    </Main>
  );
}
