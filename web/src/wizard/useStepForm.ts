/** The hook that binds a wizard step's form to its shared Zod schema. */

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, type DefaultValues, type FieldValues, type Path } from 'react-hook-form';
import type { z } from 'zod';
import type { StepProps } from './types';

/**
 * React Hook Form wired to one of the shared Zod step schemas, plus the
 * wizard's conventions: report dirtiness, show server-side field errors, and
 * focus the field a "Fix" link pointed at.
 *
 * `values` follows the saved submission: when it changes (a refetch, or an
 * upload on the same step), fields the author has not touched take the new
 * values and fields they have edited keep their edits.
 *
 * @param schema - The step's schema from `@submission-wizard/shared`.
 * @param values - The saved values for this step.
 * @returns The React Hook Form instance.
 * @see docs/adr/0009-step-form-lives-as-long-as-the-step.md
 */
export function useStepForm<T extends FieldValues>(
  schema: z.ZodType<T, T>,
  values: DefaultValues<T>,
  {
    serverErrors,
    focusField,
    onDirtyChange,
  }: Pick<StepProps, 'serverErrors' | 'focusField' | 'onDirtyChange'>,
) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: values,
    values: values as T,
    resetOptions: { keepDirtyValues: true },
    mode: 'onTouched',
  });
  const { isDirty } = form.formState;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    for (const [field, message] of Object.entries(serverErrors)) {
      form.setError(field as Path<T>, { type: 'server', message });
    }
  }, [serverErrors, form]);

  // Once on arrival: later re-renders (typing, validation) must not pull focus back.
  useEffect(() => {
    if (focusField) form.setFocus(focusField as Path<T>);
  }, [focusField, form]);

  return form;
}
