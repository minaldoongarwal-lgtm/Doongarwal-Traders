import React, { useState, useMemo } from 'react';
import { 
  Product, 
  ReorderDraft, 
  InventoryStats 
} from '../types';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Plus, 
  Edit2, 
  SlidersHorizontal, 
  ArrowRight,
  TrendingDown,
  ShoppingBag,
  ExternalLink,
  PackageCheck,
  Building,
  Mail,
  DollarSign
} from 'lucide-react';

interface InventoryOverviewProps {
  products: Product[];
  drafts: ReorderDraft[];
  stats: InventoryStats | null;
  onOpenAddModal: () => void;
  onOpenEditModal: (product: Product) => void;
  onOpenAdjustModal: (product: Product) => void;
  onGoToApprovals: (draftId?: string) => void;
}

export const InventoryOverview: React.FC<InventoryOverviewProps> = ({
  products,
  drafts,
  stats,
  onOpenAddModal,
  onOpenEditModal,
  onOpenAdjustModal,
  onGoToApprovals
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeSectionView, setActiveSectionView] = useState<'both' | 'reorder' | 'healthy'>('both');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter(p => {
      const matchesSearch = 
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q);

      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Strict Categorization Rule:
  // 1. "Items to Reorder Today" (Stock < Minimum)
  // 2. "Items in Healthy Stock" (Stock >= Minimum)
  const itemsToReorderToday = useMemo(() => {
    return filteredProducts.filter(p => p.currentQuantity < p.minimumQuantity);
  }, [filteredProducts]);

  const itemsInHealthyStock = useMemo(() => {
    return filteredProducts.filter(p => p.currentQuantity >= p.minimumQuantity);
  }, [filteredProducts]);

  // Map of active drafts by product id
  const pendingDraftsByProduct = useMemo(() => {
    const map = new Map<string, ReorderDraft>();
    drafts.forEach(d => {
      if (d.status === 'pending_approval') {
        map.set(d.productId, d);
      }
    });
    return map;
  }, [drafts]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Metric Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Breached Minimums</span>
            <div className={`p-2 rounded-lg ${itemsToReorderToday.length > 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {itemsToReorderToday.length}
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              Needs replenishment
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Stock &lt; Minimum Threshold
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Healthy Stock Level</span>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {itemsInHealthyStock.length}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {products.length > 0 ? Math.round((itemsInHealthyStock.length / products.length) * 100) : 100}% of catalog
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Stock &ge; Minimum Threshold
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Order Drafts</span>
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats?.pendingApprovalsCount ?? 0}
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              In approval gate
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Awaiting manager sign-off
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Inventory Value</span>
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              ${stats?.totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {stats?.totalUnits ?? 0} total units in stock
          </p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 w-full sm:w-auto items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name, barcode, SKU, or supplier..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="py-2 px-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>Category: {cat}</option>
            ))}
          </select>
        </div>

        {/* View toggles & Add button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800 text-xs">
            <button
              onClick={() => setActiveSectionView('both')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeSectionView === 'both'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All Sections
            </button>
            <button
              onClick={() => setActiveSectionView('reorder')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeSectionView === 'reorder'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Reorder ({itemsToReorderToday.length})
            </button>
            <button
              onClick={() => setActiveSectionView('healthy')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeSectionView === 'healthy'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Healthy ({itemsInHealthyStock.length})
            </button>
          </div>

          <button
            onClick={onOpenAddModal}
            className="px-3.5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: ITEMS TO REORDER TODAY (Stock < Minimum) */}
      {(activeSectionView === 'both' || activeSectionView === 'reorder') && (
        <section className="bg-white dark:bg-slate-900 rounded-xl border-2 border-amber-500/40 dark:border-amber-500/30 shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/20 px-6 py-4 border-b border-amber-200 dark:border-amber-900/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-500 text-white rounded-lg shadow-sm">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Items to Reorder Today
                  </h2>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-white">
                    {itemsToReorderToday.length} {itemsToReorderToday.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Current Stock &lt; Minimum Required Stock • Reorder Quantity = Minimum Required - Current Stock
                </p>
              </div>
            </div>

            {itemsToReorderToday.length > 0 && (
              <button
                onClick={() => onGoToApprovals()}
                className="px-3 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>Review Approval Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {itemsToReorderToday.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">All Stock Levels Optimal</h3>
              <p className="text-xs text-slate-500 mt-1">No products currently breached below their minimum threshold.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-amber-50/50 dark:bg-slate-800/80 text-xs text-slate-500 uppercase tracking-wider border-b border-amber-200/60 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Product / Barcode</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Current Stock</th>
                    <th className="py-3 px-4 text-center">Min Required</th>
                    <th className="py-3 px-4">Deficit & Replenishment Action</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Approval Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100/70 dark:divide-slate-800/60">
                  {itemsToReorderToday.map(product => {
                    const deficit = product.minimumQuantity - product.currentQuantity;
                    const pendingDraft = pendingDraftsByProduct.get(product.id);
                    const isOutOfStock = product.currentQuantity === 0;

                    return (
                      <tr key={product.id} className="hover:bg-amber-50/40 dark:hover:bg-amber-950/10 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {product.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              {product.barcode}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {product.sku}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {product.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className={`text-base font-bold px-2.5 py-0.5 rounded-md ${
                              isOutOfStock 
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}>
                              {product.currentQuantity} {product.unit ? <span className="text-xs font-normal text-slate-500">{product.unit}</span> : null}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              {isOutOfStock ? 'Depleted' : 'Low stock'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                          {product.minimumQuantity} {product.unit || ''}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/50 px-2 py-1 rounded border border-amber-300 dark:border-amber-800">
                              <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                              <span>Action: Reorder {deficit} {product.unit || (deficit === 1 ? 'unit' : 'units')}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Deficit: {product.minimumQuantity} - {product.currentQuantity} = <span className="font-semibold text-slate-700 dark:text-slate-300">{deficit} {product.unit || 'units'}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-xs font-medium text-slate-900 dark:text-white">
                            {product.supplierName}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{product.supplierEmail}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {pendingDraft ? (
                            <button
                              onClick={() => onGoToApprovals(pendingDraft.id)}
                              className="group text-left"
                            >
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 group-hover:bg-indigo-200 transition-colors">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                                Draft {pendingDraft.orderNumber}
                                <ExternalLink className="w-3 h-3 ml-0.5" />
                              </span>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Order Qty: {pendingDraft.orderQuantity} • Est: ${pendingDraft.totalCost.toFixed(2)}
                              </div>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              Draft queued
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onOpenAdjustModal(product)}
                              title="Manual Stock Adjust"
                              className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md transition-colors"
                            >
                              <SlidersHorizontal className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onOpenEditModal(product)}
                              title="Edit Product & Minimum"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* SECTION 2: ITEMS IN HEALTHY STOCK (Stock >= Minimum) */}
      {(activeSectionView === 'both' || activeSectionView === 'healthy') && (
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-500 text-white rounded-lg shadow-sm">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Items in Healthy Stock
                  </h2>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {itemsInHealthyStock.length} items
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Current Stock &ge; Minimum Required Stock • Action: No reorder
                </p>
              </div>
            </div>
          </div>

          {itemsInHealthyStock.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No healthy items found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/50 dark:bg-slate-800/80 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Product / Barcode</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Current Stock</th>
                    <th className="py-3 px-4 text-center">Min Required</th>
                    <th className="py-3 px-4">Stock Status & Action</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {itemsInHealthyStock.map(product => {
                    const buffer = product.currentQuantity - product.minimumQuantity;
                    const pctOfMin = Math.round((product.currentQuantity / Math.max(1, product.minimumQuantity)) * 100);

                    return (
                      <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {product.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              {product.barcode}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {product.sku}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {product.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                            {product.currentQuantity} {product.unit ? <span className="text-xs font-normal text-slate-500">{product.unit}</span> : null}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center text-slate-500 font-medium">
                          {product.minimumQuantity} {product.unit || ''}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Action: No reorder
                            </span>
                            <div className="text-[11px] text-slate-400">
                              +{buffer} {product.unit || 'units'} safety buffer ({pctOfMin}% of threshold)
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            {product.supplierName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {product.supplierEmail}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onOpenAdjustModal(product)}
                              title="Manual Stock Adjust"
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md transition-colors"
                            >
                              <SlidersHorizontal className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onOpenEditModal(product)}
                              title="Edit Product & Minimum"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
