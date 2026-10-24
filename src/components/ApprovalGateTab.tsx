import React, { useState } from 'react';
import { 
  ReorderDraft, 
  OrderStatus, 
  EmailSettings, 
  SentEmailDetails 
} from '../types';
import { 
  Send, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Eye, 
  Clock, 
  PackageCheck, 
  AlertTriangle, 
  Mail, 
  Building, 
  Calendar, 
  DollarSign, 
  Hash, 
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { User } from 'firebase/auth';
import { sendEmailViaGmailApi } from '../services/googleAuth';

interface ApprovalGateTabProps {
  drafts: ReorderDraft[];
  onApproveDraft: (id: string, approver?: string, sentEmailDetails?: SentEmailDetails) => Promise<void>;
  onRejectDraft: (id: string, reason?: string) => Promise<void>;
  onEditDraft: (id: string, updates: Partial<ReorderDraft>) => Promise<void>;
  onReceiveOrder: (id: string) => Promise<void>;
  isLoading: boolean;
  emailSettings: EmailSettings | null;
  googleUser: User | null;
  onGoogleSignIn: () => Promise<void>;
}

export const ApprovalGateTab: React.FC<ApprovalGateTabProps> = ({
  drafts,
  onApproveDraft,
  onRejectDraft,
  onEditDraft,
  onReceiveOrder,
  isLoading,
  emailSettings,
  googleUser,
  onGoogleSignIn
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'sent' | 'all'>('pending');
  const [editingDraft, setEditingDraft] = useState<ReorderDraft | null>(null);
  const [viewingEmailDraft, setViewingEmailDraft] = useState<ReorderDraft | null>(null);
  const [rejectingDraft, setRejectingDraft] = useState<ReorderDraft | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Mandatory Workspace confirmation dialog state for Gmail sending
  const [confirmingGmailDraft, setConfirmingGmailDraft] = useState<ReorderDraft | null>(null);
  const [isSendingGmail, setIsSendingGmail] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);

  // Draft Edit Form State
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editSupplierEmail, setEditSupplierEmail] = useState('');

  const pendingDrafts = drafts.filter(d => d.status === 'pending_approval');
  const sentOrders = drafts.filter(d => d.status === 'approved' || d.status === 'received');
  const rejectedDrafts = drafts.filter(d => d.status === 'rejected');

  const isGmailActive = emailSettings?.provider === 'gmail';

  const startEditing = (draft: ReorderDraft) => {
    setEditingDraft(draft);
    setEditQuantity(draft.orderQuantity);
    setEditSubject(draft.emailSubject);
    setEditBody(draft.emailBody);
    setEditSupplierEmail(draft.supplierEmail);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDraft) return;

    await onEditDraft(editingDraft.id, {
      orderQuantity: Number(editQuantity),
      emailSubject: editSubject,
      emailBody: editBody,
      supplierEmail: editSupplierEmail
    });

    setEditingDraft(null);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingDraft) return;

    await onRejectDraft(rejectingDraft.id, rejectReason);
    setRejectingDraft(null);
    setRejectReason('');
  };

  // Triggered when clicking "Approve & Send Order Email"
  const handleInitiateApprove = (draft: ReorderDraft) => {
    if (isGmailActive) {
      if (!googleUser) {
        // Prompt to connect Google account first
        setConfirmingGmailDraft(draft);
        return;
      }
      // Open explicit confirmation dialog for Workspace mutating action
      setGmailError(null);
      setConfirmingGmailDraft(draft);
    } else {
      // Standard gateway dispatch
      onApproveDraft(draft.id);
    }
  };

  // Explicit confirmation callback to send via Gmail API
  const handleConfirmSendGmail = async () => {
    if (!confirmingGmailDraft || !googleUser) return;

    setIsSendingGmail(true);
    setGmailError(null);

    try {
      const fromName = emailSettings?.fromName || googleUser.displayName || 'Purchasing Manager';
      const gmailResult = await sendEmailViaGmailApi(
        confirmingGmailDraft.supplierEmail,
        confirmingGmailDraft.emailSubject,
        confirmingGmailDraft.emailBody,
        fromName
      );

      const emailDetails: SentEmailDetails = {
        messageId: gmailResult.messageId,
        provider: 'gmail',
        to: confirmingGmailDraft.supplierEmail,
        from: googleUser.email || 'user@gmail.com',
        subject: confirmingGmailDraft.emailSubject,
        bodyPreview: confirmingGmailDraft.emailBody.slice(0, 160) + '...',
        timestamp: new Date().toISOString(),
        deliveryStatus: 'delivered'
      };

      await onApproveDraft(
        confirmingGmailDraft.id, 
        googleUser.displayName || googleUser.email || 'Gmail Operator', 
        emailDetails
      );

      setConfirmingGmailDraft(null);
    } catch (err: any) {
      console.error('Gmail send error:', err);
      setGmailError(err.message || 'Failed to dispatch email via Gmail API');
    } finally {
      setIsSendingGmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Sub-tab selector */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Supplier Reorder & Approval Gate
            </h1>
            {pendingDrafts.length > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white animate-pulse">
                {pendingDrafts.length} Action Needed
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-slate-500 max-w-xl">
              Replenishment orders are drafted with exact deficit calculations. No emails are dispatched until you explicitly review and approve them.
            </p>
            {isGmailActive && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                <Mail className="w-3 h-3 text-indigo-500" />
                Dispatch via Gmail
              </span>
            )}
          </div>
        </div>

        {/* Sub-tab pills */}
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('pending')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'pending'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Approvals ({pendingDrafts.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('sent')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'sent'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sent Orders ({sentOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'all'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <span>All History ({drafts.length})</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: PENDING APPROVALS QUEUE */}
      {activeSubTab === 'pending' && (
        <div className="space-y-4">
          {pendingDrafts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-90" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Approval Queue is Clear
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No draft orders pending review. When an item breaches its minimum stock during barcode sales, a draft PO will automatically appear here for your sign-off.
              </p>
            </div>
          ) : (
            pendingDrafts.map(draft => (
              <div 
                key={draft.id} 
                className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-indigo-500/30 dark:border-indigo-500/20 shadow-md p-6 transition-all hover:shadow-lg"
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                  {/* Left Column: PO metadata and Product info */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {draft.orderNumber}
                      </span>
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Awaiting Manager Approval
                      </span>
                      <span className="text-xs text-slate-400">
                        Generated {new Date(draft.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {draft.productName}
                    </h2>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>Supplier: <strong>{draft.supplierName}</strong></span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{draft.supplierEmail}</span>
                      </span>
                      <span className="font-mono text-slate-400">
                        Barcode: {draft.barcode}
                      </span>
                    </div>
                  </div>

                  {/* Middle Column: Exact Deficit Arithmetic Breakdown */}
                  <div className="bg-amber-50/80 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs space-y-1.5 min-w-[240px]">
                    <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Stock Breach Deficit Analysis</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-700 dark:text-slate-300">
                      <span>Minimum Required:</span>
                      <span className="font-semibold text-right">{draft.minimumQuantity} {draft.unit || 'units'}</span>
                      <span>Current Stock:</span>
                      <span className="font-semibold text-right text-rose-600 dark:text-rose-400">{draft.currentQuantity} {draft.unit || 'units'}</span>
                      <span className="border-t border-amber-200 dark:border-amber-800/60 pt-0.5">Calculated Deficit:</span>
                      <span className="border-t border-amber-200 dark:border-amber-800/60 pt-0.5 font-bold text-right text-amber-800 dark:text-amber-300">
                        {draft.deficit} {draft.unit || 'units'}
                      </span>
                    </div>
                    <div className="pt-1 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                      Order Batch: <strong>{draft.orderQuantity} {draft.unit || 'units'}</strong> @ ${draft.unitCost.toFixed(2)}/ea = <strong>${draft.totalCost.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Actions */}
                <div className="mt-4 pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingEmailDraft(draft)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview Supplier Email</span>
                    </button>

                    <button
                      onClick={() => startEditing(draft)}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Order / Quantity</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => {
                        setRejectingDraft(draft);
                        setRejectReason('');
                      }}
                      disabled={isLoading}
                      className="px-3.5 py-2 text-xs font-semibold text-rose-700 hover:text-rose-800 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject Draft</span>
                    </button>

                    <button
                      onClick={() => handleInitiateApprove(draft)}
                      disabled={isLoading}
                      className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-md flex items-center gap-2 ${
                        isGmailActive 
                          ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
                          : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                      <span>{isGmailActive ? 'Approve & Send via Gmail' : 'Approve & Send Order Email'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW 2: SENT ORDERS HISTORY */}
      {(activeSubTab === 'sent' || activeSubTab === 'all') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Dispatched Purchase Orders ({activeSubTab === 'all' ? drafts.length : sentOrders.length})</span>
            </h3>
            <span className="text-xs text-slate-500">
              Logged with transactional email receipts and delivery message IDs
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 dark:bg-slate-800/80 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Product & Barcode</th>
                  <th className="py-3 px-4 text-center">Units Ordered</th>
                  <th className="py-3 px-4 text-right">Total Cost</th>
                  <th className="py-3 px-4">Supplier & Dispatch Provider</th>
                  <th className="py-3 px-4">Sent At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(activeSubTab === 'all' ? drafts : sentOrders).map(order => {
                  const isReceived = order.status === 'received';
                  const isApproved = order.status === 'approved';
                  const isRejected = order.status === 'rejected';
                  const isGmailSent = order.sentEmailDetails?.provider === 'gmail';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {order.orderNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {order.productName}
                        </div>
                        <div className="font-mono text-xs text-slate-400">
                          {order.barcode}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-white">
                        {order.orderQuantity} {order.unit || 'units'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-white">
                        ${order.totalCost.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-xs font-medium text-slate-900 dark:text-white">
                          {order.supplierName}
                        </div>
                        <div className="mt-0.5">
                          {isReceived ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                              <PackageCheck className="w-3 h-3" />
                              Shipment Received & Restocked
                            </span>
                          ) : isApproved ? (
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              isGmailSent 
                                ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950'
                                : 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950'
                            }`}>
                              {isGmailSent ? <Mail className="w-3 h-3 text-indigo-500" /> : <Send className="w-3 h-3" />}
                              <span>{isGmailSent ? 'Sent via Gmail' : 'Dispatched (Gateway)'}</span>
                            </span>
                          ) : isRejected ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3" />
                              Rejected: {order.rejectionReason}
                            </span>
                          ) : (
                            <span className="text-xs text-amber-600 font-medium">
                              Draft Pending Approval
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {order.sentAt ? (
                          <>
                            <div>{new Date(order.sentAt).toLocaleDateString()}</div>
                            <div className="text-[10px] text-slate-400">{new Date(order.sentAt).toLocaleTimeString()}</div>
                          </>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingEmailDraft(order)}
                            title="View sent email details"
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isApproved && (
                            <button
                              onClick={() => onReceiveOrder(order.id)}
                              disabled={isLoading}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1 shadow-sm whitespace-nowrap"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              <span>Mark Received (+{order.orderQuantity})</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MANDATORY WORKSPACE CONFIRMATION MODAL: GMAIL DISPATCH */}
      {confirmingGmailDraft && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Send Purchase Order via Gmail?</h3>
                  <p className="text-xs text-slate-400 font-mono">PO: {confirmingGmailDraft.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmingGmailDraft(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {!googleUser ? (
                <div className="text-center py-4 space-y-3">
                  <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Google Sign-In Required
                  </h4>
                  <p className="text-slate-500 max-w-xs mx-auto">
                    To send this purchase order email directly using your Gmail ID, please connect your Google account.
                  </p>
                  <button
                    onClick={async () => {
                      await onGoogleSignIn();
                    }}
                    className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-2 border border-slate-200 mx-auto"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 space-y-2">
                    <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      You are about to dispatch <strong>Purchase Order {confirmingGmailDraft.orderNumber}</strong> to supplier <strong>{confirmingGmailDraft.supplierName}</strong> from your connected Gmail ID:
                    </p>
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-indigo-200 dark:border-indigo-800 font-mono text-xs text-indigo-700 dark:text-indigo-300 font-bold flex items-center gap-2">
                      <Mail className="w-4 h-4 text-indigo-500" />
                      <span>{googleUser.email}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 font-mono text-[11px]">
                    <div className="flex">
                      <span className="text-slate-400 w-20">Recipient:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">{confirmingGmailDraft.supplierEmail}</span>
                    </div>
                    <div className="flex">
                      <span className="text-slate-400 w-20">Subject:</span>
                      <span className="text-slate-900 dark:text-white font-bold truncate">{confirmingGmailDraft.emailSubject}</span>
                    </div>
                    <div className="flex">
                      <span className="text-slate-400 w-20">Quantity:</span>
                      <span className="text-slate-900 dark:text-white font-bold">{confirmingGmailDraft.orderQuantity} {confirmingGmailDraft.unit || 'units'} (${confirmingGmailDraft.totalCost.toFixed(2)})</span>
                    </div>
                  </div>

                  {gmailError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 font-medium">
                      {gmailError}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingGmailDraft(null)}
                disabled={isSendingGmail}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>

              {googleUser && (
                <button
                  type="button"
                  onClick={handleConfirmSendGmail}
                  disabled={isSendingGmail}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSendingGmail ? 'Sending via Gmail...' : 'Confirm & Send via Gmail'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: VIEW EMAIL DISPATCH INSPECTOR */}
      {viewingEmailDraft && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Purchase Order Email Preview</h3>
                  <p className="text-xs text-slate-400 font-mono">PO: {viewingEmailDraft.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingEmailDraft(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Delivery Receipt / Headers */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 font-mono">
                <div className="flex items-start">
                  <span className="text-slate-400 w-20">To:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">{viewingEmailDraft.supplierName} &lt;{viewingEmailDraft.supplierEmail}&gt;</span>
                </div>
                <div className="flex items-start">
                  <span className="text-slate-400 w-20">Subject:</span>
                  <span className="text-slate-900 dark:text-white font-bold">{viewingEmailDraft.emailSubject}</span>
                </div>
                {viewingEmailDraft.sentEmailDetails && (
                  <>
                    <div className="flex items-start">
                      <span className="text-slate-400 w-20">From:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">{viewingEmailDraft.sentEmailDetails.from}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-slate-400 w-20">Message-ID:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">{viewingEmailDraft.sentEmailDetails.messageId}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-slate-400 w-20">Gateway:</span>
                      <span className="text-slate-700 dark:text-slate-300 uppercase font-bold text-indigo-600 dark:text-indigo-400">
                        {viewingEmailDraft.sentEmailDetails.provider}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-slate-400 w-20">Status:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">{viewingEmailDraft.sentEmailDetails.deliveryStatus}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Email Body text */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Email Message Body
                </label>
                <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed border border-slate-800">
                  {viewingEmailDraft.emailBody}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setViewingEmailDraft(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Close Preview
              </button>
              {viewingEmailDraft.status === 'pending_approval' && (
                <button
                  onClick={() => {
                    const draftToApprove = viewingEmailDraft;
                    setViewingEmailDraft(null);
                    handleInitiateApprove(draftToApprove);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Approve & Dispatch Now</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT DRAFT ORDER */}
      {editingDraft && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Edit Purchase Order Draft</h3>
                  <p className="text-xs text-slate-400 font-mono">PO: {editingDraft.orderNumber} • {editingDraft.productName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDraft(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Order Quantity ({editingDraft.unit || 'Units'})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Min Deficit: {editingDraft.deficit} {editingDraft.unit || 'units'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Estimated Total Cost
                  </label>
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold">
                    ${(editQuantity * editingDraft.unitCost).toFixed(2)}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    ${editingDraft.unitCost.toFixed(2)}/unit
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Supplier Email Recipient
                </label>
                <input
                  type="email"
                  value={editSupplierEmail}
                  onChange={(e) => setEditSupplierEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Email Body Content
                </label>
                <textarea
                  rows={6}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-xs leading-relaxed"
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingDraft(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: REJECT CONFIRMATION */}
      {rejectingDraft && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleConfirmReject} className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <XCircle className="w-6 h-6" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Reject Order Draft?</h3>
            </div>
            <p className="text-xs text-slate-500">
              Are you sure you want to reject Purchase Order <strong>{rejectingDraft.orderNumber}</strong> ({rejectingDraft.productName})? No email will be sent to {rejectingDraft.supplierName}.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Reason for Rejection (Optional)
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Discontinuing item, supplier out of stock, alternate vendor..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingDraft(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Keep Draft
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
