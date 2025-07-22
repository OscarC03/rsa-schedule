# RSA Schedule Backend - PHP MySQL System

Sistema backend completo per gestione turni OSS su **Altervista.org** con PHP 8 e MySQL 8.

## 🏗️ **Struttura Database**

### Tabelle Principali:
- **`rsa_resources`** - Risorse OSS (operatori)
- **`rsa_shifts`** - Turni assegnati
- **`rsa_date_colors`** - Personalizzazioni colori per date
- **`rsa_settings`** - Impostazioni globali

### Schema SQL:
Esegui il file `database/schema.sql` nel tuo pannello MySQL Altervista per creare tutte le tabelle e inserire i dati iniziali.

## 🔧 **Configurazione Altervista.org**

1. **Database MySQL**: Assicurati di avere un database chiamato `my_turnioperapia`
2. **Modifica `config/config.php`**: 
   - Sostituisci `'username' => 'turnioperapia'` con il tuo username Altervista
   - Inserisci la password del database

```php
define('DB_CONFIG', [
    'host' => 'localhost',
    'database' => 'my_turnioperapia',  
    'username' => 'IL_TUO_USERNAME_ALTERVISTA', // ← Cambia questo
    'password' => 'LA_TUA_PASSWORD_DATABASE',    // ← E questo
    // ...
]);
```

## 🚀 **API Endpoints**

### **Test API** 
```
GET /api/index.php
```
Verifica funzionamento sistema e connessione database.

### **Risorse OSS**
```
GET    /api/resources.php                    - Legge tutte le risorse
POST   /api/resources.php                    - Salva risorsa/e (singola o batch)
DELETE /api/resources.php?id=X               - Elimina risorsa
```

### **Turni**  
```
GET    /api/shifts.php?year=X&month=Y        - Turni per mese (month: 0-11)
GET    /api/shifts.php?start=X&end=Y         - Turni per range date
POST   /api/shifts.php                       - Salva turno/i (singolo o matrice)
DELETE /api/shifts.php?resourceId=X&date=Y   - Elimina turno specifico
DELETE /api/shifts.php?start=X&end=Y         - Elimina range turni
```

### **Personalizzazioni**
```
GET    /api/settings.php?type=colors&year=X&month=Y  - Colori personalizzati
GET    /api/settings.php?type=setting&key=X          - Impostazione specifica  
POST   /api/settings.php                             - Salva personalizzazioni
DELETE /api/settings.php?type=color&date=X           - Elimina colori data
```

## 📁 **Struttura File**

```
Server/
├── api/              # Endpoints API REST
│   ├── index.php     # Test API
│   ├── resources.php # CRUD Risorse OSS  
│   ├── shifts.php    # CRUD Turni
│   └── settings.php  # Personalizzazioni
├── core/             # Classi PHP business logic
│   ├── DatabaseManager.php   # Connessione DB + utilità
│   ├── ResourcesManager.php  # Gestione risorse  
│   ├── ShiftsManager.php     # Gestione turni
│   └── SettingsManager.php   # Gestione impostazioni
├── config/           # Configurazioni
│   └── config.php    # Config database + utilità globali
└── database/         # Schema SQL
    └── schema.sql    # Creazione tabelle + dati iniziali
```

## 🎯 **Funzionalità Principali**

✅ **CRUD completo** per risorse OSS  
✅ **CRUD completo** per turni con supporto matrice  
✅ **Gestione personalizzazioni** colori per date specifiche  
✅ **Sistema di impostazioni** globali flessibile  
✅ **Transazioni database** per operazioni batch  
✅ **Gestione errori** robusta con log  
✅ **CORS headers** per integrazione frontend  
✅ **JSON API standard** con response consistenti  
✅ **Compatibilità Altervista.org** con PHP 8 e MySQL 8  

## 🚀 **Deployment su Altervista**

1. **Upload file**: Carica tutta la cartella `Server/` nel tuo spazio web Altervista
2. **Database**: Esegui `database/schema.sql` nel pannello MySQL
3. **Config**: Modifica `config/config.php` con le tue credenziali
4. **Test**: Vai su `https://tuosito.altervista.org/Server/api/index.php`

## 🔍 **Testing**

### Test Rapido Connessione:
```bash
curl "https://tuosito.altervista.org/Server/api/index.php"
```

### Test Lettura Risorse:
```bash  
curl "https://tuosito.altervista.org/Server/api/resources.php"
```

### Test Salvataggio Turno:
```bash
curl -X POST "https://tuosito.altervista.org/Server/api/shifts.php" \
  -H "Content-Type: application/json" \
  -d '{"resourceId":"1","date":"2025-07-22","shiftType":"Morning","floor":1}'
```

## 📝 **Note Tecniche**

- **Formato date**: Tutte le date sono in formato `YYYY-MM-DD`
- **Mesi frontend**: Il frontend passa i mesi come 0-11, il backend li converte automaticamente
- **JSON**: Tutti i dati complessi sono salvati come JSON nel database
- **UTF-8**: Supporto completo caratteri internazionali
- **Logs**: Gli errori sono loggati nei log di PHP (visibili nel pannello Altervista)

Questo sistema sostituisce completamente localStorage e gestisce tutti i dati lato server con persistenza database MySQL.
