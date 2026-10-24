import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send'
];

const provider = new GoogleAuthProvider();
SCOPES.forEach(scope => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account'
});

// In-memory token cache (NEVER stored in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface GoogleAuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

export const initAuth = (
  onAuthChange: (state: GoogleAuthState) => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      onAuthChange({
        user,
        accessToken: cachedAccessToken,
        isAuthenticated: true
      });
    } else if (user && !cachedAccessToken && !isSigningIn) {
      // User signed in previously in this Firebase instance, re-prompt or notify
      onAuthChange({
        user,
        accessToken: null,
        isAuthenticated: false
      });
    } else {
      cachedAccessToken = null;
      onAuthChange({
        user: null,
        accessToken: null,
        isAuthenticated: false
      });
    }
  });
};

export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve OAuth access token from Google.');
    }

    cachedAccessToken = credential.accessToken;
    return {
      user: result.user,
      accessToken: cachedAccessToken
    };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const signOutGoogle = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Base64URL encode helper compliant with RFC 4648
function base64UrlEncode(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Send an email using the Gmail REST API (users.messages.send)
 * Uses the client-side OAuth access token directly.
 */
export async function sendEmailViaGmailApi(
  to: string,
  subject: string,
  body: string,
  fromName?: string
): Promise<{ messageId: string; threadId?: string }> {
  if (!cachedAccessToken) {
    throw new Error('No active Gmail session found. Please sign in with your Google account.');
  }

  const currentUser = auth.currentUser;
  if (!currentUser?.email) {
    throw new Error('Unable to detect authenticated Gmail address.');
  }

  const senderEmail = currentUser.email;
  const displayName = fromName || currentUser.displayName || 'Purchasing Manager';

  // Construct standard RFC 2822 email format
  const rfc2822Email = [
    `From: "${displayName}" <${senderEmail}>`,
    `To: ${to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    body
  ].join('\r\n');

  const encodedMessage = base64UrlEncode(rfc2822Email);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cachedAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: encodedMessage
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Gmail API returned status ${response.status}`;
    throw new Error(`Gmail Dispatch Error: ${message}`);
  }

  const result = await response.json();
  return {
    messageId: result.id || `gmail_${Date.now()}`,
    threadId: result.threadId
  };
}
