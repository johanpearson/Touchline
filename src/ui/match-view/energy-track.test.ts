import { describe, expect, it } from "vitest";
import { createEnergyTrack, energyAt, recordEnergy } from "./energy-track";

describe("energy track", () => {
  it("gives the energy of the latest sample at or before the time asked", () => {
    const track = createEnergyTrack();
    recordEnergy(track, 0, {});
    recordEnergy(track, 60, { a: 99 });
    recordEnergy(track, 120, { a: 98 });
    expect(energyAt(track, 59)).toEqual({});
    expect(energyAt(track, 60)).toEqual({ a: 99 });
    expect(energyAt(track, 119.9)).toEqual({ a: 99 });
    expect(energyAt(track, 500)).toEqual({ a: 98 });
  });

  it("never reads a sample from after the time asked", () => {
    const track = createEnergyTrack();
    recordEnergy(track, 0, { a: 100 });
    recordEnergy(track, 600, { a: 70 });
    expect(energyAt(track, 599)).toEqual({ a: 100 });
  });

  it("replaces the sample of the same time, as a change at that time does", () => {
    const track = createEnergyTrack();
    recordEnergy(track, 60, { a: 90 });
    recordEnergy(track, 60, { a: 90, b: 100 });
    expect(track.samples).toHaveLength(1);
    expect(energyAt(track, 60)).toEqual({ a: 90, b: 100 });
  });

  it("falls back to the first sample before it, and to nothing when empty", () => {
    const track = createEnergyTrack();
    expect(energyAt(track, 10)).toEqual({});
    recordEnergy(track, 300, { a: 80 });
    expect(energyAt(track, 10)).toEqual({ a: 80 });
  });
});
