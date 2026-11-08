-- 0003: an index for the editors' queue across several statuses (ADR 0006).
-- Queue filters with several statuses ("Decided", "All") cannot read records in order from
-- submissions_queue, whose first column is the status. This index serves the order directly.
CREATE INDEX submissions_queue_order ON submissions (submitted_at DESC, id DESC) WHERE status <> 'DRAFT';
