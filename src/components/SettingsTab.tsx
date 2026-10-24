import React, { useState } from 'react';
import { EmailSettings } from '../types';
import { 
  Settings, 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Shield, 
  Server, 
  Building, 
  MapPin, 
  Key,
  Clock,
  LogOut,
  UserCheck
} from 'lucide-react';
import { User } from 'firebase/auth';
import { sendEmailViaGmailApi } from '../services/googleAuth';

interface SettingsTabProps {
  settings: EmailSettings;
  onUpdateSettings: (settings: Partial<EmailSettings>) => Promise<void>;
  onTestEmail: (recipient: string) => Promise<{ success: boolean; details: any }>;
  googleUser: User | null;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  isGoogleLoading: boolean;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  onTestEmail,
  googleUser,
  onGoogleSignIn,
  onGoogleSignOut,
  isGoogleLoading
}) => {
  const [formData, setFormData] = useState<EmailSettings>({
    ...settings,
    fromEmail: googleUser?.email && settings.provider === 'gmail' ? googleUser.email : settings.fromEmail
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Test email state
  const [testRecipient, setTestRecipient] = useState(googleUser?.email || settings.fromEmail);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const dataToSave = {
        ...formData,
        fromEmail: formData.provider === 'gmail' && googleUser?.email ? googleUser.email : formData.fromEmail
      };
      await onUpdateSettings(dataToSave);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update email settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testRecipient) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      if (formData.provider === 'gmail') {
        if (!googleUser) {
          throw new Error('Please sign in with Google to test sending via Gmail.');
        }

        const subject = 'StockPulse: Live Gmail API Test Order Dispatch';
        const body = `Hello,\n\nThis is a verified test purchase order email sent directly from your connected Gmail ID (${googleUser.email}) using the Google Workspace Gmail API.\n\nTimestamp: ${new Date().toISOString()}\nStatus: Verified Delivery`;
        
        const gmailRes = await sendEmailViaGmailApi(testRecipient, subject, body, formData.fromName);
        setTestResult({
          success: true,
          provider: 'gmail',
          messageId: gmailRes.messageId,
          threadId: gmailRes.threadId,
          from: googleUser.email,
          to: testRecipient,
          subject,
          timestamp: new Date().toISOString(),
          deliveryStatus: 'delivered'
        });
      } else {
        const res = await onTestEmail(testRecipient);
        setTestResult(res);
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Transactional Email Gateway & Gmail
            </h1>
            <p className="text-xs text-slate-500">
              Send replenishment orders to suppliers via your personal/business **Gmail account**, SendGrid, Resend, or high-fidelity simulation.
            </p>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-500" />
            <span>Select Email Dispatch Method</span>
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Choose whether to send purchase order emails using your connected Gmail ID or an API gateway.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. GMAIL OPTION */}
            <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
              formData.provider === 'gmail'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Your Gmail ID</span>
                  </div>
                  <input
                    type="radio"
                    name="provider"
                    value="gmail"
                    checked={formData.provider === 'gmail'}
                    onChange={() => setFormData({ ...formData, provider: 'gmail' })}
                    className="text-indigo-600"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Sends directly from your authenticated Google Account using the official Gmail API.
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px]">
                {googleUser ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">
                    Sign-in required
                  </span>
                )}
              </div>
            </label>

            {/* 2. SIMULATED RELAY */}
            <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
              formData.provider === 'simulated'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Simulated Gateway</span>
                  <input
                    type="radio"
                    name="provider"
                    value="simulated"
                    checked={formData.provider === 'simulated'}
                    onChange={() => setFormData({ ...formData, provider: 'simulated' })}
                    className="text-indigo-600"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Generates RFC 822 compliant message IDs, timestamps, and full headers for development.
                </p>
              </div>
            </label>

            {/* 3. SENDGRID */}
            <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
              formData.provider === 'sendgrid'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">SendGrid API</span>
                  <input
                    type="radio"
                    name="provider"
                    value="sendgrid"
                    checked={formData.provider === 'sendgrid'}
                    onChange={() => setFormData({ ...formData, provider: 'sendgrid' })}
                    className="text-indigo-600"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Dispatches via Twilio SendGrid v3 mail API using your account API key.
                </p>
              </div>
            </label>

            {/* 4. RESEND */}
            <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
              formData.provider === 'resend'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Resend API</span>
                  <input
                    type="radio"
                    name="provider"
                    value="resend"
                    checked={formData.provider === 'resend'}
                    onChange={() => setFormData({ ...formData, provider: 'resend' })}
                    className="text-indigo-600"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Modern transactional email platform with instant dispatch logs.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* GMAIL ACCOUNT MANAGEMENT CARD */}
        {formData.provider === 'gmail' && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-indigo-500/30 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                {googleUser?.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || 'Google User'}
                    className="w-12 h-12 rounded-2xl border-2 border-emerald-400 object-cover shadow-md"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-md">
                    {googleUser?.email ? googleUser.email.charAt(0).toUpperCase() : 'G'}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-white">
                      {googleUser?.displayName || 'Google Account'}
                    </span>
                    {googleUser ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Connected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Not Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">
                    {googleUser?.email || 'No Gmail account linked yet'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Scopes enabled: <code className="text-indigo-300">https://www.googleapis.com/auth/gmail.send</code>
                  </p>
                </div>
              </div>

              <div>
                {googleUser ? (
                  <button
                    type="button"
                    onClick={onGoogleSignOut}
                    className="px-3.5 py-2 text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect Gmail</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onGoogleSignIn}
                    disabled={isGoogleLoading}
                    className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span>{isGoogleLoading ? 'Signing in...' : 'Sign in with Google'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* API Keys for SendGrid or Resend */}
        {formData.provider === 'sendgrid' && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span>SendGrid API Key</span>
            </label>
            <input
              type="password"
              value={formData.sendgridApiKey || ''}
              onChange={(e) => setFormData({ ...formData, sendgridApiKey: e.target.value })}
              placeholder="SG.xxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs font-mono"
            />
          </div>
        )}

        {formData.provider === 'resend' && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span>Resend API Key</span>
            </label>
            <input
              type="password"
              value={formData.resendApiKey || ''}
              onChange={(e) => setFormData({ ...formData, resendApiKey: e.target.value })}
              placeholder="re_xxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs font-mono"
            />
          </div>
        )}

        {/* Store & Sender Information */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-500" />
            <span>Store & Purchasing Team Information</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Store / Company Name
              </label>
              <input
                type="text"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                From Name (Display)
              </label>
              <input
                type="text"
                value={formData.fromName}
                onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Sender Email Address
              </label>
              <input
                type="email"
                value={formData.provider === 'gmail' && googleUser?.email ? googleUser.email : formData.fromEmail}
                onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                disabled={formData.provider === 'gmail' && !!googleUser?.email}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs disabled:opacity-75 font-mono"
                required
              />
              {formData.provider === 'gmail' && googleUser?.email && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                  Using your authenticated Gmail ID: {googleUser.email}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Store Delivery Address
              </label>
              <input
                type="text"
                value={formData.storeAddress}
                onChange={(e) => setFormData({ ...formData, storeAddress: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
                required
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            {saveSuccess && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Settings saved successfully!
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Diagnostic Test Email Dispatch */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Send className="w-4 h-4 text-emerald-500" />
          <span>Send Live Test Purchase Order Email</span>
        </h2>
        <p className="text-xs text-slate-500">
          Send a test email to verify that your selected method ({formData.provider === 'gmail' ? 'Your Gmail Account' : formData.provider}) correctly delivers messages.
        </p>

        <div className="flex gap-2 max-w-md">
          <input
            type="email"
            value={testRecipient}
            onChange={(e) => setTestRecipient(e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
          />
          <button
            type="button"
            onClick={handleTestEmail}
            disabled={isTesting || !testRecipient}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isTesting ? 'Sending...' : formData.provider === 'gmail' ? 'Send via Gmail' : 'Send Test PO'}</span>
          </button>
        </div>

        {testResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 text-slate-200 text-xs font-mono border border-slate-800 space-y-2">
            <div className={`flex items-center gap-2 font-bold ${testResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{testResult.success ? 'Email Dispatched Successfully' : 'Email Send Failed'}</span>
            </div>
            <pre className="text-[11px] overflow-x-auto text-slate-300">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
