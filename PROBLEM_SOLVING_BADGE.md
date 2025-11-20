# Problem Solving Badge Implementation

## Overview

The "Problem Solving" badge is awarded to contributors based on the number of pull requests they have successfully merged. This badge has 5 variants representing different levels of achievement.

## Badge Definition

**Name:** Problem Solving  
**Slug:** `problem_solving`  
**Description:** Awarded for consistently solving problems through merged PRs

### Variants

| Variant | Description | Requirement | PRs Needed |
|---------|-------------|-------------|------------|
| 1x | Novice | Get 2 pull requests merged | 2 |
| 2x | Intermediate | Get 16 pull requests merged | 16 |
| 3x | Advanced | Get 128 pull requests merged | 128 |
| 4x | Expert | Get 1024 pull requests merged | 1024 |
| 5x | Master | Get 8192 pull requests merged | 8192 |

The thresholds follow a pattern of powers of 2 (2^1, 2^4, 2^7, 2^10, 2^13), creating an exponential progression that rewards long-term contribution.

## Implementation

### 1. Database Schema

Added badge-related types to `/types/db.ts`:

```typescript
export interface BadgeVariant {
  description: string;
  svg_url: string;
  requirement?: string | null;
}

export interface BadgeDefinition {
  slug: string;
  name: string;
  description: string;
  variants: Record<string, BadgeVariant>;
}

export interface ContributorBadge {
  slug: string; // Format: {badge}__{contributor}__{variant}
  badge: string; // FK to badge_definition.slug
  contributor: string; // FK to contributor.username
  variant: string;
  achieved_on: Date;
  meta: Record<string, unknown> | null;
}
```

### 2. Database Functions

Added to `/lib/db.ts`:

#### `upsertBadgeDefinition(definition: BadgeDefinition)`
Creates or updates a badge definition in the database.

#### `upsertContributorBadges(badges: ContributorBadge[])`
Awards badges to contributors. Uses `ON CONFLICT DO NOTHING` to avoid overwriting existing badge data.

#### `getPRMergedCounts()`
Efficiently queries the database to get PR merged counts for all contributors in a single query:

```sql
SELECT 
  contributor, 
  COUNT(*) as count,
  MIN(occured_at) as first_merged_at
FROM activity 
WHERE activity_definition = 'pr_merged'
GROUP BY contributor
```

### 3. Badge Definition Setup

In `/scripts/prepare.ts`, the badge definition is upserted during the prepare phase:

```typescript
await upsertBadgeDefinition({
  slug: "problem_solving",
  name: "Problem Solving",
  description: "Awarded for consistently solving problems through merged PRs",
  variants: {
    "1x": { description: "Novice - 2 PRs merged", ... },
    "2x": { description: "Intermediate - 16 PRs merged", ... },
    // ... etc
  },
});
```

### 4. Badge Awarding Logic

In `/scripts/pre-build.ts`, badges are automatically awarded:

```typescript
async function awardProblemSolvingBadges() {
  // Get PR merged counts for all contributors (single efficient query)
  const prCounts = await getPRMergedCounts();
  
  // Define thresholds
  const thresholds = [
    { variant: "1x", required: 2 },
    { variant: "2x", required: 16 },
    { variant: "3x", required: 128 },
    { variant: "4x", required: 1024 },
    { variant: "5x", required: 8192 },
  ];
  
  const badgesToAward: ContributorBadge[] = [];
  
  // Check which variants each contributor qualifies for
  for (const [contributor, { count, first_merged_at }] of prCounts.entries()) {
    for (const threshold of thresholds) {
      if (count >= threshold.required) {
        badgesToAward.push({
          slug: `problem_solving__${contributor}__${threshold.variant}`,
          badge: "problem_solving",
          contributor,
          variant: threshold.variant,
          achieved_on: first_merged_at, // Use first merged PR date
          meta: {
            pr_count: count,
            threshold: threshold.required,
            awarded_by: "automated",
          },
        });
      }
    }
  }
  
  // Award all badges (ON CONFLICT DO NOTHING prevents overwrites)
  await upsertContributorBadges(badgesToAward);
}
```

**Key Features:**
- Single efficient query to get all PR counts
- Awards all qualifying variants at once
- Uses first merged PR date as achievement date
- Stores metadata about PR count and threshold
- `ON CONFLICT DO NOTHING` ensures existing badges aren't overwritten

### 5. Export Logic

In `/scripts/export.ts`, badges are exported to JSON files:

```typescript
// Query all Problem Solving badges
const badgesResult = await db.query<ContributorBadge>(
  `SELECT * FROM contributor_badge WHERE badge = 'problem_solving'`
);

// Group by contributor
const badgesByContributor = new Map<string, ContributorBadge[]>();
for (const badge of badges) {
  // ... grouping logic
}

// Write to data/github/badges/{username}.json
for (const [contributor, contributorBadges] of badgesByContributor) {
  const filePath = join(badgesOutputDir, `${contributor}.json`);
  await writeFile(filePath, JSON.stringify(contributorBadges, null, 2));
}
```

### 6. Import Logic

In `/scripts/import.ts`, badges are imported from JSON files:

```typescript
// Read from data/github/badges/{username}.json
const badgesInputDir = join(flatDataPath, "data", "github", "badges");
const badgeJsonFiles = (await readdir(badgesInputDir))
  .filter((file) => file.endsWith(".json"));

// Parse all badge files
const allBadges: ContributorBadge[] = [];
for (const file of badgeJsonFiles) {
  const content = await readFile(join(badgesInputDir, file), "utf-8");
  const badges = JSON.parse(content) as ContributorBadge[];
  
  // Convert date strings back to Date objects
  for (const badge of badges) {
    badge.achieved_on = new Date(badge.achieved_on);
  }
  
  allBadges.push(...badges);
}

// Import to database
await upsertContributorBadges(allBadges);
```

## File Structure

```
data/
└── github/
    ├── activities/
    │   ├── user1.json
    │   ├── user2.json
    │   └── ...
    └── badges/
        ├── user1.json  # New: Badge data per contributor
        ├── user2.json
        └── ...
```

## Usage

### 1. Setup (One-time)

```bash
# Set environment variables
export PGLITE_DB_PATH=/path/to/db
export LEADERBOARD_DATA_PATH=/path/to/data

# Prepare database (creates badge definition)
tsx scripts/prepare.ts
```

### 2. Award Badges

```bash
# Run pre-build to award badges based on current PR counts
tsx scripts/pre-build.ts
```

Output:
```
Awarding Problem Solving badges...
Found 150 contributors with merged PRs
Awarding 287 badge variants...
Awarded 45/287 new contributor badges
✓ Problem Solving badges awarded
```

### 3. Export Badges

```bash
# Export badges to JSON files
tsx scripts/export.ts
```

Output:
```
Querying badges from database...
Found 287 Problem Solving badges
Grouping badges by contributor...
Found 150 contributors with badges
Creating badges output directory: /path/to/data/github/badges
Writing badge JSON files...
✓ Successfully exported 150 contributor badge files
```

### 4. Import Badges

```bash
# Import badges from JSON files
tsx scripts/import.ts
```

Output:
```
Reading badge JSON files from: /path/to/data/github/badges
Found 150 badge JSON files
Loaded 287 total badges from 150 files
Adding badges to database...
Awarded 0/287 new contributor badges  # 0 because they already exist
✓ Successfully imported all badges
```

## Badge Slug Format

Badges use a composite slug format: `{badge}__{contributor}__{variant}`

Examples:
- `problem_solving__octocat__1x`
- `problem_solving__octocat__2x`
- `problem_solving__torvalds__5x`

This format ensures:
- Uniqueness (primary key)
- Easy parsing
- Clear relationships
- No collisions

## Metadata

Each badge stores metadata about how it was earned:

```json
{
  "slug": "problem_solving__octocat__3x",
  "badge": "problem_solving",
  "contributor": "octocat",
  "variant": "3x",
  "achieved_on": "2023-05-15",
  "meta": {
    "pr_count": 150,
    "threshold": 128,
    "awarded_by": "automated"
  }
}
```

## Performance

### Efficient Querying

Instead of querying PR counts for each contributor individually (N queries), we use a single GROUP BY query:

```sql
-- ✅ Single efficient query
SELECT contributor, COUNT(*) as count, MIN(occured_at) as first_merged_at
FROM activity 
WHERE activity_definition = 'pr_merged'
GROUP BY contributor

-- ❌ Would be slow: N separate queries
SELECT COUNT(*) FROM activity 
WHERE activity_definition = 'pr_merged' 
  AND contributor = 'user1'
```

### Batch Operations

Badges are awarded in batches of 1000 using the existing `batchArray` utility, ensuring efficient database operations even with thousands of contributors.

### Idempotent Operations

Using `ON CONFLICT DO NOTHING` makes the badge awarding process idempotent:
- Safe to run multiple times
- Won't overwrite existing badge data
- Won't change achievement dates
- Only awards new badges

## Integration with Main Leaderboard

The badge data is exported to `data/github/badges/{username}.json` files, which can be:

1. Committed to the leaderboard data repository
2. Imported by the main leaderboard using its import script
3. Displayed on contributor profiles
4. Used in badge statistics and leaderboards

## Future Enhancements

Potential improvements:

1. **More Badge Types**: Add badges for other achievements (code reviews, issues, etc.)
2. **Badge Revocation**: Remove badges if PR count drops (e.g., PRs are reverted)
3. **Time-based Badges**: Award badges for PRs merged within specific time periods
4. **Quality Metrics**: Consider PR complexity, lines changed, or review feedback
5. **Team Badges**: Award badges for collaborative achievements
6. **Custom Thresholds**: Allow configuration of PR count thresholds

## Testing

To test the badge system:

```bash
# 1. Prepare database with badge definition
tsx scripts/prepare.ts

# 2. Award badges
tsx scripts/pre-build.ts

# 3. Check database
# Query to see awarded badges:
SELECT 
  contributor, 
  variant, 
  achieved_on, 
  meta->>'pr_count' as pr_count
FROM contributor_badge 
WHERE badge = 'problem_solving'
ORDER BY contributor, variant;

# 4. Export and verify JSON files
tsx scripts/export.ts
cat data/github/badges/octocat.json

# 5. Test import (should show 0 new badges if already imported)
tsx scripts/import.ts
```

## Troubleshooting

### No badges awarded

Check if there are any merged PRs:
```sql
SELECT COUNT(*) FROM activity WHERE activity_definition = 'pr_merged';
```

### Badges not exporting

Verify badges exist in database:
```sql
SELECT COUNT(*) FROM contributor_badge WHERE badge = 'problem_solving';
```

### Import shows 0 new badges

This is expected if badges already exist. The system uses `ON CONFLICT DO NOTHING` to prevent overwrites.

## Summary

The Problem Solving badge implementation:

✅ **Efficient**: Single query to get all PR counts  
✅ **Scalable**: Batch operations for thousands of contributors  
✅ **Idempotent**: Safe to run multiple times  
✅ **Preserves Data**: Won't overwrite existing badges  
✅ **Well-structured**: Clear separation of concerns  
✅ **Extensible**: Easy to add more badge types  
✅ **Documented**: Complete metadata about achievements  
✅ **Integrated**: Exports to JSON for main leaderboard  

The badge system is production-ready and can be extended to support additional achievement types in the future.

