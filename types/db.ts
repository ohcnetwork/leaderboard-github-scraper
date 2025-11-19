export enum ActivityDefinition {
  ISSUE_OPENED = "issue_opened",
  ISSUE_CLOSED = "issue_closed",
  PR_OPENED = "pr_opened",
  PR_CLOSED = "pr_closed",
  PR_MERGED = "pr_merged",
  PR_REVIEWED = "pr_reviewed",
  PR_COLLABORATED = "pr_collaborated",
  ISSUE_ASSIGNED = "issue_assigned",
  COMMENT_CREATED = "comment_created",
  COMMIT_CREATED = "commit_created",
}

export interface Activity {
  slug: string;
  contributor: string;
  activity_definition: ActivityDefinition;
  title: string | null;
  occured_at: Date;
  link: string | null;
  text: string | null;
  points: number | null;
  meta: Record<string, unknown> | null;
}

interface DurationAggregateValue {
  type: "duration";
  value: number;
}

interface NumberAggregateValue {
  type: "number";
  value: number;
}

interface StringAggregateValue {
  type: "string";
  value: string;
}

export type AggregateValue =
  | DurationAggregateValue
  | NumberAggregateValue
  | StringAggregateValue;

interface AggregateDefinitionBase {
  slug: string;
  name: string;
  description: string | null;
}

export interface GlobalAggregate extends AggregateDefinitionBase {
  value: AggregateValue | null;
}

export type ContributorAggregateDefinition = AggregateDefinitionBase;

export interface ContributorAggregate {
  aggregate: string; // FK to contributor_aggregate_definition.slug
  contributor: string; // FK to contributor.username
  value: AggregateValue;
}
