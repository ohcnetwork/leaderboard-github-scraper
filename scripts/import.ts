import { addActivities, addContributors } from "@/lib/db";
import { Activity } from "@/types/db";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

async function main() {
  // Check for FLAT_DATA_PATH environment variable
  const flatDataPath = process.env.FLAT_DATA_PATH;
  if (!flatDataPath) {
    throw new Error("FLAT_DATA_PATH environment variable is not set");
  }

  const inputDir = join(flatDataPath, "activities");
  console.log(`Reading JSON files from: ${inputDir}`);

  // Check if directory exists
  if (!existsSync(inputDir)) {
    console.log(`Directory does not exist: ${inputDir}`);
    console.log("Skipping import.");
    return;
  }

  // Read all JSON files from the directory
  const files = await readdir(inputDir);
  const jsonFiles = files.filter((file) => file.endsWith(".json"));
  console.log(`Found ${jsonFiles.length} JSON files`);

  if (jsonFiles.length === 0) {
    console.log("No JSON files found. Skipping import.");
    return;
  }

  // Read and parse all activities
  const allActivities: Activity[] = [];
  const contributors = new Set<string>();

  for (const file of jsonFiles) {
    const filePath = join(inputDir, file);
    const content = await readFile(filePath, "utf-8");
    const activities = JSON.parse(content) as Activity[];

    // Convert occured_at strings back to Date objects
    for (const activity of activities) {
      activity.occured_at = new Date(activity.occured_at);
      contributors.add(activity.contributor);
    }

    allActivities.push(...activities);

    if (allActivities.length % 1000 === 0) {
      console.log(
        `Progress: Loaded ${allActivities.length} activities so far...`
      );
    }
  }

  console.log(
    `Loaded ${allActivities.length} total activities from ${jsonFiles.length} files`
  );

  // Add contributors first
  console.log(`Adding ${contributors.size} contributors to database...`);
  await addContributors([...contributors]);

  // Add activities to database
  console.log("Adding activities to database...");
  await addActivities(allActivities);

  console.log("✓ Successfully imported all activities");
}

main();
