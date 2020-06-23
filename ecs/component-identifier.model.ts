/**
 * Used by the {@link ECSManager} to identify a component type
 */
export interface ComponentIdentifier {
  identifier: () => string;
}
