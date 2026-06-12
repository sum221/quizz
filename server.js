const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');

// Initialisierung des Express App
const app = express();

// Middleware konfigurieren
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- KONFIGURATION & PORT PRÜFUNG ---
// Prüft auf die Umgebungsvariable $PORT (für Hosting) oder nutzt Standard 3000
const PORT = process.env.PORT || 3000;

console.log(`Server startet auf Port: ${PORT}`);

// --- FAKE DATABASE (In-Memory für Demo) ---
let users = {};      // { token: { email, name } }
let quizzes = {};    // { code: { title, questions... } }

// Hilfsfunktion für zufällige Quiz-Codes
const generateCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();

// --- ROUTES FÜR ERSTELLER (Creator) ---

// 1. Login / Registrierung
app.post('/api/auth', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email benötigt' });
    
    // Generiere einen Session-Token
    const token = crypto.randomBytes(32).toString('hex');
    users[token] = { 
        email, 
        name: email.split('@')[0],
        createdAt: new Date().toISOString()
    };
    
    res.json({ token, welcome: `Hallo ${users[token].name}` });
});

// 2. Quiz erstellen
app.post('/api/quiz/create', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !users[authHeader]) return res.status(401).json({ error: 'Unauthorized' });

    const { title, questions } = req.body;
    const code = generateCode(); // z.B. "A1B2C3"
    
    quizzes[code] = {
        id: code,
        title: title || 'Unbenanntes Quiz',
        questions: questions || [],
        creator: users[authHeader].email,
        createdAt: new Date().toISOString()
    };

    res.json({ 
        success: true, 
        code, 
        url: `${process.env.APP_URL || `http://localhost:${PORT}`}/play?code=${code}` 
    });
});

// --- ROUTES FÜR SPIELER (Player) ---

// 1. Quiz laden (ohne Login!)
app.get('/api/quiz/:code', (req, res) => {
    const quiz = quizzes[req.params.code];
    if (!quiz) return res.status(404).json({ error: 'Quiz nicht gefunden' });
    
    // Wir senden nur das Notwendige zurück (keine Metadaten des Erstellers)
    res.json({ 
        title: quiz.title, 
        questions: quiz.questions 
    });
});

// --- FALLBACK ROUTE (für SPA Routing) ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server starten mit PORT-Prüfung
app.listen(PORT, () => {
    console.log(`✅ Server läuft auf http://localhost:${PORT}`);
    console.log(`📝 Ersteller Link: http://localhost:${PORT}/create`);
    console.log(`🎮 Spieler Link: http://localhost:${PORT}/play?code=CODE`);
});

module.exports = app; // Für Testing exportieren
