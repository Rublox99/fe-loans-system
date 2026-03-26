#!/bin/bash

# ============================================
# Angular Project Rename Script
# Uso: bash rename-project.sh <nuevo-nombre>
# Ejemplo: bash rename-project.sh my-awesome-app
# ============================================

set -e  # Detiene el script si hay algún error

# ── Colores para output ──────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ── Funciones de log ─────────────────────────
log_info()    { echo -e "${BLUE}[INFO]${NC} \$1"; }
log_success() { echo -e "${GREEN}[OK]${NC} \$1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} \$1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} \$1"; exit 1; }
log_step()    { echo -e "\n${CYAN}▶ $1${NC}"; }

# ── Validaciones ─────────────────────────────
if [ -z "\$1" ]; then
  log_error "Debes proporcionar un nombre para el proyecto.\nUso: bash rename-project.sh <nuevo-nombre>"
fi

# Validar formato del nombre (solo letras, números y guiones)
if [[ ! "$1" =~ ^[a-zA-Z][a-zA-Z0-9-]*$ ]]; then
  log_error "El nombre solo puede contener letras, números y guiones, y debe iniciar con una letra."
fi

# ── Variables ────────────────────────────────
NEW_NAME="\$1"
NEW_NAME_LOWER=$(echo "$NEW_NAME" | tr '[:upper:]' '[:lower:]')

# Detectar nombre actual desde package.json
OLD_NAME=$(node -e "console.log(require('./package.json').name)" 2>/dev/null)

if [ -z "$OLD_NAME" ]; then
  log_error "No se pudo detectar el nombre actual del proyecto desde package.json"
fi

OLD_NAME_LOWER=$(echo "$OLD_NAME" | tr '[:upper:]' '[:lower:]')

# ── Confirmación ─────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Angular Project Rename Tool      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "  Nombre actual : ${RED}$OLD_NAME${NC}"
echo -e "  Nuevo nombre  : ${GREEN}$NEW_NAME_LOWER${NC}"
echo ""
read -p "  ¿Deseas continuar? (y/N): " CONFIRM

if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo ""
  log_warning "Operación cancelada."
  exit 0
fi

# ── Archivos a modificar ──────────────────────
log_step "Actualizando package.json..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' "s/\"name\": \"$OLD_NAME_LOWER\"/\"name\": \"$NEW_NAME_LOWER\"/g" package.json
else
  # Linux
  sed -i "s/\"name\": \"$OLD_NAME_LOWER\"/\"name\": \"$NEW_NAME_LOWER\"/g" package.json
fi
log_success "package.json actualizado"

# ── angular.json ─────────────────────────────
log_step "Actualizando angular.json..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/\"$OLD_NAME_LOWER\"/\"$NEW_NAME_LOWER\"/g" angular.json
  sed -i '' "s/$OLD_NAME_LOWER/$NEW_NAME_LOWER/g" angular.json
else
  sed -i "s/\"$OLD_NAME_LOWER\"/\"$NEW_NAME_LOWER\"/g" angular.json
  sed -i "s/$OLD_NAME_LOWER/$NEW_NAME_LOWER/g" angular.json
fi
log_success "angular.json actualizado"

# ── index.html (title) ───────────────────────
log_step "Actualizando index.html..."
TITLE_CASE=$(echo "$NEW_NAME_LOWER" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1')
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/<title>.*<\/title>/<title>$TITLE_CASE<\/title>/g" src/index.html
else
  sed -i "s/<title>.*<\/title>/<title>$TITLE_CASE<\/title>/g" src/index.html
fi
log_success "index.html actualizado → título: $TITLE_CASE"

# ── app.component.ts (title property) ────────
log_step "Actualizando app.component.ts..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/title = '.*'/title = '$NEW_NAME_LOWER'/g" src/app/app.component.ts
else
  sed -i "s/title = '.*'/title = '$NEW_NAME_LOWER'/g" src/app/app.component.ts
fi
log_success "app.component.ts actualizado"

# ── README.md ────────────────────────────────
log_step "Actualizando README.md..."
if [ -f "README.md" ]; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/$OLD_NAME_LOWER/$NEW_NAME_LOWER/g" README.md
  else
    sed -i "s/$OLD_NAME_LOWER/$NEW_NAME_LOWER/g" README.md
  fi
  log_success "README.md actualizado"
else
  # Crear README básico si no existe
  cat > README.md << EOF
# $TITLE_CASE

Proyecto Angular generado desde boilerplate.

## Stack
- Angular
- Tailwind CSS
- NG-Zorro
- Supabase

## Desarrollo
\`\`\`bash
npm install
ng serve
\`\`\`
EOF
  log_success "README.md creado"
fi

# ── environments ─────────────────────────────
log_step "Verificando environments..."
if [ -f "src/environments/environment.ts" ]; then
  log_warning "Recuerda actualizar tus credenciales de Supabase en:"
  echo "  - src/environments/environment.ts"
  echo "  - src/environments/environment.prod.ts"
fi

# ── Reinstalar dependencias ──────────────────
log_step "Reinstalando dependencias..."
read -p "  ¿Deseas ejecutar npm install? (y/N): " INSTALL_DEPS
if [[ "$INSTALL_DEPS" == "y" || "$INSTALL_DEPS" == "Y" ]]; then
  rm -rf node_modules package-lock.json
  npm install
  log_success "Dependencias instaladas"
else
  log_warning "Recuerda ejecutar npm install manualmente"
fi

# ── Resumen final ────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         Renombrado Exitoso ✅         ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}✔${NC} package.json"
echo -e "  ${GREEN}✔${NC} angular.json"
echo -e "  ${GREEN}✔${NC} src/index.html"
echo -e "  ${GREEN}✔${NC} src/app/app.component.ts"
echo -e "  ${GREEN}✔${NC} README.md"
echo ""
echo -e "  Proyecto listo como: ${GREEN}$NEW_NAME_LOWER${NC}"
echo ""