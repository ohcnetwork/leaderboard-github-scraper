import { addActivities, addContributors, upsertContributorBadges } from "@/lib/db";
import { Activity, ContributorBadge } from "@/types/db";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

async function main() {
  // Check for LEADERBOARD_DATA_PATH environment variable
  const flatDataPath = process.env.LEADERBOARD_DATA_PATH;
  if (!flatDataPath) {
    throw new Error("LEADERBOARD_DATA_PATH environment variable is not set");
  }

  // Import activities
  const activitiesInputDir = join(flatDataPath, "data", "github", "activities");
  console.log(`Reading activity JSON files from: ${activitiesInputDir}`);

  // Check if directory exists
  if (!existsSync(activitiesInputDir)) {
    console.log(`Directory does not exist: ${activitiesInputDir}`);
    console.log("Skipping activities import.");
  } else {
    // Read all JSON files from the directory
    const files = await readdir(activitiesInputDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));
    console.log(`Found ${jsonFiles.length} activity JSON files`);

    if (jsonFiles.length === 0) {
      console.log("No activity JSON files found. Skipping activities import.");
    } else {
      // Read and parse all activities
      const allActivities: Activity[] = [];
      const contributors = new Set<string>();

      for (const file of jsonFiles) {
        const filePath = join(activitiesInputDir, file);
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
  }

  // Import badges
  const badgesInputDir = join(flatDataPath, "data", "github", "badges");
  console.log(`\nReading badge JSON files from: ${badgesInputDir}`);

  // Check if badges directory exists
  if (!existsSync(badgesInputDir)) {
    console.log(`Directory does not exist: ${badgesInputDir}`);
    console.log("Skipping badges import.");
  } else {
    // Read all JSON files from the badges directory
    const badgeFiles = await readdir(badgesInputDir);
    const badgeJsonFiles = badgeFiles.filter((file) => file.endsWith(".json"));
    console.log(`Found ${badgeJsonFiles.length} badge JSON files`);

    if (badgeJsonFiles.length === 0) {
      console.log("No badge JSON files found. Skipping badges import.");
    } else {
      // Read and parse all badges
      const allBadges: ContributorBadge[] = [];

      for (const file of badgeJsonFiles) {
        const filePath = join(badgesInputDir, file);
        const content = await readFile(filePath, "utf-8");
        const badges = JSON.parse(content) as ContributorBadge[];

        // Convert achieved_on strings back to Date objects
        for (const badge of badges) {
          badge.achieved_on = new Date(badge.achieved_on);
        }

        allBadges.push(...badges);

        if (allBadges.length % 100 === 0) {
          console.log(
            `Progress: Loaded ${allBadges.length} badges so far...`
          );
        }
      }

      console.log(
        `Loaded ${allBadges.length} total badges from ${badgeJsonFiles.length} files`
      );

      // Add badges to database
      console.log("Adding badges to database...");
      await upsertContributorBadges(allBadges);

      console.log("✓ Successfully imported all badges");
    }
  }
}

main();
