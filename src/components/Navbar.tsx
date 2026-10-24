import React from 'react';
import { 
  Package, 
  Barcode, 
  Send, 
  FileText, 
  Settings, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  LogOut,
  Mail
} from 'lucide-react';
import { User } from 'firebase/auth';
import { InventoryStats } from '../types';

interface NavbarProps {
  currentTab: 'inventory' | 'scanner' | 'approvals' | 'audit' | 'settings';
  setCurrentTab: (tab: 'inventory' | 'scanner' | 'approvals' | 'audit' | 'settings') => void;
  stats: InventoryStats | null;
  onResetData: () => void;
  isLoading: boolean;
  googleUser: User | null;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  isGoogleLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  stats,
  onResetData,
  isLoading,
  googleUser,
  onGoogleSignIn,
  onGoogleSignOut,
  isGoogleLoading
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  StockPulse
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live POS
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Inventory & Barcode Replenishment Hub</p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          {stats && (
            <div className="hidden lg:flex items-center space-x-4 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Total SKUs:</span>
                <span className="font-semibold text-white">{stats.totalSkus}</span>
              </div>
              <div className="h-3 w-px bg-slate-700" />
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Low Stock Breaches:</span>
                <span className={`font-semibold px-1.5 py-0.5 rounded ${stats.lowStockCount > 0 ? 'bg-amber-500/20 text-amber-400' : 'text-slate-300'}`}>
                  {stats.lowStockCount}
                </span>
              </div>
              <div className="h-3 w-px bg-slate-700" />
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Pending Approvals:</span>
                <span className={`font-semibold px-1.5 py-0.5 rounded ${stats.pendingApprovalsCount > 0 ? 'bg-rose-500/20 text-rose-300 animate-pulse' : 'text-slate-300'}`}>
                  {stats.pendingApprovalsCount}
                </span>
              </div>
            </div>
          )}

          {/* Action buttons & Gmail Status */}
          <div className="flex items-center space-x-2">
            {/* Google / Gmail Connect Button */}
            {googleUser ? (
              <div className="flex items-center bg-slate-800 border border-emerald-500/30 rounded-xl p-1 pr-2 space-x-2">
                {googleUser.photoURL ? (
                  <img 
                    src={googleUser.photoURL} 
                    alt={googleUser.displayName || 'User'} 
                    className="w-7 h-7 rounded-lg object-cover border border-emerald-400/40"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-xs text-white">
                    {googleUser.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Gmail Ready</span>
                  </div>
                  <p className="text-xs font-medium text-slate-200 truncate max-w-[130px]">
                    {googleUser.email}
                  </p>
                </div>
                <button
                  onClick={onGoogleSignOut}
                  title="Disconnect Gmail Account"
                  className="p-1 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onGoogleSignIn}
                disabled={isGoogleLoading}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-semibold transition-all shadow-md flex items-center space-x-2 border border-slate-200 disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>{isGoogleLoading ? 'Connecting...' : 'Connect Gmail'}</span>
              </button>
            )}

            <button
              onClick={onResetData}
              disabled={isLoading}
              title="Reset catalog back to sample data"
              className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 sm:space-x-2 border-t border-slate-800/80 -mb-px overflow-x-auto py-1">
          <button
            onClick={() => setCurrentTab('inventory')}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap ${
              currentTab === 'inventory'
                ? 'border-indigo-500 text-white bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Inventory Overview</span>
            {stats && stats.lowStockCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {stats.lowStockCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentTab('scanner')}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap ${
              currentTab === 'scanner'
                ? 'border-emerald-500 text-white bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <Barcode className="w-4 h-4 text-emerald-400" />
            <span>Barcode Sales Tab</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Active
            </span>
          </button>

          <button
            onClick={() => setCurrentTab('approvals')}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap ${
              currentTab === 'approvals'
                ? 'border-indigo-500 text-white bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <Send className="w-4 h-4 text-indigo-400" />
            <span>Reorders & Approvals</span>
            {stats && stats.pendingApprovalsCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500 text-white font-bold animate-pulse">
                {stats.pendingApprovalsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentTab('audit')}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap ${
              currentTab === 'audit'
                ? 'border-indigo-500 text-white bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Stock Audit Trail</span>
          </button>

          <button
            onClick={() => setCurrentTab('settings')}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap ${
              currentTab === 'settings'
                ? 'border-indigo-500 text-white bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Email Gateway</span>
            {googleUser && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Gmail Connected" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
