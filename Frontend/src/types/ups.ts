/**
 * UPS device metadata — MUST (frontend.md §4).
 *
 * Strict 1:1 mirror of the backend `UpsDeviceDto`. Keep in sync.
 * Do not add UI-only fields here; if a derived field is needed, compute it
 * in the consuming hook/component.
 */
export interface UpsDevice {
  /** Stable, backend-assigned identifier. Used by history endpoints. */
  id: string;

  /** Manufacturer, e.g. "APC", "CyberPower". Empty string if unknown. */
  manufacturer: string;

  /** Model name, e.g. "Back-UPS 1500". Empty string if unknown. */
  model: string;

  /** Connection type descriptor, e.g. "USB", "Network", "Serial". */
  connectionType: string;

  /** Firmware version string, or `null` if the UPS didn't report one. */
  firmwareVersion: string | null;

  /** Last time the backend saw this device (ISO-8601). */
  lastSeenAt: string;

  /** Whether this is the currently-monitored device. */
  isActive: boolean;
}
