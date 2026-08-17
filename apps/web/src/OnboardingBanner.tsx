import { Banner } from "./Banner.tsx";
import { markOnboarded } from "./ux/helpers.ts";

type OnboardingBannerProps = {
  onDismiss: () => void;
};

export function OnboardingBanner({ onDismiss }: OnboardingBannerProps) {
  const dismiss = () => {
    markOnboarded();
    onDismiss();
  };

  return (
    <Banner variant="info" testId="onboarding-banner" onDismiss={dismiss}>
      <p>
        Pick a language, edit code, and hit <strong>Run</strong>.{" "}
        <strong>Copy link</strong> shares a snapshot — not live sync.
      </p>
    </Banner>
  );
}
