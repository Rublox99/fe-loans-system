import { ReportCustomer } from "../../core/interfaces/report-customers.interface";

export const REPORT_CUSTOMERS_MOCK: ReportCustomer[] = [
    {
        id: 'a1f3c9b2-7d44-4a91-8c1e-1a2b3c4d5e01',
        first_name: 'Juan',
        second_name: 'Carlos',
        last_names: 'Pérez López',
        dni: '0801199012345',
        payment_grade: '2',
        capital: 5000,
        paid_amount: 3200,
        loan_state: 'IP',
        date_of_approval: '2025-01-15',
        next_fee_due_date: '2026-04-20'
    },
    {
        id: 'b2e4d0c3-8a55-4c12-9d2f-2b3c4d5e6f02',
        first_name: 'María',
        second_name: 'Elena',
        last_names: 'Gómez Martínez',
        dni: '0802198523456',
        payment_grade: '1',
        capital: 10000,
        paid_amount: 10000,
        loan_state: 'C',
        date_of_approval: '2024-06-10',
        next_fee_due_date: 'N/A'
    },
    {
        id: 'c3f5e1d4-9b66-4d23-ae3f-3c4d5e6f7g03',
        first_name: 'Luis',
        second_name: 'Alberto',
        last_names: 'Ramírez Díaz',
        dni: '0803199524567',
        payment_grade: '5',
        capital: 7500,
        paid_amount: 0,
        loan_state: 'R',
        date_of_approval: 'N/A',
        next_fee_due_date: 'N/A'
    },
    {
        id: 'd4g6f2e5-ac77-4e34-bf4f-4d5e6f7g8h04',
        first_name: 'Ana',
        second_name: 'Lucía',
        last_names: 'Fernández Cruz',
        dni: '0804200025678',
        payment_grade: '3',
        capital: 3000,
        paid_amount: 1500,
        loan_state: 'A',
        date_of_approval: '2026-02-01',
        next_fee_due_date: '2026-04-15'
    },
    {
        id: 'e5h7g3f6-bd88-4f45-cg5f-5e6f7g8h9i05',
        first_name: 'Carlos',
        second_name: 'Andrés',
        last_names: 'Mejía Torres',
        dni: '0805199026789',
        payment_grade: '4',
        capital: 12000,
        paid_amount: 4000,
        loan_state: 'IP',
        date_of_approval: '2025-09-10',
        next_fee_due_date: '2026-04-25'
    }
];