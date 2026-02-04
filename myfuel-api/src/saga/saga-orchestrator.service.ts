import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SagaStep, SagaState, SagaStatus } from './interfaces';

@Injectable()
export class SagaOrchestrator<T> {
  private readonly logger = new Logger(SagaOrchestrator.name);
  private steps: SagaStep<T>[] = [];

  addStep(step: SagaStep<T>): this {
    this.steps.push(step);
    return this;
  }

  clearSteps(): this {
    this.steps = [];
    return this;
  }

  async execute(data: T): Promise<SagaState<T>> {
    const state: SagaState<T> = {
      sagaId: uuidv4(),
      status: SagaStatus.STARTED,
      currentStep: 0,
      completedSteps: [],
      data,
      startedAt: new Date(),
    };

    this.logger.log(
      `Starting saga: ${state.sagaId} with ${this.steps.length} steps`,
    );

    try {
      for (let i = 0; i < this.steps.length; i++) {
        state.currentStep = i;
        state.status = SagaStatus.PROCESSING;

        const step = this.steps[i];
        this.logger.log(
          `Saga ${state.sagaId}: Executing step ${i + 1}/${this.steps.length} - ${step.name}`,
        );

        await step.execute(data);
        state.completedSteps.push(step.name);
      }

      state.status = SagaStatus.COMPLETED;
      state.completedAt = new Date();

      this.logger.log(
        `Saga ${state.sagaId}: Completed successfully in ${state.completedAt.getTime() - state.startedAt.getTime()}ms`,
      );

      return state;
    } catch (error) {
      state.error = error.message;
      this.logger.error(
        `Saga ${state.sagaId}: Failed at step ${state.currentStep} - ${error.message}`,
      );

      await this.compensate(state);

      return state;
    }
  }

  private async compensate(state: SagaState<T>): Promise<void> {
    state.status = SagaStatus.COMPENSATING;

    this.logger.log(
      `Saga ${state.sagaId}: Starting compensation for ${state.completedSteps.length} completed steps`,
    );

    // Compensate in reverse order
    for (let i = state.completedSteps.length - 1; i >= 0; i--) {
      const stepName = state.completedSteps[i];
      const step = this.steps.find((s) => s.name === stepName);

      if (step) {
        this.logger.log(
          `Saga ${state.sagaId}: Compensating step - ${step.name}`,
        );
        try {
          await step.compensate(state.data);
        } catch (compensationError) {
          this.logger.error(
            `Saga ${state.sagaId}: Compensation failed for step ${step.name}: ${compensationError.message}`,
          );
          // Continue with other compensations
        }
      }
    }

    state.status = SagaStatus.FAILED;
    state.completedAt = new Date();

    this.logger.log(
      `Saga ${state.sagaId}: Compensation completed, saga marked as FAILED`,
    );
  }
}
