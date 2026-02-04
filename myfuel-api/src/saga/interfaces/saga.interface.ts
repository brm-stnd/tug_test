export enum SagaStatus {
  STARTED = 'STARTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  COMPENSATING = 'COMPENSATING',
  FAILED = 'FAILED',
}

export interface SagaStep<T> {
  name: string;
  execute(data: T): Promise<void>;
  compensate(data: T): Promise<void>;
}

export interface SagaState<T> {
  sagaId: string;
  status: SagaStatus;
  currentStep: number;
  completedSteps: string[];
  data: T;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}
