import fs from 'fs';
import path from 'path';
import { 
  Product, 
  StockAuditLog, 
  ReorderDraft, 
  ScanResult, 
  EmailSettings, 
  InventoryStats,
  SentEmailDetails 
} from '../types.js';
import { generateOrderEmailContent, sendSupplierOrderEmail } from './emailService.js';

interface DatabaseSchema {
  products: Product[];
  drafts: ReorderDraft[];
  auditLogs: StockAuditLog[];
  emailSettings: EmailSettings;
  orderCounter: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'inventory-store.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default Seed Products
// Default Seed Products matching user's Supply Chain Demo Data
const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    name: 'Paper towel boxes',
    barcode: '037000123456',
    sku: 'SUP-TOWL-01',
    category: 'Facility Supplies',
    unit: 'boxes',
    currentQuantity: 5, // 5 < 20 -> Breached! Deficit = 15
    minimumQuantity: 20,
    reorderQuantity: 15,
    unitCost: 32.50,
    retailPrice: 48.00,
    supplierName: 'Cascades Commercial Paper',
    supplierEmail: 'orders@cascadespaper.example.com',
    supplierPhone: '(555) 234-8901',
    leadTimeDays: 2,
    notes: '2-ply commercial multifold paper towels (16 packs/box).',
    status: 'low_stock',
    lastRestockedAt: '2026-10-18T10:00:00Z',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-24T00:00:00Z'
  },
  {
    id: 'prod_2',
    name: 'Cardboard box packs',
    barcode: '078912345670',
    sku: 'PKG-CRD-02',
    category: 'Packaging Supplies',
    unit: 'packs',
    currentQuantity: 12, // 12 < 20 -> Breached! Deficit = 8
    minimumQuantity: 20,
    reorderQuantity: 8,
    unitCost: 18.00,
    retailPrice: 28.50,
    supplierName: 'Pratt Box & Corrugated Co.',
    supplierEmail: 'sales@prattbox.example.com',
    supplierPhone: '(555) 876-1122',
    leadTimeDays: 3,
    notes: 'Heavy duty corrugated shipping boxes (25/pack).',
    status: 'low_stock',
    lastRestockedAt: '2026-10-20T14:30:00Z',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-24T00:00:00Z'
  },
  {
    id: 'prod_3',
    name: 'Hand soap bottles',
    barcode: '042000890123',
    sku: 'SUP-SOAP-03',
    category: 'Facility Supplies',
    unit: 'bottles',
    currentQuantity: 30, // 30 >= 15 -> Healthy! Action: No reorder
    minimumQuantity: 15,
    reorderQuantity: 0,
    unitCost: 3.75,
    retailPrice: 7.99,
    supplierName: 'CleanCare Commercial Direct',
    supplierEmail: 'supply@cleancaredirect.example.com',
    supplierPhone: '(555) 432-9087',
    leadTimeDays: 2,
    notes: 'Antibacterial foaming hand soap pump bottles (500ml).',
    status: 'healthy',
    lastRestockedAt: '2026-10-22T09:15:00Z',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-24T00:00:00Z'
  },
  {
    id: 'prod_4',
    name: 'Packing tape rolls',
    barcode: '051131065345',
    sku: 'PKG-TAPE-04',
    category: 'Packaging Supplies',
    unit: 'rolls',
    currentQuantity: 25, // 25 >= 10 -> Healthy! Action: No reorder
    minimumQuantity: 10,
    reorderQuantity: 0,
    unitCost: 2.10,
    retailPrice: 4.50,
    supplierName: 'Industrial Adhesives Depot',
    supplierEmail: 'orders@adhesivesdepot.example.com',
    supplierPhone: '(555) 345-6789',
    leadTimeDays: 2,
    notes: 'Commercial 3-mil clear packing tape (55yd rolls).',
    status: 'healthy',
    lastRestockedAt: '2026-10-23T11:00:00Z',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-24T00:00:00Z'
  },
  {
    id: 'prod_5',
    name: 'Bubble wrap rolls',
    barcode: '084000345678',
    sku: 'PKG-BBL-05',
    category: 'Packaging Supplies',
    unit: 'rolls',
    currentQuantity: 2, // 2 < 8 -> Breached! Deficit = 6
    minimumQuantity: 8,
    reorderQuantity: 6,
    unitCost: 24.00,
    retailPrice: 38.00,
    supplierName: 'SealedAir Protective Pack',
    supplierEmail: 'fulfillment@sealedprotective.example.com',
    supplierPhone: '(555) 678-2341',
    leadTimeDays: 3,
    notes: 'Perforated heavy duty bubble cushion (12in x 350ft).',
    status: 'low_stock',
    lastRestockedAt: '2026-10-10T16:00:00Z',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-24T00:00:00Z'
  },
  {
    id: 'prod_6',
    name: 'Thermal shipping labels',
    barcode: '075300901234',
    sku: 'LBL-THM-06',
    category: 'Shipping & Office',
    unit: 'labels',
    currentQuantity: 1500, // 1500 < 3000 -> Breached! Deficit = 1500
    minimumQuantity: 3000,
    reorderQuantity: 1500,
    unitCost: 0.035,
    retailPrice: 0.08,
    supplierName: 'Avery Direct Warehouse',
    supplierEmail: 'b2b@averylabels.example.com',
    supplierPhone: '(555) 901-2345',
    leadTimeDays: 2,
    notes: 'Direct thermal 4x6 shipping labels (fanfold / rolls).',
    status: 'low_stock',
    lastRestockedAt: '2026-10-12T08:30:00Z',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-24T00:00:00Z'
  },
  {
    id: 'prod_7',
    name: 'Sharpie markers',
    barcode: '071641012345',
    sku: 'OFC-SHRP-07',
    category: 'Shipping & Office',
    unit: 'pcs',
    currentQuantity: 18, // 18 >= 12 -> Healthy! Action: No reorder
    minimumQuantity: 12,
    reorderQuantity: 0,
    unitCost: 0.85,
    retailPrice: 1.99,
    supplierName: 'Newell Brands Direct',
    supplierEmail: 'orders@newellbrands.example.com',
    supplierPhone: '(555) 456-7890',
    leadTimeDays: 3,
    notes: 'Fine point black permanent markers.',
    status: 'healthy',
    lastRestockedAt: '2026-10-21T13:45:00Z',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-24T00:00:00Z'
  }
];

const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  provider: (process.env.EMAIL_PROVIDER as any) || 'simulated',
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  mailgunApiKey: process.env.MAILGUN_API_KEY || '',
  mailgunDomain: process.env.MAILGUN_DOMAIN || '',
  fromEmail: process.env.FROM_EMAIL || 'purchasing@stockpulse-store.com',
  fromName: process.env.FROM_NAME || 'Peak Provisions Purchasing Team',
  storeName: 'Peak Provisions & Retail Co.',
  storeAddress: '104 Market Street, Suite B, Seattle, WA 98101'
};

class InventoryDatabase {
  private data: DatabaseSchema;
  private queue: Promise<any> = Promise.resolve();

  constructor() {
    this.data = this.load();
    // Generate initial drafts for any pre-breached seed products if not existing
    this.bootstrapDraftsForBreaches();
  }

  private load(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('Failed to parse database file, resetting to defaults:', err);
      }
    }
    const initialDb: DatabaseSchema = {
      products: INITIAL_PRODUCTS,
      drafts: [],
      auditLogs: [],
      emailSettings: DEFAULT_EMAIL_SETTINGS,
      orderCounter: 101
    };
    this.saveDirect(initialDb);
    return initialDb;
  }

  private saveDirect(db: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  private save() {
    this.saveDirect(this.data);
  }

  private bootstrapDraftsForBreaches() {
    for (const prod of this.data.products) {
      if (prod.currentQuantity < prod.minimumQuantity) {
        const existing = this.data.drafts.find(
          d => d.productId === prod.id && d.status === 'pending_approval'
        );
        if (!existing) {
          const deficit = prod.minimumQuantity - prod.currentQuantity;
          const orderNum = `PO-${new Date().getFullYear()}-${String(this.data.orderCounter++).padStart(4, '0')}`;
          const orderQuantity = deficit; // Strict deficit calculation as required
          const totalCost = Number((orderQuantity * prod.unitCost).toFixed(2));
          
          const { subject, body } = generateOrderEmailContent(
            {
              orderNumber: orderNum,
              productName: prod.name,
              barcode: prod.barcode,
              unit: prod.unit,
              orderQuantity,
              unitCost: prod.unitCost,
              totalCost,
              supplierName: prod.supplierName
            },
            this.data.emailSettings
          );

          this.data.drafts.push({
            id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            orderNumber: orderNum,
            productId: prod.id,
            productName: prod.name,
            barcode: prod.barcode,
            unit: prod.unit,
            currentQuantity: prod.currentQuantity,
            minimumQuantity: prod.minimumQuantity,
            deficit,
            suggestedQuantity: deficit,
            orderQuantity,
            unitCost: prod.unitCost,
            totalCost,
            supplierName: prod.supplierName,
            supplierEmail: prod.supplierEmail,
            emailSubject: subject,
            emailBody: body,
            status: 'pending_approval',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
    }
    this.save();
  }

  // Thread-safe mutex queue executor to guarantee atomic decrements
  private enqueue<T>(fn: () => Promise<T> | T): Promise<T> {
    const next = this.queue.then(() => fn());
    this.queue = next.catch(() => {});
    return next;
  }

  public getProducts(): Product[] {
    return this.data.products;
  }

  public getProductByBarcode(barcode: string): Product | undefined {
    const clean = barcode.trim();
    return this.data.products.find(p => p.barcode === clean);
  }

  public getProductById(id: string): Product | undefined {
    return this.data.products.find(p => p.id === id);
  }

  public getDrafts(): ReorderDraft[] {
    return this.data.drafts;
  }

  public getAuditLogs(): StockAuditLog[] {
    return this.data.auditLogs;
  }

  public getEmailSettings(): EmailSettings {
    return this.data.emailSettings;
  }

  public updateEmailSettings(settings: Partial<EmailSettings>): EmailSettings {
    this.data.emailSettings = { ...this.data.emailSettings, ...settings };
    this.save();
    return this.data.emailSettings;
  }

  public getStats(): InventoryStats {
    const totalSkus = this.data.products.length;
    let totalUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let healthyCount = 0;
    let totalInventoryValue = 0;

    for (const p of this.data.products) {
      totalUnits += p.currentQuantity;
      totalInventoryValue += (p.currentQuantity * p.retailPrice);
      if (p.currentQuantity === 0) {
        outOfStockCount++;
        lowStockCount++;
      } else if (p.currentQuantity < p.minimumQuantity) {
        lowStockCount++;
      } else {
        healthyCount++;
      }
    }

    const pendingApprovalsCount = this.data.drafts.filter(d => d.status === 'pending_approval').length;
    
    // Today's sales scan count
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySalesCount = this.data.auditLogs.filter(
      l => l.changeType === 'sale_scan' && l.timestamp.startsWith(todayStr)
    ).length;

    return {
      totalSkus,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      healthyCount,
      pendingApprovalsCount,
      totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
      todaySalesCount
    };
  }

  /**
   * ATOMIC BARCODE SALES SCAN
   * Uses serialized promise queue to guarantee strict race-condition safety.
   */
  public async scanBarcode(barcode: string, operator = 'Barcode POS Terminal #1'): Promise<ScanResult> {
    return this.enqueue(async () => {
      const cleanBarcode = barcode.trim();
      const product = this.data.products.find(p => p.barcode === cleanBarcode);

      if (!product) {
        return {
          success: false,
          barcode: cleanBarcode,
          message: `Unknown barcode "${cleanBarcode}". Item not in product catalog.`,
          timestamp: new Date().toISOString()
        };
      }

      const prevQty = product.currentQuantity;
      
      // Stock cannot drop below 0
      if (prevQty <= 0) {
        return {
          success: false,
          product,
          previousQuantity: 0,
          newQuantity: 0,
          breached: true,
          barcode: cleanBarcode,
          message: `Cannot decrement "${product.name}". Inventory is already depleted (0 units).`,
          timestamp: new Date().toISOString()
        };
      }

      // Decrement atomically
      const newQty = prevQty - 1;
      product.currentQuantity = newQty;
      product.updatedAt = new Date().toISOString();

      // Check breach condition: Current Stock < Minimum Required Stock
      const isBreached = newQty < product.minimumQuantity;
      if (newQty === 0) {
        product.status = 'out_of_stock';
      } else if (isBreached) {
        product.status = 'low_stock';
      } else {
        product.status = 'healthy';
      }

      let draftId: string | undefined;
      let draftCreated = false;
      let draftUpdated = false;

      if (isBreached) {
        // Business Rule: Reorder Quantity = Minimum Required Stock - Current Stock
        const deficit = product.minimumQuantity - newQty;
        
        // Prevent duplicate drafts: Check if pending draft already exists for this product
        const existingDraft = this.data.drafts.find(
          d => d.productId === product.id && d.status === 'pending_approval'
        );

        if (existingDraft) {
          // Update the open draft with new deficit quantity and refreshed email
          existingDraft.currentQuantity = newQty;
          existingDraft.deficit = deficit;
          existingDraft.suggestedQuantity = deficit;
          existingDraft.orderQuantity = deficit; // Exactly deficit
          existingDraft.totalCost = Number((deficit * product.unitCost).toFixed(2));
          existingDraft.updatedAt = new Date().toISOString();
          
          const { subject, body } = generateOrderEmailContent(
            {
              orderNumber: existingDraft.orderNumber,
              productName: product.name,
              barcode: product.barcode,
              unit: product.unit,
              orderQuantity: deficit,
              unitCost: product.unitCost,
              totalCost: existingDraft.totalCost,
              supplierName: product.supplierName
            },
            this.data.emailSettings
          );
          existingDraft.emailSubject = subject;
          existingDraft.emailBody = body;

          draftId = existingDraft.id;
          draftUpdated = true;
        } else {
          // Create brand new draft order routed to Pending Approvals queue
          const orderNum = `PO-${new Date().getFullYear()}-${String(this.data.orderCounter++).padStart(4, '0')}`;
          const orderQuantity = deficit;
          const totalCost = Number((orderQuantity * product.unitCost).toFixed(2));

          const { subject, body } = generateOrderEmailContent(
            {
              orderNumber: orderNum,
              productName: product.name,
              barcode: product.barcode,
              unit: product.unit,
              orderQuantity,
              unitCost: product.unitCost,
              totalCost,
              supplierName: product.supplierName
            },
            this.data.emailSettings
          );

          const newDraft: ReorderDraft = {
            id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            orderNumber: orderNum,
            productId: product.id,
            productName: product.name,
            barcode: product.barcode,
            unit: product.unit,
            currentQuantity: newQty,
            minimumQuantity: product.minimumQuantity,
            deficit,
            suggestedQuantity: deficit,
            orderQuantity,
            unitCost: product.unitCost,
            totalCost,
            supplierName: product.supplierName,
            supplierEmail: product.supplierEmail,
            emailSubject: subject,
            emailBody: body,
            status: 'pending_approval',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          this.data.drafts.unshift(newDraft);
          draftId = newDraft.id;
          draftCreated = true;
        }
      }

      // Record atomic audit log
      const logEntry: StockAuditLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
        changeType: 'sale_scan',
        previousQuantity: prevQty,
        newQuantity: newQty,
        changeAmount: -1,
        breachedMinimum: isBreached,
        draftOrderId: draftId,
        operator,
        timestamp: new Date().toISOString()
      };
      this.data.auditLogs.unshift(logEntry);

      // Persist changes
      this.save();

      return {
        success: true,
        product,
        previousQuantity: prevQty,
        newQuantity: newQty,
        breached: isBreached,
        draftCreated,
        draftUpdated,
        draftId,
        barcode: cleanBarcode,
        message: `Sold 1 unit of "${product.name}". Remaining stock: ${newQty} units.`,
        timestamp: new Date().toISOString()
      };
    });
  }

  /**
   * MANUAL STOCK ADJUSTMENT / RESTOCK
   */
  public async adjustStock(
    productId: string, 
    newQuantity: number, 
    changeType: 'manual_adjustment' | 'restock_received',
    operator = 'Store Manager',
    note?: string
  ): Promise<{ product: Product; auditLog: StockAuditLog }> {
    return this.enqueue(async () => {
      const product = this.data.products.find(p => p.id === productId);
      if (!product) throw new Error('Product not found');

      const prevQty = product.currentQuantity;
      const targetQty = Math.max(0, Math.floor(newQuantity));
      const delta = targetQty - prevQty;

      product.currentQuantity = targetQty;
      product.updatedAt = new Date().toISOString();
      if (changeType === 'restock_received') {
        product.lastRestockedAt = new Date().toISOString();
      }

      const isBreached = targetQty < product.minimumQuantity;
      if (targetQty === 0) {
        product.status = 'out_of_stock';
      } else if (isBreached) {
        product.status = 'low_stock';
      } else {
        product.status = 'healthy';
      }

      const log: StockAuditLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
        changeType,
        previousQuantity: prevQty,
        newQuantity: targetQty,
        changeAmount: delta,
        breachedMinimum: isBreached,
        note,
        operator,
        timestamp: new Date().toISOString()
      };
      this.data.auditLogs.unshift(log);

      this.save();
      return { product, auditLog: log };
    });
  }

  /**
   * ADD NEW PRODUCT
   */
  public addProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Product {
    const existingBarcode = this.data.products.find(p => p.barcode === productData.barcode.trim());
    if (existingBarcode) {
      throw new Error(`Product with barcode "${productData.barcode}" already exists: ${existingBarcode.name}`);
    }

    const currentQty = Math.max(0, productData.currentQuantity);
    const minQty = Math.max(0, productData.minimumQuantity);
    const isBreached = currentQty < minQty;

    const newProduct: Product = {
      ...productData,
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      barcode: productData.barcode.trim(),
      currentQuantity: currentQty,
      minimumQuantity: minQty,
      status: currentQty === 0 ? 'out_of_stock' : isBreached ? 'low_stock' : 'healthy',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.products.push(newProduct);

    // Initial audit log
    this.data.auditLogs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId: newProduct.id,
      productName: newProduct.name,
      barcode: newProduct.barcode,
      changeType: 'initial_count',
      previousQuantity: 0,
      newQuantity: currentQty,
      changeAmount: currentQty,
      breachedMinimum: isBreached,
      note: 'Initial catalog creation',
      operator: 'Catalog Admin',
      timestamp: new Date().toISOString()
    });

    if (isBreached) {
      const deficit = minQty - currentQty;
      const orderNum = `PO-${new Date().getFullYear()}-${String(this.data.orderCounter++).padStart(4, '0')}`;
      const { subject, body } = generateOrderEmailContent(
        {
          orderNumber: orderNum,
          productName: newProduct.name,
          barcode: newProduct.barcode,
          orderQuantity: deficit,
          unitCost: newProduct.unitCost,
          totalCost: deficit * newProduct.unitCost,
          supplierName: newProduct.supplierName
        },
        this.data.emailSettings
      );

      this.data.drafts.unshift({
        id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        orderNumber: orderNum,
        productId: newProduct.id,
        productName: newProduct.name,
        barcode: newProduct.barcode,
        currentQuantity: currentQty,
        minimumQuantity: minQty,
        deficit,
        suggestedQuantity: deficit,
        orderQuantity: deficit,
        unitCost: newProduct.unitCost,
        totalCost: Number((deficit * newProduct.unitCost).toFixed(2)),
        supplierName: newProduct.supplierName,
        supplierEmail: newProduct.supplierEmail,
        emailSubject: subject,
        emailBody: body,
        status: 'pending_approval',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    this.save();
    return newProduct;
  }

  /**
   * UPDATE PRODUCT
   */
  public updateProduct(id: string, updates: Partial<Product>): Product {
    const product = this.data.products.find(p => p.id === id);
    if (!product) throw new Error('Product not found');

    if (updates.barcode && updates.barcode !== product.barcode) {
      const conflict = this.data.products.find(p => p.barcode === updates.barcode && p.id !== id);
      if (conflict) {
        throw new Error(`Barcode ${updates.barcode} already assigned to ${conflict.name}`);
      }
    }

    const prevQty = product.currentQuantity;
    Object.assign(product, updates, { updatedAt: new Date().toISOString() });

    const isBreached = product.currentQuantity < product.minimumQuantity;
    product.status = product.currentQuantity === 0 ? 'out_of_stock' : isBreached ? 'low_stock' : 'healthy';

    if (updates.currentQuantity !== undefined && updates.currentQuantity !== prevQty) {
      this.data.auditLogs.unshift({
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
        changeType: 'manual_adjustment',
        previousQuantity: prevQty,
        newQuantity: product.currentQuantity,
        changeAmount: product.currentQuantity - prevQty,
        breachedMinimum: isBreached,
        operator: 'Store Manager',
        note: 'Product details updated',
        timestamp: new Date().toISOString()
      });
    }

    this.save();
    return product;
  }

  /**
   * DELETE PRODUCT
   */
  public deleteProduct(id: string): boolean {
    const index = this.data.products.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.data.products.splice(index, 1);
    this.save();
    return true;
  }

  /**
   * EDIT DRAFT ORDER
   */
  public updateDraft(id: string, updates: Partial<ReorderDraft>): ReorderDraft {
    const draft = this.data.drafts.find(d => d.id === id);
    if (!draft) throw new Error('Draft order not found');

    if (draft.status !== 'pending_approval') {
      throw new Error(`Cannot edit order that is already ${draft.status}`);
    }

    if (updates.orderQuantity !== undefined) {
      updates.orderQuantity = Math.max(1, Math.floor(updates.orderQuantity));
      updates.totalCost = Number((updates.orderQuantity * draft.unitCost).toFixed(2));
    }

    Object.assign(draft, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return draft;
  }

  /**
   * APPROVAL GATE: APPROVE AND SEND ORDER EMAIL
   */
  public async approveAndSendDraft(
    id: string, 
    approver = 'Store Manager',
    clientEmailDetails?: SentEmailDetails
  ): Promise<ReorderDraft> {
    const draft = this.data.drafts.find(d => d.id === id);
    if (!draft) throw new Error('Draft order not found');

    if (draft.status !== 'pending_approval') {
      throw new Error(`Order ${draft.orderNumber} is already ${draft.status}`);
    }

    // Use client-provided email details (e.g. dispatched via Gmail API) or server gateway
    const emailDetails = clientEmailDetails || (await sendSupplierOrderEmail(draft, this.data.emailSettings));

    const now = new Date().toISOString();
    draft.status = 'approved';
    draft.approvedAt = now;
    draft.sentAt = now;
    draft.sentEmailDetails = emailDetails;
    draft.updatedAt = now;

    // Log approval in audit trail
    this.data.auditLogs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId: draft.productId,
      productName: draft.productName,
      barcode: draft.barcode,
      changeType: 'manual_adjustment',
      previousQuantity: draft.currentQuantity,
      newQuantity: draft.currentQuantity,
      changeAmount: 0,
      breachedMinimum: false,
      draftOrderId: draft.id,
      note: `Approved Purchase Order ${draft.orderNumber} (${draft.orderQuantity} units) sent to ${draft.supplierEmail}`,
      operator: approver,
      timestamp: now
    });

    this.save();
    return draft;
  }

  /**
   * REJECT DRAFT ORDER
   */
  public rejectDraft(id: string, reason?: string, operator = 'Store Manager'): ReorderDraft {
    const draft = this.data.drafts.find(d => d.id === id);
    if (!draft) throw new Error('Draft order not found');

    if (draft.status !== 'pending_approval') {
      throw new Error(`Order ${draft.orderNumber} is already ${draft.status}`);
    }

    const now = new Date().toISOString();
    draft.status = 'rejected';
    draft.rejectedAt = now;
    draft.rejectionReason = reason || 'Rejected by store operator';
    draft.updatedAt = now;

    this.save();
    return draft;
  }

  /**
   * RECEIVE ORDER SHIPMENT & RESTOCK
   */
  public async receiveOrder(id: string, operator = 'Receiving Warehouse'): Promise<ReorderDraft> {
    const draft = this.data.drafts.find(d => d.id === id);
    if (!draft) throw new Error('Order not found');

    if (draft.status !== 'approved') {
      throw new Error(`Can only receive orders with status 'approved'. Current: ${draft.status}`);
    }

    const product = this.data.products.find(p => p.id === draft.productId);
    if (!product) throw new Error('Linked product not found in inventory');

    const prevQty = product.currentQuantity;
    const addedUnits = draft.orderQuantity;
    const newQty = prevQty + addedUnits;

    product.currentQuantity = newQty;
    product.lastRestockedAt = new Date().toISOString();
    product.updatedAt = new Date().toISOString();

    const isBreached = newQty < product.minimumQuantity;
    product.status = newQty === 0 ? 'out_of_stock' : isBreached ? 'low_stock' : 'healthy';

    draft.status = 'received';
    draft.receivedAt = new Date().toISOString();
    draft.updatedAt = new Date().toISOString();

    // Log restock audit
    this.data.auditLogs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId: product.id,
      productName: product.name,
      barcode: product.barcode,
      changeType: 'restock_received',
      previousQuantity: prevQty,
      newQuantity: newQty,
      changeAmount: addedUnits,
      breachedMinimum: isBreached,
      draftOrderId: draft.id,
      note: `Shipment received for PO ${draft.orderNumber} (+${addedUnits} units)`,
      operator,
      timestamp: new Date().toISOString()
    });

    this.save();
    return draft;
  }

  /**
   * RESET / SEED DATA
   */
  public resetToSeed(): void {
    this.data = {
      products: JSON.parse(JSON.stringify(INITIAL_PRODUCTS)),
      drafts: [],
      auditLogs: [],
      emailSettings: DEFAULT_EMAIL_SETTINGS,
      orderCounter: 101
    };
    this.bootstrapDraftsForBreaches();
    this.save();
  }
}

export const db = new InventoryDatabase();
