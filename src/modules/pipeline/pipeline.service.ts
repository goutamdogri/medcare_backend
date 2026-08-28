/**
 * Pipeline orchestration.
 *
 * The pipeline is the "live rollover forecasting" flow that advances the
 * simulated clock by one day, then asks the ML sidecar to run the full chain
 * (forecast → replenishment → transfers → simulation → alerts) against the new
 * date. The sidecar reads the simulated date and writes the generated [OUTPUT]
 * rows directly to the database; the backend never writes those tables.
 */
import { ApiError } from '../../shared/errors/api-errors.js';
import { mlClient } from '../../shared/ml-client.js';
import { logger } from '../../config/logger.js';
import type { PipelineStateRepository } from './pipeline-state.repository.js';

type SidecarTrigger = {
  runId?: string;
  status?: string;
  message?: string;
  asOf?: string | null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class PipelineService {
  constructor(private readonly state: PipelineStateRepository) {}

  /**
   * Advance the simulated clock by one day, then trigger the sidecar to run the
   * full chain for the new date. The backend only advances pipeline_state; the
   * sidecar reads it and writes the outputs.
   */
  async advanceDay(days = 1): Promise<{
    advanced: boolean;
    from: string;
    to: string;
    runId: string | null;
  }> {
    if (!Number.isInteger(days) || days < 1) {
      throw ApiError.badRequest('days must be a positive integer');
    }

    const { from, to } = await this.state.advanceDays(days);

    // Trigger, but swallow a hard sidecar failure after the clock has already
    // advanced: the user can retry the date without losing the clock move.
    let runId: string | null = null;
    try {
      const result = (await mlClient.post('/run/daily', {
        triggered_by: 'api',
      })) as SidecarTrigger;
      runId = result.runId ?? null;
    } catch (err) {
      logger.error({ from, to, err }, 'advance-day: sidecar trigger failed');
    }

    return { advanced: true, from, to, runId };
  }

  /**
   * Retry a full chain for a given as_of_date: first purge all previously
   * generated [OUTPUT] rows for that date, then ask the sidecar to re-execute
   * the chain for that exact date. The simulated clock is NOT advanced.
   */
  async retryDate(asOf: string): Promise<{
    asOf: string;
    purged: Record<string, number>;
    runId: string | null;
  }> {
    if (!DATE_RE.test(asOf)) {
      throw ApiError.badRequest(`Invalid date '${asOf}' — expected YYYY-MM-DD`);
    }

    const purged = await this.state.purgeOutputForDate(asOf);

    let runId: string | null = null;
    try {
      const result = (await mlClient.post('/run/daily', {
        date: asOf,
        triggered_by: 'api',
      })) as SidecarTrigger;
      runId = result.runId ?? null;
    } catch (err) {
      logger.error({ asOf, err }, 'retry-date: sidecar trigger failed');
    }

    return { asOf, purged, runId };
  }

  /** Read the current simulated date (used to report front-end state). */
  async getSimulatedToday(): Promise<{ simulatedToday: string }> {
    const simulatedToday = await this.state.getSimulatedToday();
    return { simulatedToday };
  }

  /** Poll the sidecar for a run's status. */
  async getRunStatus(runId: string) {
    return mlClient.get(`/run/${runId}/status`);
  }
}
