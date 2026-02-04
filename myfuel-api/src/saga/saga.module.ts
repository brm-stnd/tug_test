import { Module, forwardRef } from '@nestjs/common';
import { SagaOrchestrator } from './saga-orchestrator.service';
import { ProcessTransactionSaga } from './sagas/process-transaction.saga';
import { CardsModule } from '../modules/cards/cards.module';
import { OrganizationsModule } from '../modules/organizations/organizations.module';

@Module({
  imports: [
    forwardRef(() => CardsModule),
    forwardRef(() => OrganizationsModule),
  ],
  providers: [SagaOrchestrator, ProcessTransactionSaga],
  exports: [SagaOrchestrator, ProcessTransactionSaga],
})
export class SagaModule {}
