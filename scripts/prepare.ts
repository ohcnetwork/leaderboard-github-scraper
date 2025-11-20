import {
  upsertActivityDefinitions,
  upsertGlobalAggregateDefinitions,
  upsertContributorAggregateDefinitions,
} from "@/lib/db";

async function main() {
  await upsertActivityDefinitions();
  await upsertGlobalAggregateDefinitions();
  await upsertContributorAggregateDefinitions();
}

main();
