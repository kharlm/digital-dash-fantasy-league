import { describe, expect, it } from "vitest";

import { formatUsPhone, normalizeUsPhone } from "./phone";

describe("normalizeUsPhone", () => {
  it.each(["(407) 555-0134", "407.555.0134", "407-555-0134", "+1 407 555 0134", "14075550134"])(
    "accepts %s",
    (input) => {
      expect(normalizeUsPhone(input)).toBe("+14075550134");
    },
  );

  it.each(["12345", "555-0134", "(107) 555-0134", "", "407555013499"])("rejects %s", (input) => {
    expect(normalizeUsPhone(input)).toBeNull();
  });
});

it("formatUsPhone renders stored numbers for display", () => {
  expect(formatUsPhone("+14075550134")).toBe("(407) 555-0134");
  expect(formatUsPhone(null)).toBe("");
});
