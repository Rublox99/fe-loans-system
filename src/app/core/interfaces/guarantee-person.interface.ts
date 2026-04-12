import { PaymentGrade } from "../types/payment-grade.type";

export interface GuaranteePerson {
    id: string;                  
    user_id: string;             
    first_name: string;
    second_name: string;
    last_names: string;
    dni: string;                 
    email: string;
    location: string;
    profession: string;
    company: string | null;
    gallery: string[];
    income: number;             
    phone_number: string;
    comment: string | null;
    last_modified: string;       
    created_at: string;          
}

export interface InsertGuaranteePersonPayload {
    userId: string;
    firstName: string;
    secondName: string;
    lastName: string;
    dni: string;
    email: string;
    phone: string;
    location: string;
    profession: string;
    company?: string;
    income: number;
    paymentGrade: PaymentGrade;
    gallery: string[];   // normalized filenames already uploaded to storage
    notes?: string;
}