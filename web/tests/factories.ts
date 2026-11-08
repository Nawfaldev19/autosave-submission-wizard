import type { SubmissionFieldsFragment } from '../src/gql/graphql';

/** A submission as the API would return it, with overridable fields. */
export function submission(
  overrides: Partial<SubmissionFieldsFragment> = {},
): SubmissionFieldsFragment & { __typename: 'Submission' } {
  return {
    __typename: 'Submission',
    id: 's-1',
    status: 'DRAFT',
    version: 3,
    title: 'Salt Ledger',
    form: 'CHAPBOOK',
    synopsis: 'Twenty-four short poems kept like entries in a harbour ledger, one for every tide.',
    wordCount: null,
    season: null,
    timeSensitive: false,
    scheduleNote: '',
    penName: '',
    bio: null,
    rightsConfirmed: false,
    decisionNote: null,
    releaseDate: null,
    submittedAt: null,
    updatedAt: '2026-03-10T10:00:00.000Z',
    lockedFields: [],
    availableActions: ['SUBMIT'],
    manuscript: null,
    readiness: [],
    ...overrides,
  };
}

export function withPeople<T extends object>(record: T) {
  return {
    ...record,
    author: { __typename: 'User', name: 'Wren Calloway' },
    editor: null as null | { __typename: 'User'; id: string; name: string },
  };
}
