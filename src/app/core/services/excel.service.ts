// excel.service.ts
import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ReportCustomer } from '../interfaces/report-customers.interface';
import { LoanStateAcronym } from '../types/loan-state.type';
import { PaymentGrade } from '../types/payment-grade.type';

const GRADE_LABEL: Record<PaymentGrade, string> = {
    '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E'
};

const LOAN_STATE_LABEL: Record<LoanStateAcronym, string> = {
    'A': 'Aprobado',
    'IP': 'En Proceso',
    'R': 'Rechazado',
    'C': 'Cerrado'
};

@Injectable({
    providedIn: 'root'
})
export class ExcelService {

    async generateReportExcel(
        data: ReportCustomer[],
        totalCapital: number,
        dateRange: string
    ): Promise<void> {
        const workbook = new ExcelJS.Workbook();

        // 👇 Workbook metadata
        workbook.creator = 'Sistema de Reportes';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Reporte de Clientes', {
            pageSetup: {
                paperSize: 9, // A4
                orientation: 'landscape',
                fitToPage: true
            }
        });

        // ---- Column definitions ----
        worksheet.columns = [
            { key: 'index', header: '#', width: 5 },
            { key: 'full_name', header: 'Cliente', width: 30 },
            { key: 'dni', header: 'DNI', width: 16 },
            { key: 'payment_grade', header: 'Grado', width: 8 },
            { key: 'capital', header: 'Capital (L)', width: 16 },
            { key: 'paid_amount', header: 'Monto Pagado (L)', width: 18 },
            { key: 'loan_state', header: 'Estado de Préstamo', width: 20 },
            { key: 'date_of_approval', header: 'Fecha de Aprobación', width: 22 },
            { key: 'next_fee_due_date', header: 'Próximo Pago', width: 22 },
        ];

        // ---- Header styles ----
        this.styleHeaderRow(worksheet);

        // ---- Summary rows above the table ----
        this.addSummarySection(worksheet, data.length, totalCapital, dateRange);

        // ---- Data rows ----
        data.forEach((customer, index) => {
            const row = worksheet.addRow({
                index: index + 1,
                full_name: [customer.first_name, customer.second_name, customer.last_names]
                    .filter(Boolean).join(' '),
                dni: customer.dni,
                payment_grade: GRADE_LABEL[customer.payment_grade],
                capital: customer.capital,
                paid_amount: customer.paid_amount,
                loan_state: LOAN_STATE_LABEL[customer.loan_state],
                date_of_approval: customer.date_of_approval
                    ? this.formatDate(customer.date_of_approval)
                    : '—',
                next_fee_due_date: customer.next_fee_due_date
                    ? this.formatDate(customer.next_fee_due_date)
                    : '—',
            });

            // 👇 Alternate row background for readability
            const isEven = index % 2 === 0;
            row.eachCell(cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF5F5F5' }
                };
                cell.border = this.thinBorder();
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
                cell.font = { name: 'Calibri', size: 11 };
            });

            // 👇 Color-code the loan state cell
            const stateCell = row.getCell('loan_state');
            stateCell.font = {
                name: 'Calibri',
                size: 11,
                bold: true,
                color: { argb: this.getLoanStateColor(customer.loan_state) }
            };

            // 👇 Format capital and paid_amount as currency
            row.getCell('capital').numFmt = '"L "#,##0.00';
            row.getCell('paid_amount').numFmt = '"L "#,##0.00';
        });

        // ---- Totals row ----
        this.addTotalsRow(worksheet, data, totalCapital);

        // ---- Download ----
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        saveAs(blob, `reporte_clientes_${this.getTimestamp()}.xlsx`);
    }

    // ---- Private helpers ----

    private addSummarySection(
        worksheet: ExcelJS.Worksheet,
        totalElements: number,
        totalCapital: number,
        dateRange: string
    ): void {
        // Title row
        const titleRow = worksheet.insertRow(1, ['Reporte de Clientes']);
        titleRow.getCell(1).font = { name: 'Calibri', size: 16, bold: true };
        titleRow.height = 28;

        // Summary rows
        const summaryRows = [
            ['Elementos encontrados:', totalElements],
            ['Capital total:', totalCapital],
            ['Período:', dateRange],
            ['Generado el:', this.formatDate(new Date().toISOString())],
            [] // spacer
        ];

        summaryRows.forEach((rowData, i) => {
            const row = worksheet.insertRow(i + 2, rowData);
            row.getCell(1).font = { name: 'Calibri', size: 11, bold: true };
            row.getCell(2).font = { name: 'Calibri', size: 11 };

            // Format capital row as currency
            if (i === 1) {
                row.getCell(2).numFmt = '"L "#,##0.00';
            }
        });
    }

    private styleHeaderRow(worksheet: ExcelJS.Worksheet): void {
        const headerRow = worksheet.getRow(7); // After 6 summary rows
        headerRow.height = 20;
        headerRow.eachCell(cell => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1F3864' } // 👈 Dark blue header
            };
            cell.font = {
                name: 'Calibri',
                size: 11,
                bold: true,
                color: { argb: 'FFFFFFFF' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = this.thinBorder();
        });
    }

    private addTotalsRow(
        worksheet: ExcelJS.Worksheet,
        data: ReportCustomer[],
        totalCapital: number
    ): void {
        const totalsRow = worksheet.addRow({
            index: '',
            full_name: 'TOTALES',
            dni: '',
            payment_grade: '',
            capital: totalCapital,
            paid_amount: data.reduce((sum, c) => sum + c.paid_amount, 0),
            loan_state: '',
            date_of_approval: '',
            next_fee_due_date: ''
        });

        totalsRow.eachCell(cell => {
            cell.font = { name: 'Calibri', size: 11, bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE8F0FE' }
            };
            cell.border = this.thinBorder();
        });

        totalsRow.getCell('capital').numFmt = '"L "#,##0.00';
        totalsRow.getCell('paid_amount').numFmt = '"L "#,##0.00';
    }

    private getLoanStateColor(state: LoanStateAcronym): string {
        const colors: Record<LoanStateAcronym, string> = {
            'A': 'FF1D6F42', // Green
            'IP': 'FFB45309', // Orange
            'R': 'FFB91C1C', // Red
            'C': 'FF6D28D9'  // Purple
        };
        return colors[state];
    }

    private thinBorder(): Partial<ExcelJS.Borders> {
        const side: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFD1D5DB' } };
        return { top: side, left: side, bottom: side, right: side };
    }

    private formatDate(isoDate: string): string {
        return new Date(isoDate).toLocaleDateString('es-HN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    private getTimestamp(): string {
        return new Date().toISOString().slice(0, 10);
    }
}