export enum ActivityDefinition {
  EXAMPLE_ACTIVITY = "example_activity",
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
