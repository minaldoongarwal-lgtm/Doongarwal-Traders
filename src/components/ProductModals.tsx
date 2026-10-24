import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { 
  Package, 
  Barcode, 
  SlidersHorizontal, 
  AlertTriangle, 
  Plus, 
  Check, 
  X, 
  Sparkles,
  Building,
  Mail,
  DollarSign
} from 'lucide-react';

/* =========================================================================
   ADD PRODUCT MODAL
========================================================================= */
interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (productData: any) => Promise<void>;
  prefilledBarcode?: string;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onAddProduct,
  prefilledBarcode = ''
}) => {
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState(prefilledBarcode);
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Beverages');
  const [currentQuantity, setCurrentQuantity] = useState(10);
  const [minimumQuantity, setMinimumQuantity] = useState(5);
  const [unitCost, setUnitCost] = useState(5.00);
  const [retailPrice, setRetailPrice] = useState(12.00);
  const [supplierName, setSupplierName] = useState('Premier Goods Dist.');
  const [supplierEmail, setSupplierEmail] = useState('orders@premiergoods.example.com');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefilledBarcode) {
      setBarcode(prefilledBarcode);
    }
  }, [prefilledBarcode]);

  if (!isOpen) return null;

  const generateRandomBarcode = () => {
    const random12 = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
    setBarcode(random12);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !barcode.trim()) {
      setError('Product Name and Barcode are required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onAddProduct({
        name: name.trim(),
        barcode: barcode.trim(),
        sku: sku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
        category,
        currentQuantity: Number(currentQuantity),
        minimumQuantity: Number(minimumQuantity),
        reorderQuantity: Math.max(1, Number(minimumQuantity) - Number(currentQuantity)),
        unitCost: Number(unitCost),
        retailPrice: Number(retailPrice),
        supplierName: supplierName.trim(),
        supplierEmail: supplierEmail.trim(),
        notes
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Add New Inventory Product</h3>
              <p className="text-xs text-slate-400">Configure barcode, stock thresholds, and supplier details</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1">✕</button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto text-xs">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Product Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fair Trade Colombian Roast (500g)"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center justify-between">
                <span>Barcode Digits (UPC/EAN) *</span>
                <button
                  type="button"
                  onClick={generateRandomBarcode}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Generate EAN
                </button>
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="12-digit barcode"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-xs"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
              >
                <option value="Beverages">Beverages</option>
                <option value="Snacks">Snacks</option>
                <option value="Electronics">Electronics</option>
                <option value="Supplies">Supplies</option>
                <option value="Merchandise">Merchandise</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          {/* STOCK THRESHOLDS */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block">
              Stock Thresholds & Levels
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Current Available Stock *
                </label>
                <input
                  type="number"
                  min="0"
                  value={currentQuantity}
                  onChange={(e) => setCurrentQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1 text-amber-700 dark:text-amber-400">
                  Minimum Required Stock (Threshold) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={minimumQuantity}
                  onChange={(e) => setMinimumQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-lg text-slate-900 dark:text-white font-bold"
                  required
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              When current stock falls below minimum, a purchase order draft will be automatically generated with suggested quantity = (Minimum - Current).
            </p>
          </div>

          {/* SUPPLIER INFORMATION */}
          <div className="space-y-3">
            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block">
              Supplier & Pricing
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Unit Cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Retail Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Supplier Email *
                </label>
                <input
                  type="email"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmitting ? 'Adding...' : 'Add to Catalog'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

/* =========================================================================
   EDIT PRODUCT MODAL
========================================================================= */
interface EditProductModalProps {
  product: Product | null;
  onClose: () => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  onClose,
  onUpdateProduct,
  onDeleteProduct
}) => {
  if (!product) return null;

  const [name, setName] = useState(product.name);
  const [barcode, setBarcode] = useState(product.barcode);
  const [minimumQuantity, setMinimumQuantity] = useState(product.minimumQuantity);
  const [currentQuantity, setCurrentQuantity] = useState(product.currentQuantity);
  const [unitCost, setUnitCost] = useState(product.unitCost);
  const [retailPrice, setRetailPrice] = useState(product.retailPrice);
  const [supplierName, setSupplierName] = useState(product.supplierName);
  const [supplierEmail, setSupplierEmail] = useState(product.supplierEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onUpdateProduct(product.id, {
        name,
        barcode,
        minimumQuantity: Number(minimumQuantity),
        currentQuantity: Number(currentQuantity),
        unitCost: Number(unitCost),
        retailPrice: Number(retailPrice),
        supplierName,
        supplierEmail
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base">Edit Product & Minimum Threshold</h3>
            <p className="text-xs text-slate-400">{product.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1">✕</button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Product Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Barcode
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-amber-700 dark:text-amber-400 block mb-1">
                Minimum Stock Level (Breach Threshold)
              </label>
              <input
                type="number"
                min="0"
                value={minimumQuantity}
                onChange={(e) => setMinimumQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-amber-300 dark:border-amber-800 rounded-lg text-slate-900 dark:text-white font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Supplier Name
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Supplier Email
              </label>
              <input
                type="email"
                value={supplierEmail}
                onChange={(e) => setSupplierEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={async () => {
              if (confirm(`Are you sure you want to delete ${product.name}?`)) {
                await onDeleteProduct(product.id);
                onClose();
              }
            }}
            className="text-xs text-rose-600 hover:text-rose-700 underline"
          >
            Delete Product
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

/* =========================================================================
   MANUAL ADJUST STOCK MODAL
========================================================================= */
interface AdjustStockModalProps {
  product: Product | null;
  onClose: () => void;
  onAdjustStock: (productId: string, newQuantity: number, note?: string) => Promise<void>;
}

export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({
  product,
  onClose,
  onAdjustStock
}) => {
  if (!product) return null;

  const [quantity, setQuantity] = useState(product.currentQuantity);
  const [note, setNote] = useState('Physical inventory count audit');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onAdjustStock(product.id, quantity, note);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
        <div className="flex items-center space-x-3 text-slate-900 dark:text-white">
          <SlidersHorizontal className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-base">Adjust Stock Level</h3>
        </div>

        <div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
            {product.name}
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Barcode: {product.barcode} • Current: {product.currentQuantity} units
          </span>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            New Verified Quantity
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity(q => Math.max(0, q - 1))}
              className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-lg font-bold"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
              className="flex-1 text-center py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-base text-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setQuantity(q => q + 1)}
              className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-lg font-bold"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Reason / Audit Note
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm"
          >
            Update Stock
          </button>
        </div>
      </form>
    </div>
  );
};

/* =========================================================================
   UNKNOWN BARCODE MODAL (Graceful Handling)
========================================================================= */
interface UnknownBarcodeModalProps {
  barcode: string | null;
  onClose: () => void;
  onAddNewProductWithBarcode: (barcode: string) => void;
}

export const UnknownBarcodeModal: React.FC<UnknownBarcodeModalProps> = ({
  barcode,
  onClose,
  onAddNewProductWithBarcode
}) => {
  if (!barcode) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
        <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Barcode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Unknown Barcode Scanned</h3>
            <p className="font-mono text-xs text-slate-500 font-bold">{barcode}</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          This scanned barcode is not currently registered in your product catalog. Would you like to create a new product for this barcode now, or reject this scan?
        </p>

        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Reject Scan
          </button>
          <button
            type="button"
            onClick={() => {
              onAddNewProductWithBarcode(barcode);
              onClose();
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>
    </div>
  );
};
