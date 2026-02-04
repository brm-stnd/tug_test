import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Card, CardStatus } from './entities/card.entity';
import {
  CardSpendingCounter,
  PeriodType,
} from './entities/card-spending-counter.entity';
import { CreateCardDto, UpdateCardDto, CardSpendingDto } from './dto';
import {
  hashCardNumber,
  maskCardNumber,
  getDailyPeriodKey,
  getMonthlyPeriodKey,
} from '../../common/utils/helpers';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);

  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(CardSpendingCounter)
    private readonly counterRepository: Repository<CardSpendingCounter>,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async create(dto: CreateCardDto): Promise<Card> {
    // Verify organization exists
    await this.organizationsService.findOne(dto.organizationId);

    // Check if card number already exists
    const cardHash = hashCardNumber(dto.cardNumber);
    const existing = await this.cardRepository.findOne({
      where: { cardNumberHash: cardHash },
    });

    if (existing) {
      throw new ConflictException('Card number already exists');
    }

    const card = this.cardRepository.create({
      organizationId: dto.organizationId,
      cardNumber: maskCardNumber(dto.cardNumber),
      cardNumberHash: cardHash,
      holderName: dto.holderName,
      dailyLimit: dto.dailyLimit || '500.00',
      monthlyLimit: dto.monthlyLimit || '5000.00',
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      status: CardStatus.ACTIVE,
    } as Partial<Card>);

    const savedCard = await this.cardRepository.save(card);
    this.logger.log(`Created card: ${(savedCard as Card).id} for org: ${dto.organizationId}`);

    return savedCard as Card;
  }

  async findAll(organizationId?: string): Promise<Card[]> {
    const where = organizationId ? { organizationId } : {};
    return this.cardRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Card> {
    const card = await this.cardRepository.findOne({
      where: { id },
      relations: ['organization'],
    });

    if (!card) {
      throw new NotFoundException(`Card with ID ${id} not found`);
    }

    return card;
  }

  async findByCardNumber(cardNumber: string): Promise<Card> {
    const cardHash = hashCardNumber(cardNumber);
    const card = await this.cardRepository.findOne({
      where: { cardNumberHash: cardHash },
      relations: ['organization', 'organization.balance'],
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return card;
  }

  async update(id: string, dto: UpdateCardDto): Promise<Card> {
    const card = await this.findOne(id);
    Object.assign(card, dto);
    await this.cardRepository.save(card);
    return this.findOne(id);
  }

  async getSpending(id: string, timezone = 'UTC'): Promise<CardSpendingDto> {
    const card = await this.findOne(id);
    const now = new Date();

    const dailyKey = getDailyPeriodKey(now, timezone);
    const monthlyKey = getMonthlyPeriodKey(now, timezone);

    const [dailyCounter, monthlyCounter] = await Promise.all([
      this.counterRepository.findOne({
        where: { cardId: id, periodType: PeriodType.DAILY, periodKey: dailyKey },
      }),
      this.counterRepository.findOne({
        where: { cardId: id, periodType: PeriodType.MONTHLY, periodKey: monthlyKey },
      }),
    ]);

    const dailySpent = dailyCounter?.amountSpent || '0';
    const monthlySpent = monthlyCounter?.amountSpent || '0';

    return {
      dailySpent,
      dailyRemaining: (parseFloat(card.dailyLimit) - parseFloat(dailySpent)).toFixed(2),
      monthlySpent,
      monthlyRemaining: (parseFloat(card.monthlyLimit) - parseFloat(monthlySpent)).toFixed(2),
      periodDate: dailyKey,
    };
  }

  /**
   * Check if card can process a transaction of given amount
   */
  async validateCardForTransaction(
    cardId: string,
    amount: string,
    timezone = 'UTC',
  ): Promise<{ valid: boolean; reason?: string }> {
    const card = await this.findOne(cardId);

    if (card.status !== CardStatus.ACTIVE) {
      return { valid: false, reason: 'CARD_INACTIVE' };
    }

    if (card.expiryDate && card.expiryDate < new Date()) {
      return { valid: false, reason: 'CARD_EXPIRED' };
    }

    const spending = await this.getSpending(cardId, timezone);
    const amountNum = parseFloat(amount);

    if (parseFloat(spending.dailyRemaining) < amountNum) {
      return { valid: false, reason: 'DAILY_LIMIT_EXCEEDED' };
    }

    if (parseFloat(spending.monthlyRemaining) < amountNum) {
      return { valid: false, reason: 'MONTHLY_LIMIT_EXCEEDED' };
    }

    return { valid: true };
  }

  /**
   * Update spending counters for a transaction (called within transaction context)
   */
  async updateSpendingCounters(
    cardId: string,
    amount: string,
    timezone: string,
    manager: EntityManager,
  ): Promise<void> {
    const now = new Date();
    const dailyKey = getDailyPeriodKey(now, timezone);
    const monthlyKey = getMonthlyPeriodKey(now, timezone);

    await this.upsertCounter(manager, cardId, PeriodType.DAILY, dailyKey, amount);
    await this.upsertCounter(manager, cardId, PeriodType.MONTHLY, monthlyKey, amount);
  }

  private async upsertCounter(
    manager: EntityManager,
    cardId: string,
    periodType: PeriodType,
    periodKey: string,
    amount: string,
  ): Promise<void> {
    // Try to update existing counter
    const result = await manager
      .createQueryBuilder()
      .update(CardSpendingCounter)
      .set({
        amountSpent: () => `amount_spent + ${parseFloat(amount)}`,
        transactionCount: () => 'transaction_count + 1',
      })
      .where('card_id = :cardId', { cardId })
      .andWhere('period_type = :periodType', { periodType })
      .andWhere('period_key = :periodKey', { periodKey })
      .execute();

    // If no existing counter, create one
    if (result.affected === 0) {
      const counter = manager.create(CardSpendingCounter, {
        cardId,
        periodType,
        periodKey,
        amountSpent: amount,
        transactionCount: 1,
      });

      try {
        await manager.save(counter);
      } catch (error) {
        // Handle race condition - another process may have created it
        if (error.code === '23505') {
          // Unique violation
          await manager
            .createQueryBuilder()
            .update(CardSpendingCounter)
            .set({
              amountSpent: () => `amount_spent + ${parseFloat(amount)}`,
              transactionCount: () => 'transaction_count + 1',
            })
            .where('card_id = :cardId', { cardId })
            .andWhere('period_type = :periodType', { periodType })
            .andWhere('period_key = :periodKey', { periodKey })
            .execute();
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Rollback spending counters (for compensation)
   */
  async rollbackSpendingCounters(
    cardId: string,
    amount: string,
    timezone: string,
    manager: EntityManager,
  ): Promise<void> {
    const now = new Date();
    const dailyKey = getDailyPeriodKey(now, timezone);
    const monthlyKey = getMonthlyPeriodKey(now, timezone);

    await this.decrementCounter(manager, cardId, PeriodType.DAILY, dailyKey, amount);
    await this.decrementCounter(manager, cardId, PeriodType.MONTHLY, monthlyKey, amount);
  }

  private async decrementCounter(
    manager: EntityManager,
    cardId: string,
    periodType: PeriodType,
    periodKey: string,
    amount: string,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(CardSpendingCounter)
      .set({
        amountSpent: () => `GREATEST(0, amount_spent - ${parseFloat(amount)})`,
        transactionCount: () => 'GREATEST(0, transaction_count - 1)',
      })
      .where('card_id = :cardId', { cardId })
      .andWhere('period_type = :periodType', { periodType })
      .andWhere('period_key = :periodKey', { periodKey })
      .execute();
  }
}
