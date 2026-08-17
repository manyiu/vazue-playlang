import type { LanguageInfo } from "@playlang/runtime-core";

type LanguagePickerProps = {
  languages: LanguageInfo[];
  activeId: string;
  onSelect: (language: LanguageInfo) => void;
};

export function LanguagePicker({ languages, activeId, onSelect }: LanguagePickerProps) {
  const active = languages.find((item) => item.id === activeId);

  return (
    <label className="flex min-w-0 items-center gap-2 lg:hidden">
      <span className="sr-only">Language</span>
      <select
        data-testid="language-picker"
        value={activeId}
        onChange={(event) => {
          const next = languages.find((item) => item.id === event.target.value);
          if (next) onSelect(next);
        }}
        className="max-w-[10rem] truncate rounded-md border border-white/15 bg-[#141820] px-2 py-1.5 text-sm text-white/90 sm:max-w-none"
        aria-label="Select language"
      >
        {languages.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
            {item.status !== "available" ? ` (${item.status})` : ""}
          </option>
        ))}
      </select>
      {active?.coldStartHint ? (
        <span className="hidden text-[11px] text-white/40 sm:inline" title={active.coldStartHint}>
          First run may be slow
        </span>
      ) : null}
    </label>
  );
}
