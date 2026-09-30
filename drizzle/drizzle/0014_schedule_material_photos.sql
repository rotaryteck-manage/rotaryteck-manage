CREATE TABLE IF NOT EXISTS schedule_material_photos (
  id TEXT PRIMARY KEY NOT NULL,
  material_id TEXT NOT NULL,
  photo_key TEXT NOT NULL,
  photo_name TEXT NOT NULL DEFAULT '',
  sort_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS schedule_material_photos_material_idx
ON schedule_material_photos(material_id, sort_index);