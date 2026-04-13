import { Customer } from "../interfaces/customers.interface";
import { GuaranteePerson } from "../interfaces/guarantee-person.interface";

export type EntityKind = 'C' | 'A'; // Cliente | Aval

export type Entity =
    | (Customer & { _kind: 'C' })
    | (GuaranteePerson & { _kind: 'A' });