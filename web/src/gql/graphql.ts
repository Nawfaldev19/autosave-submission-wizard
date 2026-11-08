/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
/** Any subset of draft fields. Omitted fields are left unchanged. */
export type DraftInput = {
  /** Short biography (20 to 600 characters). */
  bio?: string | null | undefined;
  /** The kind of work. */
  form?: Form | null | undefined;
  /** Optional pen name (up to 80 characters). */
  penName?: string | null | undefined;
  /** The author holds the rights to the work. */
  rightsConfirmed?: boolean | null | undefined;
  /** Optional timing note (up to 400 characters). */
  scheduleNote?: string | null | undefined;
  /** The publishing list asked for. */
  season?: Season | null | undefined;
  /** What it is about (50 to 2,000 characters). */
  synopsis?: string | null | undefined;
  /** Whether the work is tied to a date. */
  timeSensitive?: boolean | null | undefined;
  /** The work’s title (1 to 120 characters). */
  title?: string | null | undefined;
  /** Length in words (500 to 120,000). */
  wordCount?: number | null | undefined;
};

/** The kind of work. */
export type Form =
  /** A poetry chapbook of up to 40 pages. */
  | 'CHAPBOOK'
  /** A short-story collection. */
  | 'COLLECTION'
  /** A long-form essay. */
  | 'ESSAY';

/** What kind of account a user has. */
export type Role =
  /** Prepares and submits their own work, and reads decisions about it. */
  | 'AUTHOR'
  /** Works through the queue: claims submissions and accepts or declines them. */
  | 'EDITOR';

/** The publishing list a submission is considered for. */
export type Season =
  /** The autumn list. */
  | 'AUTUMN'
  /** Either list; the press chooses. */
  | 'EITHER'
  /** The spring list. */
  | 'SPRING';

/** A step of the submission wizard; the value is the URL segment. */
export type Step =
  /** Step 4: About you. */
  | 'about'
  /** Step 1: Basics. */
  | 'basics'
  /** Step 2: Manuscript. */
  | 'manuscript'
  /** Step 5: Review and submit. */
  | 'review'
  /** Step 3: Schedule. */
  | 'schedule';

/** Where a submission is in the editorial workflow. */
export type SubmissionStatus =
  /** Accepted with a release date; only a few fields stay editable. */
  | 'ACCEPTED'
  /** Declined with a note; the author may revise it into a new draft. */
  | 'DECLINED'
  /** Being prepared by its author; only the author can see it. */
  | 'DRAFT'
  /** Claimed by an editor, who alone may decide it. */
  | 'IN_REVIEW'
  /** Sent to the press and waiting for an editor to claim it. */
  | 'SUBMITTED';

/** A status change the workflow allows. See `Submission.availableActions`. */
export type WorkflowAction =
  /** Claiming editor: accept with a release date. */
  | 'ACCEPT'
  /** Editor: take a waiting submission into review. */
  | 'CLAIM'
  /** Claiming editor: decline with a note for the author. */
  | 'DECLINE'
  /** Author: turn a declined submission back into a draft. */
  | 'REVISE'
  /** Author: send a complete draft to the press. */
  | 'SUBMIT'
  /** Author: take a waiting submission back to draft. */
  | 'WITHDRAW';

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { id: string, name: string, role: Role } | null, press: { name: string, timeZone: string, today: string } };

export type SignInMutationVariables = Exact<{
  email: string;
  password: string;
}>;


export type SignInMutation = { signIn:
    | { __typename: 'InvalidCredentialsError', message: string }
    | { __typename: 'MutationSignInSuccess', data: { id: string } }
    | { __typename: 'ValidationError', message: string }
   };

export type MarkNotificationsReadMutationVariables = Exact<{ [key: string]: never; }>;


export type MarkNotificationsReadMutation = { markNotificationsRead:
    | { __typename: 'MutationMarkNotificationsReadSuccess', data: number }
    | { __typename: 'NotSignedInError' }
   };

export type SignOutMutationVariables = Exact<{ [key: string]: never; }>;


export type SignOutMutation = { signOut: boolean };

export type SubmissionFieldsFragment = { id: string, status: SubmissionStatus, version: number, title: string | null, form: Form | null, synopsis: string | null, wordCount: number | null, season: Season | null, timeSensitive: boolean, scheduleNote: string, penName: string, bio: string | null, rightsConfirmed: boolean, decisionNote: string | null, releaseDate: string | null, submittedAt: string | null, updatedAt: string, lockedFields: Array<string>, availableActions: Array<WorkflowAction>, manuscript: { id: string, fileName: string, sizeBytes: number, downloadUrl: string } | null, readiness: Array<{ step: Step, field: string, message: string }> };

export type MySubmissionsQueryVariables = Exact<{ [key: string]: never; }>;


export type MySubmissionsQuery = { mySubmissions: Array<{ id: string, status: SubmissionStatus, version: number, title: string | null, form: Form | null, synopsis: string | null, wordCount: number | null, season: Season | null, timeSensitive: boolean, scheduleNote: string, penName: string, bio: string | null, rightsConfirmed: boolean, decisionNote: string | null, releaseDate: string | null, submittedAt: string | null, updatedAt: string, lockedFields: Array<string>, availableActions: Array<WorkflowAction>, manuscript: { id: string, fileName: string, sizeBytes: number, downloadUrl: string } | null, readiness: Array<{ step: Step, field: string, message: string }> }>, notifications: Array<{ id: string, subject: string, body: string, createdAt: string, readAt: string | null, submissionId: string }> };

export type SubmissionQueryVariables = Exact<{
  id: string | number;
}>;


export type SubmissionQuery = { submission: { id: string, status: SubmissionStatus, version: number, title: string | null, form: Form | null, synopsis: string | null, wordCount: number | null, season: Season | null, timeSensitive: boolean, scheduleNote: string, penName: string, bio: string | null, rightsConfirmed: boolean, decisionNote: string | null, releaseDate: string | null, submittedAt: string | null, updatedAt: string, lockedFields: Array<string>, availableActions: Array<WorkflowAction>, author: { name: string }, editor: { id: string, name: string } | null, manuscript: { id: string, fileName: string, sizeBytes: number, downloadUrl: string } | null, readiness: Array<{ step: Step, field: string, message: string }> } | null };

export type CreateDraftMutationVariables = Exact<{
  input: DraftInput;
}>;


export type CreateDraftMutation = { createDraft:
    | { __typename: 'ConflictError', message: string }
    | { __typename: 'ForbiddenError', message: string }
    | { __typename: 'InvalidTransitionError', message: string }
    | { __typename: 'MutationCreateDraftSuccess', data: { id: string, status: SubmissionStatus, version: number, title: string | null, form: Form | null, synopsis: string | null, wordCount: number | null, season: Season | null, timeSensitive: boolean, scheduleNote: string, penName: string, bio: string | null, rightsConfirmed: boolean, decisionNote: string | null, releaseDate: string | null, submittedAt: string | null, updatedAt: string, lockedFields: Array<string>, availableActions: Array<WorkflowAction>, manuscript: { id: string, fileName: string, sizeBytes: number, downloadUrl: string } | null, readiness: Array<{ step: Step, field: string, message: string }> } }
    | { __typename: 'NotFoundError', message: string }
    | { __typename: 'NotSignedInError', message: string }
    | { __typename: 'ValidationError', message: string, problems: Array<{ field: string, message: string }> }
   };

export type SaveDraftMutationVariables = Exact<{
  id: string | number;
  version: number;
  input: DraftInput;
}>;


export type SaveDraftMutation = { saveDraft:
    | { __typename: 'ConflictError', message: string, currentVersion: number }
    | { __typename: 'ForbiddenError', message: string }
    | { __typename: 'InvalidTransitionError', message: string }
    | { __typename: 'LockedFieldError', message: string, fields: Array<string> }
    | { __typename: 'MutationSaveDraftSuccess', data: { id: string, status: SubmissionStatus, version: number, title: string | null, form: Form | null, synopsis: string | null, wordCount: number | null, season: Season | null, timeSensitive: boolean, scheduleNote: string, penName: string, bio: string | null, rightsConfirmed: boolean, decisionNote: string | null, releaseDate: string | null, submittedAt: string | null, updatedAt: string, lockedFields: Array<string>, availableActions: Array<WorkflowAction>, manuscript: { id: string, fileName: string, sizeBytes: number, downloadUrl: string } | null, readiness: Array<{ step: Step, field: string, message: string }> } }
    | { __typename: 'NotFoundError', message: string }
    | { __typename: 'NotSignedInError', message: string }
    | { __typename: 'ValidationError', message: string, problems: Array<{ field: string, message: string }> }
   };

export type UploadManuscriptMutationVariables = Exact<{
  id: string | number;
  version: number;
  file: File;
}>;


export type UploadManuscriptMutation = { uploadManuscript:
    | { __typename: 'ConflictError', message: string }
    | { __typename: 'ForbiddenError', message: string }
    | { __typename: 'InvalidTransitionError', message: string }
    | { __typename: 'MutationUploadManuscriptSuccess', data: { id: string, status: SubmissionStatus, version: number, title: string | null, form: Form | null, synopsis: string | null, wordCount: number | null, season: Season | null, timeSensitive: boolean, scheduleNote: string, penName: string, bio: string | null, rightsConfirmed: boolean, decisionNote: string | null, releaseDate: string | null, submittedAt: string | null, updatedAt: string, lockedFields: Array<string>, availableActions: Array<WorkflowAction>, manuscript: { id: string, fileName: string, sizeBytes: number, downloadUrl: string } | null, readiness: Array<{ step: Step, field: string, message: string }> } }
    | { __typename: 'NotFoundError', message: string }
    | { __typename: 'NotSignedInError', message: string }
    | { __typename: 'UploadRejectedError', message: string }
    | { __typename: 'ValidationError', message: string }
   };

export type SubmitSubmissionMutationVariables = Exact<{
  id: string | number;
  version: number;
}>;


export type SubmitSubmissionMutation = { submitSubmission:
    | { __typename: 'ConflictError', message: string }
    | { __typename: 'ForbiddenError', message: string }
    | { __typename: 'IncompleteSubmissionError', message: string, issues: Array<{ step: Step, field: string, message: string }> }
    | { __typename: 'InvalidTransitionError', message: string }
    | { __typename: 'MutationSubmitSubmissionSuccess', data: { id: string, status: SubmissionStatus, version: number, title: string | null, form: Form | null, synopsis: string | null, wordCount: number | null, season: Season | null, timeSensitive: boolean, scheduleNote: string, penName: string, bio: string | null, rightsConfirmed: boolean, decisionNote: string | null, releaseDate: string | null, submittedAt: string | null, updatedAt: string, lockedFields: Array<string>, availableActions: Array<WorkflowAction>, manuscript: { id: string, fileName: string, sizeBytes: number, downloadUrl: string } | null, readiness: Array<{ step: Step, field: string, message: string }> } }
    | { __typename: 'NotFoundError', message: string }
    | { __typename: 'NotSignedInError', message: string }
    | { __typename: 'ValidationError', message: string }
   };

export type WithdrawSubmissionMutationVariables = Exact<{
  id: string | number;
  version: number;
}>;


export type WithdrawSubmissionMutation = { withdrawSubmission:
    | { __typename: 'ConflictError', message: string }
    | { __typename: 'ForbiddenError', message: string }
    | { __typename: 'InvalidTransitionError', message: string }
    | { __typename: 'MutationWithdrawSubmissionSuccess', data: { id: string, status: SubmissionStatus, version: number, title: string | null, form: Form | null, synopsis: string | null, wordCount: number | null, season: Season | null, timeSensitive: boolean, scheduleNote: string, penName: string, bio: string | null, rightsConfirmed: boolean, decisionNote: string | null, releaseDate: string | null, submittedAt: string | null, updatedAt: string, lockedFields: Array<string>, availableActions: Array<WorkflowAction>, manuscript: { id: string, fileName: string, sizeBytes: number, downloadUrl: string } | null, readiness: Array<{ step: Step, field: string, message: string }> } }
    | { __typename: 'NotFoundError', message: string }
    | { __typename: 'NotSignedInError', message: string }
    | { __typename: 'ValidationError', message: string }
   };

export type ReviseSubmissionMutationVariables = Exact<{
  id: string | number;
}>;


export type ReviseSubmissionMutation = { reviseSubmission:
    | { __typename: 'ConflictError', message: string }
    | { __typename: 'ForbiddenError', message: string }
    | { __typename: 'InvalidTransitionError', message: string }
    | { __typename: 'MutationReviseSubmissionSuccess', data: { id: string, status: SubmissionStatus, version: number, title: string | null, form: Form | null, synopsis: string | null, wordCount: number | null, season: Season | null, timeSensitive: boolean, scheduleNote: string, penName: string, bio: string | null, rightsConfirmed: boolean, decisionNote: string | null, releaseDate: string | null, submittedAt: string | null, updatedAt: string, lockedFields: Array<string>, availableActions: Array<WorkflowAction>, manuscript: { id: string, fileName: string, sizeBytes: number, downloadUrl: string } | null, readiness: Array<{ step: Step, field: string, message: string }> } }
    | { __typename: 'NotFoundError', message: string }
    | { __typename: 'NotSignedInError', message: string }
    | { __typename: 'ValidationError', message: string }
   };

export type DuplicateSubmissionMutationVariables = Exact<{
  id: string | number;
}>;


export type DuplicateSubmissionMutation = { duplicateSubmission:
    | { __typename: 'ConflictError', message: string }
    | { __typename: 'ForbiddenError', message: string }
    | { __typename: 'InvalidTransitionError', message: string }
    | { __typename: 'MutationDuplicateSubmissionSuccess', data: { id: string } }
    | { __typename: 'NotFoundError', message: string }
    | { __typename: 'NotSignedInError', message: string }
    | { __typename: 'ValidationError', message: string }
   };

export type ReviewQueueQueryVariables = Exact<{
  statuses?: Array<SubmissionStatus> | SubmissionStatus | null | undefined;
  after?: string | null | undefined;
}>;


export type ReviewQueueQuery = { reviewQueue:
    | { __typename: 'ForbiddenError', message: string }
    | { __typename: 'NotSignedInError', message: string }
    | { __typename: 'QueryReviewQueueSuccess', data: { nodes: Array<{ id: string, status: SubmissionStatus, title: string | null, form: Form | null, submittedAt: string | null, author: { name: string }, editor: { name: string } | null }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } } }
    | { __typename: 'ValidationError', message: string }
   };

export type ClaimSubmissionMutationVariables = Exact<{
  id: string | number;
}>;


export type ClaimSubmissionMutation = { claimSubmission:
    | { __typename: 'ConflictError', message: string }
    | { __typename: 'ForbiddenError', message: string }
    | { __typename: 'InvalidTransitionError', message: string }
    | { __typename: 'MutationClaimSubmissionSuccess', data: { id: string, status: SubmissionStatus, version: number, availableActions: Array<WorkflowAction>, editor: { id: string, name: string } | null } }
    | { __typename: 'NotFoundError', message: string }
    | { __typename: 'NotSignedInError', message: string }
    | { __typename: 'ValidationError', message: string }
   };

export type AcceptSubmissionMutationVariables = Exact<{
  id: string | number;
  releaseDate: string;
}>;


export type AcceptSubmissionMutation = { acceptSubmission:
    | { __typename: 'ConflictError', message: string }
    | { __typename: 'ForbiddenError', message: string }
    | { __typename: 'InvalidTransitionError', message: string }
    | { __typename: 'MutationAcceptSubmissionSuccess', data: { id: string, status: SubmissionStatus, version: number, releaseDate: string | null, availableActions: Array<WorkflowAction> } }
    | { __typename: 'NotFoundError', message: string }
    | { __typename: 'NotSignedInError', message: string }
    | { __typename: 'ValidationError', message: string, problems: Array<{ field: string, message: string }> }
   };

export type DeclineSubmissionMutationVariables = Exact<{
  id: string | number;
  note: string;
}>;


export type DeclineSubmissionMutation = { declineSubmission:
    | { __typename: 'ConflictError', message: string }
    | { __typename: 'ForbiddenError', message: string }
    | { __typename: 'InvalidTransitionError', message: string }
    | { __typename: 'MutationDeclineSubmissionSuccess', data: { id: string, status: SubmissionStatus, version: number, decisionNote: string | null, availableActions: Array<WorkflowAction> } }
    | { __typename: 'NotFoundError', message: string }
    | { __typename: 'NotSignedInError', message: string }
    | { __typename: 'ValidationError', message: string, problems: Array<{ field: string, message: string }> }
   };

export const SubmissionFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SubmissionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Submission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"synopsis"}},{"kind":"Field","name":{"kind":"Name","value":"wordCount"}},{"kind":"Field","name":{"kind":"Name","value":"season"}},{"kind":"Field","name":{"kind":"Name","value":"timeSensitive"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleNote"}},{"kind":"Field","name":{"kind":"Name","value":"penName"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"rightsConfirmed"}},{"kind":"Field","name":{"kind":"Name","value":"decisionNote"}},{"kind":"Field","name":{"kind":"Name","value":"releaseDate"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lockedFields"}},{"kind":"Field","name":{"kind":"Name","value":"availableActions"}},{"kind":"Field","name":{"kind":"Name","value":"manuscript"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fileName"}},{"kind":"Field","name":{"kind":"Name","value":"sizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"downloadUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"readiness"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"step"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<SubmissionFieldsFragment, unknown>;
export const MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}},{"kind":"Field","name":{"kind":"Name","value":"press"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"timeZone"}},{"kind":"Field","name":{"kind":"Name","value":"today"}}]}}]}}]} as unknown as DocumentNode<MeQuery, MeQueryVariables>;
export const SignInDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SignIn"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signIn"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MutationSignInSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"data"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Error"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<SignInMutation, SignInMutationVariables>;
export const MarkNotificationsReadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"MarkNotificationsRead"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"markNotificationsRead"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MutationMarkNotificationsReadSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"data"}}]}}]}}]}}]} as unknown as DocumentNode<MarkNotificationsReadMutation, MarkNotificationsReadMutationVariables>;
export const SignOutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SignOut"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signOut"}}]}}]} as unknown as DocumentNode<SignOutMutation, SignOutMutationVariables>;
export const MySubmissionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MySubmissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mySubmissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SubmissionFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"notifications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}},{"kind":"Field","name":{"kind":"Name","value":"submissionId"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SubmissionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Submission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"synopsis"}},{"kind":"Field","name":{"kind":"Name","value":"wordCount"}},{"kind":"Field","name":{"kind":"Name","value":"season"}},{"kind":"Field","name":{"kind":"Name","value":"timeSensitive"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleNote"}},{"kind":"Field","name":{"kind":"Name","value":"penName"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"rightsConfirmed"}},{"kind":"Field","name":{"kind":"Name","value":"decisionNote"}},{"kind":"Field","name":{"kind":"Name","value":"releaseDate"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lockedFields"}},{"kind":"Field","name":{"kind":"Name","value":"availableActions"}},{"kind":"Field","name":{"kind":"Name","value":"manuscript"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fileName"}},{"kind":"Field","name":{"kind":"Name","value":"sizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"downloadUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"readiness"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"step"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<MySubmissionsQuery, MySubmissionsQueryVariables>;
export const SubmissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Submission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"submission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SubmissionFields"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"editor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SubmissionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Submission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"synopsis"}},{"kind":"Field","name":{"kind":"Name","value":"wordCount"}},{"kind":"Field","name":{"kind":"Name","value":"season"}},{"kind":"Field","name":{"kind":"Name","value":"timeSensitive"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleNote"}},{"kind":"Field","name":{"kind":"Name","value":"penName"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"rightsConfirmed"}},{"kind":"Field","name":{"kind":"Name","value":"decisionNote"}},{"kind":"Field","name":{"kind":"Name","value":"releaseDate"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lockedFields"}},{"kind":"Field","name":{"kind":"Name","value":"availableActions"}},{"kind":"Field","name":{"kind":"Name","value":"manuscript"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fileName"}},{"kind":"Field","name":{"kind":"Name","value":"sizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"downloadUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"readiness"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"step"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<SubmissionQuery, SubmissionQueryVariables>;
export const CreateDraftDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateDraft"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DraftInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createDraft"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MutationCreateDraftSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"data"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SubmissionFields"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Error"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ValidationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"problems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SubmissionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Submission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"synopsis"}},{"kind":"Field","name":{"kind":"Name","value":"wordCount"}},{"kind":"Field","name":{"kind":"Name","value":"season"}},{"kind":"Field","name":{"kind":"Name","value":"timeSensitive"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleNote"}},{"kind":"Field","name":{"kind":"Name","value":"penName"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"rightsConfirmed"}},{"kind":"Field","name":{"kind":"Name","value":"decisionNote"}},{"kind":"Field","name":{"kind":"Name","value":"releaseDate"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lockedFields"}},{"kind":"Field","name":{"kind":"Name","value":"availableActions"}},{"kind":"Field","name":{"kind":"Name","value":"manuscript"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fileName"}},{"kind":"Field","name":{"kind":"Name","value":"sizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"downloadUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"readiness"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"step"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<CreateDraftMutation, CreateDraftMutationVariables>;
export const SaveDraftDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveDraft"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"version"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DraftInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveDraft"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"version"},"value":{"kind":"Variable","name":{"kind":"Name","value":"version"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MutationSaveDraftSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"data"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SubmissionFields"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Error"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ValidationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"problems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ConflictError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currentVersion"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LockedFieldError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SubmissionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Submission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"synopsis"}},{"kind":"Field","name":{"kind":"Name","value":"wordCount"}},{"kind":"Field","name":{"kind":"Name","value":"season"}},{"kind":"Field","name":{"kind":"Name","value":"timeSensitive"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleNote"}},{"kind":"Field","name":{"kind":"Name","value":"penName"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"rightsConfirmed"}},{"kind":"Field","name":{"kind":"Name","value":"decisionNote"}},{"kind":"Field","name":{"kind":"Name","value":"releaseDate"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lockedFields"}},{"kind":"Field","name":{"kind":"Name","value":"availableActions"}},{"kind":"Field","name":{"kind":"Name","value":"manuscript"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fileName"}},{"kind":"Field","name":{"kind":"Name","value":"sizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"downloadUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"readiness"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"step"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<SaveDraftMutation, SaveDraftMutationVariables>;
export const UploadManuscriptDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UploadManuscript"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"version"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"file"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"File"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uploadManuscript"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"version"},"value":{"kind":"Variable","name":{"kind":"Name","value":"version"}}},{"kind":"Argument","name":{"kind":"Name","value":"file"},"value":{"kind":"Variable","name":{"kind":"Name","value":"file"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MutationUploadManuscriptSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"data"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SubmissionFields"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Error"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SubmissionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Submission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"synopsis"}},{"kind":"Field","name":{"kind":"Name","value":"wordCount"}},{"kind":"Field","name":{"kind":"Name","value":"season"}},{"kind":"Field","name":{"kind":"Name","value":"timeSensitive"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleNote"}},{"kind":"Field","name":{"kind":"Name","value":"penName"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"rightsConfirmed"}},{"kind":"Field","name":{"kind":"Name","value":"decisionNote"}},{"kind":"Field","name":{"kind":"Name","value":"releaseDate"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lockedFields"}},{"kind":"Field","name":{"kind":"Name","value":"availableActions"}},{"kind":"Field","name":{"kind":"Name","value":"manuscript"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fileName"}},{"kind":"Field","name":{"kind":"Name","value":"sizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"downloadUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"readiness"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"step"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<UploadManuscriptMutation, UploadManuscriptMutationVariables>;
export const SubmitSubmissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SubmitSubmission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"version"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"submitSubmission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"version"},"value":{"kind":"Variable","name":{"kind":"Name","value":"version"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MutationSubmitSubmissionSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"data"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SubmissionFields"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"IncompleteSubmissionError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"issues"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"step"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Error"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SubmissionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Submission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"synopsis"}},{"kind":"Field","name":{"kind":"Name","value":"wordCount"}},{"kind":"Field","name":{"kind":"Name","value":"season"}},{"kind":"Field","name":{"kind":"Name","value":"timeSensitive"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleNote"}},{"kind":"Field","name":{"kind":"Name","value":"penName"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"rightsConfirmed"}},{"kind":"Field","name":{"kind":"Name","value":"decisionNote"}},{"kind":"Field","name":{"kind":"Name","value":"releaseDate"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lockedFields"}},{"kind":"Field","name":{"kind":"Name","value":"availableActions"}},{"kind":"Field","name":{"kind":"Name","value":"manuscript"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fileName"}},{"kind":"Field","name":{"kind":"Name","value":"sizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"downloadUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"readiness"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"step"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<SubmitSubmissionMutation, SubmitSubmissionMutationVariables>;
export const WithdrawSubmissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"WithdrawSubmission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"version"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"withdrawSubmission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"version"},"value":{"kind":"Variable","name":{"kind":"Name","value":"version"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MutationWithdrawSubmissionSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"data"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SubmissionFields"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Error"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SubmissionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Submission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"synopsis"}},{"kind":"Field","name":{"kind":"Name","value":"wordCount"}},{"kind":"Field","name":{"kind":"Name","value":"season"}},{"kind":"Field","name":{"kind":"Name","value":"timeSensitive"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleNote"}},{"kind":"Field","name":{"kind":"Name","value":"penName"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"rightsConfirmed"}},{"kind":"Field","name":{"kind":"Name","value":"decisionNote"}},{"kind":"Field","name":{"kind":"Name","value":"releaseDate"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lockedFields"}},{"kind":"Field","name":{"kind":"Name","value":"availableActions"}},{"kind":"Field","name":{"kind":"Name","value":"manuscript"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fileName"}},{"kind":"Field","name":{"kind":"Name","value":"sizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"downloadUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"readiness"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"step"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<WithdrawSubmissionMutation, WithdrawSubmissionMutationVariables>;
export const ReviseSubmissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReviseSubmission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reviseSubmission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MutationReviseSubmissionSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"data"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SubmissionFields"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Error"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SubmissionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Submission"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"synopsis"}},{"kind":"Field","name":{"kind":"Name","value":"wordCount"}},{"kind":"Field","name":{"kind":"Name","value":"season"}},{"kind":"Field","name":{"kind":"Name","value":"timeSensitive"}},{"kind":"Field","name":{"kind":"Name","value":"scheduleNote"}},{"kind":"Field","name":{"kind":"Name","value":"penName"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"rightsConfirmed"}},{"kind":"Field","name":{"kind":"Name","value":"decisionNote"}},{"kind":"Field","name":{"kind":"Name","value":"releaseDate"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lockedFields"}},{"kind":"Field","name":{"kind":"Name","value":"availableActions"}},{"kind":"Field","name":{"kind":"Name","value":"manuscript"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fileName"}},{"kind":"Field","name":{"kind":"Name","value":"sizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"downloadUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"readiness"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"step"}},{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<ReviseSubmissionMutation, ReviseSubmissionMutationVariables>;
export const DuplicateSubmissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DuplicateSubmission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"duplicateSubmission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MutationDuplicateSubmissionSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"data"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Error"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<DuplicateSubmissionMutation, DuplicateSubmissionMutationVariables>;
export const ReviewQueueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ReviewQueue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"statuses"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SubmissionStatus"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reviewQueue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"statuses"},"value":{"kind":"Variable","name":{"kind":"Name","value":"statuses"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"10"}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"QueryReviewQueueSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"data"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"form"}},{"kind":"Field","name":{"kind":"Name","value":"submittedAt"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"editor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Error"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<ReviewQueueQuery, ReviewQueueQueryVariables>;
export const ClaimSubmissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ClaimSubmission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"claimSubmission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MutationClaimSubmissionSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"data"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"availableActions"}},{"kind":"Field","name":{"kind":"Name","value":"editor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Error"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<ClaimSubmissionMutation, ClaimSubmissionMutationVariables>;
export const AcceptSubmissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AcceptSubmission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"releaseDate"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"acceptSubmission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"releaseDate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"releaseDate"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MutationAcceptSubmissionSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"data"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"releaseDate"}},{"kind":"Field","name":{"kind":"Name","value":"availableActions"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ValidationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"problems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Error"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<AcceptSubmissionMutation, AcceptSubmissionMutationVariables>;
export const DeclineSubmissionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeclineSubmission"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"note"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"declineSubmission"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"note"},"value":{"kind":"Variable","name":{"kind":"Name","value":"note"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MutationDeclineSubmissionSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"data"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"decisionNote"}},{"kind":"Field","name":{"kind":"Name","value":"availableActions"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ValidationError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"problems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"field"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Error"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<DeclineSubmissionMutation, DeclineSubmissionMutationVariables>;