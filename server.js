// server.js - Versione con pulsanti toggle ON/OFF e database MySQL
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mysql = require('mysql2');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3000;

// Configurazione della connessione MySQL
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'door_game',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Creazione della tabella se non esiste
pool.query(`
    CREATE TABLE IF NOT EXISTS game_states (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_text TEXT,
        user1_button_state BOOLEAN,
        user2_button_state BOOLEAN,
        result_button_state BOOLEAN,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) {
        console.error('Errore nella creazione della tabella:', err);
    } else {
        console.log('Tabella game_states pronta');
    }
});

// Serviamo i file statici
app.use(express.static(path.join(__dirname, 'public')));

// Stato dei pulsanti (ora boolean per ON/OFF)
let user1ButtonState = false; // false = OFF, true = ON
let user2ButtonState = false; // false = OFF, true = ON
const connectedUsers = new Map();
let user1Assigned = false;
let user2Assigned = false;
let currentUser1Text = '';
let currentUser2Text = '';

io.on('connection', (socket) => {
    console.log(`Nuovo utente connesso: ${socket.id}`);
    
    // Inviamo l'ID di connessione al client
    socket.emit('connectionId', socket.id);
    
    // Inviamo lo stato attuale dei pulsanti e le assegnazioni
    socket.emit('gameState', {
        user1ButtonState,
        user2ButtonState,
        user1Assigned,
        user2Assigned
    });
    
    // Gestiamo il salvataggio del testo
    socket.on('saveUserText', (data) => {
        if (data.userRole === 'user1') {
            currentUser1Text = data.text;
            console.log(`Testo salvato per Utente 1: ${data.text}`);
        } else if (data.userRole === 'user2') {
            currentUser2Text = data.text;
            console.log(`Testo salvato per Utente 2: ${data.text}`);
        }
    });
    
    // Gestiamo la selezione del ruolo
    socket.on('setRole', (role) => {
        console.log(`Utente ${socket.id} ha selezionato il ruolo: ${role}`);
        
        // Verifichiamo se il ruolo è già assegnato
        if (role === 'user1' && user1Assigned) {
            socket.emit('roleError', 'Utente 1 è già stato assegnato');
            return;
        }
        if (role === 'user2' && user2Assigned) {
            socket.emit('roleError', 'Utente 2 è già stato assegnato');
            return;
        }
        
        // Assegniamo il ruolo
        connectedUsers.set(socket.id, role);
        if (role === 'user1') user1Assigned = true;
        if (role === 'user2') user2Assigned = true;
        
        // Notifichiamo tutti i client delle nuove assegnazioni
        io.emit('roleAssignment', {
            user1Assigned,
            user2Assigned
        });
    });
    
    // Gestiamo il toggle dei pulsanti
    socket.on('toggleButton', (data) => {
        // Verifichiamo se l'utente ha il permesso di modificare il pulsante
        const userRole = connectedUsers.get(socket.id);
        if (data.user === 'user1' && userRole !== 'user1') return;
        if (data.user === 'user2' && userRole !== 'user2') return;
        
        if (data.user === 'user1') {
            user1ButtonState = data.state;
        } else if (data.user === 'user2') {
            user2ButtonState = data.state;
        }
        
        // Notifichiamo tutti i client del cambiamento di stato
        io.emit('buttonStateChange', {
            user: data.user,
            state: data.state
        });
        
        // Controlliamo se entrambi i pulsanti sono ON per abilitare il risultato
        checkResult();
    });
    
    // Gestiamo la disconnessione
    socket.on('disconnect', () => {
        console.log(`Utente disconnesso: ${socket.id}`);
        const userRole = connectedUsers.get(socket.id);
        if (userRole === 'user1') {
            user1Assigned = false;
            user1ButtonState = false;
            currentUser1Text = '';
        } else if (userRole === 'user2') {
            user2Assigned = false;
            user2ButtonState = false;
            currentUser2Text = '';
        }
        connectedUsers.delete(socket.id);
        
        // Notifichiamo tutti i client delle nuove assegnazioni e stati
        io.emit('roleAssignment', {
            user1Assigned,
            user2Assigned
        });
        io.emit('gameState', {
            user1ButtonState,
            user2ButtonState,
            user1Assigned,
            user2Assigned
        });
    });
    
    // Funzione per controllare se entrambi i pulsanti sono ON per abilitare il risultato
    function checkResult() {
        if (user1ButtonState && user2ButtonState) {
            io.emit('canShowResult', true);
            
            // Salviamo lo stato nel database MySQL
            const query = `
                INSERT INTO game_states 
                (user_text, user1_button_state, user2_button_state, result_button_state) 
                VALUES (?, ?, ?, ?)
            `;
            
            // Salviamo il testo di entrambi gli utenti
            const combinedText = `Utente 1: ${currentUser1Text}\nUtente 2: ${currentUser2Text}`;
            
            pool.query(query, [combinedText, user1ButtonState, user2ButtonState, true], (err, results) => {
                if (err) {
                    console.error('Errore nel salvataggio dello stato:', err);
                } else {
                    console.log('Stato del gioco salvato nel database');
                }
            });
        } else {
            io.emit('canShowResult', false);
        }
    }
});

server.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});
