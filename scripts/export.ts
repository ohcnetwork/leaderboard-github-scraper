import { getDb } from "@/lib/db";
import { Activity, ActivityDefinition } from "@/types/db";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

async function main() {
  const db = getDb();

  // Check for FLAT_DATA_PATH environment variable
  const flatDataPath = process.env.FLAT_DATA_PATH;
  if (!flatDataPath) {
    throw new Error("FLAT_DATA_PATH environment variable is not set");
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

  // Create output directory
  const outputDir = join(flatDataPath, "activities");
  console.log(`Creating output directory: ${outputDir}`);
  await mkdir(outputDir, { recursive: true });

  // Write JSON files for each contributor
  console.log("Writing JSON files...");
  let filesWritten = 0;

  for (const [contributor, contributorActivities] of activitiesByContributor) {
    const filePath = join(outputDir, `${contributor}.json`);
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
    `✓ Successfully exported ${filesWritten} contributor activity files to ${outputDir}`
  );
}

main();
