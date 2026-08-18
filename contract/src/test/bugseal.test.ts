import { expect, it } from 'vitest';
import { BugSealSimulator } from './bugseal-simulator.js';
import { bytes, privateState } from './test-data.js';

it('derives the same maintainer authority from the same secret', () => {
  const simulator = new BugSealSimulator(privateState(1, 2, 3));
  expect(simulator.deriveMaintainerAuthority(bytes(1))).toEqual(
    simulator.deriveMaintainerAuthority(bytes(1)),
  );
});

it('domain-separates report commitments by project, digest, and salt', () => {
  const simulator = new BugSealSimulator(privateState(1, 2, 3));
  const base = simulator.reportCommitment(bytes(4), bytes(5), bytes(6));
  expect(simulator.reportCommitment(bytes(7), bytes(5), bytes(6))).not.toEqual(base);
  expect(simulator.reportCommitment(bytes(4), bytes(8), bytes(6))).not.toEqual(base);
  expect(simulator.reportCommitment(bytes(4), bytes(5), bytes(9))).not.toEqual(base);
});

it('keeps the configured witness values in private state', () => {
  const state = privateState(1, 2, 3);
  const simulator = new BugSealSimulator(state);
  expect(simulator.getPrivateState()).toEqual(state);
});
