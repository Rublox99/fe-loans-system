import { LoanModality } from "../types/loan-modality";
import { LoanState } from "../types/loan-state.type";

export interface Loan {
  id: string;
  customer_id: string;
  state: LoanState;
  date: string;
  capital: number;
  capital_balance: number;
  interest: number;
  fee_value: number;
  fees: number;
  paid_fees: number;
  modality: LoanModality;
  first_expiration_date: string | null;
  last_expected_expiration_date: string | null;
  next_expected_payment: string | null;
  created_at: string;
  updated_at: string;
}