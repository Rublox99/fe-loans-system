import { Injectable } from '@angular/core';
import { forkJoin, from, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Customer, CustomerForEdit, InsertCustomerPayload, UpdateCustomerPayload, UpdateSpousePayload } from '../../interfaces/customers.interface';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../../environments/environment';
import { GuaranteePerson, InsertGuaranteePersonPayload, UpdateGuaranteePersonPayload } from '../../interfaces/guarantee-person.interface';
import { InsertSpousePayload, Spouse } from '../../interfaces/spouse.interface';
import { Entity } from '../../types/entity.type';

export interface PaginatedEntities {
    data: Entity[];
    total: number;
}

export interface CustomerStats {
    totalActive: number;
    gradeA: number;
    gradeBC: number;
    gradeDE: number;
    newThisMonth: number;
}

@Injectable({
    providedIn: 'root'
})
export class EntitiesService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            environment.supabase.url,
            environment.supabase.key
        );
    }

    // ─── SELECT ────────────────────────────────────────────────────────────────

    getEntities(
        search?: string,
        page: number = 1,
        pageSize: number = 10,
        returnAllEntities: boolean = false
    ): Observable<PaginatedEntities> {

        const buildCustomerQuery = () => {
            let q = this.supabase
                .from('customers')
                .select(`
        *,
        spouse:spouses!spouse_id (
          first_name,
          second_name,
          last_names,
          dni
        )
      `, { count: 'exact' });

            if (search) {
                q = q.or(
                    `first_name.ilike.%${search}%,` +
                    `second_name.ilike.%${search}%,` +
                    `last_names.ilike.%${search}%,` +
                    `dni.ilike.%${search}%`
                );
            }
            return from(q);
        };

        const buildGuaranteeQuery = () => {
            let q = this.supabase
                .from('guarantee_persons')
                .select('*', { count: 'exact' });

            if (search) {
                q = q.or(
                    `first_name.ilike.%${search}%,` +
                    `second_name.ilike.%${search}%,` +
                    `last_names.ilike.%${search}%,` +
                    `dni.ilike.%${search}%`
                );
            }
            return from(q);
        };

        if (!returnAllEntities) {
            // Customers only — paginated at DB level
            const start = (page - 1) * pageSize;
            const end = start + pageSize - 1;

            let q = this.supabase
                .from('customers')
                .select(`
        *,
        spouse:spouses!spouse_id (
          first_name,
          second_name,
          last_names,
          dni
        )
      `, { count: 'exact' })
                .range(start, end);

            if (search) {
                q = q.or(
                    `first_name.ilike.%${search}%,` +
                    `second_name.ilike.%${search}%,` +
                    `last_names.ilike.%${search}%,` +
                    `dni.ilike.%${search}%`
                );
            }

            return from(q).pipe(
                map(({ data, count, error }) => {
                    if (error) throw error;
                    return {
                        data: (data as Customer[]).map(c => ({ ...c, _kind: 'C' as const })),
                        total: count ?? 0
                    };
                })
            );
        }

        // Both customers + guarantee persons — fetch counts in parallel,
        // then fetch only the page window we need.
        return forkJoin([buildCustomerQuery(), buildGuaranteeQuery()]).pipe(
            switchMap(([customers, guarantees]) => {
                if (customers.error) throw customers.error;
                if (guarantees.error) throw guarantees.error;

                const totalCustomers = customers.count ?? 0;
                const totalGuarantees = guarantees.count ?? 0;
                const total = totalCustomers + totalGuarantees;

                // Global offset window
                const globalStart = (page - 1) * pageSize;
                const globalEnd = globalStart + pageSize; // exclusive

                // Slice customers
                const custStart = Math.min(globalStart, totalCustomers);
                const custEnd = Math.min(globalEnd, totalCustomers);
                const custNeeded = custEnd - custStart;

                // Slice guarantee persons (starts after all customers)
                const guarStart = Math.max(0, globalStart - totalCustomers);
                const guarEnd = Math.max(0, globalEnd - totalCustomers);
                const guarNeeded = guarEnd - guarStart;

                // Build only the queries we actually need for this page
                const obs: Observable<Entity[]>[] = [];

                if (custNeeded > 0) {
                    let q = this.supabase
                        .from('customers')
                        .select(`
            *,
            spouse:spouses!spouse_id (
              first_name,
              second_name,
              last_names,
              dni
            )
          `)
                        .range(custStart, custEnd - 1); // supabase range is inclusive

                    if (search) {
                        q = q.or(
                            `first_name.ilike.%${search}%,` +
                            `second_name.ilike.%${search}%,` +
                            `last_names.ilike.%${search}%,` +
                            `dni.ilike.%${search}%`
                        );
                    }

                    obs.push(
                        from(q).pipe(
                            map(({ data, error }) => {
                                if (error) throw error;
                                return (data as Customer[]).map(c => ({ ...c, _kind: 'C' as const }));
                            })
                        )
                    );
                }

                if (guarNeeded > 0) {
                    let q = this.supabase
                        .from('guarantee_persons')
                        .select('*')
                        .range(guarStart, guarEnd - 1);

                    if (search) {
                        q = q.or(
                            `first_name.ilike.%${search}%,` +
                            `second_name.ilike.%${search}%,` +
                            `last_names.ilike.%${search}%,` +
                            `dni.ilike.%${search}%`
                        );
                    }

                    obs.push(
                        from(q).pipe(
                            map(({ data, error }) => {
                                if (error) throw error;
                                return (data as GuaranteePerson[]).map(g => ({ ...g, _kind: 'A' as const }));
                            })
                        )
                    );
                }

                if (obs.length === 0) {
                    return of({ data: [] as Entity[], total });
                }

                return forkJoin(obs).pipe(
                    map(results => ({
                        data: results.flat(),
                        total
                    }))
                );
            })
        );
    }

    getCustomerById(id: string): Observable<Customer | undefined> {
        return from(
            this.supabase
                .from('customers')
                .select('*')
                .eq('id', id)
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                return data as Customer;
            })
        );
    }

    getCustomerForEdit(id: string): Observable<CustomerForEdit> {
        return from(
            this.supabase
                .from('customers')
                .select('*')
                .eq('id', id)
                .single()
        ).pipe(
            switchMap(({ data: customer, error }) => {
                if (error) throw error;

                const guaranteePerson$ = customer.guaranteePerson_id
                    ? from(
                        this.supabase
                            .from('guarantee_persons')
                            .select('*')
                            .eq('id', customer.guaranteePerson_id)
                            .single()
                    ).pipe(map(({ data }) => data as GuaranteePerson))
                    : of(null);

                const spouse$ = customer.spouse_id
                    ? from(
                        this.supabase
                            .from('spouses')
                            .select('*')
                            .eq('id', customer.spouse_id)
                            .single()
                    ).pipe(map(({ data }) => data as Spouse))
                    : of(null);

                return forkJoin({
                    customer: of(customer as Customer),
                    guaranteePerson: guaranteePerson$,
                    spouse: spouse$
                });
            })
        );
    }

    // In EntitiesService

    getLoanSummariesForCustomers(
        customerIds: string[]
    ): Observable<Map<string, { totalBalance: number; lastPaymentDate: string | null }>> {

        if (customerIds.length === 0) {
            return of(new Map());
        }

        // Query 1: sum of capital_balance per customer for active loans
        const balances$ = from(
            this.supabase
                .from('loans')
                .select('customer_id, capital_balance')
                .in('customer_id', customerIds)
                .eq('state', 'Accepted')
        );

        // Query 2: most recent payment_date per customer via fees → loans join
        const lastPayments$ = from(
            this.supabase
                .from('fees')
                .select('payment_date, loans!inner(customer_id)')
                .in('loans.customer_id', customerIds)
                .not('payment_date', 'is', null)
                .order('payment_date', { ascending: false })
        );

        return forkJoin([balances$, lastPayments$]).pipe(
            map(([balancesRes, paymentsRes]) => {
                if (balancesRes.error) throw balancesRes.error;
                if (paymentsRes.error) throw paymentsRes.error;

                const result = new Map<string, { totalBalance: number; lastPaymentDate: string | null }>();

                // Initialise all requested IDs with zero/null defaults
                customerIds.forEach(id => result.set(id, { totalBalance: 0, lastPaymentDate: null }));

                // Accumulate balances
                for (const row of balancesRes.data ?? []) {
                    const entry = result.get(row.customer_id)!;
                    entry.totalBalance += Number(row.capital_balance);
                }

                // Last payment — rows already ordered DESC so first hit per customer wins
                for (const row of paymentsRes.data ?? []) {
                    const customerId = (row.loans as any).customer_id as string;
                    const entry = result.get(customerId);
                    if (entry && entry.lastPaymentDate === null) {
                        entry.lastPaymentDate = row.payment_date;
                    }
                }

                return result;
            })
        );
    }

    getGuaranteePersonForEdit(id: string): Observable<GuaranteePerson> {
        return from(
            this.supabase
                .from('guarantee_persons')
                .select('*')
                .eq('id', id)
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                return data as GuaranteePerson;
            })
        );
    }

    getGuaranteePersonById(id: string | null): Observable<GuaranteePerson> {
        return from(
            this.supabase
                .from('guarantee_persons')
                .select('*')
                .eq('id', id)
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                return data as GuaranteePerson;
            })
        );
    }

    getSpouseById(id: string): Observable<Spouse> {
        return from(
            this.supabase
                .from('spouses')
                .select('*')
                .eq('id', id)
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                return data as Spouse;
            })
        );
    }

    getGuaranteePersons(query: string): Observable<GuaranteePerson[]> {
        return from(
            this.supabase
                .from('guarantee_persons')
                .select('id, first_name, second_name, last_names')
                .or(
                    `first_name.ilike.%${query}%,` +
                    `second_name.ilike.%${query}%,` +
                    `last_names.ilike.%${query}%`
                )
                .limit(10)
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                return data as GuaranteePerson[];
            })
        );
    }

    getCustomerStats(): Observable<CustomerStats> {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

        // head: true means only the count is retrieved, no rows are transferred
        const totalActive$ = from(
            this.supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('state', 'Active')
        ).pipe(map(({ count, error }) => {
            if (error) throw error;
            return count ?? 0;
        }));

        const gradeA$ = from(
            this.supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('payment_grade', '1')
        ).pipe(map(({ count, error }) => {
            if (error) throw error;
            return count ?? 0;
        }));

        const gradeBC$ = from(
            this.supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .in('payment_grade', ['2', '3'])
        ).pipe(map(({ count, error }) => {
            if (error) throw error;
            return count ?? 0;
        }));

        const gradeDE$ = from(
            this.supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .in('payment_grade', ['4', '5'])
        ).pipe(map(({ count, error }) => {
            if (error) throw error;
            return count ?? 0;
        }));

        const newThisMonth$ = from(
            this.supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', monthStart)
                .lte('created_at', monthEnd)
        ).pipe(map(({ count, error }) => {
            if (error) throw error;
            return count ?? 0;
        }));

        return forkJoin({
            totalActive: totalActive$,
            gradeA: gradeA$,
            gradeBC: gradeBC$,
            gradeDE: gradeDE$,
            newThisMonth: newThisMonth$
        });
    }

    // ─── UPDATE ────────────────────────────────────────────────────────────────
    async updateGuaranteePersonGallery(
        id: string,
        gallery: string[]
    ): Promise<{ error: string | null }> {
        const { error } = await this.supabase
            .from('guarantee_persons')
            .update({ gallery })
            .eq('id', id);

        if (error) {
            console.error('updateGuaranteePersonGallery error:', error.message);
            return { error: error.message };
        }

        return { error: null };
    }

    async updateCustomerGallery(
        id: string,
        gallery: string[]
    ): Promise<{ error: string | null }> {
        const { error } = await this.supabase
            .from('guarantee_persons')
            .update({ gallery })
            .eq('id', id);

        if (error) {
            console.error('updateCustomerGallery error:', error.message);
            return { error: error.message };
        }

        return { error: null };
    }

    async updateCustomer(
        id: string,
        payload: UpdateCustomerPayload
    ): Promise<{ error: string | null }> {
        const { error } = await this.supabase
            .from('customers')
            .update({
                first_name: payload.firstName,
                second_name: payload.secondName,
                last_names: payload.lastName,
                dni: payload.dni,
                phone_numbers: [payload.phone],
                email: payload.email ?? null,
                location: payload.location,
                profession: payload.profession,
                company: payload.company ?? null,
                income: payload.income,
                payment_grade: payload.paymentGrade,
                gallery: payload.gallery,
                comment: payload.notes ?? null,
                spouse_id: payload.spouseId ?? null,
                'guaranteePerson_id': payload.guaranteePersonId ?? null,
                last_modified: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            console.error('updateCustomer error:', error.message);
            return { error: error.message };
        }

        return { error: null };
    }

    async updateGuaranteePerson(
        id: string,
        payload: UpdateGuaranteePersonPayload
    ): Promise<{ error: string | null }> {
        const { error } = await this.supabase
            .from('guarantee_persons')
            .update({
                first_name: payload.firstName,
                second_name: payload.secondName,
                last_names: payload.lastName,
                dni: payload.dni,
                phone_number: payload.phone,       // singular — not an array
                email: payload.email,
                location: payload.location,
                profession: payload.profession,
                company: payload.company ?? null,
                income: payload.income,
                payment_grade: payload.paymentGrade,
                gallery: payload.gallery,
                comment: payload.notes ?? null,
                last_modified: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            console.error('updateGuaranteePerson error:', error.message);
            return { error: error.message };
        }

        return { error: null };
    }

    async updateSpouse(
        id: string,
        payload: UpdateSpousePayload
    ): Promise<{ error: string | null }> {
        const { error } = await this.supabase
            .from('spouses')
            .update({
                first_name: payload.firstName,
                second_name: payload.secondName,
                last_names: payload.lastName,
                dni: payload.dni,
                phone_numbers: [payload.phone],
                location: payload.location,
                profession: payload.profession,
                income: payload.income,
                last_modified: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            console.error('updateSpouse error:', error.message);
            return { error: error.message };
        }

        return { error: null };
    }


    // ─── INSERT ────────────────────────────────────────────────────────────────

    async insertGuaranteePerson(
        payload: InsertGuaranteePersonPayload
    ): Promise<{ data: GuaranteePerson | null; error: string | null }> {
        const { data, error } = await this.supabase
            .from('guarantee_persons')
            .insert({
                user_id: payload.userId,
                first_name: payload.firstName,
                second_name: payload.secondName,
                last_names: payload.lastName,
                dni: payload.dni,
                email: payload.email,
                phone_number: payload.phone,
                location: payload.location,
                profession: payload.profession,
                company: payload.company ?? null,
                income: payload.income,
                payment_grade: payload.paymentGrade,
                gallery: payload.gallery,
                comment: payload.notes ?? null,
            })
            .select()
            .single();

        if (error) {
            console.error('insertGuaranteePerson error:', error.message);
            return { data: null, error: error.message };
        }

        return { data: data as GuaranteePerson, error: null };
    }

    async insertSpouse(
        payload: InsertSpousePayload
    ): Promise<{ data: Spouse | null; error: string | null }> {
        const { data, error } = await this.supabase
            .from('spouses')
            .insert({
                first_name: payload.firstName,
                second_name: payload.secondName,
                last_names: payload.lastName,
                dni: payload.dni,
                phone_numbers: [payload.phone],  // stored as array with single entry
                location: payload.location,
                profession: payload.profession,
                income: payload.income,
            })
            .select()
            .single();

        if (error) {
            console.error('insertSpouse error:', error.message);
            return { data: null, error: error.message };
        }

        return { data: data as Spouse, error: null };
    }

    async insertCustomer(
        payload: InsertCustomerPayload
    ): Promise<{ data: Customer | null; error: string | null }> {
        const { data, error } = await this.supabase
            .from('customers')
            .insert({
                user_id: payload.userId,
                first_name: payload.firstName,
                second_name: payload.secondName,
                last_names: payload.lastName,
                dni: payload.dni,
                phone_numbers: [payload.phone],
                email: payload.email ?? null,
                location: payload.location,
                profession: payload.profession,
                company: payload.company ?? null,
                income: payload.income,
                payment_grade: payload.paymentGrade,
                gallery: payload.gallery,
                comment: payload.notes ?? null,
                state: 'Active',
                spouse_id: payload.spouseId ?? null,
                'guaranteePerson_id': payload.guaranteePersonId ?? null,
            })
            .select()
            .single();

        if (error) {
            console.error('insertCustomer error:', error.message);
            return { data: null, error: error.message };
        }

        return { data: data as Customer, error: null };
    }

    // ─── DELETE ────────────────────────────────────────────────────────────────
    /**
     * Unlinks spouse from customer and deletes the spouse row
     */
    async unlinkAndDeleteSpouse(
        customerId: string,
        spouseId: string
    ): Promise<{ error: string | null }> {
        // First unlink to satisfy the FK constraint
        const { error: unlinkError } = await this.supabase
            .from('customers')
            .update({ spouse_id: null })
            .eq('id', customerId);

        if (unlinkError) {
            console.error('unlinkSpouse error:', unlinkError.message);
            return { error: unlinkError.message };
        }

        // Then delete the spouse row
        const { error: deleteError } = await this.supabase
            .from('spouses')
            .delete()
            .eq('id', spouseId);

        if (deleteError) {
            console.error('deleteSpouse error:', deleteError.message);
            return { error: deleteError.message };
        }

        return { error: null };
    }
}