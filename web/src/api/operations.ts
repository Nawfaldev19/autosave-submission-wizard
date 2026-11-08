/**
 * Every GraphQL document the app sends. GraphQL Code Generator reads this file
 * and types each document from server/schema.graphql (`npm run codegen`).
 */

import { graphql } from '../gql';

/** The signed-in user (or null) and the press's name, zone and today's date. */
export const meQuery = graphql(`
  query Me {
    me {
      id
      name
      role
    }
    press {
      name
      timeZone
      today
    }
  }
`);

/** Signs in; on success the server sets the session cookie. */
export const signInMutation = graphql(`
  mutation SignIn($email: String!, $password: String!) {
    signIn(email: $email, password: $password) {
      __typename
      ... on MutationSignInSuccess {
        data {
          id
        }
      }
      ... on Error {
        message
      }
    }
  }
`);

/** Marks all of the author's messages as read. */
export const markNotificationsReadMutation = graphql(`
  mutation MarkNotificationsRead {
    markNotificationsRead {
      __typename
      ... on MutationMarkNotificationsReadSuccess {
        data
      }
    }
  }
`);

/** Ends every session of the account. */
export const signOutMutation = graphql(`
  mutation SignOut {
    signOut
  }
`);

/**
 * Spread by name (`...SubmissionFields`) in the documents below; exported so the
 * code generator and readers can find it in one place.
 * @public
 */
export const submissionFields = graphql(`
  fragment SubmissionFields on Submission {
    id
    status
    version
    title
    form
    synopsis
    wordCount
    season
    timeSensitive
    scheduleNote
    penName
    bio
    rightsConfirmed
    decisionNote
    releaseDate
    submittedAt
    updatedAt
    lockedFields
    availableActions
    manuscript {
      id
      fileName
      sizeBytes
      downloadUrl
    }
    readiness {
      step
      field
      message
    }
  }
`);

/** The author's submissions and messages. */
export const mySubmissionsQuery = graphql(`
  query MySubmissions {
    mySubmissions {
      ...SubmissionFields
    }
    notifications {
      id
      subject
      body
      createdAt
      readAt
      submissionId
    }
  }
`);

/** One submission with every field the wizard and detail pages show. */
export const submissionQuery = graphql(`
  query Submission($id: ID!) {
    submission(id: $id) {
      ...SubmissionFields
      author {
        name
      }
      editor {
        id
        name
      }
    }
  }
`);

/** Saves a new draft (the first save of step 1). */
export const createDraftMutation = graphql(`
  mutation CreateDraft($input: DraftInput!) {
    createDraft(input: $input) {
      __typename
      ... on MutationCreateDraftSuccess {
        data {
          ...SubmissionFields
        }
      }
      ... on Error {
        message
      }
      ... on ValidationError {
        problems {
          field
          message
        }
      }
    }
  }
`);

/** Saves fields of an existing draft, or an accepted submission's editable fields, against a version. */
export const saveDraftMutation = graphql(`
  mutation SaveDraft($id: ID!, $version: Int!, $input: DraftInput!) {
    saveDraft(id: $id, version: $version, input: $input) {
      __typename
      ... on MutationSaveDraftSuccess {
        data {
          ...SubmissionFields
        }
      }
      ... on Error {
        message
      }
      ... on ValidationError {
        problems {
          field
          message
        }
      }
      ... on ConflictError {
        currentVersion
      }
      ... on LockedFieldError {
        fields
      }
    }
  }
`);

/** Uploads the manuscript as a multipart request. */
export const uploadManuscriptMutation = graphql(`
  mutation UploadManuscript($id: ID!, $version: Int!, $file: File!) {
    uploadManuscript(id: $id, version: $version, file: $file) {
      __typename
      ... on MutationUploadManuscriptSuccess {
        data {
          ...SubmissionFields
        }
      }
      ... on Error {
        message
      }
    }
  }
`);

/** Sends a complete draft to the press. */
export const submitMutation = graphql(`
  mutation SubmitSubmission($id: ID!, $version: Int!) {
    submitSubmission(id: $id, version: $version) {
      __typename
      ... on MutationSubmitSubmissionSuccess {
        data {
          ...SubmissionFields
        }
      }
      ... on IncompleteSubmissionError {
        issues {
          step
          field
          message
        }
      }
      ... on Error {
        message
      }
    }
  }
`);

/** Takes an unclaimed submission back to draft. */
export const withdrawMutation = graphql(`
  mutation WithdrawSubmission($id: ID!, $version: Int!) {
    withdrawSubmission(id: $id, version: $version) {
      __typename
      ... on MutationWithdrawSubmissionSuccess {
        data {
          ...SubmissionFields
        }
      }
      ... on Error {
        message
      }
    }
  }
`);

/** Turns a declined submission back into a draft. */
export const reviseMutation = graphql(`
  mutation ReviseSubmission($id: ID!) {
    reviseSubmission(id: $id) {
      __typename
      ... on MutationReviseSubmissionSuccess {
        data {
          ...SubmissionFields
        }
      }
      ... on Error {
        message
      }
    }
  }
`);

/** Starts a new draft from an earlier submission. */
export const duplicateMutation = graphql(`
  mutation DuplicateSubmission($id: ID!) {
    duplicateSubmission(id: $id) {
      __typename
      ... on MutationDuplicateSubmissionSuccess {
        data {
          id
        }
      }
      ... on Error {
        message
      }
    }
  }
`);

/** One page of the editors' queue. */
export const reviewQueueQuery = graphql(`
  query ReviewQueue($statuses: [SubmissionStatus!], $after: String) {
    reviewQueue(statuses: $statuses, first: 10, after: $after) {
      __typename
      ... on QueryReviewQueueSuccess {
        data {
          nodes {
            id
            status
            title
            form
            submittedAt
            author {
              name
            }
            editor {
              name
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
      ... on Error {
        message
      }
    }
  }
`);

/** An editor takes a waiting submission into review. */
export const claimMutation = graphql(`
  mutation ClaimSubmission($id: ID!) {
    claimSubmission(id: $id) {
      __typename
      ... on MutationClaimSubmissionSuccess {
        data {
          id
          status
          version
          availableActions
          editor {
            id
            name
          }
        }
      }
      ... on Error {
        message
      }
    }
  }
`);

/** The claiming editor accepts with a release date. */
export const acceptMutation = graphql(`
  mutation AcceptSubmission($id: ID!, $releaseDate: Date!) {
    acceptSubmission(id: $id, releaseDate: $releaseDate) {
      __typename
      ... on MutationAcceptSubmissionSuccess {
        data {
          id
          status
          version
          releaseDate
          availableActions
        }
      }
      ... on ValidationError {
        problems {
          field
          message
        }
      }
      ... on Error {
        message
      }
    }
  }
`);

/** The claiming editor declines with a note. */
export const declineMutation = graphql(`
  mutation DeclineSubmission($id: ID!, $note: String!) {
    declineSubmission(id: $id, note: $note) {
      __typename
      ... on MutationDeclineSubmissionSuccess {
        data {
          id
          status
          version
          decisionNote
          availableActions
        }
      }
      ... on ValidationError {
        problems {
          field
          message
        }
      }
      ... on Error {
        message
      }
    }
  }
`);
