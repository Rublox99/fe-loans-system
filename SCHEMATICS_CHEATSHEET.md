# ----- COMPONENTES ----- #

## Básico
ng generate component features/home/components/my-component --standalone

## Con ruta específica y sin crear carpeta extra
ng generate component features/home/components/my-component --standalone --flat

## Especificando tipo de change detection
ng generate component features/home/components/my-component --standalone --change-detection=OnPush

## Omitir archivos que no necesitas
ng generate component features/home/components/my-component --standalone --skip-tests
ng generate component features/home/components/my-component --standalone --inline-style --inline-template

# ----- PAGES ----- #
ng g c features/home/pages/home-page --standalone --change-detection=OnPush --skip-tests

ng g c features/users/pages/user-list --standalone --change-detection=OnPush --skip-tests

ng g c features/users/pages/user-detail --standalone --change-detection=OnPush --skip-tests

# ----- MÓDULOS ----- #
## Módulo básico
ng g module features/users

# Módulo con routing propio
ng g module features/users --routing

# Módulo solo con archivo de rutas
ng g module features/users/users-routing --flat

# ----- GUARDS ----- #
## Guard funcional (moderno - Angular 15+)
ng g guard core/guards/auth

## Te preguntará qué interfaces implementar:
## ✅ CanActivate
## CanActivateChild
## CanDeactivate
## CanMatch

# ----- SERVICES ----- #
## Service básico (providedIn root por defecto)
ng g service core/services/users

## Service para un feature específico
ng g service features/users/services/user

## Sin tests
ng g service core/services/users --skip-tests

# ----- INTERCEPTORES ----- #
## Requerido registrarlos en en app.config.ts/app.module.ts
## Interceptor funcional (Angular 15+)
ng g interceptor core/interceptors/http-error

ng g interceptor core/interceptors/auth-token

// app.module.ts
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';

providers: [
  {
    provide: HTTP_INTERCEPTORS,
    useFactory: () => httpErrorInterceptor,
    multi: true
  }
]

# ----- INTERFACES ----- #
## Generar interfaz
ng g interface core/models/user

## Generar interfaz con sufijo
ng g interface core/models/user model

## Resultado: user.model.ts

# ----- ENUM ----- #
ng g enum core/models/user-role

## Resultado: user-role.enum.ts

# ----- PIPES ----- #
## Pipe standalone
ng g pipe shared/pipes/truncate --standalone --skip-tests

# ----- DIRECTIVAS ----- #
## Directive standalone
ng g directive shared/directives/highlight --standalone --skip-tests

# ----- RESOLVERS ----- #
ng g resolver core/resolvers/user --skip-tests

## Te preguntará el tipo:
## ✅ resolveFn (funcional - recomendado)

# ----- EJEMPLO: GENERACION DE FEATURE COMPLETO ----- #
## 1. Crear módulo con routing
ng g module features/products --routing --skip-tests

## 2. Crear páginas del feature
ng g c features/products/pages/product-list --standalone --change-detection=OnPush --skip-tests
ng g c features/products/pages/product-detail --standalone --change-detection=OnPush --skip-tests
ng g c features/products/pages/product-form --standalone --change-detection=OnPush --skip-tests

## 3. Crear componentes reutilizables del feature
ng g c features/products/components/product-card --standalone --change-detection=OnPush --skip-tests

## 4. Crear el service del feature
ng g service features/products/services/product --skip-tests

## 5. Crear la interfaz
ng g interface features/products/models/product model

## 6. Crear resolver (opcional)
ng g resolver features/products/resolvers/product --skip-tests

## 7. Configuración de Lazy Loading
*app-routing.module.ts*
{
  path: 'products',
  loadChildren: () =>
    import('./features/products/products.module')
      .then(m => m.ProductsModule)
}

*features/products/products-routing.module.ts*
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/product-list/product-list.component')
        .then(m => m.ProductListComponent)
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/product-detail/product-detail.component')
        .then(m => m.ProductDetailComponent)
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/product-form/product-form.component')
        .then(m => m.ProductFormComponent)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductsRoutingModule {}

# ----- FLAGS ----- #
Flag	                    Shorthand	                Descripción
--standalone                Genera componente           standalone
--change-detection=OnPush	--c=OnPush	                Mejor performance
--skip-tests		                                    No genera .spec.ts
--flat		                                            No crea carpeta propia
--inline-style	            -s	                        Estilos en el mismo archivo
--inline-template	        -t	                        Template en el mismo archivo
--export		                                        Exporta en el módulo padre
--module	                -m	                        Especifica el módulo al que pertenece
--prefix	                -p	                        Cambia el prefijo del selector
--dry-run	                -d	                        Simula sin crear archivos

# ----- TIPS ----- #
## Ver qué generará sin crear nada (dry run)
ng g c features/users/pages/user-list --standalone --dry-run

## Ver todos los schematics disponibles
ng generate --help

## Crear múltiples con un script bash
for page in list detail form; do
  ng g c features/products/pages/product-$page --standalone --change-detection=OnPush --skip-tests
done