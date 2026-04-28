// loans.interface.ts
import { LoanModality } from "../types/loan-modality";
import { LoanState } from "../types/loan-state.type";

export interface Loan {
  id: string;
  customer_id: string;
  state: LoanState;
  date: string;
  capital: number;
  capital_balance: number;
  raw_capital: number; // Added for display purposes
  is_refinanced: boolean;
  refinanced_from_loan_id: string | null;
  interest: number;
  fee_value: number;
  fees: number;
  paid_fees: number;
  modality: LoanModality;
  first_expiration_date: string | null;
  last_expected_expiration_date: string | null;
  next_expected_payment: string | null;
  accepted_at: string | null; 
  created_at: string;
  updated_at: string;
}

export interface LoanSummary {
  totalBalance: number;
  lastPaymentDate: string | null;
}
export interface LoanWithCustomer extends Loan {
  customer: {
    first_name: string;
    second_name: string;
    last_names: string;
    dni: string;
  };
}

export interface LoansStats {
  fluctuatingCapital: number;
  portfolioLiquidity: number;
  activeLoans: number;
}

export interface CreateLoanPayload {
  customerId: string;
  raw_capital: number;
  capital: number;
  capital_balance: number;
  interest: number;
  fees: number;
  feeValue: number;
  modality: 'S' | 'Q' | 'M';
}

export interface UpdateLoanPayload {
  raw_capital?: number;
  capital?: number;
  capital_balance?: number;
  interest?: number;
  fees?: number;
  fee_value?: number;
  modality?: 'S' | 'Q' | 'M';
}