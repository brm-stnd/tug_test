import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OrganizationsService } from './organizations.service';
import { Organization, OrganizationStatus } from './entities/organization.entity';
import { OrganizationBalance } from './entities/organization-balance.entity';
import { BalanceLedger } from './entities/balance-ledger.entity';
import { NotFoundException } from '@nestjs/common';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let organizationRepository: jest.Mocked<Repository<Organization>>;
  let balanceRepository: jest.Mocked<Repository<OrganizationBalance>>;
  let ledgerRepository: jest.Mocked<Repository<BalanceLedger>>;

  const mockOrganization: Organization = {
    id: 'org-123',
    name: 'Test Organization',
    status: OrganizationStatus.ACTIVE,
    timezone: 'UTC',
    createdAt: new Date(),
    updatedAt: new Date(),
    balance: null,
    cards: [],
  };

  const mockBalance: OrganizationBalance = {
    id: 'balance-123',
    organizationId: 'org-123',
    currentBalance: '1000.00',
    reservedBalance: '0.00',
    currency: 'USD',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    organization: null,
    get availableBalance() {
      return (parseFloat(this.currentBalance) - parseFloat(this.reservedBalance)).toFixed(2);
    },
  };

  beforeEach(async () => {
    const mockOrganizationRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockBalanceRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const mockLedgerRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrganizationRepository,
        },
        {
          provide: getRepositoryToken(OrganizationBalance),
          useValue: mockBalanceRepository,
        },
        {
          provide: getRepositoryToken(BalanceLedger),
          useValue: mockLedgerRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    organizationRepository = module.get(getRepositoryToken(Organization));
    balanceRepository = module.get(getRepositoryToken(OrganizationBalance));
    ledgerRepository = module.get(getRepositoryToken(BalanceLedger));
  });

  describe('findOne', () => {
    it('should return an organization when found', async () => {
      const orgWithBalance = { ...mockOrganization, balance: mockBalance };
      organizationRepository.findOne.mockResolvedValue(orgWithBalance);

      const result = await service.findOne('org-123');

      expect(result).toEqual(orgWithBalance);
      expect(organizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        relations: ['balance'],
      });
    });

    it('should throw NotFoundException when organization not found', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all organizations', async () => {
      const organizations = [mockOrganization];
      organizationRepository.find.mockResolvedValue(organizations);

      const result = await service.findAll();

      expect(result).toEqual(organizations);
      expect(organizationRepository.find).toHaveBeenCalledWith({
        relations: ['balance'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getBalance', () => {
    it('should return balance when found', async () => {
      balanceRepository.findOne.mockResolvedValue(mockBalance);

      const result = await service.getBalance('org-123');

      expect(result).toEqual(mockBalance);
    });

    it('should throw NotFoundException when balance not found', async () => {
      balanceRepository.findOne.mockResolvedValue(null);

      await expect(service.getBalance('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('hasSufficientBalance', () => {
    it('should return true when balance is sufficient', async () => {
      balanceRepository.findOne.mockResolvedValue(mockBalance);

      const result = await service.hasSufficientBalance('org-123', '500.00');

      expect(result).toBe(true);
    });

    it('should return false when balance is insufficient', async () => {
      balanceRepository.findOne.mockResolvedValue(mockBalance);

      const result = await service.hasSufficientBalance('org-123', '1500.00');

      expect(result).toBe(false);
    });
  });

  describe('getLedger', () => {
    it('should return ledger entries', async () => {
      const ledgerEntries = [{ id: 'ledger-1' }, { id: 'ledger-2' }] as BalanceLedger[];
      ledgerRepository.find.mockResolvedValue(ledgerEntries);

      const result = await service.getLedger('org-123', 50);

      expect(result).toEqual(ledgerEntries);
      expect(ledgerRepository.find).toHaveBeenCalledWith({
        where: { organizationId: 'org-123' },
        order: { createdAt: 'DESC' },
        take: 50,
      });
    });
  });
});
