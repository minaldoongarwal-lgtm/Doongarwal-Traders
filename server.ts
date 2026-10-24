import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './src/server/db.js';
import { sendSupplierOrderEmail } from './src/server/emailService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get Inventory & Stats
app.get('/api/inventory', (req, res) => {
  try {
    const products = db.getProducts();
    const stats = db.getStats();
    res.json({ products, stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add Product
app.post('/api/inventory', (req, res) => {
  try {
    const { name, barcode, sku, category, currentQuantity, minimumQuantity, reorderQuantity, unitCost, retailPrice, supplierName, supplierEmail, supplierPhone, leadTimeDays, notes } = req.body;
    
    if (!name || !barcode || currentQuantity === undefined || minimumQuantity === undefined) {
      return res.status(400).json({ error: 'Missing required product fields (name, barcode, currentQuantity, minimumQuantity)' });
    }

    const product = db.addProduct({
      name,
      barcode: String(barcode).trim(),
      sku: sku || `SKU-${Date.now().toString().slice(-4)}`,
      category: category || 'General',
      currentQuantity: Number(currentQuantity),
      minimumQuantity: Number(minimumQuantity),
      reorderQuantity: Number(reorderQuantity || Math.max(1, minimumQuantity - currentQuantity)),
      unitCost: Number(unitCost || 0),
      retailPrice: Number(retailPrice || 0),
      supplierName: supplierName || 'Direct Vendor',
      supplierEmail: supplierEmail || 'supplier@example.com',
      supplierPhone,
      leadTimeDays: Number(leadTimeDays || 3),
      notes
    });

    res.status(201).json({ product, stats: db.getStats() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update Product
app.put('/api/inventory/:id', (req, res) => {
  try {
    const product = db.updateProduct(req.params.id, req.body);
    res.json({ product, stats: db.getStats() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Product
app.delete('/api/inventory/:id', (req, res) => {
  try {
    const success = db.deleteProduct(req.params.id);
    if (!success) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, stats: db.getStats() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ATOMIC SCAN DECREMENT
app.post('/api/inventory/scan', async (req, res) => {
  try {
    const { barcode, operator } = req.body;
    if (!barcode) {
      return res.status(400).json({ error: 'Barcode is required' });
    }

    const result = await db.scanBarcode(String(barcode), operator);
    const stats = db.getStats();
    res.json({ result, stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manual Stock Adjust / Restock
app.post('/api/inventory/adjust', async (req, res) => {
  try {
    const { productId, newQuantity, changeType, note, operator } = req.body;
    if (!productId || newQuantity === undefined) {
      return res.status(400).json({ error: 'productId and newQuantity are required' });
    }

    const outcome = await db.adjustStock(
      productId,
      Number(newQuantity),
      changeType || 'manual_adjustment',
      operator || 'Store Manager',
      note
    );

    res.json({ outcome, stats: db.getStats() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get Reorder Drafts & History
app.get('/api/reorders/drafts', (req, res) => {
  try {
    const drafts = db.getDrafts();
    res.json({ drafts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Edit Draft Order
app.put('/api/reorders/drafts/:id', (req, res) => {
  try {
    const draft = db.updateDraft(req.params.id, req.body);
    res.json({ draft });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// APPROVAL GATE: Approve and Send Order Email
app.post('/api/reorders/drafts/:id/approve', async (req, res) => {
  try {
    const { approver, sentEmailDetails } = req.body;
    const approvedOrder = await db.approveAndSendDraft(req.params.id, approver, sentEmailDetails);
    const stats = db.getStats();
    res.json({ order: approvedOrder, stats });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Reject Draft Order
app.post('/api/reorders/drafts/:id/reject', (req, res) => {
  try {
    const { reason, operator } = req.body;
    const draft = db.rejectDraft(req.params.id, reason, operator);
    const stats = db.getStats();
    res.json({ draft, stats });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Receive Order Shipment & Restock
app.post('/api/reorders/orders/:id/receive', async (req, res) => {
  try {
    const { operator } = req.body;
    const order = await db.receiveOrder(req.params.id, operator);
    const stats = db.getStats();
    res.json({ order, stats, products: db.getProducts() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Audit Logs
app.get('/api/audit-logs', (req, res) => {
  try {
    const logs = db.getAuditLogs();
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Email Settings
app.get('/api/email-settings', (req, res) => {
  try {
    const settings = db.getEmailSettings();
    res.json({ settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/email-settings', (req, res) => {
  try {
    const settings = db.updateEmailSettings(req.body);
    res.json({ settings });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Test Email Dispatch
app.post('/api/email-settings/test', async (req, res) => {
  try {
    const settings = db.getEmailSettings();
    const testDraft: any = {
      orderNumber: 'TEST-PO-9999',
      productName: 'System Diagnostic Test Item',
      barcode: '999999999999',
      orderQuantity: 10,
      unitCost: 5.00,
      totalCost: 50.00,
      supplierName: 'Diagnostic Mail Relay',
      supplierEmail: req.body.recipient || settings.fromEmail,
      emailSubject: 'StockPulse: Transactional Email Gateway Test',
      emailBody: `This is a verified test dispatch from StockPulse Inventory Manager.\nProvider: ${settings.provider}\nTimestamp: ${new Date().toISOString()}`
    };

    const details = await sendSupplierOrderEmail(testDraft, settings);
    res.json({ success: true, details });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset / Seed
app.post('/api/inventory/reset', (req, res) => {
  try {
    db.resetToSeed();
    res.json({
      success: true,
      products: db.getProducts(),
      drafts: db.getDrafts(),
      stats: db.getStats()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite Middleware for Dev / Static Files for Production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[StockPulse Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Startup Error]:', err);
});
