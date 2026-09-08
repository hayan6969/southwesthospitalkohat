const fs = require('fs');
const text = fs.readFileSync('C:/Users/Mashab jadoon/.gemini/antigravity-cli/brain/c0fe6c41-7586-4b32-a60a-d4468f4123af/.system_generated/steps/433/output.txt', 'utf8');
const m = text.match(/<untrusted-data-[^>]+\r\ns*\(\[.*?\]\)\r\ns*<\/untrusted-data-/s);
if (!m) { console.log('no json'); process.exit(1); }
const dbRows = JSON.parse(m[1]);
const dbCols = {};
for (const r of dbRows) {
  if (!dbCols[r.table_name]) dbCols[r.table_name] = [];
  dbCols[r.table_name].push(r.column_name);
}
const sql = fs.readFileSync('D:/anti gravity/New folder/north west/southwesthospitalkohat/Databse/southwest-schema-v2.sql', 'utf8');
const lines = sql.split('\n');
let currentTable = null;
let tableCols = {};
for (let l of lines) {
  if (l.startsWith('CREATE TABLE IF NOT EXISTS public.')) {
    currentTable = l.split('public.')[1].split(' ')[0].trim();
    tableCols[currentTable] = [];
  } else if (currentTable && l.startsWith('"') && l.includes(' ')) {
    const colName = l.split('"')[1];
    tableCols[currentTable].push(colName);
  } else if (l.startsWith(');')) {
    currentTable = null;
  }
}
for (const [tname, cols] of Object.entries(tableCols)) {
  const dbT = dbCols[tname] || [];
  const missing = cols.filter(c => !dbT.includes(c));
  if (missing.length > 0) console.log(tname, 'missing: ', missing.join(', '));
}
