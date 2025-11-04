export const pendingConfirmations = new Map();
/*
Map token -> {
  invokerId: string,
  robloxInfo: { name, id, thumbnailUrl },
  reason: string,
  expiryDate: string|null,
  timeoutHandle: Timeout,
}
*/
export function setPending(token, data) {
    pendingConfirmations.set(token, data);
}
export function getPending(token) {
    return pendingConfirmations.get(token);
}
export function removePending(token) {
    const entry = pendingConfirmations.get(token);
    if (entry && entry.timeoutHandle) {
        clearTimeout(entry.timeoutHandle);
    }
    pendingConfirmations.delete(token);
}