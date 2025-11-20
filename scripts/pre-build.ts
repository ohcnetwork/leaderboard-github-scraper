import {
  getDb,
  upsertContributorAggregates,
  upsertGlobalAggregates,
} from "@/lib/db";

async function calculateAndUpsertPRAvgTAT() {
  const db = getDb();

  // Query all PR_MERGED activities with pr_avg_tat in meta
  const result = await db.query<{
    contributor: string;
    pr_avg_tat: string;
  }>(
    `SELECT contributor, (meta->>'pr_avg_tat')::numeric as pr_avg_tat
       FROM activity 
       WHERE activity_definition = 'pr_merged' 
         AND meta->>'pr_avg_tat' IS NOT NULL`
  );

  // Calculate per-contributor averages
  const contributorTATs = new Map<string, number[]>();
  const allTATs: number[] = [];

  for (const row of result.rows) {
    const tat = Number(row.pr_avg_tat);
    if (!isNaN(tat)) {
      if (!contributorTATs.has(row.contributor)) {
        contributorTATs.set(row.contributor, []);
      }
      contributorTATs.get(row.contributor)!.push(tat);
      allTATs.push(tat);
    }
  }

  // Prepare contributor aggregates
  const contributorAggregates = Array.from(contributorTATs.entries()).map(
    ([contributor, tats]) => ({
      aggregate: "pr_avg_tat",
      contributor,
      value: {
        type: "duration" as const,
        value: Math.round(tats.reduce((sum, t) => sum + t, 0) / tats.length),
      },
    })
  );

  // Calculate global average
  const globalAvg =
    allTATs.length > 0
      ? Math.round(allTATs.reduce((sum, t) => sum + t, 0) / allTATs.length)
      : null;

  // Upsert aggregates
  if (contributorAggregates.length > 0) {
    await upsertContributorAggregates(contributorAggregates);
    console.log(
      `Updated PR avg TAT for ${contributorAggregates.length} contributors`
    );
  }

  if (globalAvg !== null) {
    await upsertGlobalAggregates([
      {
        slug: "pr_avg_tat",
        name: "PR Avg. Turn-Around Time",
        description:
          "Average time taken to get a PR merged since it has been opened",
        value: {
          type: "duration",
          value: globalAvg,
        },
      },
    ]);
    console.log(`Updated global PR avg TAT: ${globalAvg}ms`);
  }
}

async function main() {
  // Calculate and store PR average turn-around time aggregates
  await calculateAndUpsertPRAvgTAT();
}

main();
