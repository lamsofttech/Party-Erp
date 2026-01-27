// src/components/swirl-toast.ts

type ToastType = "success" | "error" | "info";

let container: HTMLDivElement | null = null;

const ensureContainer = () => {
    if (typeof document === "undefined") return null;

    if (!container) {
        container = document.createElement("div");
        container.className = "swirl-toast-container";
        document.body.appendChild(container);
    }

    return container;
};

const showToast = (message: string, type: ToastType) => {
    const root = ensureContainer();
    if (!root) {
        // Fallback if DOM not ready
        alert(message);
        return;
    }

    const el = document.createElement("div");
    el.className = `swirl-toast swirl-toast-${type} animate-slide-in`;
    el.textContent = message;

    root.appendChild(el);

    setTimeout(() => {
        if (root.contains(el)) {
            root.removeChild(el);
        }
    }, 3500);
};

export const toast = {
    success: (msg: string) => showToast(msg, "success"),
    error: (msg: string) => showToast(msg, "error"),
    info: (msg: string) => showToast(msg, "info"),
};
