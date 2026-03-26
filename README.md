# fe-angular-boilerplate

## ------------ ##
Basic template to start an Angular project with Tailwind, NG-Zorro, routing, i18n and basic dependencies
ng new angular-boilerplate --routing=true --style=scss --strict=true --standalone=false

## ----- Instalación e inicialización de TailwindCSS ----- ##
npm install -D tailwindcss@3
npx tailwindcss init
npx tailwindcss -i ./src/input.css -o ./src/output.css --watch

(En src/styles.css)
@tailwind base;
@tailwind components;
@tailwind utilities;

## ----- Schematic para NG-Zorro ----- ##
ng add ng-zorro-antd

## ----- Instalación de Supabase ----- ##
npm install @supabase/supabase-js
** De usar Supabase, src/app/core/services/supabase.service.ts y src/app/core/services/auth.service.ts funca como base

## ----- Creación de directorios ----- ##
mkdir -p src/app/{core,shared,features,layouts}
mkdir -p src/app/core/{guards,interceptors,services,models}
mkdir -p src/app/shared/{components,directives,pipes}
mkdir -p src/app/features/{home,example-feature}
mkdir -p src/app/layouts/{main-layout,auth-layout}
mkdir -p src/environments

## ----- Creación de un Feature module como ejemplo ----- ##
ng generate module features/home --routing
ng generate component features/home/pages/home --module=features/home/home.module

## ----- Clonación de boilerplate ----- ##
git clone
npx degit tu-usuario/angular-boilerplate nuevo-proyecto