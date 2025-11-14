import { Activity, ActivityDefinition } from "@/types/db";
import { PGlite } from "@electric-sql/pglite";

let dbInstance: PGlite | null = null;

/**
 * Initialize and return PGlite database instance
 */
export function getDb(): PGlite {
  const dataPath = process.env.PGLITE_DB_PATH;

  if (!dataPath) {
    throw Error(
      "'PGLITE_DB_PATH' environment needs to be set with a path to the database data."
    );
  }

  // Initialize the database if it doesn't exist, otherwise return the existing instance.
  // This is to avoid creating a new database instance for each call to getDb().
  if (!dbInstance) {
    dbInstance = new PGlite(dataPath);
  }

  return dbInstance;
}

/**
 * Upsert activity definitions to the database
 */
export async function upsertActivityDefinitions() {
  const db = getDb();

  await db.query(`
    INSERT INTO activity_definition (slug, name, description, points, icon)
    VALUES 
      ('${ActivityDefinition.COMMENT_CREATED}', 'Commented', 'Commented on an Issue/PR', 0, 'message-circle'),
      ('${ActivityDefinition.ISSUE_ASSIGNED}', 'Issue Assigned', 'Got an issue assigned', 1, 'user-round-check'),
      ('${ActivityDefinition.PR_REVIEWED}', 'PR Reviewed', 'Reviewed a Pull Request', 2, 'eye'),
      ('${ActivityDefinition.ISSUE_OPENED}', 'Issue Opened', 'Raised an Issue', 2, 'circle-dot'),
      ('${ActivityDefinition.PR_OPENED}', 'PR Opened', 'Opened a Pull Request', 1, 'git-pull-request-create-arrow'),
      ('${ActivityDefinition.PR_MERGED}', 'PR Merged', 'Merged a Pull Request', 7, 'git-merge'),
      ('${ActivityDefinition.PR_COLLABORATED}', 'PR Collaborated', 'Collaborated on a Pull Request', 2, NULL),
      ('${ActivityDefinition.ISSUE_CLOSED}', 'Issue Closed', 'Closed an Issue', 0, NULL),
      ('${ActivityDefinition.COMMIT_CREATED}', 'Commit Created', 'Pushed a commit', 0, 'git-commit-horizontal')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, points = EXCLUDED.points, icon = EXCLUDED.icon;
  `);
}

/**
 * Batch an array into smaller arrays of a given size
 * @param array - The array to batch
 * @param batchSize - The size of each batch
 * @returns An array of arrays
 */
function batchArray<T>(array: T[], batchSize: number): T[][] {
  const result = [];
  for (let i = 0; i < array.length; i += batchSize) {
    result.push(array.slice(i, i + batchSize));
  }
  return result;
}

function getSqlPositionalParamPlaceholders(length: number, cols: number) {
  // $1, $2, $3, $4, $5, $6, $7, $8, $9, ...
  const params = Array.from({ length: length * cols }, (_, i) => `$${i + 1}`);

  // ($1, $2, $3), ($4, $5, $6), ($7, $8, $9), ...
  return batchArray(params, cols)
    .map((p) => `\n        (${p.join(", ")})`)
    .join(", ");
}

export async function addContributors(contributors: string[]) {
  const db = getDb();

  // Remove duplicates from the array
  contributors = [...new Set(contributors)];

  for (const batch of batchArray(contributors, 1000)) {
    const result = await db.query(
      `
      INSERT INTO contributor (username, avatar_url, social_profiles)
      VALUES ${getSqlPositionalParamPlaceholders(batch.length, 3)}
      ON CONFLICT (username) DO NOTHING;
    `,
      batch.flatMap((c) => [
        c,
        `https://avatars.githubusercontent.com/${c}`,
        JSON.stringify({ github: `https://github.com/${c}` }),
      ])
    );

    console.log(
      `Added ${result.affectedRows}/${batch.length} new contributors`
    );
  }
}

export async function addActivities(activities: Activity[]) {
  const db = getDb();

  for (const batch of batchArray(activities, 1000)) {
    const result = await db.query(
      `
      INSERT INTO activity (slug, contributor, activity_definition, title, occured_at, link, text, points, meta)
      VALUES ${getSqlPositionalParamPlaceholders(batch.length, 9)}
      ON CONFLICT (slug) DO UPDATE SET contributor = EXCLUDED.contributor, activity_definition = EXCLUDED.activity_definition, title = EXCLUDED.title, occured_at = EXCLUDED.occured_at, link = EXCLUDED.link;
    `,
      batch.flatMap((a) => [
        a.slug,
        a.contributor,
        a.activity_definition,
        a.title,
        a.occured_at.toISOString(),
        a.link,
        a.text,
        a.points ?? null,
        a.meta ? JSON.stringify(a.meta) : null,
      ])
    );

    console.log(`Added ${result.affectedRows}/${batch.length} new activities`);
  }
}

/**
 * Update the role of bot contributors to 'bot'
 * @param botUsernames - Array of bot usernames to update
 */
export async function updateBotRoles(botUsernames: string[]) {
  if (botUsernames.length === 0) {
    console.log("No bot users to update");
    return;
  }

  const db = getDb();

  // Remove duplicates
  const uniqueBotUsernames = [...new Set(botUsernames)];

  for (const batch of batchArray(uniqueBotUsernames, 1000)) {
    const placeholders = batch.map((_, i) => `$${i + 1}`).join(", ");
    const result = await db.query(
      `
      UPDATE contributor
      SET role = 'bot'
      WHERE username IN (${placeholders});
    `,
      batch
    );

    console.log(
      `Updated ${result.affectedRows}/${batch.length} bot contributors`
    );
  }
}
