interface OnboardingHintProps {
  onDismiss: () => void;
}

/** A one-time callout for first-time visitors, since the tray alone doesn't explain itself. */
export function OnboardingHint({ onDismiss }: OnboardingHintProps) {
  return (
    <div className="onboarding-hint" role="note">
      <p>
        This is live weather. Time, the weather at your location, and how you use this page shape
        the sound. <strong>⚙</strong> opens the Studio for more controls.
      </p>
      <button className="ghost" onClick={onDismiss}>
        Got it
      </button>
    </div>
  );
}
