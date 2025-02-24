import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, IconButton  } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useContext } from "react";
import { StudentContext } from "../layouts/view-member";

function MemberDocuments() {
    const { student, loading, error } = useContext(StudentContext);

    if (loading) return <p className="text-center">Loading...</p>;
    if (error) return <p className="text-red-500 text-center">{error}</p>;
    if (!student) return <p className="text-red-500 text-center">Student not found.</p>;

    const [open, setOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<{ name: string; url: string } | null>(null);

    // Open modal with selected document
    const handleOpen = (doc: { name: string; url: string }) => {
        setSelectedDoc(doc);
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

    const documents = [
        { name: "High School Certificate", url: `${base_url}${student.kcseCert}` },
        { name: "Undergraduate Certificate", url: `${base_url}${student.undergradCert}` },
        { name: "Undergraduate Transcripts", url: `${base_url}${student.undergradTranscript}` },
        { name: "Credit Report", url: `${credit_url}${student.creditReport}` },
        { name: "GPA Report", url: `${gpa_url}${student.gpaReport}` }
    ];

    return (
        <main>
            <div className="shadow-[9px_9px_54px_9px_rgba(0,0,0,0.08)] p-10 rounded-lg dark:bg-gray-700">
                <p className="font-bold text-center text-[24px] text-[#2164a6] dark:text-blue-300">Documents</p>
                <div>
                    {/* Document List */}
                    {documents.map((doc, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2">
                            <p>{doc.name}</p>
                            <IconButton onClick={() => handleOpen(doc)}>
                                <VisibilityIcon color="primary" />
                            </IconButton>
                        </div>
                    ))}

                    {/* Dialog with Close Button */}
                    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
                        <DialogTitle className="flex justify-between items-center">
                            <span>{selectedDoc?.name}</span>
                            <IconButton onClick={handleClose} className="hover:bg-red-100">
                                <CloseIcon className="text-red-500" />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent>
                            {selectedDoc && (
                                <iframe
                                    src={selectedDoc.url}
                                    width="100%"
                                    height="500px"
                                    title={selectedDoc.name}
                                />
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </main>
    )
}

export default MemberDocuments