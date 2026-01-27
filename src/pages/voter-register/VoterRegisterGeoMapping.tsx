export default function VoterRegisterExports() {
    const runExport = () => {
        /**
         * Direct navigation avoids:
         * - blob typing issues
         * - TS errors
         * - CORS headaches
         *
         * Backend should:
         * - check permissions
         * - generate CSV
         * - force download
         */
        window.location.href = "/API/voter-register/export.php?format=csv";
    };

    return (
        <div className="p-4 md:p-6">
            <h1 className="text-lg font-semibold text-gray-900">Export Center</h1>

            <p className="text-sm text-gray-600 mt-1">
                Create restricted voter register exports based on your access level.
            </p>

            <div className="mt-4 rounded-xl border bg-white p-4">
                <button
                    onClick={runExport}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                >
                    Export Voter Register (CSV)
                </button>

                <div className="mt-3 text-sm text-gray-500">
                    Exports are filtered by county, constituency, ward, and station
                    permissions.
                </div>
            </div>
        </div>
    );
}
