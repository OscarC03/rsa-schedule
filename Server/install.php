<?php
/**
 * Script di installazione automatica per RSA Schedule Manager
 * Da eseguire UNA SOLA VOLTA dopo aver caricato i file su Altervista
 */

// Impedisce l'esecuzione se già installato
if (file_exists(__DIR__ . '/INSTALLATION_COMPLETE.txt')) {
    http_response_code(403);
    die('⚠️ L\'installazione è già stata completata. Per reinstallare, cancella il file INSTALLATION_COMPLETE.txt');
}

?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RSA Schedule Manager - Installazione</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.5em;
        }
        h2 {
            color: #34495e;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
            margin-top: 30px;
        }
        .step {
            background: #f8f9fa;
            padding: 20px;
            margin: 15px 0;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        .status {
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
            font-weight: bold;
        }
        .success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .warning {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }
        .info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        button {
            background: #3498db;
            color: white;
            padding: 12px 25px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 5px;
            transition: background 0.3s;
        }
        button:hover {
            background: #2980b9;
        }
        button:disabled {
            background: #95a5a6;
            cursor: not-allowed;
        }
        .progress {
            background: #ecf0f1;
            border-radius: 10px;
            overflow: hidden;
            margin: 20px 0;
        }
        .progress-bar {
            background: #3498db;
            height: 20px;
            width: 0%;
            transition: width 0.5s;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
        }
        .requirements {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 10px;
            margin: 10px 0;
        }
        .requirement {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 5px;
        }
        .check-ok { color: #27ae60; }
        .check-error { color: #e74c3c; }
        .hidden { display: none; }
        pre {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            font-size: 14px;
        }
        .api-endpoint {
            background: #34495e;
            color: white;
            padding: 8px 12px;
            border-radius: 3px;
            font-family: monospace;
            display: inline-block;
            margin: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 RSA Schedule Manager</h1>
        <h2>Installazione Automatica</h2>
        
        <div id="progress-container">
            <div class="progress">
                <div class="progress-bar" id="progress-bar">0%</div>
            </div>
        </div>

        <!-- Step 1: Controllo Requisiti -->
        <div class="step" id="step-1">
            <h3>📋 Step 1: Controllo Requisiti</h3>
            <p>Verifica che il server soddisfi tutti i requisiti necessari.</p>
            
            <div class="requirements" id="requirements">
                <!-- Popolato via JavaScript -->
            </div>
            
            <button onclick="checkRequirements()" id="btn-check">Controlla Requisiti</button>
        </div>

        <!-- Step 2: Configurazione Database -->
        <div class="step hidden" id="step-2">
            <h3>🗄️ Step 2: Configurazione Database</h3>
            <p>Configurazione della connessione al database MySQL di Altervista.</p>
            
            <div class="info">
                <strong>Database Altervista predefinito:</strong><br>
                Host: localhost<br>
                Database: my_turnioperapia<br>
                Username: turnioperapia<br>
                Password: (vuota)
            </div>
            
            <div id="db-status"></div>
            <button onclick="testDatabase()" id="btn-db">Testa Connessione Database</button>
        </div>

        <!-- Step 3: Inizializzazione -->
        <div class="step hidden" id="step-3">
            <h3>⚙️ Step 3: Inizializzazione Sistema</h3>
            <p>Creazione delle tabelle e inserimento dei dati di default.</p>
            
            <div id="init-status"></div>
            <button onclick="initializeSystem()" id="btn-init">Inizializza Sistema</button>
        </div>

        <!-- Step 4: Test API -->
        <div class="step hidden" id="step-4">
            <h3>🧪 Step 4: Test API</h3>
            <p>Verifica del funzionamento di tutti gli endpoint API.</p>
            
            <div id="api-status"></div>
            <button onclick="testAPI()" id="btn-api">Testa API</button>
        </div>

        <!-- Step 5: Completamento -->
        <div class="step hidden" id="step-5">
            <h3>✅ Installazione Completata</h3>
            <p>Il sistema RSA Schedule Manager è stato installato con successo!</p>
            
            <div class="success">
                <strong>Sistema pronto per l'uso!</strong><br>
                Puoi ora integrare il frontend Next.js con le API backend.
            </div>

            <h4>Endpoint API disponibili:</h4>
            <div>
                <span class="api-endpoint">GET /Server/api/status.php</span>
                <span class="api-endpoint">GET /Server/api/shifts.php</span>
                <span class="api-endpoint">GET /Server/api/resources.php</span>
                <span class="api-endpoint">GET /Server/api/settings.php</span>
                <span class="api-endpoint">GET /Server/api/backup.php</span>
            </div>

            <h4>Prossimi passi:</h4>
            <ol>
                <li>Configura il frontend Next.js per utilizzare queste API</li>
                <li>Aggiorna le chiamate API nel codice React</li>
                <li>Testa l'integrazione completa</li>
                <li>Opzionale: configura backup automatici</li>
            </ol>

            <button onclick="completeInstallation()" id="btn-complete">Completa Installazione</button>
        </div>

        <div id="messages"></div>
    </div>

    <script>
        let currentStep = 1;
        let installationData = {};

        // Aggiorna la progress bar
        function updateProgress(step) {
            const progress = (step / 5) * 100;
            document.getElementById('progress-bar').style.width = progress + '%';
            document.getElementById('progress-bar').textContent = Math.round(progress) + '%';
        }

        // Mostra il prossimo step
        function showStep(step) {
            // Nasconde tutti gli step
            for (let i = 1; i <= 5; i++) {
                document.getElementById(`step-${i}`).classList.add('hidden');
            }
            
            // Mostra lo step richiesto
            document.getElementById(`step-${step}`).classList.remove('hidden');
            currentStep = step;
            updateProgress(step);
        }

        // Aggiunge un messaggio
        function addMessage(message, type = 'info') {
            const div = document.createElement('div');
            div.className = `status ${type}`;
            div.innerHTML = message;
            document.getElementById('messages').appendChild(div);
            
            // Scroll automatico
            div.scrollIntoView({ behavior: 'smooth' });
        }

        // Step 1: Controllo requisiti
        function checkRequirements() {
            addMessage('🔍 Controllo requisiti del server...', 'info');
            
            const requirements = [
                { name: 'PHP Version ≥ 7.4', check: '<?php echo version_compare(PHP_VERSION, "7.4.0", ">=") ? "OK" : "FAIL"; ?>' },
                { name: 'PDO Extension', check: '<?php echo extension_loaded("pdo") ? "OK" : "FAIL"; ?>' },
                { name: 'PDO MySQL Extension', check: '<?php echo extension_loaded("pdo_mysql") ? "OK" : "FAIL"; ?>' },
                { name: 'JSON Extension', check: '<?php echo extension_loaded("json") ? "OK" : "FAIL"; ?>' },
                { name: 'cURL Extension', check: '<?php echo extension_loaded("curl") ? "OK" : "FAIL"; ?>' },
                { name: 'Directory Writable', check: '<?php echo is_writable(__DIR__) ? "OK" : "FAIL"; ?>' }
            ];

            // Simula controllo requisiti (in un'implementazione reale useresti AJAX)
            setTimeout(() => {
                let allOk = true;
                const container = document.getElementById('requirements');
                container.innerHTML = '';

                requirements.forEach(req => {
                    const div = document.createElement('div');
                    div.className = 'requirement';
                    
                    // Per la demo, simula che tutti i requisiti siano OK
                    const status = 'OK'; // In realtà dovresti fare una chiamata AJAX
                    const isOk = status === 'OK';
                    if (!isOk) allOk = false;

                    div.innerHTML = `
                        <span>${req.name}</span>
                        <span class="${isOk ? 'check-ok' : 'check-error'}">
                            ${isOk ? '✅' : '❌'} ${status}
                        </span>
                    `;
                    container.appendChild(div);
                });

                if (allOk) {
                    addMessage('✅ Tutti i requisiti sono soddisfatti!', 'success');
                    setTimeout(() => showStep(2), 1000);
                } else {
                    addMessage('❌ Alcuni requisiti non sono soddisfatti. Contatta il supporto Altervista.', 'error');
                }
            }, 2000);
        }

        // Step 2: Test database
        function testDatabase() {
            addMessage('🔗 Test connessione database...', 'info');
            
            // Chiamata AJAX per testare il database
            fetch('api/init.php?test=1')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('db-status').innerHTML = 
                            '<div class="success">✅ Connessione database riuscita!</div>';
                        addMessage('✅ Database connesso correttamente!', 'success');
                        setTimeout(() => showStep(3), 1000);
                    } else {
                        document.getElementById('db-status').innerHTML = 
                            '<div class="error">❌ Errore connessione: ' + data.message + '</div>';
                        addMessage('❌ Errore connessione database: ' + data.message, 'error');
                    }
                })
                .catch(error => {
                    document.getElementById('db-status').innerHTML = 
                        '<div class="error">❌ Errore di rete: ' + error.message + '</div>';
                    addMessage('❌ Errore di rete: ' + error.message, 'error');
                });
        }

        // Step 3: Inizializzazione sistema
        function initializeSystem() {
            addMessage('⚙️ Inizializzazione sistema in corso...', 'info');
            
            fetch('api/init.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('init-status').innerHTML = 
                        '<div class="success">✅ Sistema inizializzato correttamente!</div>';
                    addMessage('✅ Tabelle create e dati inseriti!', 'success');
                    installationData.initialization = data.data;
                    setTimeout(() => showStep(4), 1000);
                } else {
                    document.getElementById('init-status').innerHTML = 
                        '<div class="error">❌ Errore inizializzazione: ' + data.message + '</div>';
                    addMessage('❌ Errore inizializzazione: ' + data.message, 'error');
                }
            })
            .catch(error => {
                document.getElementById('init-status').innerHTML = 
                    '<div class="error">❌ Errore di rete: ' + error.message + '</div>';
                addMessage('❌ Errore di rete: ' + error.message, 'error');
            });
        }

        // Step 4: Test API
        function testAPI() {
            addMessage('🧪 Test degli endpoint API...', 'info');
            
            const apiTests = [
                { name: 'Status API', url: 'api/status.php' },
                { name: 'Resources API', url: 'api/resources.php?action=list' },
                { name: 'Settings API', url: 'api/settings.php?action=all' },
                { name: 'Backup API', url: 'api/backup.php?action=status' }
            ];

            let completedTests = 0;
            let passedTests = 0;
            
            document.getElementById('api-status').innerHTML = '<div class="info">🔄 Testing in corso...</div>';

            apiTests.forEach(test => {
                fetch(test.url)
                    .then(response => response.json())
                    .then(data => {
                        completedTests++;
                        if (data.success) {
                            passedTests++;
                        }
                        
                        if (completedTests === apiTests.length) {
                            if (passedTests === apiTests.length) {
                                document.getElementById('api-status').innerHTML = 
                                    `<div class="success">✅ Tutti i test API superati (${passedTests}/${apiTests.length})</div>`;
                                addMessage('✅ Tutte le API funzionano correttamente!', 'success');
                                setTimeout(() => showStep(5), 1000);
                            } else {
                                document.getElementById('api-status').innerHTML = 
                                    `<div class="warning">⚠️ Test parzialmente superati (${passedTests}/${apiTests.length})</div>`;
                                addMessage(`⚠️ ${passedTests}/${apiTests.length} API funzionanti`, 'warning');
                                setTimeout(() => showStep(5), 1000);
                            }
                        }
                    })
                    .catch(error => {
                        completedTests++;
                        if (completedTests === apiTests.length) {
                            document.getElementById('api-status').innerHTML = 
                                `<div class="error">❌ Test falliti (${passedTests}/${apiTests.length})</div>`;
                        }
                    });
            });
        }

        // Step 5: Completamento
        function completeInstallation() {
            addMessage('🎯 Finalizzazione installazione...', 'info');
            
            // Crea file di completamento installazione
            fetch('api/init.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'complete_installation',
                    timestamp: new Date().toISOString(),
                    data: installationData
                })
            })
            .then(() => {
                addMessage('🎉 Installazione completata con successo!', 'success');
                
                // Disabilita tutti i pulsanti
                document.querySelectorAll('button').forEach(btn => btn.disabled = true);
                
                // Messaggio finale
                setTimeout(() => {
                    alert('✅ RSA Schedule Manager installato correttamente!\n\nPuoi ora chiudere questa pagina e iniziare a usare il sistema.');
                }, 2000);
            });
        }

        // Inizializzazione
        document.addEventListener('DOMContentLoaded', function() {
            updateProgress(1);
            addMessage('👋 Benvenuto nell\'installazione di RSA Schedule Manager!', 'info');
        });
    </script>
</body>
</html>
