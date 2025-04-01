# Relazioni on off

Applicazione web per gestire relazioni on/off tra utenti.

## Configurazione Locale

1. Clona il repository
2. Installa le dipendenze:
   ```bash
   npm install
   ```
3. Crea un file `.env` basato su `.env.example` e configura le tue variabili d'ambiente
4. Avvia il server:
   ```bash
   node server.js
   ```

## Deployment su Render.com

1. Crea un nuovo Web Service su Render.com
2. Connetti il tuo repository GitHub
3. Configura le variabili d'ambiente su Render.com:
   - `DB_HOST`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
   - `PORT`

## Note

- Assicurati di avere un database MySQL configurato e accessibile
- Le credenziali del database non devono essere committate nel repository
- Il file `.env` è già incluso nel `.gitignore`