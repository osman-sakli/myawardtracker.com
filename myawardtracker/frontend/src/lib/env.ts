/** Public runtime configuration, injected at build time from Terraform output. */
export const env = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, ''),
  region: process.env.NEXT_PUBLIC_AWS_REGION ?? 'us-east-1',
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? '',
  userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? '',
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, ''),
  wsUrl: (process.env.NEXT_PUBLIC_WS_URL ?? '').replace(/\/$/, ''),
};

export const isAuthConfigured = Boolean(env.userPoolId && env.userPoolClientId);
