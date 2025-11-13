import { upsertActivityDefinitions } from "@/lib/db";

async function main() {
  await upsertActivityDefinitions();
}

main();
