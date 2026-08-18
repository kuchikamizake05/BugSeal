import { expect, it } from 'vitest';
import { ReportStatus } from '../managed/bugseal/contract/index.js';
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

it('registers a public project with a witness-derived maintainer authority', () => {
  const simulator = new BugSealSimulator(privateState(1, 2, 3));
  const projectId = bytes(10);
  simulator.registerProject(projectId);
  expect(simulator.getLedger().projects.lookup(projectId)).toEqual(
    simulator.deriveMaintainerAuthority(bytes(1)),
  );
});

it('rejects duplicate project registration', () => {
  const simulator = new BugSealSimulator(privateState(1, 2, 3));
  const projectId = bytes(10);
  simulator.registerProject(projectId);
  expect(() => simulator.registerProject(projectId)).toThrow('Project already registered');
});

it('stores only the report commitment, project, and submitted status', () => {
  const simulator = new BugSealSimulator(privateState(1, 2, 3));
  const projectId = bytes(10);
  simulator.registerProject(projectId);
  const reportId = simulator.submitReport(projectId);
  const record = simulator.getLedger().reports.lookup(reportId);
  expect(record.projectId).toEqual(projectId);
  expect(record.status).toEqual(ReportStatus.SUBMITTED);
  expect(reportId).toEqual(simulator.reportCommitment(projectId, bytes(2), bytes(3)));
});

it('rejects reports for unregistered projects', () => {
  const simulator = new BugSealSimulator(privateState(1, 2, 3));
  expect(() => simulator.submitReport(bytes(10))).toThrow('Project is not registered');
});

