I will update `src/services/authErrors.js` to improve error handling and debugging capabilities:

1.  **Add `invalid_grant` mapping**: Map the common Supabase error `invalid_grant` to "账号或密码错误" (Account or password error), as this is often the underlying cause of generic login failures.
2.  **Expand Network Error Detection**: Add `timeout`, `aborted`, and `connection refused` to the network error patterns to catch more transient connection issues.
3.  **Improve Fallback Message**: Modify the default "unknown error" message to include the original error details (e.g., `发生未知错误: <original_error>`). This ensures that if a truly unknown error occurs, the actual cause is visible for debugging instead of being swallowed.

This approach addresses the user's report by handling the likely hidden error (`invalid_grant`) and providing visibility into any other potential causes.
