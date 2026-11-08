-- 0001: the initial schema. Users, manuscripts, submissions and notifications, with the
-- workflow's invariants as CHECK constraints so they hold even if application code is wrong.
-- Enumerated columns are text with CHECK lists that mirror the lists in shared/src.
-- There are no triggers: the application sets updated_at and version on every write.

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  role text NOT NULL CHECK (role IN ('AUTHOR', 'EDITOR')),
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower ON users (lower(email));

CREATE TABLE manuscripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users (id),
  file_name text NOT NULL,
  storage_key text NOT NULL UNIQUE,
  media_type text NOT NULL CHECK (media_type IN ('application/pdf', 'text/plain')),
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 5242880),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES users (id),
  editor_id uuid REFERENCES users (id),
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'ACCEPTED', 'DECLINED')),
  version integer NOT NULL DEFAULT 1,
  title text,
  form text CHECK (form IN ('CHAPBOOK', 'ESSAY', 'COLLECTION')),
  synopsis text,
  word_count integer,
  season text CHECK (season IN ('SPRING', 'AUTUMN', 'EITHER')),
  time_sensitive boolean NOT NULL DEFAULT false,
  schedule_note text NOT NULL DEFAULT '',
  pen_name text NOT NULL DEFAULT '',
  bio text,
  rights_confirmed boolean NOT NULL DEFAULT false,
  manuscript_id uuid REFERENCES manuscripts (id),
  decision_note text,
  release_date date,
  submitted_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- The workflow's invariants, enforced even if application code is wrong.
  CONSTRAINT submitted_have_timestamp CHECK (status = 'DRAFT' OR submitted_at IS NOT NULL),
  CONSTRAINT review_has_editor CHECK (status NOT IN ('IN_REVIEW', 'ACCEPTED', 'DECLINED') OR editor_id IS NOT NULL),
  CONSTRAINT accepted_has_release_date CHECK (status <> 'ACCEPTED' OR release_date IS NOT NULL),
  CONSTRAINT declined_has_note CHECK (status <> 'DECLINED' OR decision_note IS NOT NULL)
);
CREATE INDEX submissions_author ON submissions (author_id, updated_at DESC);
-- Keyset pagination for the editors' queue: (status, submitted_at DESC, id DESC).
CREATE INDEX submissions_queue ON submissions (status, submitted_at DESC, id DESC);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES users (id),
  submission_id uuid NOT NULL REFERENCES submissions (id),
  subject text NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_recipient ON notifications (recipient_id, created_at DESC);
