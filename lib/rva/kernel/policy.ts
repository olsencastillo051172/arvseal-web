/**
 * ARV Trust Kernel v1 — L0 policy constants.
 */

export const ARV_L0_POLICY_ID = 'ARV-L0-LOCAL-INTEGRITY-v1';

export const ARV_L0_POLICY = {
  id: ARV_L0_POLICY_ID,
  level: 'L0',
  mode: 'LOCAL_PROOF',
  description: 'Local integrity proof without ARV Authority registration.',
  authorityRequired: false,
  networkRequired: false,
} as const;

export function isL0LocalStatus(status: string): boolean {
  return status === 'LOCAL_UNREGISTERED';
}

export function requiresAuthorityRegistration(status: string): boolean {
  return status !== 'LOCAL_UNREGISTERED';
}
