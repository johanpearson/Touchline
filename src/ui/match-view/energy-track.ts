export type Energy = Readonly<Record<string, number>>;

/** The energy of every player at one engine time. */
export type EnergySample = { time: number; energy: Energy };

/** The engine's energy sampled as it ran, so a view can read it at the director's clock and not at the engine's. */
export type EnergyTrack = { samples: EnergySample[] };

export const createEnergyTrack = (): EnergyTrack => ({ samples: [] });

/** Records the energy at engine `time`; a sample at the same time replaces the last one. Times never go back. */
export const recordEnergy = (track: EnergyTrack, time: number, energy: Energy): void => {
  const last = track.samples.at(-1);
  if (last && last.time >= time) {
    if (last.time === time) track.samples[track.samples.length - 1] = { time, energy };
    return;
  }
  track.samples.push({ time, energy });
};

/**
 * The energy at match `time`: the latest sample at or before it, never one from later. Before the
 * first sample (a match restored in the middle) the first sample stands; with no sample, nobody has
 * played and everyone is at full energy.
 */
export const energyAt = (track: EnergyTrack, time: number): Energy => {
  const { samples } = track;
  for (let i = samples.length - 1; i >= 0; i -= 1) {
    const sample = samples[i];
    if (sample && sample.time <= time) return sample.energy;
  }
  return samples[0]?.energy ?? {};
};
