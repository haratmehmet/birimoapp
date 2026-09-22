const fs = require('fs');

let schema = fs.readFileSync('src/db/schema.ts', 'utf8');

if (!schema.includes('index,')) {
  schema = schema.replace('unique,', 'unique,\n  index,');
}

// Add index to students
if (!schema.includes("index('students_org_idx')")) {
  schema = schema.replace(
    '...timestamps,\n});',
    "...timestamps,\n}, (table) => [\n  index('students_org_idx').on(table.organizationId)\n]);"
  );
}

// Add index to educationPackages
if (!schema.includes("index('packages_org_idx')")) {
  schema = schema.replace(
    "paidAmount: varchar('paid_amount', { length: 50 }).default('0').notNull(), // Ödenen Tutar (TL)\n  ...timestamps,\n});",
    "paidAmount: varchar('paid_amount', { length: 50 }).default('0').notNull(), // Ödenen Tutar (TL)\n  ...timestamps,\n}, (table) => [\n  index('packages_org_idx').on(table.organizationId),\n  index('packages_student_idx').on(table.studentId)\n]);"
  );
}

// Add index to lessons
if (!schema.includes("index('lessons_org_idx')")) {
  schema = schema.replace(
    "seriesId: varchar('series_id', { length: 255 }), // Tekrarlayan dersleri bağlamak için\n  ...timestamps,\n});",
    "seriesId: varchar('series_id', { length: 255 }), // Tekrarlayan dersleri bağlamak için\n  ...timestamps,\n}, (table) => [\n  index('lessons_org_idx').on(table.organizationId),\n  index('lessons_teacher_idx').on(table.teacherId),\n  index('lessons_student_idx').on(table.studentId),\n  index('lessons_date_idx').on(table.startTime)\n]);"
  );
}

fs.writeFileSync('src/db/schema.ts', schema);
console.log('Indexes added successfully.');
