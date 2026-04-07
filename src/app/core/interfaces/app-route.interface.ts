export interface AppRoute {
    path: string
    label: string
}

export interface AppRoutesCollection {
    login: AppRoute
    customers: AppRoute
    loans: AppRoute
    reports: AppRoute
}