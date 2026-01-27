import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface User {
    id: string;
    username: string;
    email: string;
    name: string;
}

interface DeleteConfirmationModalProps {
    deleteTarget: User | null;
    deletingId: string | null;
    onCancel: () => void;
    onConfirm?: () => void;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    deleteTarget,
    deletingId,
    onCancel,
    onConfirm,
}) => {
    if (!deleteTarget) return null;

    const isProcessing = deletingId === deleteTarget.id;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-gray-800 rounded p-6 w-full max-w-md shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-red-600">
                        Confirm Delete
                    </h2>
                    <button onClick={onCancel}>
                        <XMarkIcon className="h-6 w-6 text-gray-600" />
                    </button>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-200 mb-4">
                    Are you sure you want to remove user{" "}
                    <span className="font-semibold">
                        {deleteTarget.name || deleteTarget.username}
                    </span>{" "}
                    ({deleteTarget.email})? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm"
                        disabled={isProcessing}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm disabled:opacity-60"
                        disabled={isProcessing || !onConfirm}
                    >
                        {isProcessing ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;
