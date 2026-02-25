export type ScanMode = 'CHECKOUT' | 'CHECKIN';

export type Step =
  | 'idle'
  | 'scanning'
  | 'verifying'
  | 'asset_verification'
  | 'signing'
  | 'combo_checkin'
  | 'damage_check'
  | 'done';
