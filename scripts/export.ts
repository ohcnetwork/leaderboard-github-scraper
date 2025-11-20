import { getDb } from "@/lib/db";
import { Activity, ActivityDefinition, ContributorBadge } from "@/types/db";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

async function main() {
  const db = getDb();

  // Check for LEADERBOARD_DATA_PATH environment variable
  const flatDataPath = process.env.LEADERBOARD_DATA_PATH;
  if (!flatDataPath) {
    throw new Error("LEADERBOARD_DATA_PATH environment variable is not set");
  }

  // Get all activity definitions managed by this scraper
  const managedActivityDefinitions = Object.values(ActivityDefinition);
  const placeholders = managedActivityDefinitions
    .map((_, i) => `$${i + 1}`)
    .join(", ");

  console.log("Querying activities from database...");
  const result = await db.query<Activity>(
    `SELECT * FROM activity WHERE activity_definition IN (${placeholders})`,
    managedActivityDefinitions
  );
  const activities = result.rows;
  console.log(`Found ${activities.length} activities`);

  // Group activities by contributor
  console.log("Grouping activities by contributor...");
  const activitiesByContributor = new Map<string, Activity[]>();

  for (const activity of activities) {
    const contributor = activity.contributor;
    if (!activitiesByContributor.has(contributor)) {
      activitiesByContributor.set(contributor, []);
    }
    activitiesByContributor.get(contributor)!.push(activity);
  }

  console.log(`Found ${activitiesByContributor.size} unique contributors`);

  // Create output directory for activities
  const activitiesOutputDir = join(flatDataPath, "data", "github", "activities");
  console.log(`Creating activities output directory: ${activitiesOutputDir}`);
  await mkdir(activitiesOutputDir, { recursive: true });

  // Write JSON files for each contributor's activities
  console.log("Writing activity JSON files...");
  let filesWritten = 0;

  for (const [contributor, contributorActivities] of activitiesByContributor) {
    const filePath = join(activitiesOutputDir, `${contributor}.json`);
    await writeFile(
      filePath,
      JSON.stringify(contributorActivities, null, 2),
      "utf-8"
    );
    filesWritten++;

    if (filesWritten % 10 === 0) {
      console.log(
        `Progress: ${filesWritten}/${activitiesByContributor.size} files written`
      );
    }
  }

  console.log(
    `✓ Successfully exported ${filesWritten} contributor activity files to ${activitiesOutputDir}`
  );

  // Export badges
  console.log("\nQuerying badges from database...");
  const badgesResult = await db.query<ContributorBadge>(
    `SELECT * FROM contributor_badge WHERE badge = 'problem_solving'`
  );
  const badges = badgesResult.rows;
  console.log(`Found ${badges.length} Problem Solving badges`);

  // Group badges by contributor
  console.log("Grouping badges by contributor...");
  const badgesByContributor = new Map<string, ContributorBadge[]>();

  for (const badge of badges) {
    const contributor = badge.contributor;
    if (!badgesByContributor.has(contributor)) {
      badgesByContributor.set(contributor, []);
    }
    badgesByContributor.get(contributor)!.push(badge);
  }

  console.log(`Found ${badgesByContributor.size} contributors with badges`);

  // Create output directory for badges
  const badgesOutputDir = join(flatDataPath, "data", "github", "badges");
  console.log(`Creating badges output directory: ${badgesOutputDir}`);
  await mkdir(badgesOutputDir, { recursive: true });

  // Write JSON files for each contributor's badges
  console.log("Writing badge JSON files...");
  let badgeFilesWritten = 0;

  for (const [contributor, contributorBadges] of badgesByContributor) {
    const filePath = join(badgesOutputDir, `${contributor}.json`);
    await writeFile(
      filePath,
      JSON.stringify(contributorBadges, null, 2),
      "utf-8"
    );
    badgeFilesWritten++;

    if (badgeFilesWritten % 10 === 0) {
      console.log(
        `Progress: ${badgeFilesWritten}/${badgesByContributor.size} files written`
      );
    }
  }

  console.log(
    `✓ Successfully exported ${badgeFilesWritten} contributor badge files to ${badgesOutputDir}`
  );
}

main();
