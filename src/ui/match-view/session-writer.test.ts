import { describe, expect, it } from "vitest";
import { createSessionWriter, SESSION_WRITE_INTERVAL_MS } from "./session-writer";

const aWriter = () => {
  const written: string[] = [];
  let time = 0;
  const writer = createSessionWriter<string>(
    (value) => written.push(value),
    () => time,
  );
  return { writer, written, at: (ms: number) => void (time = ms) };
};

describe("createSessionWriter", () => {
  it("writes the first throttled value at once", () => {
    const { writer, written } = aWriter();
    writer.throttled("a");
    expect(written).toEqual(["a"]);
  });

  it("holds back throttled values inside the interval", () => {
    const { writer, written, at } = aWriter();
    writer.throttled("a");
    at(SESSION_WRITE_INTERVAL_MS - 1);
    writer.throttled("b");
    expect(written).toEqual(["a"]);
  });

  it("writes again once the interval has passed", () => {
    const { writer, written, at } = aWriter();
    writer.throttled("a");
    at(SESSION_WRITE_INTERVAL_MS);
    writer.throttled("b");
    expect(written).toEqual(["a", "b"]);
  });

  it("writes changes and pauses at once, whatever the interval", () => {
    const { writer, written, at } = aWriter();
    writer.throttled("a");
    at(10);
    writer.now("change");
    expect(written).toEqual(["a", "change"]);
  });

  it("counts the interval from the latest write, immediate ones included", () => {
    const { writer, written, at } = aWriter();
    at(1000);
    writer.now("pause");
    at(1000 + SESSION_WRITE_INTERVAL_MS - 1);
    writer.throttled("tick");
    expect(written).toEqual(["pause"]);
  });
});
