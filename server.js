const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const cloudinary = require('cloudinary').v2;

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ===== CLOUDINARY =====
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ===== MONGODB =====
const MONGODB_URI = process.env.MONGODB_URI;
let db;

async function connectDB() {
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db('casadw');
        console.log('✅ MongoDB conectado!');
    } catch (e) {
        console.error('❌ Erro ao conectar MongoDB:', e.message);
        process.exit(1);
    }
}

// ============== ROTAS ==============

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'API Casa DW funcionando!',
        timestamp: new Date().toISOString(),
        db: db ? 'MongoDB conectado' : 'Desconectado'
    });
});

// ===== UPLOAD DE ARQUIVO PARA CLOUDINARY =====
app.post('/api/upload', async (req, res) => {
    try {
        const { file, filename, userId } = req.body;

        if (!file) {
            return res.status(400).json({ success: false, error: 'Arquivo obrigatório' });
        }

        const result = await cloudinary.uploader.upload(file, {
            folder: `casadw/${userId || 'geral'}`,
            resource_type: 'auto',
            public_id: `${Date.now()}_${(filename || 'arquivo').replace(/[^a-z0-9]/gi, '_')}`
        });

        res.json({
            success: true,
            url: result.secure_url,
            publicId: result.public_id
        });
    } catch (e) {
        console.error('❌ Erro upload Cloudinary:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// ===== DELETAR ARQUIVO DO CLOUDINARY =====
app.delete('/api/upload', async (req, res) => {
    try {
        const { publicId } = req.body;
        if (!publicId) return res.status(400).json({ success: false, error: 'publicId obrigatório' });
        await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
        res.json({ success: true });
    } catch (e) {
        console.error('❌ Erro ao deletar do Cloudinary:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// ===== OBTER DADOS DO USUÁRIO =====
app.get('/api/sync/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const col = db.collection('users');
        const userData = await col.findOne({ userId });

        const defaultCategories = ['Alimentação', 'Carro', 'Transporte', 'Manutenção', 'Farmácia', 'Outros', 'Pets', 'Hotel', 'Escritório', 'Fornecedor'];
        const defaultSuppliers = ['Amoedo', 'Carrefour', 'Detail Wash', 'Droga Raia', 'Hortfruti', 'Kalunga', 'Lave Bem', 'Outros', 'Pacheco', 'PetChic', 'Posto hum', 'Prezunic', 'RM água', 'Venancio', 'Zona Sul'];
        const defaultPaymentMethods = ['Cartão de Crédito', 'Reembolso', 'Conta Corrente', 'Outros'];

        if (!userData) {
            return res.json({
                expenses: [],
                income: [],
                fleet: { vehicles: [] },
                notes: [],
                systemUsers: [],
                years: [2024, 2025, 2026],
                categories: defaultCategories,
                suppliers: defaultSuppliers,
                paymentMethods: defaultPaymentMethods,
                maintenance: [],
                maintenanceTypes: [],
                maintenanceAreas: [],
                timestamp: Date.now()
            });
        }

        res.json({
            expenses: userData.expenses || [],
            income: userData.income || [],
            fleet: userData.fleet || { vehicles: [] },
            notes: userData.notes || [],
            systemUsers: userData.systemUsers || [],
            years: userData.years || [2024, 2025, 2026],
            categories: userData.categories || defaultCategories,
            suppliers: userData.suppliers || defaultSuppliers,
            paymentMethods: userData.paymentMethods || defaultPaymentMethods,
            maintenance: userData.maintenance || [],
            maintenanceTypes: userData.maintenanceTypes || [],
            maintenanceAreas: userData.maintenanceAreas || [],
            timestamp: Date.now()
        });
    } catch (e) {
        console.error('❌ Erro ao obter dados:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// ===== SALVAR DADOS DO USUÁRIO =====
app.post('/api/sync', async (req, res) => {
    try {
        const { userId, expenses, income, fleet, notes, systemUsers, years, categories, suppliers, paymentMethods, maintenance, maintenanceTypes, maintenanceAreas } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, error: 'userId obrigatório' });
        }

        const col = db.collection('users');

        const update = { userId, updatedAt: new Date() };
        if (expenses !== undefined) update.expenses = expenses;
        if (income !== undefined) update.income = income;
        if (fleet !== undefined) update.fleet = fleet;
        if (notes !== undefined) update.notes = notes;
        if (systemUsers !== undefined) update.systemUsers = systemUsers;
        if (years !== undefined) update.years = years;
        if (categories !== undefined) update.categories = categories;
        if (suppliers !== undefined) update.suppliers = suppliers;
        if (paymentMethods !== undefined) update.paymentMethods = paymentMethods;
        if (maintenance !== undefined) update.maintenance = maintenance;
        if (maintenanceTypes !== undefined) update.maintenanceTypes = maintenanceTypes;
        if (maintenanceAreas !== undefined) update.maintenanceAreas = maintenanceAreas;

        await col.updateOne(
            { userId },
            { $set: update },
            { upsert: true }
        );

        res.json({ success: true });
    } catch (e) {
        console.error('❌ Erro ao salvar dados:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// ===== DELETAR DADOS DO USUÁRIO =====
app.delete('/api/sync/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const col = db.collection('users');
        await col.deleteOne({ userId });
        res.json({ success: true, message: `Dados de ${userId} deletados` });
    } catch (e) {
        console.error('❌ Erro ao deletar dados:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// ===== INICIAR SERVIDOR =====
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
        console.log(`☁️  Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME}`);
        console.log(`🍃 MongoDB: conectado`);
    });
});
