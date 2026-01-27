// src/pages/NewNomineePage.tsx (mobile-optimized + hot toast + success flow)
import React, { useState, useEffect } from "react";
import {
  Backdrop,
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  MenuItem,
  Divider,
  Tooltip,
  Snackbar,
  Alert,
  AlertColor,
  Checkbox,
  FormControlLabel,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slide,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import toast, { Toaster } from "react-hot-toast";
import type { TransitionProps } from "@mui/material/transitions";
import type { TextFieldProps } from "@mui/material/TextField";

// Styled component for file upload area
const UploadBox = styled(Box)(({ theme }) => ({
  border: "2px dashed #ccc",
  borderRadius: 8,
  padding: theme.spacing(2),
  textAlign: "center",
  cursor: "pointer",
  marginTop: theme.spacing(1.5),
  transition: "background 0.3s",
  "&:hover": { background: theme.palette.action.hover },
}));

// Stepper labels for the multi-step form
const steps = [
  "Personal Information",
  "Position & Location",
  "Documents",
  "Payment",
  "Declaration & Submit",
];

const NewNomineePage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTabletDown = useMediaQuery(theme.breakpoints.down("md"));

  // --- State Variables ---
  const [activeStep, setActiveStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>("success");

  const [successOpen, setSuccessOpen] = useState(false); // success sheet/dialog

  // Stores nominee ID after initial registration (from Step 0 backend response)
  const [nomineeId, setNomineeId] = useState<string | null>(null);

  // Form data for all steps
  const initialForm = {
    full_name: "",
    national_id: "",
    passport_number: "",
    date_of_birth: "",
    gender: "",
    phone: "",
    email: "",
    physical_address: "",
    position: "",
    county: "",
    constituency: "",
    ward: "",
    membership_number: "",
    payment_reference: "",
    payment_method: "MPesa" as "MPesa" | "card" | "bank",
    payment_date: "",
    payment_amount: "",
    loyalty_declaration: false,
    dispute_acceptance: false,
  };
  const [formData, setFormData] = useState({ ...initialForm });

  // State to hold document files
  const [documents, setDocuments] = useState<{ [key: string]: File | null }>({
    national_id_doc: null,
    membership_proof_doc: null,
    academic_certificates_doc: null,
    police_clearance_doc: null,
    kra_compliance_doc: null,
    eacc_clearance_doc: null,
    helb_clearance_doc: null,
    declaration_of_assets_doc: null,
    passport_photo: null,
    affirmation_signature: null,
  });

  // States for location data (counties, constituencies, wards)
  const [counties, setCounties] = useState<any[]>([]);
  const [constituencies, setConstituencies] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  // Nomination fee & currency
  const [nominationFeeKES, setNominationFeeKES] = useState<number>(0);
  const [selectedCurrency, setSelectedCurrency] = useState<"KES" | "USD">("KES");
  const [usdToKesRate, setUsdToKesRate] = useState<number>(0);
  const [displayAmount, setDisplayAmount] = useState<string>("");

  // --- useEffect Hooks for Data Fetching ---
  useEffect(() => {
    // 1. Fetch Counties
    fetch("https://skizagroundsuite.com/API/get_locations.php")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success" && data.level === "county") setCounties(data.data);
      })
      .catch((err) => console.error("Error loading counties:", err));

    // 2. Fetch Nomination Fee (KES)
    fetch("https://skizagroundsuite.com/API/get_nomination_fee.php")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success" && data.amount) {
          const fee = parseFloat(data.amount);
          setNominationFeeKES(fee);
          setDisplayAmount(fee.toFixed(2));
          setFormData((prev) => ({ ...prev, payment_amount: String(fee) }));
        } else {
          const def = 1.0;
          setNominationFeeKES(def);
          setDisplayAmount(def.toFixed(2));
          setFormData((prev) => ({ ...prev, payment_amount: String(def) }));
          setSnackbarMessage(`Warning: Could not fetch nomination fee. Defaulting to KES ${def}.`);
          setSnackbarSeverity("warning");
          setSnackbarOpen(true);
        }
      })
      .catch((err) => {
        console.error("Error fetching nomination fee:", err);
        const def = 1.0;
        setNominationFeeKES(def);
        setDisplayAmount(def.toFixed(2));
        setFormData((prev) => ({ ...prev, payment_amount: String(def) }));
        setSnackbarMessage(`Error fetching nomination fee. Defaulting to KES ${def}.`);
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      });

    // 3. Fetch USD->KES
    fetch("https://skizagroundsuite.com/API/payments/fixerAPI.php?action=sell&from=usd&to=kes&amount=1")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success" && data.result) setUsdToKesRate(data.result);
        else {
          setSnackbarMessage("Warning: Could not fetch USD exchange rate. USD may be unavailable.");
          setSnackbarSeverity("warning");
          setSnackbarOpen(true);
        }
      })
      .catch((err) => {
        console.error("Error fetching USD rate:", err);
        setSnackbarMessage("Error fetching USD exchange rate.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      });
  }, []);

  // Recalculate display amount on currency/rates change
  useEffect(() => {
    if (nominationFeeKES > 0) {
      if (selectedCurrency === "KES") {
        setDisplayAmount(nominationFeeKES.toFixed(2));
        setFormData((p) => ({ ...p, payment_amount: String(nominationFeeKES) }));
      } else if (selectedCurrency === "USD" && usdToKesRate > 0) {
        const usdAmount = nominationFeeKES / usdToKesRate;
        setDisplayAmount(usdAmount.toFixed(2));
        setFormData((p) => ({ ...p, payment_amount: String(usdAmount) }));
      } else if (selectedCurrency === "USD" && usdToKesRate === 0) {
        setDisplayAmount("N/A");
        setFormData((p) => ({ ...p, payment_amount: "" }));
        setSnackbarMessage("Cannot convert to USD. Exchange rate not available.");
        setSnackbarSeverity("warning");
        setSnackbarOpen(true);
      }
    }
  }, [selectedCurrency, nominationFeeKES, usdToKesRate]);

  // Fetch constituencies when county changes
  useEffect(() => {
    if (formData.county) {
      fetch(`https://skizagroundsuite.com/API/get_constituencies.php?county_code=${formData.county}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success" && Array.isArray(data.data)) {
            setConstituencies(data.data);
            setFormData((p) => ({ ...p, constituency: "", ward: "" }));
            setWards([]);
          } else {
            setConstituencies([]);
            setWards([]);
            setFormData((p) => ({ ...p, constituency: "", ward: "" }));
          }
        })
        .catch((err) => console.error("Error loading constituencies:", err));
    } else {
      setConstituencies([]);
      setWards([]);
      setFormData((p) => ({ ...p, constituency: "", ward: "" }));
    }
  }, [formData.county]);

  // Fetch wards when constituency changes
  useEffect(() => {
    if (formData.constituency) {
      fetch(`https://skizagroundsuite.com/API/get_wards.php?const_code=${formData.constituency}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success" && Array.isArray(data.data)) {
            setWards(data.data);
            setFormData((p) => ({ ...p, ward: "" }));
          } else {
            setWards([]);
            setFormData((p) => ({ ...p, ward: "" }));
          }
        })
        .catch((err) => console.error("Error loading wards:", err));
    } else {
      setWards([]);
      setFormData((p) => ({ ...p, ward: "" }));
    }
  }, [formData.constituency]);

  // --- Event Handlers ---
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const name = target.name as keyof typeof formData | "selected_currency";

    if (name === "payment_method") {
      const value = (target as HTMLInputElement | HTMLSelectElement).value as typeof formData.payment_method;
      setFormData((prev) => ({ ...prev, [name]: value, payment_reference: "" }));
      setPaymentDone(false);
      return;
    }

    if (name === "selected_currency") {
      const value = (target as HTMLInputElement | HTMLSelectElement).value as "KES" | "USD";
      setSelectedCurrency(value);
      return;
    }

    // checkbox/radio vs everything else
    const value =
      target instanceof HTMLInputElement && (target.type === "checkbox" || target.type === "radio")
        ? (target as HTMLInputElement).checked
        : target.value;

    setFormData((prev) => ({ ...prev, [name]: value as any }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (e.target.files && e.target.files.length > 0) {
      setDocuments((prev) => ({ ...prev, [fieldName]: e.target.files![0] }));
    }
  };

  const handleSnackbarClose = () => setSnackbarOpen(false);

  // --- Core API Submission Logic for Each Step ---
  const handleStepSubmit = async (): Promise<boolean> => {
    setUploading(true);
    let endpoint = "";
    let payload: any;
    let headers: HeadersInit | undefined = { "Content-Type": "application/json" };

    switch (activeStep) {
      case 0:
        endpoint = "https://skizagroundsuite.com/API/admissions/save_personal_info.php";
        payload = {
          full_name: formData.full_name,
          national_id: formData.national_id,
          passport_number: formData.passport_number,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          phone: formData.phone,
          email: formData.email,
          physical_address: formData.physical_address,
        };
        break;
      case 1:
        if (!nomineeId) {
          setSnackbarMessage("Error: Nominee ID not found. Please restart the process.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setUploading(false);
          return false;
        }
        endpoint = "https://skizagroundsuite.com/API/admissions/submit_position_location.php";
        payload = {
          nominee_id: nomineeId,
          position: formData.position,
          county: formData.county,
          constituency: formData.constituency,
          ward: formData.ward,
          membership_number: formData.membership_number,
        };
        break;
      case 2:
        if (!nomineeId) {
          setSnackbarMessage("Error: Nominee ID not found. Please restart the process.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setUploading(false);
          return false;
        }
        endpoint = "https://skizagroundsuite.com/API/admissions/upload_nominee_documents.php";
        payload = new FormData();
        payload.append("nominee_id", nomineeId);
        Object.keys(documents).forEach((key) => {
          if (documents[key]) payload.append(key, documents[key] as File);
        });
        headers = undefined; // let browser set multipart boundary
        break;
      case 3:
        if (!nomineeId) {
          setSnackbarMessage("Error: Nominee ID not found. Please restart the process.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setUploading(false);
          return false;
        }
        endpoint = "https://skizagroundsuite.com/API/admissions/confirm_nominee_payment.php";
        payload = {
          nominee_id: nomineeId,
          payment_amount: formData.payment_amount,
          payment_reference: formData.payment_reference,
          payment_method: formData.payment_method,
          payment_date: formData.payment_date || new Date().toISOString().slice(0, 10),
        };
        break;
      case 4:
        if (!nomineeId) {
          setSnackbarMessage("Error: Nominee ID not found. Please restart the process.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setUploading(false);
          return false;
        }
        endpoint = "https://skizagroundsuite.com/API/admissions/finalize_nominee_application.php";
        payload = {
          nominee_id: nomineeId,
          loyalty_declaration: formData.loyalty_declaration,
          dispute_acceptance: formData.dispute_acceptance,
        };
        break;
      default:
        setUploading(false);
        return false;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: activeStep === 2 ? payload : JSON.stringify(payload),
      });
      const result = await response.json();

      if (result.status === "success") {
        setSnackbarMessage(`Step ${activeStep + 1}: Saved successfully!`);
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        if (activeStep === 0 && result.nominee_id) setNomineeId(result.nominee_id);
        return true;
      } else {
        setSnackbarMessage(`Step ${activeStep + 1} Error: ${result.message || "Failed to save."}`);
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return false;
      }
    } catch (error) {
      console.error("API call error for step", activeStep, ":", error);
      setSnackbarMessage(`Network error saving step ${activeStep + 1}. Please try again.`);
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return false;
    } finally {
      setUploading(false);
    }
  };

  // Next/back
  const handleNext = async () => {
    if (activeStep === 3) {
      if (formData.payment_method === "MPesa" && !paymentDone) {
        setSnackbarMessage("Please initiate M-PESA payment before proceeding.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }
    }
    const success = await handleStepSubmit();
    if (success) setActiveStep((prev) => prev + 1);
  };
  const handleBack = () => setActiveStep((prev) => prev - 1);

  // Payment initiation
  const initiatePayment = async () => {
    const amountNum = parseFloat(displayAmount);
    const isAmountValid = Number.isFinite(amountNum) && amountNum > 0;

    if (!formData.payment_amount || !nomineeId || !isAmountValid) {
      setSnackbarMessage("Payment amount & Nominee ID are required with a valid amount.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    if (formData.payment_method === "MPesa") {
      if (!formData.phone) {
        setSnackbarMessage("Phone number is required for M-Pesa payment.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }
      if (formData.phone !== "254708374149" && process.env.NODE_ENV === "development") {
        setSnackbarMessage("For sandbox M-Pesa testing, use 254708374149");
        setSnackbarSeverity("warning");
        setSnackbarOpen(true);
        return;
      }
    }

    setUploading(true);
    try {
      const res = await fetch("https://skizagroundsuite.com/API/payments/make_payments.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nominee_id: nomineeId,
          phone: formData.phone,
          amount: amountNum,
          currency: selectedCurrency,
          purpose: "Nomination Fees",
          payment_method: formData.payment_method,
          email: formData.email,
        }),
      });
      const data = await res.json();

      if (data.status === "success") {
        setSnackbarMessage(data.message || "Payment initiated successfully!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);

        if (formData.payment_method === "card" || formData.payment_method === "bank") {
          if (data.checkoutURL) window.location.href = data.checkoutURL;
          else {
            setSnackbarMessage("Payment initiated, but no redirect URL provided.");
            setSnackbarSeverity("warning");
            setSnackbarOpen(true);
          }
        } else if (formData.payment_method === "MPesa") {
          setPaymentDone(true);
        }
      } else {
        setSnackbarMessage(`Payment initiation failed: ${data.message || "Unknown error."}`);
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Error initiating payment:", error);
      setSnackbarMessage("Network error initiating payment.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setUploading(false);
    }
  };

  // Final submit
  const resetAll = () => {
    setActiveStep(0);
    setFormData({ ...initialForm, payment_amount: String(nominationFeeKES) });
    setDocuments({
      national_id_doc: null,
      membership_proof_doc: null,
      academic_certificates_doc: null,
      police_clearance_doc: null,
      kra_compliance_doc: null,
      eacc_clearance_doc: null,
      helb_clearance_doc: null,
      declaration_of_assets_doc: null,
      passport_photo: null,
      affirmation_signature: null,
    });
    setPaymentDone(false);
    setNomineeId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!formData.loyalty_declaration || !formData.dispute_acceptance) {
      setSnackbarMessage("Please agree to the Loyalty Declaration and Dispute Acceptance.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    const success = await handleStepSubmit();
    if (success) {
      toast.success("Successfully added nominee!", { duration: 3500 });
      setSuccessOpen(true); // show success sheet with CTA
    }
  };

  // --- Render per step ---
  const renderStepContent = () => {
    // ✅ FIX: explicitly type commonFieldProps so `size` becomes "small" | "medium" (not string)
    const commonFieldProps: Partial<TextFieldProps> = {
      fullWidth: true,
      margin: "normal",
      size: isTabletDown ? "small" : "medium",
    };

    switch (activeStep) {
      case 0:
        return (
          <>
            <Typography variant={isMobile ? "subtitle1" : "h6"}>Personal Information</Typography>
            <Divider sx={{ mb: 1.5 }} />
            <TextField label="Full Name" name="full_name" value={formData.full_name} onChange={handleInputChange} {...commonFieldProps} required />
            <TextField label="National ID" name="national_id" value={formData.national_id} onChange={handleInputChange} {...commonFieldProps} required />
            <TextField label="Passport Number" name="passport_number" value={formData.passport_number} onChange={handleInputChange} {...commonFieldProps} />
            <TextField type="date" label="Date of Birth" name="date_of_birth" value={formData.date_of_birth} onChange={handleInputChange} InputLabelProps={{ shrink: true }} {...commonFieldProps} required />
            <TextField label="Gender" name="gender" value={formData.gender} onChange={handleInputChange} select {...commonFieldProps} required>
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </TextField>
            <TextField label="Phone (for M-PESA)" name="phone" value={formData.phone} onChange={handleInputChange} helperText={isMobile ? "Sandbox: 254708374149" : "For sandbox M-Pesa testing, use 254708374149"} {...commonFieldProps} required />
            <TextField label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} {...commonFieldProps} required />
            <TextField label="Physical Address" name="physical_address" value={formData.physical_address} onChange={handleInputChange} multiline rows={2} {...commonFieldProps} />
          </>
        );
      case 1:
        return (
          <>
            <Typography variant={isMobile ? "subtitle1" : "h6"}>Position & Location</Typography>
            <Divider sx={{ mb: 1.5 }} />
            <TextField label="Position" name="position" value={formData.position} onChange={handleInputChange} select {...commonFieldProps} required>
              {["MCA", "MP", "Woman Rep", "Senator", "Governor", "President"].map((pos) => (
                <MenuItem key={pos} value={pos}>{pos}</MenuItem>
              ))}
            </TextField>
            <TextField label="County" name="county" value={formData.county} onChange={handleInputChange} select {...commonFieldProps} required>
              {counties.map((county) => (
                <MenuItem key={county.county_code} value={county.county_code}>{county.county_name}</MenuItem>
              ))}
            </TextField>
            <TextField label="Constituency" name="constituency" value={formData.constituency} onChange={handleInputChange} select disabled={!constituencies.length} {...commonFieldProps} required>
              {constituencies.map((c) => (
                <MenuItem key={c.const_code} value={c.const_code}>{c.constituency_name}</MenuItem>
              ))}
            </TextField>
            <TextField label="Ward" name="ward" value={formData.ward} onChange={handleInputChange} select disabled={!wards.length} {...commonFieldProps} required>
              {wards.map((w) => (
                <MenuItem key={w.ward_code} value={w.ward_code}>{w.ward_name}</MenuItem>
              ))}
            </TextField>
            <TextField label="Membership Number" name="membership_number" value={formData.membership_number} onChange={handleInputChange} {...commonFieldProps} required />
          </>
        );
      case 2:
        return (
          <>
            <Typography variant={isMobile ? "subtitle1" : "h6"}>Document Uploads</Typography>
            <Divider sx={{ mb: 1.5 }} />
            {Object.keys(documents).map((docKey) => (
              <Tooltip title={`Upload ${docKey.replace(/_/g, " ")}`} key={docKey}>
                <UploadBox>
                  <input type="file" id={`upload-${docKey}`} style={{ display: "none" }} onChange={(e) => handleFileChange(e, docKey)} accept="image/*,.pdf" />
                  <label htmlFor={`upload-${docKey}`} style={{ cursor: "pointer" }}>
                    <CloudUploadIcon fontSize="large" color="action" />
                    <Typography variant="body2" sx={{ mt: 1 }} noWrap>
                      {documents[docKey]?.name || `Upload ${docKey.replace(/_/g, " ")}`}
                    </Typography>
                  </label>
                </UploadBox>
              </Tooltip>
            ))}
          </>
        );
      case 3:
        return (
          <>
            <Typography variant={isMobile ? "subtitle1" : "h6"}>Nomination Fee Payment</Typography>
            <Divider sx={{ mb: 1.5 }} />
            <TextField label="Currency" name="selected_currency" value={selectedCurrency} onChange={handleInputChange} select {...commonFieldProps} required>
              <MenuItem value="KES">KES - Kenyan Shilling</MenuItem>
              <MenuItem value="USD" disabled={usdToKesRate === 0}>USD - US Dollar {usdToKesRate === 0 ? "(Rate not available)" : ""}</MenuItem>
            </TextField>
            <TextField type="text" label={`Nomination Fee Amount (${selectedCurrency})`} name="payment_amount" value={displayAmount} {...commonFieldProps} required InputProps={{ readOnly: true }} />
            <TextField label="Payment Method" name="payment_method" value={formData.payment_method} onChange={handleInputChange} select {...commonFieldProps} required>
              <MenuItem value="MPesa">M-Pesa</MenuItem>
              <MenuItem value="card">Card (Visa, Mastercard, etc.)</MenuItem>
              <MenuItem value="bank">Bank Transfer (Invoice)</MenuItem>
            </TextField>
            {formData.payment_method === "MPesa" && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                * Ensure the phone in Personal Info is correct—this number receives the M-Pesa push.
              </Typography>
            )}
            <Button
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
              disabled={
                uploading ||
                (selectedCurrency === "USD" && usdToKesRate === 0) ||
                !nomineeId ||
                (formData.payment_method === "MPesa" && (!formData.phone || paymentDone))
              }
              onClick={initiatePayment}
            >
              {uploading
                ? "Processing..."
                : formData.payment_method === "MPesa"
                  ? (paymentDone ? "M-PESA Push Sent" : "Initiate M-PESA Payment")
                  : `Proceed with ${formData.payment_method === "card" ? "Card" : "Bank"} Payment`}
            </Button>
          </>
        );
      case 4:
        return (
          <>
            <Typography variant={isMobile ? "subtitle1" : "h6"}>Declaration & Final Submission</Typography>
            <Divider sx={{ mb: 1.5 }} />
            <FormControlLabel
              control={<Checkbox checked={formData.loyalty_declaration} onChange={handleInputChange} name="loyalty_declaration" required />}
              label="I declare my loyalty and commitment to the party principles and objectives."
            />
            <FormControlLabel
              control={<Checkbox checked={formData.dispute_acceptance} onChange={handleInputChange} name="dispute_acceptance" required />}
              label="I accept the party's dispute resolution mechanisms."
            />
          </>
        );
      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  const MobileHeader = (
    <Box sx={{ mb: 2, display: { xs: "block", md: "none" } }}>
      <Typography variant="subtitle2" color="text.secondary">
        Step {activeStep + 1} of {steps.length}
      </Typography>
      <Typography variant="h6" fontWeight={800}>
        {steps[activeStep]}
      </Typography>
    </Box>
  );

  const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { children: React.ReactElement<any, any> },
    ref: React.Ref<unknown>
  ) {
    return <Slide direction="up" ref={ref} {...props} />;
  });

  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 4, px: { xs: 1, sm: 2 } }}>
      <Typography variant={isMobile ? "h5" : "h4"} component="h1" gutterBottom align="center" fontWeight={800}>
        Nomination Application
      </Typography>

      {/* On desktop, show full stepper; on mobile, show compact header */}
      {isTabletDown ? (
        MobileHeader
      ) : (
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>
      )}

      <Box sx={{ p: { xs: 2, sm: 3 }, border: "1px solid #eee", borderRadius: 2, boxShadow: 1 }}>
        {renderStepContent()}

        {/* Bottom action bar (sticky on mobile) */}
        <Box
          sx={{
            position: { xs: "sticky", md: "static" },
            bottom: 0,
            pt: 2,
            mt: 3,
            bgcolor: { xs: "background.paper", md: "transparent" },
            borderTop: { xs: "1px solid", md: "none" },
            borderColor: { xs: "divider", md: "transparent" },
            display: "flex",
            gap: 1,
            justifyContent: "space-between",
          }}
        >
          <Button variant="outlined" onClick={handleBack} disabled={activeStep === 0 || uploading} fullWidth={isMobile}>
            Back
          </Button>

          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={uploading || !formData.loyalty_declaration || !formData.dispute_acceptance}
              fullWidth={isMobile}
            >
              {uploading ? <CircularProgress size={22} color="inherit" /> : "Submit Application"}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleNext}
              disabled={
                uploading ||
                (activeStep === 3 && formData.payment_method === "MPesa" && !paymentDone) ||
                (activeStep === 3 && formData.payment_method !== "MPesa" && (!displayAmount || displayAmount === "N/A")) ||
                (activeStep === 0 && (!formData.full_name || !formData.national_id || !formData.date_of_birth || !formData.gender || !formData.phone || !formData.email)) ||
                (activeStep === 1 && (!formData.position || !formData.county || !formData.constituency || !formData.ward || !formData.membership_number))
              }
              fullWidth={isMobile}
            >
              {uploading ? <CircularProgress size={22} color="inherit" /> : "Next"}
            </Button>
          )}
        </Box>
      </Box>

      {/* Loading Backdrop */}
      <Backdrop sx={{ color: "#fff", zIndex: (t) => t.zIndex.drawer + 1 }} open={uploading}>
        <CircularProgress color="inherit" />
      </Backdrop>

      {/* Snackbar (general messages) */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Hot toast renderer */}
      <Toaster position={isMobile ? "bottom-center" : "top-right"} />

      {/* Success sheet/dialog with CTA */}
      <Dialog
        open={successOpen}
        TransitionComponent={Transition}
        keepMounted
        fullWidth
        maxWidth="xs"
        fullScreen={isMobile}
        onClose={() => setSuccessOpen(false)}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>🎉 Nominee submitted</DialogTitle>
        <DialogContent dividers>
          <Typography gutterBottom>
            Successfully added. Would you like to start a new application?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setSuccessOpen(false)} color="inherit" fullWidth={isMobile}>Close</Button>
          <Button
            onClick={() => {
              setSuccessOpen(false);
              resetAll();
              toast.success("Starting a new application", { duration: 2000 });
            }}
            variant="contained"
            color="primary"
            fullWidth={isMobile}
          >
            Add another candidate
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default NewNomineePage;
