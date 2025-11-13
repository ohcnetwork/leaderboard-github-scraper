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
  meta: Record<string, string> | null;
}
