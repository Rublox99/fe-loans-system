import { FeeState } from "../types/fee-state";

export interface Fee {
    id: string;
    loan_id: string;
    user_id: string;
    expiration_date: string;
    payment_date: string | null;
    paid_amount: number | null;
    fee_state: FeeState;
    delay_days: number;
    last_modified: string;
    created_at: string;
}