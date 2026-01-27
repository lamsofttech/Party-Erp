import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import profileImg from "../assets/profile.png";
import { useUser } from "../contexts/UserContext";

type LifecycleStatus = "recruited" | "onboarded" | "assigned";
type BillingStatus = "pending" | "billed" | "paid";

interface ProfileData {
    firstName: string;
    middleName: string;
    // kept for backend compatibility, but UI matches screenshot (only first + middle)
    lastName: string;
    mpesaNumber: string;
    voiceNumber: string;
    lifecycleStatus: LifecycleStatus;
    billingStatus: BillingStatus;
}

const API_BASE =
    (import.meta as any)?.env?.VITE_API_BASE_URL?.replace(/\/+$/, "") ||
    ((import.meta as any)?.env?.DEV ? "https://skizagroundsuite.com" : "");

function toRoleLabel(role?: string) {
    if (!role) return "User";
    return role
        .toString()
        .trim()
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function splitName(fullName: string) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || "";
    const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
    const middleName = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";
    return { firstName, middleName, lastName };
}

// helper: prefer known phone fields, fallback to voice/mpesa
function pickPhone(user: any) {
    return (
        user?.phone ??
        user?.phone_number ??
        user?.mobile ??
        user?.msisdn ??
        user?.voice_number ??
        user?.mpesa_number ??
        ""
    );
}

const ProfilePage: React.FC = () => {
    const { user, setUser } = useUser();

    const [profile, setProfile] = useState<ProfileData>({
        firstName: "",
        middleName: "",
        lastName: "",
        mpesaNumber: "",
        voiceNumber: "",
        lifecycleStatus: "recruited",
        billingStatus: "pending",
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

    const [currentPin, setCurrentPin] = useState("");
    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [changingPin, setChangingPin] = useState(false);
    const [pinMessage, setPinMessage] = useState<string | null>(null);
    const [pinError, setPinError] = useState<string | null>(null);

    const lifecycleLabelMap: Record<LifecycleStatus, string> = {
        recruited: "Recruited",
        onboarded: "Onboarded",
        assigned: "Assigned",
    };

    // tuned to look like screenshot chips (soft)
    const lifecycleClassMap: Record<LifecycleStatus, string> = {
        recruited: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        onboarded: "bg-blue-50 text-blue-600 border border-blue-200",
        assigned: "bg-red-600 text-white border border-red-600 shadow-sm",
    };

    const billingLabelMap: Record<BillingStatus, string> = {
        pending: "Billing: Pending",
        billed: "Billing: Billed",
        paid: "Billing: Paid",
    };

    const billingClassMap: Record<BillingStatus, string> = {
        pending: "bg-amber-50 text-amber-700 border border-amber-200",
        billed: "bg-sky-50 text-sky-700 border border-sky-200",
        paid: "bg-emerald-600 text-white border border-emerald-600 shadow-sm",
    };

    // ✅ if context is empty after refresh, hydrate from localStorage
    useEffect(() => {
        if (user) return;

        const stored = localStorage.getItem("authUser") || localStorage.getItem("user");

        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed && typeof parsed === "object") {
                    setUser(parsed);
                }
            } catch {
                // ignore bad json
            }
        }
    }, [user, setUser]);

    const roleLabel = useMemo(() => toRoleLabel((user as any)?.role), [user]);

    const jurisdictionLine = useMemo(() => {
        if (!user) return null;

        const ward = (user as any)?.ward_name;
        const constituency = (user as any)?.constituency_name;
        const county = (user as any)?.county_name;
        const countryType = (user as any)?.country_type;

        const parts = [ward, constituency, county].filter(Boolean);
        const loc = parts.length ? parts.join(", ") : null;

        if (countryType === "DIASPORA") {
            const cid = (user as any)?.country_id;
            return cid ? `Diaspora (Country ID: ${cid})` : "Diaspora";
        }

        return loc ? loc : null;
    }, [user]);

    const emailLine = useMemo(() => {
        if (!user) return "—";
        const email =
            (user as any)?.email ??
            (user as any)?.user_email ??
            (user as any)?.mail ??
            (user as any)?.username ??
            "";
        return email ? email.toString() : "—";
    }, [user]);

    const phoneLine = useMemo(() => {
        if (!user) return "—";
        const phone = pickPhone(user as any);
        if (!phone) return "—";
        const s = phone.toString().trim();

        // keep +254 visible like screenshot (don't duplicate)
        if (s.startsWith("+")) return s;
        if (s.startsWith("0")) return `+254 ${s.slice(1)}`;
        if (s.startsWith("7")) return `+254 ${s}`;
        return s;
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof ProfileData) => {
        const value = e.target.value;
        setProfile((prev) => ({ ...prev, [field]: value }));
    };

    // ✅ Hydrate form ONLY from logged-in user (not generic)
    useEffect(() => {
        if (!user) {
            setLoading(false);
            setError("Not logged in. Please log in again.");
            return;
        }

        const fullName = ((user as any)?.name ?? "").toString();
        const { firstName, middleName, lastName } = fullName
            ? splitName(fullName)
            : { firstName: "", middleName: "", lastName: "" };

        setProfile({
            firstName,
            middleName,
            lastName, // kept internally
            mpesaNumber: ((user as any)?.mpesa_number ?? "").toString(),
            voiceNumber: ((user as any)?.voice_number ?? "").toString(),
            lifecycleStatus: "recruited",
            billingStatus: "pending",
        });

        setError(null);
        setLoading(false);
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setMessage(null);

        try {
            const token = localStorage.getItem("token");
            const headers: HeadersInit = { "Content-Type": "application/json" };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
                headers["X-Token"] = token;
            }

            // Screenshot UI: only First + Middle in the form
            // We keep lastName if it already exists in user, but we don't force editing it.
            const fullName = [profile.firstName, profile.middleName, profile.lastName]
                .filter(Boolean)
                .join(" ");

            const res = await fetch(`${API_BASE}/API/profile-update.php`, {
                method: "POST",
                credentials: "include",
                headers,
                body: JSON.stringify({
                    name: fullName,
                    mpesa_number: profile.mpesaNumber,
                    voice_number: profile.voiceNumber,
                }),
            });

            const text = await res.text();
            let json: any = null;
            try {
                json = JSON.parse(text);
            } catch { }

            if (!res.ok || !json?.success) {
                throw new Error(json?.message || `HTTP ${res.status}`);
            }

            setMessage(json.message || "Profile updated successfully.");

            // ✅ keep user unique everywhere (context + storage)
            const updatedUser: any = {
                ...(user as any),
                name: fullName,
                mpesa_number: profile.mpesaNumber,
                voice_number: profile.voiceNumber,
            };

            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
            localStorage.setItem("authUser", JSON.stringify(updatedUser));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleChangePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPinMessage(null);
        setPinError(null);

        if (!currentPin || !newPin || !confirmPin) {
            return setPinError("Please fill in all fields.");
        }

        if (!/^\d{6}$/.test(currentPin)) {
            return setPinError("Current PIN must be 6 digits.");
        }

        if (!/^\d{6}$/.test(newPin)) {
            return setPinError("New PIN must be 6 digits.");
        }

        if (newPin !== confirmPin) {
            return setPinError("New PIN and confirmation do not match.");
        }

        if (currentPin === newPin) {
            return setPinError("New PIN must be different.");
        }

        setChangingPin(true);

        try {
            const token = localStorage.getItem("token");
            const headers: HeadersInit = { "Content-Type": "application/json" };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
                headers["X-Token"] = token;
            }

            const res = await fetch(`${API_BASE}/API/change-pin.php`, {
                method: "POST",
                credentials: "include",
                headers,
                body: JSON.stringify({
                    current_pin: currentPin,
                    new_pin: newPin,
                    confirm_pin: confirmPin,
                }),
            });

            const text = await res.text();
            let json: any = null;
            try {
                json = JSON.parse(text);
            } catch { }

            if (!res.ok || !json?.success) {
                throw new Error(json?.message || `HTTP ${res.status}`);
            }

            setPinMessage("PIN updated successfully.");
            setCurrentPin("");
            setNewPin("");
            setConfirmPin("");
        } catch (err: any) {
            setPinError(err.message);
        } finally {
            setChangingPin(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
                Loading your profile…
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-rose-50 via-pink-50 to-red-100">
                <div className="max-w-md w-full border border-red-200 bg-red-50 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-red-700">Not logged in</p>
                    <p className="text-xs text-red-600 mt-1">Your session is missing. Please log in again.</p>
                </div>
            </div>
        );
    }

    const lifecycleLabel = lifecycleLabelMap[profile.lifecycleStatus];
    const lifecycleClasses = lifecycleClassMap[profile.lifecycleStatus];

    const billingLabel = billingLabelMap[profile.billingStatus];
    const billingClasses = billingClassMap[profile.billingStatus];

    // Screenshot style: display name is First + Middle (optionally last if present)
    const displayName = [profile.firstName, profile.middleName, profile.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-red-100">
            <div className="h-2 w-full bg-red-500" />

            <div className="py-8 px-4">
                <div className="max-w-6xl mx-auto">
                    {/* HEADER (back + breadcrumb + gear) */}
                    <div className="mb-6 flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-sm text-rose-500">
                                <button
                                    type="button"
                                    onClick={() => window.history.back()}
                                    className="text-rose-500 hover:text-rose-700"
                                    aria-label="Back"
                                >
                                    ←
                                </button>
                                <span>Dashboard</span>
                                <span>•</span>
                                <span>Profile</span>
                            </div>

                            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-rose-900">
                                My Profile
                            </h1>
                        </div>

                        <button
                            type="button"
                            className="mt-1 rounded-full border border-rose-200 bg-white/60 backdrop-blur px-3 py-2 text-rose-700 hover:bg-white/80"
                            aria-label="Settings"
                        >
                            ⚙
                        </button>
                    </div>

                    <div className="grid gap-6 md:grid-cols-[320px,1fr]">
                        {/* LEFT CARD */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="rounded-3xl p-6 flex flex-col items-center shadow-xl border border-white/60 bg-gradient-to-br from-rose-200/70 via-pink-200/50 to-white/40 backdrop-blur"
                        >
                            <div className="w-28 h-28 rounded-full overflow-hidden bg-white/70 border border-white/70 flex items-center justify-center mb-4 shadow">
                                <img src={profileImg} alt="Profile avatar" className="w-full h-full object-cover" />
                            </div>

                            <h2 className="text-xl font-extrabold text-rose-900 text-center">
                                {displayName || "—"}
                            </h2>

                            <p className="text-xs uppercase tracking-wide text-rose-600/80 mt-1">
                                {roleLabel}
                            </p>

                            {jurisdictionLine && (
                                <p className="text-[11px] text-rose-700/70 mt-1 text-center">
                                    {jurisdictionLine}
                                </p>
                            )}

                            <div className="mt-3 flex flex-wrap justify-center gap-2 text-[10px] font-semibold">
                                <span className={`px-2.5 py-1 rounded-full ${lifecycleClasses}`}>
                                    {lifecycleLabel}
                                </span>
                                <span className={`px-2.5 py-1 rounded-full ${billingClasses}`}>
                                    {billingLabel}
                                </span>
                            </div>

                            {/* Screenshot: Edit button + email + phone + edit button */}
                            <div className="mt-5 w-full space-y-3">
                                <button
                                    type="button"
                                    className="w-full rounded-xl bg-red-500 text-white py-3 text-sm font-semibold shadow hover:bg-red-600 flex items-center justify-center gap-2"
                                >
                                    ✎ Edit Profile
                                </button>

                                <div className="w-full rounded-xl bg-white/60 border border-white/70 backdrop-blur px-4 py-3 text-sm text-slate-600 flex items-center gap-3">
                                    <span className="opacity-70">✉</span>
                                    <span className="truncate">{emailLine}</span>
                                </div>

                                <div className="w-full rounded-xl bg-white/60 border border-white/70 backdrop-blur px-4 py-3 text-sm text-slate-600 flex items-center gap-3">
                                    <span className="opacity-70">📞</span>
                                    <span className="truncate">{phoneLine}</span>
                                </div>

                                <button
                                    type="button"
                                    className="w-full rounded-xl bg-red-500 text-white py-3 text-sm font-semibold shadow hover:bg-red-600 flex items-center justify-center gap-2"
                                >
                                    ✎ Edit Profile
                                </button>
                            </div>
                        </motion.div>

                        {/* RIGHT CONTENT */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, delay: 0.05 }}
                            className="rounded-3xl shadow-xl border border-white/60 bg-white/55 backdrop-blur overflow-hidden"
                        >
                            {/* Tabs */}
                            <div className="flex border-b border-rose-100 bg-white/30">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveTab("profile");
                                        setError(null);
                                        setMessage(null);
                                    }}
                                    className={`flex-1 py-4 text-sm font-semibold border-b-2 ${activeTab === "profile"
                                            ? "text-rose-700 border-rose-500"
                                            : "text-rose-300 border-transparent"
                                        }`}
                                >
                                    Profile
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveTab("password");
                                        setPinError(null);
                                        setPinMessage(null);
                                    }}
                                    className={`flex-1 py-4 text-sm font-semibold border-b-2 ${activeTab === "password"
                                            ? "text-rose-700 border-rose-500"
                                            : "text-rose-300 border-transparent"
                                        }`}
                                >
                                    Change Password
                                </button>
                            </div>

                            <div className="p-6 sm:p-8">
                                {/* PROFILE TAB */}
                                {activeTab === "profile" && (
                                    <>
                                        {/* Banner with shield */}
                                        <div className="bg-rose-50/80 border border-rose-100 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                                                🛡
                                            </div>
                                            <div>
                                                <p className="font-extrabold text-rose-900 leading-tight">
                                                    Update your profile
                                                </p>
                                                <p className="text-xs text-rose-700/80 mt-1">
                                                    Confirm your official details for secure operations.
                                                </p>
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                                {error}
                                            </div>
                                        )}

                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            {/* NAME FIELDS */}
                                            <div>
                                                <h3 className="text-sm font-semibold text-rose-900 mb-3">
                                                    Personal Details
                                                </h3>

                                                {/* Screenshot: First + Middle only */}
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div>
                                                        <label className="text-xs font-semibold text-rose-700">
                                                            First Name *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={profile.firstName}
                                                            onChange={(e) => handleChange(e, "firstName")}
                                                            required
                                                            className="mt-1 w-full rounded-xl border border-white/70 bg-white/70 backdrop-blur px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-200"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-xs font-semibold text-rose-700">
                                                            Middle Name *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={profile.middleName}
                                                            onChange={(e) => handleChange(e, "middleName")}
                                                            required
                                                            className="mt-1 w-full rounded-xl border border-white/70 bg-white/70 backdrop-blur px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-200"
                                                        />
                                                    </div>
                                                </div>

                                                {/* hidden last name retained */}
                                                <input type="hidden" value={profile.lastName} readOnly />
                                            </div>

                                            {/* CONTACT NUMBERS */}
                                            <div>
                                                <h3 className="text-sm font-semibold text-rose-900 mb-3">
                                                    Contact Numbers
                                                </h3>

                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div>
                                                        <label className="text-xs font-semibold text-rose-700">
                                                            M-Pesa Number *
                                                        </label>
                                                        <div className="mt-1 flex items-center gap-2">
                                                            <span className="px-3 py-3 text-xs text-rose-700 border border-white/70 bg-white/70 backdrop-blur rounded-xl">
                                                                +254
                                                            </span>
                                                            <input
                                                                type="tel"
                                                                placeholder="7XXXXXXXX"
                                                                value={profile.mpesaNumber}
                                                                onChange={(e) => handleChange(e, "mpesaNumber")}
                                                                required
                                                                className="flex-1 rounded-xl border border-white/70 bg-white/70 backdrop-blur px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-200"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-xs font-semibold text-rose-700">
                                                            Voice Number *
                                                        </label>
                                                        <div className="mt-1 flex items-center gap-2">
                                                            <span className="px-3 py-3 text-xs text-rose-700 border border-white/70 bg-white/70 backdrop-blur rounded-xl">
                                                                +254
                                                            </span>
                                                            <input
                                                                type="tel"
                                                                placeholder="7XXXXXXXX"
                                                                value={profile.voiceNumber}
                                                                onChange={(e) => handleChange(e, "voiceNumber")}
                                                                required
                                                                className="flex-1 rounded-xl border border-white/70 bg-white/70 backdrop-blur px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-200"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SAVE BUTTON */}
                                            <div className="flex justify-between items-center border-t border-rose-100 pt-4">
                                                <p className="text-[11px] text-rose-700/70">
                                                    Ensure accuracy before saving.
                                                </p>

                                                <button
                                                    type="submit"
                                                    disabled={saving}
                                                    className={`px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-red-500 hover:bg-red-600 ${saving ? "opacity-70 cursor-wait" : ""
                                                        }`}
                                                >
                                                    {saving ? "Saving..." : "Save Profile"}
                                                </button>
                                            </div>

                                            {message && <p className="text-[11px] text-emerald-600 mt-1">{message}</p>}
                                        </form>
                                    </>
                                )}

                                {/* CHANGE PIN TAB */}
                                {activeTab === "password" && (
                                    <>
                                        <div className="bg-rose-50/80 border border-rose-100 rounded-2xl px-5 py-4 mb-6">
                                            <p className="font-extrabold text-rose-900 leading-tight">
                                                Change your security PIN
                                            </p>
                                        </div>

                                        {pinError && (
                                            <div className="text-xs text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-xl mb-4">
                                                {pinError}
                                            </div>
                                        )}

                                        {pinMessage && (
                                            <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl mb-4">
                                                {pinMessage}
                                            </div>
                                        )}

                                        <form onSubmit={handleChangePinSubmit} className="space-y-5">
                                            <div>
                                                <label className="text-xs font-semibold text-rose-700">
                                                    Current PIN *
                                                </label>
                                                <input
                                                    type="password"
                                                    value={currentPin}
                                                    onChange={(e) => setCurrentPin(e.target.value)}
                                                    required
                                                    className="mt-1 w-full rounded-xl border border-white/70 bg-white/70 backdrop-blur px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-200"
                                                />
                                            </div>

                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div>
                                                    <label className="text-xs font-semibold text-rose-700">
                                                        New PIN *
                                                    </label>
                                                    <input
                                                        type="password"
                                                        value={newPin}
                                                        onChange={(e) => setNewPin(e.target.value)}
                                                        required
                                                        className="mt-1 w-full rounded-xl border border-white/70 bg-white/70 backdrop-blur px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-200"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs font-semibold text-rose-700">
                                                        Confirm PIN *
                                                    </label>
                                                    <input
                                                        type="password"
                                                        value={confirmPin}
                                                        onChange={(e) => setConfirmPin(e.target.value)}
                                                        required
                                                        className="mt-1 w-full rounded-xl border border-white/70 bg-white/70 backdrop-blur px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-200"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center border-t border-rose-100 pt-4">
                                                <p className="text-[11px] text-rose-700/70">Keep this PIN confidential.</p>

                                                <button
                                                    type="submit"
                                                    disabled={changingPin}
                                                    className={`px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-red-500 hover:bg-red-600 ${changingPin ? "opacity-70 cursor-wait" : ""
                                                        }`}
                                                >
                                                    {changingPin ? "Updating…" : "Save New PIN"}
                                                </button>
                                            </div>
                                        </form>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
