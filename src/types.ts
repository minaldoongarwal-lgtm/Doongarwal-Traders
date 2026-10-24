export interface Product {
  id: string;
  name: string;
  barcode: string;
  sku: string;
  category: string;
  unit?: string; // e.g. boxes, packs, bottles, rolls, labels, pcs
  currentQuantity: number;
  minimumQuantity: number;
  reorderQuantity: number; // Suggested replenishment pack or minimum deficit
  unitCost: number;
  retailPrice: number;
  supplierName: string;
  supplierEmail: string;
  supplierPhone?: string;
  leadTimeDays?: number;
  notes?: string;
  status: 'healthy' | 'low_stock' | 'out_of_stock';
  lastRestockedAt?: string;
  updatedAt: string;
  createdAt: string;
}

export type StockChangeType = 
  | 'sale_scan' 
  | 'manual_adjustment' 
  | 'restock_received' 
  | 'initial_count';

export interface StockAuditLog {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  changeType: StockChangeType;
  previousQuantity: number;
  newQuantity: number;
  changeAmount: number;
  breachedMinimum: boolean;
  draftOrderId?: string;
  note?: string;
  operator: string;
  timestamp: string;
}

export type OrderStatus = 
  | 'pending_approval' 
  | 'approved' 
  | 'rejected' 
  | 'received';

export interface SentEmailDetails {
  messageId: string;
  provider: string;
  to: string;
  from: string;
  subject: string;
  bodyPreview: string;
  timestamp: string;
  deliveryStatus: 'delivered' | 'sent' | 'queued' | 'simulated_delivered';
}

export interface ReorderDraft {
  id: string;
  orderNumber: string; // e.g. PO-2026-0104
  productId: string;
  productName: string;
  barcode: string;
  unit?: string;
  currentQuantity: number;
  minimumQuantity: number;
  deficit: number;
  suggestedQuantity: number;
  orderQuantity: number;
  unitCost: number;
  totalCost: number;
  supplierName: string;
  supplierEmail: string;
  emailSubject: string;
  emailBody: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  sentAt?: string;
  sentEmailDetails?: SentEmailDetails;
  receivedAt?: string;
  notes?: string;
}

export interface ScanResult {
  success: boolean;
  product?: Product;
  previousQuantity?: number;
  newQuantity?: number;
  breached?: boolean;
  draftCreated?: boolean;
  draftUpdated?: boolean;
  draftId?: string;
  message: string;
  barcode: string;
  timestamp: string;
}

export interface EmailSettings {
  provider: 'simulated' | 'sendgrid' | 'resend' | 'mailgun' | 'gmail';
  sendgridApiKey?: string;
  resendApiKey?: string;
  mailgunApiKey?: string;
  mailgunDomain?: string;
  fromEmail: string;
  fromName: string;
  storeName: string;
  storeAddress: string;
}

export interface InventoryStats {
  totalSkus: number;
  totalUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  healthyCount: number;
  pendingApprovalsCount: number;
  totalInventoryValue: number;
  todaySalesCount: number;
}
