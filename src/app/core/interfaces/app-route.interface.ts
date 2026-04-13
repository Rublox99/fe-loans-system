export interface AppRoute {
    path: string
    label: string
}

export interface AppRoutesCollection {
    login: AppRoute
    entities: AppRoute
    loans: AppRoute
    reports: AppRoute
}