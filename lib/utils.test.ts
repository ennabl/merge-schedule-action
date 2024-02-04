import timezoneMock from "timezone-mock";
import { test, expect } from "vitest";
import {
  getScheduleDateString,
  isValidMergeMethod,
  isValidDate,
  stringifyDate,
} from "./utils";

timezoneMock.register("UTC");

test("getScheduleDateString", () => {
  expect(getScheduleDateString("")).toBe("");
  expect(getScheduleDateString("/schedule")).toBe("");
  expect(getScheduleDateString("/schedule 2022-06-08")).toBe("2022-06-08");
  expect(getScheduleDateString("/schedule 2022-06-08T12:00:00")).toBe(
    "2022-06-08T12:00:00"
  );
});

test("isValidMergeMethod", () => {
  expect(isValidMergeMethod("merge")).toBe(true);
  expect(isValidMergeMethod("squash")).toBe(true);
  expect(isValidMergeMethod("rebase")).toBe(true);
  expect(isValidMergeMethod("bad")).toBe(false);
});

test("isValidDate", () => {
  expect(isValidDate(new Date("2022-06-08"))).toBe(true);
  expect(isValidDate(new Date("2022-06-08T09:00:00"))).toBe(true);
  expect(isValidDate(new Date("2022-06-08T15:00:00Z"))).toBe(true);
  expect(isValidDate(new Date("2022-16-08"))).toBe(false);
  expect(isValidDate(new Date("2022-16-08T09:00:00"))).toBe(false);
  expect(isValidDate(new Date("2022-16-08T15:00:00Z"))).toBe(false);
});

test("stringifyDate", () => {
  expect(stringifyDate(new Date("2022-06-08"))).toBe("2022-06-08 00:00:00");
  expect(stringifyDate(new Date("2022-06-08T09:00:00"))).toBe(
    "2022-06-08 09:00:00"
  );
  expect(stringifyDate(new Date("2022-06-08T15:00:00Z"))).toBe(
    "2022-06-08 15:00:00"
  );
});
