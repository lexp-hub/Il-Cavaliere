#!/bin/bash
# Script per dividere il codice del bot (su main) e della dashboard (su feature/dashboard)

echo "=== Inizio configurazione Branch ==="

# 1. Crea e pubblica il branch della dashboard con tutto lo stato attuale
echo "1. Creazione e push del branch 'feature/dashboard'..."
git checkout -b feature/dashboard
git push -u origin feature/dashboard

# 2. Ritorna su main e rimuovi la dashboard
echo "2. Ritorno su 'main' e pulizia dei file della dashboard..."
git checkout main

# Rimuovi file della dashboard
rm -f dashboard.js
rm -rf public

# Modifica index.js per rimuovere l'avvio della dashboard
echo "3. Rimozione dell'avvio della dashboard da index.js..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' '/import.*startDashboard/d' index.js
  sed -i '' '/startDashboard(/d' index.js
else
  # Linux
  sed -i '/import.*startDashboard/d' index.js
  sed -i '/startDashboard(/d' index.js
fi

# Modifica package.json per rimuovere express
echo "4. Rimozione di express da package.json..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' '/"express":/d' package.json
else
  sed -i '/"express":/d' package.json
fi

# Commit e push su main
echo "5. Creazione del commit di pulizia su 'main' e push..."
git add .
git commit -m "chore: remove dashboard from main (moved to feature/dashboard)"
git push origin main

echo "=== Configurazione Completata con Successo! ==="
echo "Ora hai:"
echo " - Branch 'main': Solo il bot con memoria e ricerca (senza server web)."
echo " - Branch 'feature/dashboard': Bot con pannello di controllo web integrato."
