import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Paper,
  MenuItem,
  CircularProgress,
  Fade,
} from "@mui/material";
import { useForm, Controller, FieldPath } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axios from "axios";

const steps = ["Personal Details", "Position Details", "Confirmation"] as const;

const schema = yup.object({
  full_name: yup.string().required("Full Name is required"),
  national_id: yup.string().required("National ID is required"),
  phone: yup.string().required("Phone number is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  position: yup.string().required("Position is required"),
  county: yup.string().required("County is required"),
});

type FormValues = yup.InferType<typeof schema>;

const positions = ["MCA", "MP", "Woman Rep", "Senator", "Governor", "President"] as const;

const NewNomineeForm: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    handleSubmit,
    control,
    trigger,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      full_name: "",
      national_id: "",
      phone: "",
      email: "",
      position: "",
      county: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const step1Fields: FieldPath<FormValues>[] = [
    "full_name",
    "national_id",
    "phone",
    "email",
  ];
  const step2Fields: FieldPath<FormValues>[] = ["position", "county"];

  const handleNext = async () => {
    const valid = await trigger(activeStep === 0 ? step1Fields : step2Fields);
    if (valid) setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const response = await axios.post("https://skizagroundsuite.com/API/add_nominee.php", data);
      if (response.data?.status === "success") {
        alert("Nominee successfully added!");
        reset();
        setActiveStep(0);
      } else {
        alert(response.data?.message || "Failed to add nominee.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while adding the nominee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "90vh",
        background: "linear-gradient(135deg, #f0f4f8, #e0f7fa)",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 4,
          width: "100%",
          maxWidth: 600,
          backdropFilter: "blur(12px)",
          background: "rgba(255,255,255,0.6)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
        }}
      >
        <Typography variant="h5" fontWeight="bold" textAlign="center" gutterBottom>
          Register New Nominee
        </Typography>
        <Typography variant="body2" textAlign="center" mb={3}>
          Capture and submit nominee details for ODM vetting and management.
        </Typography>

        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} mt={3}>
          <Fade in={activeStep === 0} unmountOnExit>
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Controller
                    name="full_name"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Full Name"
                        fullWidth
                        error={!!errors.full_name}
                        helperText={errors.full_name?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="national_id"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="National ID"
                        fullWidth
                        error={!!errors.national_id}
                        helperText={errors.national_id?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Phone"
                        fullWidth
                        error={!!errors.phone}
                        helperText={errors.phone?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="email"
                        label="Email"
                        fullWidth
                        error={!!errors.email}
                        helperText={errors.email?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Box>
          </Fade>

          <Fade in={activeStep === 1} unmountOnExit>
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Controller
                    name="position"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Position"
                        select
                        fullWidth
                        error={!!errors.position}
                        helperText={errors.position?.message}
                      >
                        {positions.map((pos) => (
                          <MenuItem key={pos} value={pos}>
                            {pos}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="county"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="County"
                        fullWidth
                        error={!!errors.county}
                        helperText={errors.county?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Box>
          </Fade>

          <Fade in={activeStep === 2} unmountOnExit>
            <Box textAlign="center">
              <Typography variant="h6" mb={2}>
                Confirm Submission
              </Typography>
              <Typography variant="body2" mb={3}>
                Review the details and submit to register the nominee.
              </Typography>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {isSubmitting ? "Submitting..." : "Submit Nominee"}
              </Button>
            </Box>
          </Fade>

          <Box mt={3} display="flex" justifyContent="space-between">
            {activeStep > 0 && (
              <Button variant="outlined" onClick={handleBack}>
                Back
              </Button>
            )}
            {activeStep < steps.length - 1 && (
              <Button variant="contained" onClick={handleNext}>
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default NewNomineeForm;
