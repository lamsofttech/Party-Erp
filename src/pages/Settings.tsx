import { useMemo, useState } from "react";
import { PartyTheme, usePartyTheme } from "../contexts/PartyThemeContext";

function ColorField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <label className="flex items-center justify-between gap-4 py-2">
            <span className="text-sm text-gray-700">{label}</span>

            <div className="flex items-center gap-3">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-9 w-14 rounded border"
                />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-32 rounded border px-2 py-1 text-sm font-mono"
                    placeholder="#RRGGBB"
                />
            </div>
        </label>
    );
}

export default function SettingsPage() {
    const { theme, setTheme, resetTheme } = usePartyTheme();
    const [draft, setDraft] = useState<PartyTheme>(theme);

    const canSave = useMemo(
        () => JSON.stringify(draft) !== JSON.stringify(theme),
        [draft, theme]
    );

    return (
        <div className="p-6 max-w-3xl">
            <div className="mb-4">
                <h1 className="text-xl font-semibold">Settings</h1>
                <p className="text-sm text-gray-600">
                    Configure party colors. Saving updates the sidenav immediately.
                </p>
            </div>

            <div className="rounded-xl border bg-white p-5">
                <h2 className="text-sm font-semibold text-gray-800 mb-3">Brand</h2>

                <ColorField
                    label="Primary"
                    value={draft.primary}
                    onChange={(v) => setDraft({ ...draft, primary: v })}
                />
                <ColorField
                    label="Primary Dark"
                    value={draft.primaryDark}
                    onChange={(v) => setDraft({ ...draft, primaryDark: v })}
                />
                <ColorField
                    label="Secondary"
                    value={draft.secondary}
                    onChange={(v) => setDraft({ ...draft, secondary: v })}
                />

                <div className="mt-4 border-t pt-4">
                    <h2 className="text-sm font-semibold text-gray-800 mb-3">
                        Sidebar Gradient
                    </h2>

                    <ColorField
                        label="Gradient Top"
                        value={draft.sidebarGradTop}
                        onChange={(v) => setDraft({ ...draft, sidebarGradTop: v })}
                    />
                    <ColorField
                        label="Gradient Mid"
                        value={draft.sidebarGradMid}
                        onChange={(v) => setDraft({ ...draft, sidebarGradMid: v })}
                    />
                    <ColorField
                        label="Gradient Bottom"
                        value={draft.sidebarGradBottom}
                        onChange={(v) => setDraft({ ...draft, sidebarGradBottom: v })}
                    />
                </div>

                <div className="mt-4 border-t pt-4">
                    <h2 className="text-sm font-semibold text-gray-800 mb-3">
                        Sidebar Text
                    </h2>

                    <ColorField
                        label="Ink"
                        value={draft.sidebarInk}
                        onChange={(v) => setDraft({ ...draft, sidebarInk: v })}
                    />
                    <ColorField
                        label="Muted"
                        value={draft.sidebarMuted}
                        onChange={(v) => setDraft({ ...draft, sidebarMuted: v })}
                    />
                    <ColorField
                        label="Border"
                        value={draft.sidebarBorder}
                        onChange={(v) => setDraft({ ...draft, sidebarBorder: v })}
                    />
                </div>

                {/* Preview */}
                <div
                    className="mt-6 rounded-xl p-4 text-white"
                    style={{
                        background: `linear-gradient(180deg, ${draft.sidebarGradTop} 0%, ${draft.sidebarGradMid} 45%, ${draft.sidebarGradBottom} 100%)`,
                    }}
                >
                    <div className="text-sm font-semibold" style={{ color: draft.sidebarInk }}>
                        Sidebar preview title
                    </div>
                    <div className="text-xs" style={{ color: draft.sidebarMuted }}>
                        Preview muted text
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                        disabled={!canSave}
                        onClick={() => setTheme(draft)}
                    >
                        Save
                    </button>
                    <button
                        className="rounded-lg border px-4 py-2 text-sm"
                        onClick={() => setDraft(theme)}
                    >
                        Cancel
                    </button>
                    <button
                        className="ml-auto rounded-lg border px-4 py-2 text-sm"
                        onClick={() => {
                            resetTheme();
                            // draft will be reset on next render; also reset local draft immediately
                            setDraft(theme);
                        }}
                    >
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
}
