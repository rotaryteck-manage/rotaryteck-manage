// This project uses reviewed, sequential SQL migrations; Drizzle's old snapshots must not generate destructive replacements.
console.error('本專案使用 drizzle/*.sql 順序遷移。請新增SQL遷移並執行 npm test；不要用舊ORM快照自動產生遠端結構變更。db/schema.ts 提供目前結構參考。');
process.exitCode=1;
