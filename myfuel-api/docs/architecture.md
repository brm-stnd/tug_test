# MyFuel API - Architecture Documentation

## System Overview

```mermaid
graph TB
    subgraph "External Systems"
        FC[Fuel Card Provider]
        MW[Mobile/Web Clients]
    end

    subgraph "API Gateway"
        LB[Load Balancer]
        API[NestJS API Server]
    end

    subgraph "Infrastructure"
        PG[(PostgreSQL)]
        RD[(Redis Cache)]
        RQ[RabbitMQ]
    end

    MW --> LB
    FC --> LB
    LB --> API
    API --> PG
    API --> RD
    API --> RQ
```

## Entity Relationship Diagram

```mermaid
erDiagram
    ORGANIZATION ||--o{ CARD : has
    ORGANIZATION ||--|| ORGANIZATION_BALANCE : has
    ORGANIZATION_BALANCE ||--o{ BALANCE_LEDGER : tracks
    CARD ||--o{ CARD_SPENDING_COUNTER : tracks
    CARD ||--o{ TRANSACTION : processes
    ORGANIZATION ||--o{ TRANSACTION : owns
    ORGANIZATION ||--o{ WEBHOOK_EVENT : receives

    ORGANIZATION {
        uuid id PK
        string name
        enum status
        string timezone
        timestamp created_at
        timestamp updated_at
    }

    ORGANIZATION_BALANCE {
        uuid id PK
        uuid organization_id FK
        decimal current_balance
        decimal reserved_balance
        string currency
        int version
        timestamp created_at
        timestamp updated_at
    }

    BALANCE_LEDGER {
        uuid id PK
        uuid organization_balance_id FK
        enum entry_type
        decimal amount
        decimal balance_before
        decimal balance_after
        string reference
        string description
        timestamp created_at
    }

    CARD {
        uuid id PK
        uuid organization_id FK
        string card_number
        string card_number_hash
        enum status
        decimal daily_limit
        decimal monthly_limit
        string holder_name
        date expiry_date
        timestamp created_at
        timestamp updated_at
    }

    CARD_SPENDING_COUNTER {
        uuid id PK
        uuid card_id FK
        enum period_type
        string period_key
        decimal amount_spent
        int version
        timestamp created_at
        timestamp updated_at
    }

    TRANSACTION {
        uuid id PK
        string idempotency_key UK
        uuid organization_id FK
        uuid card_id FK
        enum status
        decimal amount
        enum decline_reason
        string external_reference
        string station_id
        string station_name
        string fuel_type
        decimal liters
        timestamp processed_at
        timestamp created_at
        timestamp updated_at
    }

    WEBHOOK_EVENT {
        uuid id PK
        uuid organization_id FK
        string idempotency_key UK
        enum event_type
        enum status
        jsonb payload
        int attempts
        timestamp last_attempt_at
        string last_error
        timestamp processed_at
        timestamp created_at
        timestamp updated_at
    }
```

## Transaction Flow - Saga Pattern

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Controller
    participant TS as Transaction Service
    participant SO as Saga Orchestrator
    participant CS as Cards Service
    participant OS as Organizations Service
    participant DB as PostgreSQL
    participant RQ as RabbitMQ

    C->>API: POST /transactions (cardNumber, amount)
    API->>TS: processTransaction(dto)
    TS->>RQ: Emit TRANSACTION_INITIATED event
    TS->>SO: Execute ProcessTransactionSaga

    Note over SO: Step 1: Validate Card
    SO->>CS: validateCardForTransaction()
    CS->>DB: Check card status, expiry, limits
    CS-->>SO: CardValidation result

    alt Card Invalid
        SO-->>TS: Return DECLINED
        TS->>RQ: Emit TRANSACTION_DECLINED
        TS-->>API: TransactionResult (declined)
        API-->>C: 200 OK (declined reason)
    end

    Note over SO: Step 2: Check Balance
    SO->>OS: hasSufficientBalance()
    OS->>DB: Check organization balance
    OS-->>SO: Balance check result

    alt Insufficient Balance
        SO-->>TS: Return DECLINED
        TS->>RQ: Emit TRANSACTION_DECLINED
        TS-->>API: TransactionResult (declined)
        API-->>C: 200 OK (insufficient_balance)
    end

    Note over SO: Step 3: Deduct Balance (with optimistic lock)
    SO->>DB: BEGIN TRANSACTION
    SO->>OS: deductBalance() with version check
    SO->>DB: Create Transaction record
    SO->>DB: Create BalanceLedger entry
    SO->>DB: COMMIT

    Note over SO: Step 4: Update Spending Counters
    SO->>CS: updateSpendingCounters()
    CS->>DB: Upsert daily/monthly counters

    Note over SO: Step 5: Approve Transaction
    SO->>DB: Update transaction status = APPROVED

    SO-->>TS: SagaResult (success)
    TS->>RQ: Emit TRANSACTION_APPROVED
    TS-->>API: TransactionResult (approved)
    API-->>C: 200 OK (transactionId, newBalance)
```

## Saga Compensation Flow

```mermaid
sequenceDiagram
    participant SO as Saga Orchestrator
    participant S1 as Step 1: ValidateCard
    participant S2 as Step 2: CheckBalance
    participant S3 as Step 3: DeductBalance
    participant S4 as Step 4: UpdateCounters
    participant S5 as Step 5: Approve

    Note over SO: Normal Execution
    SO->>S1: execute()
    S1-->>SO: ✓ Success
    SO->>S2: execute()
    S2-->>SO: ✓ Success
    SO->>S3: execute()
    S3-->>SO: ✓ Success
    SO->>S4: execute()
    S4-->>SO: ✗ FAILURE

    Note over SO: Compensation Phase (reverse order)
    SO->>S3: compensate() - Refund balance
    S3-->>SO: ✓ Compensated
    SO->>S2: compensate() - No action needed
    S2-->>SO: ✓ Skipped
    SO->>S1: compensate() - No action needed
    S1-->>SO: ✓ Skipped

    SO-->>SO: Mark saga as FAILED
```

## Module Architecture

```mermaid
graph TB
    subgraph "Application Layer"
        AM[App Module]
    end

    subgraph "Feature Modules"
        OM[Organizations Module]
        CM[Cards Module]
        TM[Transactions Module]
        WM[Webhooks Module]
    end

    subgraph "Infrastructure Modules"
        CFM[Config Module]
        DBM[Database Module]
        CAM[Cache Module]
        MSG[Messaging Module]
        SAG[Saga Module]
        HLT[Health Module]
    end

    subgraph "Common Module"
        DTO[DTOs]
        GRD[Guards]
        FLT[Filters]
        INT[Interceptors]
        UTL[Utilities]
    end

    AM --> OM
    AM --> CM
    AM --> TM
    AM --> WM
    AM --> CFM
    AM --> DBM
    AM --> CAM
    AM --> MSG
    AM --> SAG
    AM --> HLT

    OM --> DBM
    OM --> CAM
    CM --> DBM
    CM --> CAM
    CM --> OM
    TM --> CM
    TM --> OM
    TM --> SAG
    TM --> MSG
    WM --> MSG
    WM --> DBM

    SAG --> MSG
```

## Caching Strategy

```mermaid
graph LR
    subgraph "Cache Layer"
        direction TB
        RC[(Redis)]
    end

    subgraph "Cached Data"
        C1[Card Lookup - 1hr TTL]
        C2[Org Metadata - 2hr TTL]
        C3[Spending Limits - 5min TTL]
        C4[Transaction Status - 1min TTL]
    end

    subgraph "Cache Patterns"
        P1[Cache-Aside Read]
        P2[Write-Through]
        P3[Cache Invalidation]
    end

    RC --> C1
    RC --> C2
    RC --> C3
    RC --> C4

    P1 -.-> C1
    P1 -.-> C2
    P2 -.-> C3
    P3 -.-> C4
```

## Optimistic Locking Flow

```mermaid
sequenceDiagram
    participant C1 as Client 1
    participant C2 as Client 2
    participant API as API Server
    participant DB as PostgreSQL

    Note over DB: Balance: $1000, Version: 1

    C1->>API: Deduct $100
    C2->>API: Deduct $200
    
    API->>DB: SELECT balance, version WHERE org_id = X
    DB-->>API: balance: 1000, version: 1
    
    API->>DB: SELECT balance, version WHERE org_id = X
    DB-->>API: balance: 1000, version: 1

    API->>DB: UPDATE SET balance=900, version=2 WHERE version=1
    DB-->>API: Rows affected: 1 ✓
    
    API->>DB: UPDATE SET balance=800, version=2 WHERE version=1
    DB-->>API: Rows affected: 0 ✗

    API-->>C1: Success - New balance: $900
    API-->>C2: Retry or Error (OptimisticLockException)

    Note over DB: Final Balance: $900, Version: 2
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Container Orchestration"
        subgraph "API Tier"
            A1[API Pod 1]
            A2[API Pod 2]
            A3[API Pod N]
        end
        
        subgraph "Data Tier"
            PG[(PostgreSQL)]
            RD[(Redis)]
            RQ[RabbitMQ]
        end
    end

    subgraph "External"
        LB[Load Balancer]
        DNS[DNS]
    end

    DNS --> LB
    LB --> A1
    LB --> A2
    LB --> A3
    
    A1 --> PG
    A2 --> PG
    A3 --> PG
    
    A1 --> RD
    A2 --> RD
    A3 --> RD
    
    A1 --> RQ
    A2 --> RQ
    A3 --> RQ
```

## Security Model

```mermaid
graph TB
    subgraph "Authentication & Authorization"
        API[API Key Guard]
        JWT[JWT Guard]
        WH[Webhook Signature Guard]
    end

    subgraph "Data Protection"
        HASH[Card Number Hashing SHA-256]
        MASK[Card Number Masking]
        ENC[Sensitive Data Encryption]
    end

    subgraph "Input Validation"
        VAL[class-validator]
        TRANS[class-transformer]
        PIPE[ValidationPipe]
    end

    subgraph "Error Handling"
        FILT[Global Exception Filter]
        LOG[Structured Logging]
    end

    API --> HASH
    API --> MASK
    JWT --> VAL
    WH --> TRANS
    PIPE --> FILT
    FILT --> LOG
```
