export const QUEUES = {
  TRANSACTION_QUEUE: 'transaction_queue',
  NOTIFICATION_QUEUE: 'notification_queue',
  DEAD_LETTER_QUEUE: 'dead_letter_queue',
};

export const EXCHANGES = {
  TRANSACTION_EXCHANGE: 'transaction_exchange',
  NOTIFICATION_EXCHANGE: 'notification_exchange',
};

export const ROUTING_KEYS = {
  TRANSACTION_CREATED: 'transaction.created',
  TRANSACTION_APPROVED: 'transaction.approved',
  TRANSACTION_DECLINED: 'transaction.declined',
  TRANSACTION_REVERSED: 'transaction.reversed',
};
