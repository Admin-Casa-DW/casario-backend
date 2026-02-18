const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Banco de dados em memória (simples e funcional!)
const database = {
    users: {} // { userId: { expenses: {}, income: {}, fleet: {}, notes: {} } }
};

// Função auxiliar para obter dados do usuário
function getUserData(userId) {
    if (!database.users[userId]) {
        database.users[userId] = {
            expenses: {},
            income: {},
            fleet: { vehicles: [] },
            notes: {}
        };
    }
    return database.users[userId];
}

// ============== ROTAS ==============

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'API Casario Financeiro funcionando!',
        timestamp: new Date().toISOString(),
        users: Object.keys(database.users).length
    });
});

// ===== DESPESAS =====

// Obter despesas de um mês específico
app.get('/api/expenses/:userId/:month/:year', (req, res) => {
    const { userId, month, year } = req.params;
    const userData = getUserData(userId);
    const key = `${month}-${year}`;

    const expense = userData.expenses[key] || {
        userId,
        month: parseInt(month),
        year: parseInt(year),
        items: []
    };

    res.json(expense);
});

// Salvar/Atualizar despesas de um mês
app.post('/api/expenses', (req, res) => {
    const { userId, month, year, items } = req.body;
    const userData = getUserData(userId);
    const key = `${month}-${year}`;

    userData.expenses[key] = {
        userId,
        month,
        year,
        items,
        updatedAt: new Date()
    };

    res.json({ success: true, expense: userData.expenses[key] });
});

// ===== RECEITAS =====

// Obter receitas de um mês específico
app.get('/api/income/:userId/:month/:year', (req, res) => {
    const { userId, month, year } = req.params;
    const userData = getUserData(userId);
    const key = `${month}-${year}`;

    const income = userData.income[key] || {
        userId,
        month: parseInt(month),
        year: parseInt(year),
        items: []
    };

    res.json(income);
});

// Salvar/Atualizar receitas de um mês
app.post('/api/income', (req, res) => {
    const { userId, month, year, items } = req.body;
    const userData = getUserData(userId);
    const key = `${month}-${year}`;

    userData.income[key] = {
        userId,
        month,
        year,
        items,
        updatedAt: new Date()
    };

    res.json({ success: true, income: userData.income[key] });
});

// ===== FROTA =====

// Obter frota do usuário
app.get('/api/fleet/:userId', (req, res) => {
    const { userId } = req.params;
    const userData = getUserData(userId);

    res.json(userData.fleet);
});

// Salvar/Atualizar frota
app.post('/api/fleet', (req, res) => {
    const { userId, vehicles } = req.body;
    const userData = getUserData(userId);

    userData.fleet = {
        userId,
        vehicles,
        updatedAt: new Date()
    };

    res.json({ success: true, fleet: userData.fleet });
});

// ===== NOTAS =====

// Obter nota de um mês
app.get('/api/notes/:userId/:month/:year', (req, res) => {
    const { userId, month, year } = req.params;
    const userData = getUserData(userId);
    const key = `${month}-${year}`;

    const note = userData.notes[key] || {
        userId,
        month: parseInt(month),
        year: parseInt(year),
        content: ''
    };

    res.json(note);
});

// Salvar nota
app.post('/api/notes', (req, res) => {
    const { userId, month, year, content } = req.body;
    const userData = getUserData(userId);
    const key = `${month}-${year}`;

    userData.notes[key] = {
        userId,
        month,
        year,
        content,
        updatedAt: new Date()
    };

    res.json({ success: true, note: userData.notes[key] });
});

// ===== SINCRONIZAÇÃO COMPLETA =====

// Obter TODOS os dados de um usuário
app.get('/api/sync/:userId', (req, res) => {
    const userId = req.params.userId;
    const userData = getUserData(userId);

    // Converter objetos de volta para arrays
    const expenses = Object.values(userData.expenses);
    const income = Object.values(userData.income);
    const notes = Object.values(userData.notes);

    res.json({
        expenses: expenses || [],
        income: income || [],
        fleet: userData.fleet || { vehicles: [] },
        notes: notes || [],
        timestamp: Date.now()
    });
});

// Sincronizar TODOS os dados de uma vez
app.post('/api/sync', (req, res) => {
    const { userId, expenses, income, fleet, notes } = req.body;
    const userData = getUserData(userId);

    // Salvar despesas
    if (expenses && Array.isArray(expenses)) {
        expenses.forEach(exp => {
            const key = `${exp.month}-${exp.year}`;
            userData.expenses[key] = {
                userId,
                month: exp.month,
                year: exp.year,
                items: exp.items,
                updatedAt: new Date()
            };
        });
    }

    // Salvar receitas
    if (income && Array.isArray(income)) {
        income.forEach(inc => {
            const key = `${inc.month}-${inc.year}`;
            userData.income[key] = {
                userId,
                month: inc.month,
                year: inc.year,
                items: inc.items,
                updatedAt: new Date()
            };
        });
    }

    // Salvar frota
    if (fleet) {
        userData.fleet = {
            userId,
            vehicles: fleet.vehicles || [],
            updatedAt: new Date()
        };
    }

    // Salvar notas
    if (notes && Array.isArray(notes)) {
        notes.forEach(note => {
            const key = `${note.month}-${note.year}`;
            userData.notes[key] = {
                userId,
                month: note.month,
                year: note.year,
                content: note.content,
                updatedAt: new Date()
            };
        });
    }

    res.json({ success: true });
});

// Porta
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
    console.log(`💾 Banco de dados: Em memória (simples e rápido)`);
});
