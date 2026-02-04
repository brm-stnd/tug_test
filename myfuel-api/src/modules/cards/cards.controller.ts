import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CardsService } from './cards.service';
import {
  CreateCardDto,
  UpdateCardDto,
  CardResponseDto,
} from './dto';

@ApiTags('cards')
@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new fuel card' })
  @ApiResponse({
    status: 201,
    description: 'Card created successfully',
    type: CardResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 409, description: 'Card number already exists' })
  async create(@Body() dto: CreateCardDto): Promise<CardResponseDto> {
    return this.cardsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all fuel cards' })
  @ApiQuery({
    name: 'organizationId',
    required: false,
    type: 'string',
    description: 'Filter by organization',
  })
  @ApiResponse({
    status: 200,
    description: 'List of cards',
    type: [CardResponseDto],
  })
  async findAll(
    @Query('organizationId') organizationId?: string,
  ): Promise<CardResponseDto[]> {
    return this.cardsService.findAll(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get card by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Card details',
    type: CardResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CardResponseDto> {
    return this.cardsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update card' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Card updated',
    type: CardResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCardDto,
  ): Promise<CardResponseDto> {
    return this.cardsService.update(id, dto);
  }

  @Get(':id/spending')
  @ApiOperation({ summary: 'Get card spending summary' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiQuery({
    name: 'timezone',
    required: false,
    type: 'string',
    description: 'Timezone for period calculation',
    example: 'America/New_York',
  })
  @ApiResponse({ status: 200, description: 'Spending summary' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async getSpending(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('timezone') timezone?: string,
  ) {
    return this.cardsService.getSpending(id, timezone || 'UTC');
  }
}
