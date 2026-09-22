const fs = require('fs');
let schema = fs.readFileSync('src/db/schema.ts', 'utf8');

// Remove the wrongly added index from organizations
schema = schema.replace(
  "}, (table) => [\n  index('students_org_idx').on(table.organizationId)\n]);",
  "});"
);

// We still need to add index to students, educationPackages, lessons.
// Let's do it safely by matching the specific table names.
function addIndexToTable(schemaText, tableName, indexConfig) {
  const tableRegex = new RegExp(`(export const ${tableName} = pgTable\\('[^']+', {[\\s\\S]*?\\.\\.\\.timestamps,)(\\n}\\);)`, 'm');
  if (tableRegex.test(schemaText)) {
    return schemaText.replace(tableRegex, `$1\n}, (table) => [\n${indexConfig}\n]);`);
  }
  return schemaText;
}

schema = addIndexToTable(schema, 'students', "  index('students_org_idx').on(table.organizationId)");
schema = addIndexToTable(schema, 'educationPackages', "  index('packages_org_idx').on(table.organizationId),\n  index('packages_student_idx').on(table.studentId)");
schema = addIndexToTable(schema, 'lessons', "  index('lessons_org_idx').on(table.organizationId),\n  index('lessons_teacher_idx').on(table.teacherId),\n  index('lessons_student_idx').on(table.studentId),\n  index('lessons_date_idx').on(table.startTime)");

fs.writeFileSync('src/db/schema.ts', schema);
