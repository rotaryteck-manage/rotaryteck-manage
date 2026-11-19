-- Keep per-project material history and per-reel cut history on indexed lookups.
CREATE INDEX IF NOT EXISTS state_material_parent170
 ON state_records(json_extract(json_extract(record_key,'$[1]'),'$[0]'))
 WHERE json_extract(record_key,'$[0]') IN ('materialLog','materialLogOrder');
CREATE INDEX IF NOT EXISTS state_wire_history170
 ON state_records(json_extract(body,'$.reelId'))
 WHERE json_extract(record_key,'$[0]')='wireCuts';
