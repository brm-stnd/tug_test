import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CardsService } from './cards.service';
import { Card, CardStatus } from './entities/card.entity';
import {
  CardSpendingCounter,
  PeriodType,
} from './entities/card-spending-counter.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import * as helpers from '../../common/utils/helpers';

jest.mock('../../common/utils/helpers', () => ({
  hashCardNumber: jest.fn((num) => `hashed_${num}`),
  maskCardNumber: jest.fn((num) => `****${num.slice(-4)}`),
  getDailyPeriodKey: jest.fn(() => '2026-02-03'),
  getMonthlyPeriodKey: jest.fn(() => '2026-02'),
}));

describe('CardsService', () => {
  let service: CardsService;
  let cardRepository: jest.Mocked<Repository<Card>>;
  let counterRepository: jest.Mocked<Repository<CardSpendingCounter>>;
  let organizationsService: jest.Mocked<OrganizationsService>;

  const mockOrganization = {
    id: 'org-123',
    name: 'Test Org',
    timezone: 'UTC',
  };

  const mockCard: Card = {
    id: 'card-123',
    organizationId: 'org-123',
    cardNumber: '****1234',
    cardNumberHash: 'hashed_1234567890123456',
    status: CardStatus.ACTIVE,
    dailyLimit: '500.00',
    monthlyLimit: '5000.00',
    holderName: 'John Doe',
    expiryDate: new Date('2027-12-31'),
    createdAt: new Date(),
    updatedAt: new Date(),
    organization: mockOrganization as any,
    spendingCounters: [],
    transactions: [],
  };

  beforeEach(async () => {
    const mockCardRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockCounterRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockOrganizationsService = {
      findOne: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardsService,
        {
          provide: getRepositoryToken(Card),
          useValue: mockCardRepository,
        },
        {
          provide: getRepositoryToken(CardSpendingCounter),
          useValue: mockCounterRepository,
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

    service = module.get<CardsService>(CardsService);
    cardRepository = module.get(getRepositoryToken(Card));
    counterRepository = module.get(getRepositoryToken(CardSpendingCounter));
    organizationsService = module.get(OrganizationsService);
  });

  describe('findOne', () => {
    it('should return a card when found', async () => {
      cardRepository.findOne.mockResolvedValue(mockCard);

      const result = await service.findOne('card-123');

      expect(result).toEqual(mockCard);
      expect(cardRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'card-123' },
        relations: ['organization'],
      });
    });

    it('should throw NotFoundException when card not found', async () => {
      cardRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByCardNumber', () => {
    it('should return a card when found by card number', async () => {
      cardRepository.findOne.mockResolvedValue(mockCard);

      const result = await service.findByCardNumber('1234567890123456');

      expect(result).toEqual(mockCard);
      expect(helpers.hashCardNumber).toHaveBeenCalledWith('1234567890123456');
    });

    it('should throw NotFoundException when card not found', async () => {
      cardRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByCardNumber('0000000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all cards', async () => {
      const cards = [mockCard];
      cardRepository.find.mockResolvedValue(cards);

      const result = await service.findAll();

      expect(result).toEqual(cards);
    });

    it('should filter by organization ID', async () => {
      const cards = [mockCard];
      cardRepository.find.mockResolvedValue(cards);

      await service.findAll('org-123');

      expect(cardRepository.find).toHaveBeenCalledWith({
        where: { organizationId: 'org-123' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('create', () => {
    it('should create a new card', async () => {
      organizationsService.findOne.mockResolvedValue(mockOrganization as any);
      cardRepository.findOne.mockResolvedValue(null); // No existing card
      cardRepository.create.mockReturnValue(mockCard);
      cardRepository.save.mockResolvedValue(mockCard);

      const result = await service.create({
        organizationId: 'org-123',
        cardNumber: '1234567890123456',
        holderName: 'John Doe',
      });

      expect(result).toEqual(mockCard);
      expect(organizationsService.findOne).toHaveBeenCalledWith('org-123');
    });

    it('should throw ConflictException when card number exists', async () => {
      organizationsService.findOne.mockResolvedValue(mockOrganization as any);
      cardRepository.findOne.mockResolvedValue(mockCard);

      await expect(
        service.create({
          organizationId: 'org-123',
          cardNumber: '1234567890123456',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getSpending', () => {
    it('should return spending summary with counters', async () => {
      cardRepository.findOne.mockResolvedValue(mockCard);

      const dailyCounter: CardSpendingCounter = {
        id: 'counter-1',
        cardId: 'card-123',
        periodType: PeriodType.DAILY,
        periodKey: '2026-02-03',
        amountSpent: '100.00',
        transactionCount: 2,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        card: null,
      };

      const monthlyCounter: CardSpendingCounter = {
        id: 'counter-2',
        cardId: 'card-123',
        periodType: PeriodType.MONTHLY,
        periodKey: '2026-02',
        amountSpent: '500.00',
        transactionCount: 10,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        card: null,
      };

      counterRepository.findOne
        .mockResolvedValueOnce(dailyCounter)
        .mockResolvedValueOnce(monthlyCounter);

      const result = await service.getSpending('card-123', 'UTC');

      expect(result).toEqual({
        dailySpent: '100.00',
        dailyRemaining: '400.00',
        monthlySpent: '500.00',
        monthlyRemaining: '4500.00',
        periodDate: '2026-02-03',
      });
    });

    it('should return zero spending when no counters exist', async () => {
      cardRepository.findOne.mockResolvedValue(mockCard);
      counterRepository.findOne.mockResolvedValue(null);

      const result = await service.getSpending('card-123', 'UTC');

      expect(result.dailySpent).toBe('0');
      expect(result.monthlySpent).toBe('0');
    });
  });

  describe('validateCardForTransaction', () => {
    it('should return valid for active card within limits', async () => {
      cardRepository.findOne.mockResolvedValue(mockCard);
      counterRepository.findOne.mockResolvedValue(null);

      const result = await service.validateCardForTransaction(
        'card-123',
        '100.00',
        'UTC',
      );

      expect(result.valid).toBe(true);
    });

    it('should return invalid for inactive card', async () => {
      const inactiveCard = { ...mockCard, status: CardStatus.BLOCKED };
      cardRepository.findOne.mockResolvedValue(inactiveCard);

      const result = await service.validateCardForTransaction(
        'card-123',
        '100.00',
        'UTC',
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('CARD_INACTIVE');
    });

    it('should return invalid when daily limit exceeded', async () => {
      cardRepository.findOne.mockResolvedValue(mockCard);

      const dailyCounter: CardSpendingCounter = {
        id: 'counter-1',
        cardId: 'card-123',
        periodType: PeriodType.DAILY,
        periodKey: '2026-02-03',
        amountSpent: '450.00',
        transactionCount: 5,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        card: null,
      };

      counterRepository.findOne
        .mockResolvedValueOnce(dailyCounter)
        .mockResolvedValueOnce(null);

      const result = await service.validateCardForTransaction(
        'card-123',
        '100.00',
        'UTC',
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('DAILY_LIMIT_EXCEEDED');
    });
  });
});
