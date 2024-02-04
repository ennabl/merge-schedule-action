import type { SimplePullRequest } from "@octokit/webhooks-types";
import moment from "moment-timezone";

export function hasScheduleCommand(text: string): boolean {
  return Boolean(text && /(^|\n)\/schedule/.test(text));
}

export function getScheduleDateString(text: string): string {
  if (!text) return "";
  return text.match(/(^|\n)\/schedule (.*)/)?.pop() ?? "";
}

export function isValidDate(date: moment.Moment): boolean {
  return date.isValid();
}

export function stringifyDate(date: moment.Moment): string {
  return date.format("MMMM Do YYYY, HH:mm:ss");
}

export function isFork(pullRequest: SimplePullRequest): boolean {
  return pullRequest.head.repo.fork;
}

type MergeMethod = "merge" | "squash" | "rebase";

export function isValidMergeMethod(method: string): method is MergeMethod {
  return ["merge", "squash", "rebase"].includes(method);
}
