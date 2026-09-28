ALTER TABLE schedule_entries ADD COLUMN sort_index INTEGER NOT NULL DEFAULT 0;
-- Preserve the order in which older jobs were entered, including jobs saved in one batch.
UPDATE schedule_entries SET sort_index=(
 SELECT COUNT(*) FROM schedule_entries previous
 WHERE previous.kind=schedule_entries.kind
   AND previous.day=schedule_entries.day
   AND previous.rowid<=schedule_entries.rowid
) WHERE kind IN ('weekly','daily');
