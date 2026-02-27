/** Cliente API para el guardia: escaneo QR (check-in/check-out) y confirmación de combos. */
import { apiFetch } from './client';

export interface ComboCheckinStatePayload {
  bundleGroupId: string;
  totalAssets: number;
  scannedAssetIds: string[];
  pendingAssets: Array<{ id: string; name: string; tag: string }>;
  allRequests: Array<{ id: number; asset_id: string; user_id: string; assets?: { name?: string; tag?: string } }>;
}

export interface GuardScanResponse {
  success: boolean;
  message: string;
  data?: unknown;
  comboState?: ComboCheckinStatePayload;
}

export async function guardScan(
  qrData: string,
  type: 'CHECKOUT' | 'CHECKIN',
  options?: { signature?: string; isDamaged?: boolean; damageNotes?: string }
): Promise<GuardScanResponse> {
  return apiFetch<GuardScanResponse>('/api/guard/scan', {
    method: 'POST',
    body: JSON.stringify({
      qrData,
      type,
      signature: options?.signature,
      isDamaged: options?.isDamaged,
      damageNotes: options?.damageNotes,
    }),
  });
}

/** Confirma el check-in de un combo (varios activos escaneados). */
export async function confirmComboCheckin(
  comboState: ComboCheckinStatePayload,
  isDamaged: boolean,
  damageNotes: string
): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>('/api/guard/scan/confirm-combo', {
    method: 'POST',
    body: JSON.stringify({ comboState, isDamaged, damageNotes }),
  });
}
