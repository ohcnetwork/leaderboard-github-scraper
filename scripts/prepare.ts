import {
  upsertActivityDefinitions,
  upsertGlobalAggregateDefinitions,
  upsertContributorAggregateDefinitions,
  upsertBadgeDefinition,
} from "@/lib/db";

async function main() {
  await upsertActivityDefinitions();
  await upsertGlobalAggregateDefinitions();
  await upsertContributorAggregateDefinitions();

  // Upsert Problem Solving badge definition
  await upsertBadgeDefinition({
    slug: "problem_solving",
    name: "Problem Solving",
    description: "Awarded for consistently solving problems through merged PRs",
    variants: {
      "1x": {
        description: "Novice - 2 PRs merged",
        svg_url: "/badges/problem-solving-1x.svg",
        requirement: "Get 2 pull requests merged",
      },
      "2x": {
        description: "Intermediate - 16 PRs merged",
        svg_url: "/badges/problem-solving-2x.svg",
        requirement: "Get 16 pull requests merged",
      },
      "3x": {
        description: "Advanced - 128 PRs merged",
        svg_url: "/badges/problem-solving-3x.svg",
        requirement: "Get 128 pull requests merged",
      },
      "4x": {
        description: "Expert - 1024 PRs merged",
        svg_url: "/badges/problem-solving-4x.svg",
        requirement: "Get 1024 pull requests merged",
      },
      "5x": {
        description: "Master - 8192 PRs merged",
        svg_url: "/badges/problem-solving-5x.svg",
        requirement: "Get 8192 pull requests merged",
      },
    },
  });

  console.log("✓ Badge definitions upserted");
}

main();
