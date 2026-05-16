/** Map Cognito SDK errors to friendly, user-facing messages. */

interface CognitoLikeError {
  name?: string;
  code?: string;
  message?: string;
}

const MESSAGES: Record<string, string> = {
  NotAuthorizedException: 'Incorrect email or password.',
  UserNotFoundException: 'Incorrect email or password.',
  UsernameExistsException: 'An account with this email already exists.',
  CodeMismatchException: 'That confirmation code is incorrect.',
  ExpiredCodeException: 'That code has expired — request a new one.',
  LimitExceededException: 'Too many attempts. Please wait a moment and try again.',
  TooManyRequestsException: 'Too many attempts. Please wait a moment and try again.',
  InvalidParameterException: 'Please check the details you entered.',
};

export function authErrorMessage(error: unknown): string {
  const err = error as CognitoLikeError;
  const key = err?.name || err?.code || '';
  if (key === 'InvalidPasswordException' && err.message) {
    return err.message;
  }
  return MESSAGES[key] || err?.message || 'Something went wrong. Please try again.';
}

export function isUnconfirmedError(error: unknown): boolean {
  const err = error as CognitoLikeError;
  return (err?.name || err?.code) === 'UserNotConfirmedException';
}
