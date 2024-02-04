import mockDate from "mockdate";
import timezoneMock from "timezone-mock";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { mockProcessStdout } from "vitest-mock-process";
import {
  cleanupWebhooksFolder,
  generatePullRequestWebhook,
  setupWebhooksFolder,
} from "../test/utils";
import handlePullRequest from "./handle-pull-request";
import * as comment from "./comment";

timezoneMock.register("UTC");
mockDate.set("2022-06-10T00:00:00.000Z");

describe("handlePullRequest", () => {
  beforeAll(() => {
    setupWebhooksFolder("pull-request");
  });

  afterAll(() => {
    cleanupWebhooksFolder("pull-request");
  });

  test("closed pull request", async () => {
    const mockStdout = mockProcessStdout();
    process.env.GITHUB_EVENT_PATH = generatePullRequestWebhook({
      state: "closed",
    });

    await handlePullRequest();

    expect(mockStdout.mock.calls).toEqual([
      [
        "Handling pull request closed for https://github.com/ennabl/merge-schedule-action/pull/2\n",
      ],
      ["Pull request already closed, ignoring\n"],
    ]);
  });

  test("fork pull request", async () => {
    const mockStdout = mockProcessStdout();
    process.env.GITHUB_EVENT_PATH = generatePullRequestWebhook({ fork: true });

    await handlePullRequest();

    expect(mockStdout.mock.calls).toEqual([
      [
        "Handling pull request opened for https://github.com/ennabl/merge-schedule-action/pull/2\n",
      ],
      ["::error::Setting a scheduled merge is not allowed from forks\n"],
    ]);
  });

  test("no schedule command", async () => {
    const mockStdout = mockProcessStdout();
    process.env.GITHUB_EVENT_PATH = generatePullRequestWebhook({ number: 15 });

    await handlePullRequest();

    expect(mockStdout.mock.calls).toEqual([
      [
        "Handling pull request opened for https://github.com/ennabl/merge-schedule-action/pull/15\n",
      ],
      ["No /schedule command found\n"],
    ]);
  });

  test("no schedule command with previous commit", async () => {
    const mockStdout = mockProcessStdout();
    process.env.GITHUB_EVENT_PATH = generatePullRequestWebhook({ number: 15 });

    await handlePullRequest();

    expect(mockStdout.mock.calls).toEqual([
      [
        "Handling pull request opened for https://github.com/ennabl/merge-schedule-action/pull/15\n",
      ],
      ["No /schedule command found\n"],
    ]);
  });

  test("invalid date", async () => {
    const mockStdout = mockProcessStdout();
    const createComment = vi.spyOn(comment, "createComment");
    process.env.GITHUB_EVENT_PATH = generatePullRequestWebhook({ number: 7 });

    await handlePullRequest();

    expect(mockStdout.mock.calls).toEqual([
      [
        "Handling pull request opened for https://github.com/ennabl/merge-schedule-action/pull/7\n",
      ],
      [`Schedule command found in pull request body: \"bad-date\"\n`],
      [
        `Comment created: https://github.com/ennabl/merge-schedule-action/issues/7#issuecomment-72\n`,
      ],
    ]);
    expect(createComment.mock.calls).toHaveLength(1);
    expect(createComment.mock.calls[0][2]).toMatchInlineSnapshot(`
      ":x: **Merge Schedule**
      \\"bad-date\\" is not a valid date
      <!-- Merge Schedule Pull Request Comment -->"
    `);
  });

  test("date in the past", async () => {
    const mockStdout = mockProcessStdout();
    const createComment = vi.spyOn(comment, "createComment");
    process.env.GITHUB_EVENT_PATH = generatePullRequestWebhook({
      body: "Pull request body\n/schedule 2022-06-08",
    });

    await handlePullRequest();

    expect(mockStdout.mock.calls).toEqual([
      [
        "Handling pull request opened for https://github.com/ennabl/merge-schedule-action/pull/2\n",
      ],
      [`Schedule command found in pull request body: \"2022-06-08\"\n`],
      [
        `Comment created: https://github.com/ennabl/merge-schedule-action/issues/2#issuecomment-22\n`,
      ],
    ]);
    expect(createComment.mock.calls).toHaveLength(1);
    expect(createComment.mock.calls[0][2]).toMatchInlineSnapshot(`
      ":warning: **Merge Schedule**
      2022-06-08 00:00:00 is already in the past. Current time is 2022-06-09 18:00:00. Timezone: UTC
      <!-- Merge Schedule Pull Request Comment -->"
    `);
  });

  test("date in the past - custom time zone", async () => {
    const mockStdout = mockProcessStdout();
    const createComment = vi.spyOn(comment, "createComment");
    process.env.GITHUB_EVENT_PATH = generatePullRequestWebhook({
      body: "Pull request body\n/schedule 2022-06-08",
    });
    process.env.INPUT_TIME_ZONE = "Europe/Lisbon";

    await handlePullRequest();

    expect(mockStdout.mock.calls).toEqual([
      [
        "Handling pull request opened for https://github.com/ennabl/merge-schedule-action/pull/2\n",
      ],
      [`Schedule command found in pull request body: "2022-06-08"\n`],
      [
        `Comment created: https://github.com/ennabl/merge-schedule-action/issues/2#issuecomment-22\n`,
      ],
    ]);
    expect(createComment.mock.calls).toHaveLength(1);
    expect(createComment.mock.calls[0][2]).toMatchInlineSnapshot(`
      ":warning: **Merge Schedule**
      2022-06-08 00:00:00 is already in the past. Current time is 2022-06-09 19:00:00. Timezone: Europe/Lisbon
      <!-- Merge Schedule Pull Request Comment -->"
    `);
  });

  test("schedule merge", async () => {
    const mockStdout = mockProcessStdout();
    const createComment = vi.spyOn(comment, "createComment");
    process.env.GITHUB_EVENT_PATH = generatePullRequestWebhook({ number: 16 });

    await handlePullRequest();

    expect(mockStdout.mock.calls).toEqual([
      [
        "Handling pull request opened for https://github.com/ennabl/merge-schedule-action/pull/16\n",
      ],
      [`Schedule command found in pull request body: "2022-06-12"\n`],
      [
        `Comment created: https://github.com/ennabl/merge-schedule-action/issues/16#issuecomment-162\n`,
      ],
    ]);
    expect(createComment.mock.calls).toHaveLength(1);
    expect(createComment.mock.calls[0][2]).toMatchInlineSnapshot(`
      ":hourglass: **Merge Schedule**
      Scheduled to be merged on 2022-06-12 00:00:00 (UTC)
      <!-- Merge Schedule Pull Request Comment -->"
    `);
  });

  test("schedule merge with previous commit", async () => {
    const mockStdout = mockProcessStdout();
    const updateComment = vi.spyOn(comment, "updateComment");
    process.env.GITHUB_EVENT_PATH = generatePullRequestWebhook({ number: 17 });

    await handlePullRequest();

    expect(mockStdout.mock.calls).toEqual([
      [
        "Handling pull request opened for https://github.com/ennabl/merge-schedule-action/pull/17\n",
      ],
      [`Schedule command found in pull request body: "2022-06-12"\n`],
      [
        `Comment updated: https://github.com/ennabl/merge-schedule-action/issues/17#issuecomment-171\n`,
      ],
    ]);
    expect(updateComment.mock.calls).toHaveLength(1);
    expect(updateComment.mock.calls[0][2]).toMatchInlineSnapshot(`
      ":hourglass: **Merge Schedule**
      Scheduled to be merged on 2022-06-12 00:00:00 (UTC)
      <!-- Merge Schedule Pull Request Comment -->"
    `);
  });

  test("schedule merge with previous commit already up to date", async () => {
    const mockStdout = mockProcessStdout();
    const updateComment = vi.spyOn(comment, "updateComment");
    process.env.GITHUB_EVENT_PATH = generatePullRequestWebhook({
      body: "Pull request body\n/schedule 2022-06-12",
      number: 4,
    });

    await handlePullRequest();

    expect(mockStdout.mock.calls).toEqual([
      [
        "Handling pull request opened for https://github.com/ennabl/merge-schedule-action/pull/4\n",
      ],
      [`Schedule command found in pull request body: "2022-06-12"\n`],
      ["Comment already up to date\n"],
    ]);
    expect(updateComment.mock.calls).toHaveLength(0);
  });

  test("schedule merge without date", async () => {
    const mockStdout = mockProcessStdout();
    const createComment = vi.spyOn(comment, "createComment");
    process.env.GITHUB_EVENT_PATH = generatePullRequestWebhook({ number: 18 });

    await handlePullRequest();

    expect(mockStdout.mock.calls).toEqual([
      [
        "Handling pull request opened for https://github.com/ennabl/merge-schedule-action/pull/18\n",
      ],
      [`Schedule command found in pull request body: ""\n`],
      [
        `Comment created: https://github.com/ennabl/merge-schedule-action/issues/18#issuecomment-182\n`,
      ],
    ]);
    expect(createComment.mock.calls).toHaveLength(1);
    expect(createComment.mock.calls[0][2]).toMatchInlineSnapshot(`
      ":x: **Merge Schedule**
      \\"\\" is not a valid date
      <!-- Merge Schedule Pull Request Comment -->"
    `);
  });
});
