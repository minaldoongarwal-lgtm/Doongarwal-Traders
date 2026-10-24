import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Product, 
  ReorderDraft, 
  StockAuditLog, 
  EmailSettings, 
  InventoryStats, 
  ScanResult,
  SentEmailDetails 
} from './types';
import { Navbar } from './components/Navbar';
import { InventoryOverview } from './components/InventoryOverview';
import { BarcodeSalesTab } from './components/BarcodeSalesTab';
import { ApprovalGateTab } from './components/ApprovalGateTab';
import { AuditLogTab } from './components/AuditLogTab';
import { SettingsTab } from './components/SettingsTab';
import { 
  AddProductModal, 
  EditProductModal, 
  AdjustStockModal, 
  UnknownBarcodeModal 
} from './components/ProductModals';
import { playSound } from './utils/sound';
import { 
  initAuth, 
  signInWithGoogle, 
  signOutGoogle 
} from './services/googleAuth';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'inventory' | 'scanner' | 'approvals' | 'audit' | 'settings'>('inventory');
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [drafts, setDrafts] = useState<ReorderDraft[]>([]);
  const [auditLogs, setAuditLogs] = useState<StockAuditLog[]>([]);
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Google Workspace / Gmail OAuth Authentication state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [prefilledBarcode, setPrefilledBarcode] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth((state) => {
      setGoogleUser(state.user);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Initial Data Fetch
  const fetchData = async () => {
    try {
      const [invRes, draftsRes, logsRes, emailRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/reorders/drafts'),
        fetch('/api/audit-logs'),
        fetch('/api/email-settings')
      ]);

      if (invRes.ok) {
        const data = await invRes.json();
        setProducts(data.products || []);
        setStats(data.stats || null);
      }

      if (draftsRes.ok) {
        const data = await draftsRes.json();
        setDrafts(data.drafts || []);
      }

      if (logsRes.ok) {
        const data = await logsRes.json();
        setAuditLogs(data.logs || []);
      }

      if (emailRes.ok) {
        const data = await emailRes.json();
        setEmailSettings(data.settings || null);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // GOOGLE SIGN IN (Connect Gmail)
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      setGoogleUser(res.user);
      playSound('success');

      // Automatically offer or set Gmail as provider if user signed in
      if (res.user.email) {
        await handleUpdateEmailSettings({
          provider: 'gmail',
          fromEmail: res.user.email
        });
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      alert(`Google Sign-In failed: ${err.message || 'Please verify popup was not blocked'}`);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // GOOGLE SIGN OUT (Disconnect Gmail)
  const handleGoogleSignOut = async () => {
    try {
      await signOutGoogle();
      setGoogleUser(null);
      // Fallback provider to simulated
      if (emailSettings?.provider === 'gmail') {
        await handleUpdateEmailSettings({
          provider: 'simulated',
          fromEmail: 'purchasing@stockpulse-store.com'
        });
      }
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  // 1. ATOMIC SCAN BARCODE
  const handleScanBarcode = async (barcode: string): Promise<ScanResult> => {
    const res = await fetch('/api/inventory/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode, operator: 'Barcode Terminal #1' })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Scan request failed');
    }

    if (data.result.success && data.result.product) {
      // Update local product state atomically
      setProducts(prev => 
        prev.map(p => p.id === data.result.product.id ? data.result.product : p)
      );
      if (data.stats) setStats(data.stats);

      // Refresh drafts and logs asynchronously
      fetch('/api/reorders/drafts')
        .then(r => r.json())
        .then(d => setDrafts(d.drafts || []));

      fetch('/api/audit-logs')
        .then(r => r.json())
        .then(l => setAuditLogs(l.logs || []));
    }

    return data.result;
  };

  // 2. ADD PRODUCT
  const handleAddProduct = async (productData: any) => {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add product');

    setProducts(prev => [...prev, data.product]);
    if (data.stats) setStats(data.stats);

    // Refresh drafts and logs
    fetchData();
  };

  // 3. UPDATE PRODUCT
  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update product');

    setProducts(prev => prev.map(p => p.id === id ? data.product : p));
    if (data.stats) setStats(data.stats);
    fetchData();
  };

  // 4. DELETE PRODUCT
  const handleDeleteProduct = async (id: string) => {
    const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete');

    setProducts(prev => prev.filter(p => p.id !== id));
    if (data.stats) setStats(data.stats);
  };

  // 5. ADJUST STOCK
  const handleAdjustStock = async (productId: string, newQuantity: number, note?: string) => {
    const res = await fetch('/api/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, newQuantity, note, changeType: 'manual_adjustment' })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to adjust stock');

    setProducts(prev => prev.map(p => p.id === productId ? data.outcome.product : p));
    if (data.stats) setStats(data.stats);
    fetchData();
  };

  // 6. APPROVE DRAFT ORDER (Supports Gmail client-dispatched details)
  const handleApproveDraft = async (
    id: string, 
    approver = 'Store Manager', 
    sentEmailDetails?: SentEmailDetails
  ) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reorders/drafts/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approver, sentEmailDetails })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');

      playSound('success');
      setDrafts(prev => prev.map(d => d.id === id ? data.order : d));
      if (data.stats) setStats(data.stats);

      // Refresh logs
      fetch('/api/audit-logs').then(r => r.json()).then(l => setAuditLogs(l.logs || []));
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 7. REJECT DRAFT ORDER
  const handleRejectDraft = async (id: string, reason?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reorders/drafts/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject draft');

      setDrafts(prev => prev.map(d => d.id === id ? data.draft : d));
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 8. EDIT DRAFT ORDER
  const handleEditDraft = async (id: string, updates: Partial<ReorderDraft>) => {
    const res = await fetch(`/api/reorders/drafts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to edit draft');

    setDrafts(prev => prev.map(d => d.id === id ? data.draft : d));
  };

  // 9. RECEIVE ORDER SHIPMENT & RESTOCK
  const handleReceiveOrder = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reorders/orders/${id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator: 'Receiving Dock #1' })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process shipment');

      playSound('success');
      setDrafts(prev => prev.map(d => d.id === id ? data.order : d));
      if (data.products) setProducts(data.products);
      if (data.stats) setStats(data.stats);

      fetch('/api/audit-logs').then(r => r.json()).then(l => setAuditLogs(l.logs || []));
    } catch (err: any) {
      alert(`Receive error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 10. UPDATE EMAIL SETTINGS
  const handleUpdateEmailSettings = async (settings: Partial<EmailSettings>) => {
    const res = await fetch('/api/email-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update email settings');
    setEmailSettings(data.settings);
  };

  // 11. TEST EMAIL DISPATCH
  const handleTestEmail = async (recipient: string) => {
    const res = await fetch('/api/email-settings/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Test email failed');
    return data;
  };

  // 12. RESET SEED DATA
  const handleResetData = async () => {
    if (!confirm('Reset catalog, stock levels, and drafts back to realistic store seed state?')) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/inventory/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
        setDrafts(data.drafts);
        setStats(data.stats);
        fetch('/api/audit-logs').then(r => r.json()).then(l => setAuditLogs(l.logs || []));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Navbar with Google/Gmail status */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        stats={stats}
        onResetData={handleResetData}
        isLoading={isLoading}
        googleUser={googleUser}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        isGoogleLoading={isGoogleLoading}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'inventory' && (
          <InventoryOverview
            products={products}
            drafts={drafts}
            stats={stats}
            onOpenAddModal={() => {
              setPrefilledBarcode('');
              setIsAddModalOpen(true);
            }}
            onOpenEditModal={(prod) => setEditingProduct(prod)}
            onOpenAdjustModal={(prod) => setAdjustingProduct(prod)}
            onGoToApprovals={(draftId) => {
              setCurrentTab('approvals');
            }}
          />
        )}

        {currentTab === 'scanner' && (
          <BarcodeSalesTab
            products={products}
            onScanBarcode={handleScanBarcode}
            onUnknownBarcode={(barcode) => setUnknownBarcode(barcode)}
            onGoToApprovals={(draftId) => {
              setCurrentTab('approvals');
            }}
          />
        )}

        {currentTab === 'approvals' && (
          <ApprovalGateTab
            drafts={drafts}
            onApproveDraft={handleApproveDraft}
            onRejectDraft={handleRejectDraft}
            onEditDraft={handleEditDraft}
            onReceiveOrder={handleReceiveOrder}
            isLoading={isLoading}
            emailSettings={emailSettings}
            googleUser={googleUser}
            onGoogleSignIn={handleGoogleSignIn}
          />
        )}

        {currentTab === 'audit' && (
          <AuditLogTab logs={auditLogs} />
        )}

        {currentTab === 'settings' && emailSettings && (
          <SettingsTab
            settings={emailSettings}
            onUpdateSettings={handleUpdateEmailSettings}
            onTestEmail={handleTestEmail}
            googleUser={googleUser}
            onGoogleSignIn={handleGoogleSignIn}
            onGoogleSignOut={handleGoogleSignOut}
            isGoogleLoading={isGoogleLoading}
          />
        )}
      </main>

      {/* MODALS */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddProduct={handleAddProduct}
        prefilledBarcode={prefilledBarcode}
      />

      <EditProductModal
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
      />

      <AdjustStockModal
        product={adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
        onAdjustStock={handleAdjustStock}
      />

      <UnknownBarcodeModal
        barcode={unknownBarcode}
        onClose={() => setUnknownBarcode(null)}
        onAddNewProductWithBarcode={(barcode) => {
          setPrefilledBarcode(barcode);
          setIsAddModalOpen(true);
        }}
      />
    </div>
  );
}
