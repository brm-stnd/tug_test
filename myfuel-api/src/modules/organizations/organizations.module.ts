import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { Organization } from './entities/organization.entity';
import { OrganizationBalance } from './entities/organization-balance.entity';
import { BalanceLedger } from './entities/balance-ledger.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, OrganizationBalance, BalanceLedger]),
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
