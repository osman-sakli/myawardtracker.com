/** Cognito authentication wrapper.
 *
 * Every function here touches browser storage, so each guards against being
 * called during static prerendering (`typeof window === 'undefined'`).
 */

import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

import { env } from './env';

let cachedPool: CognitoUserPool | null = null;

function pool(): CognitoUserPool {
  if (typeof window === 'undefined') {
    throw new Error('Authentication is only available in the browser.');
  }
  if (!cachedPool) {
    cachedPool = new CognitoUserPool({
      UserPoolId: env.userPoolId,
      ClientId: env.userPoolClientId,
    });
  }
  return cachedPool;
}

function cognitoUser(email: string): CognitoUser {
  return new CognitoUser({ Username: email, Pool: pool() });
}

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
}

export function signUp(email: string, password: string, fullName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const attributes = [
      new CognitoUserAttribute({ Name: 'email', Value: email }),
      new CognitoUserAttribute({ Name: 'name', Value: fullName }),
    ];
    pool().signUp(email, password, attributes, [], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cognitoUser(email).confirmRegistration(code, true, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function resendConfirmationCode(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cognitoUser(email).resendConfirmationCode((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function signIn(email: string, password: string): Promise<CognitoUserSession> {
  return new Promise((resolve, reject) => {
    cognitoUser(email).authenticateUser(
      new AuthenticationDetails({ Username: email, Password: password }),
      {
        onSuccess: (session) => resolve(session),
        onFailure: (err) => reject(err),
        newPasswordRequired: () =>
          reject(new Error('A password reset is required. Please contact support.')),
      },
    );
  });
}

export function forgotPassword(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cognitoUser(email).forgotPassword({
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    });
  });
}

export function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    cognitoUser(email).confirmPassword(code, newPassword, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    });
  });
}

export function getSession(): Promise<CognitoUserSession | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    const user = pool().getCurrentUser();
    if (!user) return resolve(null);
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) return resolve(null);
      resolve(session);
    });
  });
}

/** ID token — carries the email/name claims the backend authorizer reads. */
export async function getAuthToken(): Promise<string | null> {
  const session = await getSession();
  return session ? session.getIdToken().getJwtToken() : null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session) return null;
  const claims = session.getIdToken().decodePayload();
  return {
    sub: String(claims.sub ?? ''),
    email: String(claims.email ?? ''),
    name: String(claims.name ?? claims['cognito:username'] ?? ''),
  };
}

export function signOut(): void {
  if (typeof window === 'undefined') return;
  pool().getCurrentUser()?.signOut();
}
