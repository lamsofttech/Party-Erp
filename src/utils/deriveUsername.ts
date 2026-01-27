export const deriveUsernameFromEmail = (email: string) => {
    const left = (email || "").split("@")[0] || "";
    const cleaned = left.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 50);
    return cleaned || `user_${Date.now()}`;
};
