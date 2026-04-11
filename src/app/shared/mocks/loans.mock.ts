import { Loan } from '../../core/interfaces/loans.interface';

export const LOANS_MOCK: Loan[] = [
    {
        // Carlos - Under Review
        id: 'loan-0001-e001-4a2b-9c1a-111111111111',
        customer_id: 'a1b2c3d4-e001-4a2b-9c1a-111111111111',
        state: 'Under Review',
        date: '2024-11-01T08:00:00.000Z',
        capital: 50000.00,
        capital_balance: 50000.00,        // Not disbursed yet
        interest: 5.00,
        fee_value: 9166.67,
        fees: 6,
        paid_fees: 0,
        modality: 'M',                    // Monthly
        first_expiration_date: null,      // Not accepted yet
        last_expected_expiration_date: null,
        next_expected_payment: null,
        created_at: '2024-11-01T08:00:00.000Z',
        updated_at: '2024-11-01T08:00:00.000Z'
    },
    {
        // María - Denied
        id: 'loan-0002-e002-4a2b-9c1a-222222222222',
        customer_id: 'b2c3d4e5-e002-4a2b-9c1a-222222222222',
        state: 'Denied',
        date: '2024-10-15T09:30:00.000Z',
        capital: 20000.00,
        capital_balance: 20000.00,        // Never disbursed
        interest: 8.00,
        fee_value: 2750.00,
        fees: 8,
        paid_fees: 0,
        modality: 'Q',                    // Biweekly
        first_expiration_date: null,
        last_expected_expiration_date: null,
        next_expected_payment: null,
        created_at: '2024-10-15T09:30:00.000Z',
        updated_at: '2024-10-20T10:00:00.000Z'
    },
    {
        // José - Accepted (In progress, 2 of 6 fees paid)
        id: 'loan-0003-e003-4a2b-9c1a-333333333333',
        customer_id: 'c3d4e5f6-e003-4a2b-9c1a-333333333333',
        state: 'Accepted',
        date: '2024-08-01T10:00:00.000Z',
        capital: 30000.00,
        capital_balance: 20000.00,        // 2 fees paid
        interest: 10.00,
        fee_value: 5500.00,
        fees: 6,
        paid_fees: 2,
        modality: 'M',                    // Monthly
        first_expiration_date: '2024-09-01T00:00:00.000Z',
        last_expected_expiration_date: '2025-02-01T00:00:00.000Z',
        next_expected_payment: '2024-12-01T00:00:00.000Z',
        created_at: '2024-08-01T10:00:00.000Z',
        updated_at: '2024-10-01T10:00:00.000Z'
    },
    {
        // Ana - Paid (All fees completed)
        id: 'loan-0004-e004-4a2b-9c1a-444444444444',
        customer_id: 'd4e5f6g7-e004-4a2b-9c1a-444444444444',
        state: 'Paid',
        date: '2024-05-01T11:00:00.000Z',
        capital: 15000.00,
        capital_balance: 0.00,            // Fully paid
        interest: 6.00,
        fee_value: 3975.00,
        fees: 4,
        paid_fees: 4,
        modality: 'M',                    // Monthly
        first_expiration_date: '2024-06-01T00:00:00.000Z',
        last_expected_expiration_date: '2024-09-01T00:00:00.000Z',
        next_expected_payment: null,      // No more payments
        created_at: '2024-05-01T11:00:00.000Z',
        updated_at: '2024-09-05T11:00:00.000Z'
    }
];