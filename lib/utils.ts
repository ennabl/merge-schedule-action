import type { SimplePullRequest } from "@octokit/webhooks-types";

export function hasScheduleCommand(text: string): boolean {
  return Boolean(text && /(^|\n)\/schedule/.test(text));
}

export function getScheduleDateString(text: string): string {
  if (!text) return "";
  return text.match(/(^|\n)\/schedule (.*)/)?.pop() ?? "";
}

export function getScheduleDate(text: string): Date {
  return new Date(getScheduleDateString(text));
}

export function isValidDate(date: Date): boolean {
  return !isNaN(date.getTime());
}

export function stringifyDate(date: Date): string {
  const dateTimeString = date.toISOString().split(".")[0];
  const [day, time] = dateTimeString.split("T");
  return `${day} ${time}`;
}

export function isFork(pullRequest: SimplePullRequest): boolean {
  return pullRequest.head.repo.fork;
}

type MergeMethod = "merge" | "squash" | "rebase";

export function isValidMergeMethod(method: string): method is MergeMethod {
  return ["merge", "squash", "rebase"].includes(method);
}
