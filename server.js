// server.js - Versione con pulsanti toggle ON/OFF
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3000;

// Serviamo i file statici
app.use(express.static(path.join(__dirname, 'public')));

// Stato dei pulsanti (ora boolean per ON/OFF)
let user1ButtonState = false; // false = OFF, true = ON
let user2ButtonState = false; // false = OFF, true = ON
const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log(`Nuovo utente connesso: ${socket.id}`);
    
    // Inviamo l'ID di connessione al client
    socket.emit('connectionId', socket.id);
    
    // Inviamo lo stato attuale dei pulsanti
    socket.emit('gameState', {
        user1ButtonState,
        user2ButtonState
    });
    
    // Gestiamo la selezione del ruolo
    socket.on('setRole', (role) => {
        console.log(`Utente ${socket.id} ha selezionato il ruolo: ${role}`);
        connectedUsers.set(socket.id, role);
    });
    
    // Gestiamo il toggle dei pulsanti
    socket.on('toggleButton', (data) => {
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
        connectedUsers.delete(socket.id);
    });
    
    // Funzione per controllare se entrambi i pulsanti sono ON
    function checkResult() {
        if (user1ButtonState && user2ButtonState) {
            io.emit('canShowResult', true);
        } else {
            io.emit('canShowResult', false);
        }
    }
});

server.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});
