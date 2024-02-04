import timezoneMock from "timezone-mock";
import { test, expect } from "vitest";
import {
  getScheduleDateString,
  isValidMergeMethod,
  isValidDate,
  stringifyDate,
} from "./utils";
import { localeDateString } from "./locale-date";

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
  expect(isValidDate(localeDateString("2022-06-08"))).toBe(true);
  expect(isValidDate(localeDateString("2022-06-08T09:00:00"))).toBe(true);
  expect(isValidDate(localeDateString("2022-06-08T15:00:00Z"))).toBe(true);
  expect(isValidDate(localeDateString("2022-16-08"))).toBe(false);
  expect(isValidDate(localeDateString("2022-16-08T09:00:00"))).toBe(false);
  expect(isValidDate(localeDateString("2022-16-08T15:00:00Z"))).toBe(false);
});

test("stringifyDate", () => {
  expect(stringifyDate(localeDateString("2022-06-08"))).toBe(
    "June 8th 2022, 00:00:00"
  );
  expect(stringifyDate(localeDateString("2022-06-08T09:00:00"))).toBe(
    "June 8th 2022, 09:00:00"
  );
  expect(stringifyDate(localeDateString("2022-06-08T15:00:00Z"))).toBe(
    "June 8th 2022, 15:00:00"
  );
});
