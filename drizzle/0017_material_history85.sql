-- Keep large receipt histories in individual versioned records, without removing history.
INSERT INTO state_records(record_key,body,revision)
SELECT json_array('materialLog',''||json_array(json_extract(p.body,CASE WHEN json_extract(p.record_key,'$[0]')='deletedProjects' THEN '$.project.id' ELSE '$.id' END),COALESCE(json_extract(l.value,'$.id'),'legacy-'||l.key))),l.value,1
FROM state_records p,json_each(p.body,CASE WHEN json_extract(p.record_key,'$[0]')='deletedProjects' THEN '$.project.materialLogs' ELSE '$.materialLogs' END) l
WHERE p.body IS NOT NULL AND json_extract(p.record_key,'$[0]') IN ('projects','deletedProjects') AND json_type(p.body,CASE WHEN json_extract(p.record_key,'$[0]')='deletedProjects' THEN '$.project.materialLogs' ELSE '$.materialLogs' END)='array';
INSERT INTO state_records(record_key,body,revision)
SELECT json_array('materialLogOrder',''||json_array(project_id,bucket)),json_group_array(log_id),1
FROM (SELECT p.record_key,json_extract(p.body,CASE WHEN json_extract(p.record_key,'$[0]')='deletedProjects' THEN '$.project.id' ELSE '$.id' END) AS project_id,
CAST((json_array_length(p.body,CASE WHEN json_extract(p.record_key,'$[0]')='deletedProjects' THEN '$.project.materialLogs' ELSE '$.materialLogs' END)-1-CAST(l.key AS INTEGER))/1000 AS INTEGER) AS bucket,
COALESCE(json_extract(l.value,'$.id'),'legacy-'||l.key) AS log_id FROM state_records p,json_each(p.body,CASE WHEN json_extract(p.record_key,'$[0]')='deletedProjects' THEN '$.project.materialLogs' ELSE '$.materialLogs' END) l
WHERE p.body IS NOT NULL AND json_extract(p.record_key,'$[0]') IN ('projects','deletedProjects') AND json_type(p.body,CASE WHEN json_extract(p.record_key,'$[0]')='deletedProjects' THEN '$.project.materialLogs' ELSE '$.materialLogs' END)='array' ORDER BY p.record_key,CAST(l.key AS INTEGER)) GROUP BY record_key,project_id,bucket;
INSERT INTO state_records(record_key,body,revision)
SELECT json_array('materialLogOrder',''||json_array(json_extract(p.body,CASE WHEN json_extract(p.record_key,'$[0]')='deletedProjects' THEN '$.project.id' ELSE '$.id' END),0)),'[]',1 FROM state_records p
WHERE p.body IS NOT NULL AND json_extract(p.record_key,'$[0]') IN ('projects','deletedProjects') AND json_array_length(p.body,CASE WHEN json_extract(p.record_key,'$[0]')='deletedProjects' THEN '$.project.materialLogs' ELSE '$.materialLogs' END)=0;
UPDATE state_records SET body=CASE WHEN json_extract(record_key,'$[0]')='deletedProjects' THEN json_set(body,'$.project.materialLogs',json('[]'),'$.project._materialLogStorage85',json('true')) ELSE json_set(body,'$.materialLogs',json('[]'),'$._materialLogStorage85',json('true')) END,revision=revision+1 WHERE body IS NOT NULL AND json_extract(record_key,'$[0]') IN ('projects','deletedProjects') AND json_type(body,CASE WHEN json_extract(record_key,'$[0]')='deletedProjects' THEN '$.project.materialLogs' ELSE '$.materialLogs' END)='array';
UPDATE state_storage_meta SET revision=revision+1;
