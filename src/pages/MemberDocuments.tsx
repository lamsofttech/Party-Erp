import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { useContext } from "react";
import { StudentContext } from "../layouts/view-member";

// Define interface for document entries
interface DocumentEntry {
    name: string;
    url?: string | null; // For single documents
    urls?: string[];     // For multiple documents (e.g., Loan Contracts)
}

function MemberDocuments() {
    const { student, loading, error } = useContext(StudentContext);

    if (loading) return <p className="text-center">Loading...</p>;
    if (error) return <p className="text-red-500 text-center">{error}</p>;
    if (!student) return <p className="text-red-500 text-center">Student not found.</p>;

    const [open, setOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<DocumentEntry | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0); // For carousel navigation

    // Open modal with selected document and reset carousel index
    const handleOpen = (doc: DocumentEntry) => {
        setSelectedDoc(doc);
        setCurrentIndex(0); // Reset to first document
        setOpen(true);
    };

    // Close modal
    const handleClose = () => {
        setOpen(false);
        setSelectedDoc(null);
    };

    const base_url = "https://internationalscholars.qhtestingserver.com/apply/uploadfolder/";
    const credit_url = "https://finkapinternational.qhtestingserver.com/login/main/uploads/";
    const gpa_url = "https://finkapinternational.qhtestingserver.com/login/main/gpa_reports/";
    const visa_url = "https://finkapinternational.qhtestingserver.com/login/member/uploads/visa_documents/";
    const school_app_docs_url = "https://finkapinternational.qhtestingserver.com/login/member/dashboard/school_app_docs/";

    const documents: DocumentEntry[] = [
        { name: "ID Card", url: `${base_url}${student.idFile}` },
        { name: "Current Address", url: student.address ? `${school_app_docs_url}${student.address}` : null },
        { name: "High School Certificate", url: student.kcseCert ? `${base_url}${student.kcseCert}` : null },
        { name: "Undergraduate Certificate", url: student.undergradCert ? `${base_url}${student.undergradCert}` : null },
        { name: "Undergraduate Transcripts", url: student.undergradTranscript ? `${base_url}${student.undergradTranscript}` : null },
        { name: "Credit Report", url: student.creditReport ? `${credit_url}${student.creditReport}` : null },
        { name: "GPA Report", url: student.gpaReport ? `${gpa_url}${student.gpaReport}` : null },
        { name: "Test Score Report", url: student.testReport ? `${school_app_docs_url}${student.testReport}` : null },
        { name: "Contract", url: student.contract ? `${student.contract}` : null },
        { name: "Passport", url: student.passportDoc ? `${school_app_docs_url}${student.passportDoc}` : null },
        { name: "Resume", url: student.resumeDoc ? `${school_app_docs_url}${student.resumeDoc}` : null },
        { name: "Visa", url: student.visa ? `${visa_url}${student.visa}` : null },
        { name: "Loan Contracts", urls: student.loanConsents ? student.loanConsents : undefined },
        { name: "Verified Transcripts", url: student.transcripts ? `${school_app_docs_url}${student.transcripts}` : null },
    ];

    // Handle carousel navigation
    const handlePrevious = () => setCurrentIndex(prev => Math.max(prev - 1, 0));
    const handleNext = () => setCurrentIndex(prev => Math.min(prev + 1, (selectedDoc?.urls?.length ?? 1) - 1));

    return (
        <main>
            <div className="shadow-[9px_9px_54px_9px_rgba(0,0,0,0.08)] p-10 rounded-lg dark:bg-gray-700">
                <p className="font-bold text-center text-[24px] text-[#2164a6] dark:text-blue-300">Documents</p>
                <div>
                    {/* Document List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-16">
                        {documents.reduce<DocumentEntry[][]>((acc, doc, index) => {
                            const columnIndex = Math.floor(index / 7);
                            if (!acc[columnIndex]) acc[columnIndex] = [];
                            acc[columnIndex].push(doc);
                            return acc;
                        }, []).map((column, colIndex) => (
                            <div key={colIndex} className="flex flex-col gap-2">
                                {column.map((doc, index) => (
                                    <div
                                        key={`${colIndex}-${index}`}
                                        className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md"
                                    >
                                        <p className="text-gray-700 dark:text-gray-300">{doc.name}</p>
                                        <IconButton onClick={() => handleOpen(doc)} size="small">
                                            <VisibilityIcon className="text-blue-500" />
                                        </IconButton>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Dialog with Close Button */}
                    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
                        <DialogTitle className="flex justify-between items-center">
                            <span>{selectedDoc?.name}</span>
                            <IconButton onClick={handleClose} className="hover:bg-red-100">
                                <CloseIcon className="text-red-500" />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent>
                            {selectedDoc ? (
                                selectedDoc.urls && selectedDoc.urls.length > 0 ? (
                                    <div>
                                        <iframe
                                            src={selectedDoc.urls[currentIndex]}
                                            width="100%"
                                            height="500px"
                                            title={`${selectedDoc.name} ${currentIndex + 1}`}
                                        />
                                        <div className="flex justify-between mt-2">
                                            <button
                                                onClick={handlePrevious}
                                                disabled={currentIndex === 0}
                                                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                                            >
                                                Previous
                                            </button>
                                            <span>{currentIndex + 1} / {selectedDoc.urls.length}</span>
                                            <button
                                                onClick={handleNext}
                                                disabled={currentIndex === selectedDoc.urls.length - 1}
                                                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                ) : selectedDoc.url ? (
                                    <iframe
                                        src={selectedDoc.url}
                                        width="100%"
                                        height="500px"
                                        title={selectedDoc.name}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm animate-fade-in">
                                        <DescriptionOutlinedIcon
                                            className="text-gray-400 dark:text-gray-500 mb-4"
                                            style={{ fontSize: "48px" }}
                                        />
                                        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                            Document Not Available
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                            The requested document could not be found.
                                        </p>
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm animate-fade-in">
                                    <DescriptionOutlinedIcon
                                        className="text-gray-400 dark:text-gray-500 mb-4"
                                        style={{ fontSize: "48px" }}
                                    />
                                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                        Document Not Available
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                        The requested document could not be found.
                                    </p>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </main>
    );
}

export default MemberDocuments;