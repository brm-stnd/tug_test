import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  TransactionsService,
  ProcessTransactionData,
} from './transactions.service';
import {
  Transaction,
  TransactionStatus,
  DeclineReason,
} from './entities/transaction.entity';
import { CardsService } from '../cards/cards.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { NotFoundException } from '@nestjs/common';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionRepository: jest.Mocked<Repository<Transaction>>;
  let cardsService: jest.Mocked<CardsService>;

  const mockTransaction: Transaction = {
    id: 'txn-123',
    idempotencyKey: 'test-key-123',
    organizationId: 'org-123',
    cardId: 'card-123',
    externalReference: 'EXT-001',
    stationId: 'STATION-001',
    stationName: 'Test Station',
    amount: '50.00',
    fuelType: 'DIESEL',
    liters: '45.5',
    status: TransactionStatus.APPROVED,
    declineReason: null,
    metadata: null,
    processedAt: new Date(),
    createdAt: new Date(),
    organization: null,
    card: null,
  };

  beforeEach(async () => {
    const mockTransactionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockCardsService = {
      findByCardNumber: jest.fn(),
      validateCardForTransaction: jest.fn(),
      updateSpendingCounters: jest.fn(),
    };

    const mockOrganizationsService = {
      hasSufficientBalance: jest.fn(),
      deductBalance: jest.fn(),
      getBalance: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: CardsService,
          useValue: mockCardsService,
        },
        {
          provide: OrganizationsService,
          useValue: mockOrganizationsService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    transactionRepository = module.get(getRepositoryToken(Transaction));
    cardsService = module.get(CardsService);
  });

  describe('findOne', () => {
    it('should return a transaction when found', async () => {
      transactionRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.findOne('txn-123');

      expect(result).toEqual(mockTransaction);
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByIdempotencyKey', () => {
    it('should return transaction when found', async () => {
      transactionRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.findByIdempotencyKey('test-key-123');

      expect(result).toEqual(mockTransaction);
    });

    it('should return null when not found', async () => {
      transactionRepository.findOne.mockResolvedValue(null);

      const result = await service.findByIdempotencyKey('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return transactions with filters', async () => {
      const transactions = [mockTransaction];
      transactionRepository.find.mockResolvedValue(transactions);

      const result = await service.findAll('card-123', 'org-123', 50);

      expect(result).toEqual(transactions);
      expect(transactionRepository.find).toHaveBeenCalledWith({
        where: { cardId: 'card-123', organizationId: 'org-123' },
        order: { createdAt: 'DESC' },
        take: 50,
      });
    });
  });

  describe('processTransaction', () => {
    const transactionData: ProcessTransactionData = {
      cardNumber: '1234567890123456',
      amount: '50.00',
      idempotencyKey: 'test-key-456',
      externalReference: 'EXT-002',
      stationId: 'STATION-001',
      stationName: 'Test Station',
      fuelType: 'DIESEL',
      liters: '45.5',
    };

    it('should return existing transaction if idempotency key exists', async () => {
      transactionRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.processTransaction(transactionData);

      expect(result.transactionId).toBe(mockTransaction.id);
      expect(result.status).toBe(mockTransaction.status);
    });

    it('should decline when card not found', async () => {
      transactionRepository.findOne.mockResolvedValue(null);
      cardsService.findByCardNumber.mockRejectedValue(
        new NotFoundException('Card not found'),
      );
      transactionRepository.create.mockReturnValue({
        ...mockTransaction,
        status: TransactionStatus.DECLINED,
        declineReason: DeclineReason.CARD_NOT_FOUND,
      });
      transactionRepository.save.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.DECLINED,
        declineReason: DeclineReason.CARD_NOT_FOUND,
      });

      const result = await service.processTransaction(transactionData);

      expect(result.status).toBe(TransactionStatus.DECLINED);
      expect(result.declineReason).toBe(DeclineReason.CARD_NOT_FOUND);
    });
  });
});
