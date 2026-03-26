# ── Usando Git Bash ────────────────────────────
# 1. Clonar (Cambiar nombre del nuevo directorio)
git clone https://github.com/Rublox99/fe-angular-boilerplate.git fe-electric-guide-insertions

# 2. Entrar al proyecto (Cambiar nombre)
cd fe-electric-guide-insertions

# 3. Eliminar historial (comando bash)
rm -rf .git

# 4. Iniciar git limpio
git init
git add .
git commit -m "Feat: Initial commit from boilerplate"

# 5. Conectar al nuevo repo remoto y hacer push (Requiere que el repo exista en Github)
git remote add origin https://github.com/Rublox99/fe-electric-guide-insertions.git 
git branch -M main
git push -u origin main