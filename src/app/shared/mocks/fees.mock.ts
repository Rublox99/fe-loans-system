import { Fee } from '../../core/interfaces/fees.interface';

// Only Accepted & Paid loans have fees (trigger: fn_create_fees_on_loan_accepted)
export const FEES_MOCK: Fee[] = [

    // ─── Loan 3 (José - Accepted, 2 paid / 4 remaining) ────────────────────────

    {
        id: 'fee-00001-e003-4a2b-9c1a-333333333333',
        loan_id: 'loan-0003-e003-4a2b-9c1a-333333333333',
        user_id: 'user-uuid-002',
        expiration_date: '2024-09-01T00:00:00.000Z',
        payment_date: '2024-09-01T08:30:00.000Z',     // Paid on time
        paid_amount: 5500.00,
        fee_state: '2',                                 // Paid
        delay_days: 0,
        last_modified: '2024-09-01T08:30:00.000Z',
        created_at: '2024-08-01T10:00:00.000Z'
    },
    {
        id: 'fee-00002-e003-4a2b-9c1a-333333333333',
        loan_id: 'loan-0003-e003-4a2b-9c1a-333333333333',
        user_id: 'user-uuid-002',
        expiration_date: '2024-10-01T00:00:00.000Z',
        payment_date: '2024-10-05T09:00:00.000Z',     // Paid late
        paid_amount: 5500.00,
        fee_state: '2',                                 // Paid
        delay_days: 4,
        last_modified: '2024-10-05T09:00:00.000Z',
        created_at: '2024-08-01T10:00:00.000Z'
    },
    {
        id: 'fee-00003-e003-4a2b-9c1a-333333333333',
        loan_id: 'loan-0003-e003-4a2b-9c1a-333333333333',
        user_id: 'user-uuid-002',
        expiration_date: '2024-11-01T00:00:00.000Z',
        payment_date: '2024-10-05T09:00:00.000Z',       // Paid (overdue)
        paid_amount: 5500.00,
        fee_state: '3',                                 // Overdue
        delay_days: 5,
        last_modified: '2024-11-06T00:00:00.000Z',
        created_at: '2024-08-01T10:00:00.000Z'
    },
    {
        id: 'fee-00004-e003-4a2b-9c1a-333333333333',
        loan_id: 'loan-0003-e003-4a2b-9c1a-333333333333',
        user_id: 'user-uuid-002',
        expiration_date: '2024-12-01T00:00:00.000Z',
        payment_date: null,
        paid_amount: null,
        fee_state: '1',                                 // Pending
        delay_days: 0,
        last_modified: '2024-08-01T10:00:00.000Z',
        created_at: '2024-08-01T10:00:00.000Z'
    },

    // ─── Loan 4 (Ana - Paid, all 4 fees completed) ─────────────────────────────

    {
        id: 'fee-00001-e004-4a2b-9c1a-444444444444',
        loan_id: 'loan-0004-e004-4a2b-9c1a-444444444444',
        user_id: 'user-uuid-003',
        expiration_date: '2024-06-01T00:00:00.000Z',
        payment_date: '2024-06-01T10:00:00.000Z',
        paid_amount: 3975.00,
        fee_state: '2',                                 // Paid
        delay_days: 0,
        last_modified: '2024-06-01T10:00:00.000Z',
        created_at: '2024-05-01T11:00:00.000Z'
    },
    {
        id: 'fee-00002-e004-4a2b-9c1a-444444444444',
        loan_id: 'loan-0004-e004-4a2b-9c1a-444444444444',
        user_id: 'user-uuid-003',
        expiration_date: '2024-07-01T00:00:00.000Z',
        payment_date: '2024-07-01T09:00:00.000Z',
        paid_amount: 3975.00,
        fee_state: '2',                                 // Paid
        delay_days: 0,
        last_modified: '2024-07-01T09:00:00.000Z',
        created_at: '2024-05-01T11:00:00.000Z'
    },
    {
        id: 'fee-00003-e004-4a2b-9c1a-444444444444',
        loan_id: 'loan-0004-e004-4a2b-9c1a-444444444444',
        user_id: 'user-uuid-003',
        expiration_date: '2024-08-01T00:00:00.000Z',
        payment_date: '2024-08-03T08:00:00.000Z',     // Paid slightly late
        paid_amount: 3975.00,
        fee_state: '2',                                 // Paid
        delay_days: 2,
        last_modified: '2024-08-03T08:00:00.000Z',
        created_at: '2024-05-01T11:00:00.000Z'
    },
    {
        id: 'fee-00004-e004-4a2b-9c1a-444444444444',
        loan_id: 'loan-0004-e004-4a2b-9c1a-444444444444',
        user_id: 'user-uuid-003',
        expiration_date: '2024-09-01T00:00:00.000Z',
        payment_date: '2024-09-01T11:00:00.000Z',
        paid_amount: 3975.00,
        fee_state: '2',                                 // Paid
        delay_days: 0,
        last_modified: '2024-09-01T11:00:00.000Z',
        created_at: '2024-05-01T11:00:00.000Z'
    }
];