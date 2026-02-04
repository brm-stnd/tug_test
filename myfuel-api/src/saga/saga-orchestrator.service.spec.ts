import { SagaOrchestrator } from './saga-orchestrator.service';
import { SagaStep, SagaStatus } from './interfaces';

describe('SagaOrchestrator', () => {
  let orchestrator: SagaOrchestrator<TestData>;

  interface TestData {
    value: number;
    step1Executed?: boolean;
    step2Executed?: boolean;
    step3Executed?: boolean;
    step1Compensated?: boolean;
    step2Compensated?: boolean;
  }

  beforeEach(() => {
    orchestrator = new SagaOrchestrator<TestData>();
  });

  describe('execute', () => {
    it('should execute all steps successfully', async () => {
      const step1: SagaStep<TestData> = {
        name: 'Step1',
        execute: async (data) => {
          data.step1Executed = true;
        },
        compensate: async (data) => {
          data.step1Compensated = true;
        },
      };

      const step2: SagaStep<TestData> = {
        name: 'Step2',
        execute: async (data) => {
          data.step2Executed = true;
        },
        compensate: async (data) => {
          data.step2Compensated = true;
        },
      };

      orchestrator.addStep(step1).addStep(step2);

      const data: TestData = { value: 0 };
      const result = await orchestrator.execute(data);

      expect(result.status).toBe(SagaStatus.COMPLETED);
      expect(result.completedSteps).toEqual(['Step1', 'Step2']);
      expect(data.step1Executed).toBe(true);
      expect(data.step2Executed).toBe(true);
    });

    it('should compensate completed steps on failure', async () => {
      const step1: SagaStep<TestData> = {
        name: 'Step1',
        execute: async (data) => {
          data.step1Executed = true;
        },
        compensate: async (data) => {
          data.step1Compensated = true;
        },
      };

      const step2: SagaStep<TestData> = {
        name: 'Step2',
        execute: async (data) => {
          data.step2Executed = true;
        },
        compensate: async (data) => {
          data.step2Compensated = true;
        },
      };

      const step3: SagaStep<TestData> = {
        name: 'Step3',
        execute: async () => {
          throw new Error('Step 3 failed');
        },
        compensate: async (data) => {
          data.step3Executed = false;
        },
      };

      orchestrator.addStep(step1).addStep(step2).addStep(step3);

      const data: TestData = { value: 0 };
      const result = await orchestrator.execute(data);

      expect(result.status).toBe(SagaStatus.FAILED);
      expect(result.error).toBe('Step 3 failed');
      expect(result.completedSteps).toEqual(['Step1', 'Step2']);
      expect(data.step1Compensated).toBe(true);
      expect(data.step2Compensated).toBe(true);
    });

    it('should compensate in reverse order', async () => {
      const compensationOrder: string[] = [];

      const step1: SagaStep<TestData> = {
        name: 'Step1',
        execute: async () => {},
        compensate: async () => {
          compensationOrder.push('Step1');
        },
      };

      const step2: SagaStep<TestData> = {
        name: 'Step2',
        execute: async () => {},
        compensate: async () => {
          compensationOrder.push('Step2');
        },
      };

      const step3: SagaStep<TestData> = {
        name: 'Step3',
        execute: async () => {
          throw new Error('Fail');
        },
        compensate: async () => {},
      };

      orchestrator.addStep(step1).addStep(step2).addStep(step3);

      const data: TestData = { value: 0 };
      await orchestrator.execute(data);

      expect(compensationOrder).toEqual(['Step2', 'Step1']);
    });

    it('should handle compensation errors gracefully', async () => {
      const step1: SagaStep<TestData> = {
        name: 'Step1',
        execute: async (data) => {
          data.step1Executed = true;
        },
        compensate: async () => {
          throw new Error('Compensation failed');
        },
      };

      const step2: SagaStep<TestData> = {
        name: 'Step2',
        execute: async () => {
          throw new Error('Step 2 failed');
        },
        compensate: async () => {},
      };

      orchestrator.addStep(step1).addStep(step2);

      const data: TestData = { value: 0 };
      const result = await orchestrator.execute(data);

      // Should still mark as failed, even with compensation error
      expect(result.status).toBe(SagaStatus.FAILED);
    });

    it('should generate unique saga IDs', async () => {
      const step: SagaStep<TestData> = {
        name: 'Step1',
        execute: async () => {},
        compensate: async () => {},
      };

      orchestrator.addStep(step);

      const result1 = await orchestrator.execute({ value: 1 });
      const result2 = await orchestrator.execute({ value: 2 });

      expect(result1.sagaId).not.toBe(result2.sagaId);
    });
  });

  describe('clearSteps', () => {
    it('should clear all steps', async () => {
      const step: SagaStep<TestData> = {
        name: 'Step1',
        execute: async (data) => {
          data.step1Executed = true;
        },
        compensate: async () => {},
      };

      orchestrator.addStep(step).clearSteps();

      const data: TestData = { value: 0 };
      const result = await orchestrator.execute(data);

      expect(result.completedSteps).toEqual([]);
      expect(data.step1Executed).toBeUndefined();
    });
  });
});
