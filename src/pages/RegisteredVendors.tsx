// SECTION 1 — RegisteredVendors.tsx (Part 1/3)
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Snackbar,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  IconButton,
  Tooltip,
  Collapse,
  Divider,
  Tabs,
  Tab,
  Box,
  Typography,
  Autocomplete,
} from "@mui/material";
import { Users, Plus, Edit2, Trash2, Banknote, Package, Send } from "lucide-react";
import CountUp from "react-countup";

// --- Interfaces ---
interface Vendor {
  id: number;
  vendor_name: string;
  category: string;
  contact_person: string;
  email: string;
  phone_number: string;
  address: string;
  status: "Active" | "Suspended" | "Blacklisted";
  rating: number;
  notes: string;
  county?: string;
  constituency?: string;
  ward?: string;
  polling_station?: string;
}

interface SupplyItem {
  id: number;
  vendor_id: number;
  vendor_name: string;
  item_name: string;
  quantity: number;
  unit: string;
  description?: string;
  cost_per_unit: number;
  date_acquired: string;
  location_in_storage?: string;
}

interface SupplyIssuance {
  id: number;
  supply_item_id: number;
  item_name: string;
  quantity_issued: number;
  issued_to_team_member: string;
  issued_for_purpose: string;
  issue_date: string;
  notes?: string;
  issue_county?: string;
  issue_constituency?: string;
  issue_ward?: string;
  issue_polling_station?: string;
}

// --- Constants ---
const categoryOptions = [
  "Transport",
  "Food",
  "Clothing",
  "Medical",
  "Education",
  "Shelter",
  "Printing",
  "Merchandise",
  "Event Services",
];

const statusOptions: Vendor["status"][] = ["Active", "Suspended", "Blacklisted"];

const unitOptions = ["pcs", "units", "sets", "meters", "liters", "rolls", "boxes", "kms", "hours", "days"];

// --- Component ---
const RegisteredVendors: React.FC = () => {
  // Data
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([]);
  const [supplyIssuances, setSupplyIssuances] = useState<SupplyIssuance[]>([]);

  // UI
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedBankVendorId, setExpandedBankVendorId] = useState<number | null>(null);
  const [bankAccountForm, setBankAccountForm] = useState({
    bank_name: "",
    account_number: "",
    account_name: "",
    swift_code: "",
    notes: "",
  });

  const [supplyItemDialogOpen, setSupplyItemDialogOpen] = useState(false);
  const [editingSupplyItem, setEditingSupplyItem] = useState<SupplyItem | null>(null);

  const [issueSupplyDialogOpen, setIssueSupplyDialogOpen] = useState(false);
  const [issueSupplyForm, setIssueSupplyForm] = useState({
    supply_item_id: "",
    quantity_issued: "",
    issued_to_team_member: "",
    issued_for_purpose: "",
    notes: "",
    issue_county: "",
    issue_constituency: "",
    issue_ward: "",
    issue_polling_station: "",
  });

  const [currentTab, setCurrentTab] = useState(0);

  // Geo lists (flat, non-cascading)
  const [allCounties, setAllCounties] = useState<string[]>([]);
  const [allConstituencies, setAllConstituencies] = useState<string[]>([]);
  const [allWards, setAllWards] = useState<string[]>([]);
  const [allPollingStations, setAllPollingStations] = useState<string[]>([]);

  // Helper for flat geo fetch
  const fetchAllGeoData = async (
    url: string,
    setData: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    try {
      const response = await fetch(url);
      const result = await response.json();
      if (result.status === "success") {
        setData(result.data || []);
      } else {
        console.error(`Failed to fetch data from ${url}:`, result.message);
        setData([]);
      }
    } catch (error) {
      console.error(`Error fetching data from ${url}:`, error);
      setData([]);
    }
  };

  // Initial load
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await fetchAllGeoData("https://skizagroundsuite.com/API/get_counties.php", setAllCounties);
        await fetchAllGeoData("https://skizagroundsuite.com/API/get_all_constituencies.php", setAllConstituencies);
        await fetchAllGeoData("https://skizagroundsuite.com/API/get_all_wards.php", setAllWards);
        await fetchAllGeoData("https://skizagroundsuite.com/API/get_all_polling_stations.php", setAllPollingStations);

        // Vendors
        const vendorResponse = await fetch("https://skizagroundsuite.com/API/vendors.php");
        const vendorResult = await vendorResponse.json();
        if (vendorResult.status === "success") {
          const parsedVendors = vendorResult.data.map((vendor: any) => ({
            ...vendor,
            id: Number(vendor.id),
            rating: Number(vendor.rating),
            county: vendor.county || "",
            constituency: vendor.constituency || "",
            ward: vendor.ward || "",
            polling_station: vendor.polling_station || "",
          }));
          setVendors(parsedVendors);
        } else {
          setSnackbar({ open: true, message: vendorResult.message, severity: "error" });
        }

        // Supply items
        const supplyItemResponse = await fetch("https://skizagroundsuite.com/API/supply_items.php");
        const supplyItemResult = await supplyItemResponse.json();
        if (supplyItemResult.status === "success") {
          const parsedSupplyItems = supplyItemResult.data.map((item: any) => ({
            ...item,
            id: Number(item.id),
            vendor_id: Number(item.vendor_id),
            quantity: Number(item.quantity),
            cost_per_unit: Number(item.cost_per_unit),
          }));
          setSupplyItems(parsedSupplyItems);
        } else {
          setSnackbar({ open: true, message: supplyItemResult.message, severity: "error" });
        }

        // Supply issuances
        const supplyIssuanceResponse = await fetch("https://skizagroundsuite.com/API/get_supply_issuances.php");
        const supplyIssuanceResult = await supplyIssuanceResponse.json();
        if (supplyIssuanceResult.status === "success") {
          const parsedSupplyIssuances = supplyIssuanceResult.data.map((issuance: any) => ({
            ...issuance,
            id: Number(issuance.id),
            supply_item_id: Number(issuance.supply_item_id),
            quantity_issued: Number(issuance.quantity_issued),
            issue_county: issuance.issue_county || "",
            issue_constituency: issuance.issue_constituency || "",
            issue_ward: issuance.issue_ward || "",
            issue_polling_station: issuance.issue_polling_station || "",
          }));
          setSupplyIssuances(parsedSupplyIssuances);
        } else {
          setSnackbar({ open: true, message: supplyIssuanceResult.message, severity: "error" });
        }
      } catch (error) {
        console.error("Fetch data error:", error);
        setSnackbar({ open: true, message: "Failed to fetch data. Check API endpoints.", severity: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
// SECTION 2 — RegisteredVendors.tsx (Part 2/3)
// --- Vendor Management ---
  const handleOpenVendorDialog = (vendor?: Vendor) => {
    setEditingVendor(
      vendor ?? {
        id: 0,
        vendor_name: "",
        category: categoryOptions[0],
        contact_person: "",
        email: "",
        phone_number: "",
        address: "",
        status: "Active",
        rating: 0,
        notes: "",
        county: "",
        constituency: "",
        ward: "",
        polling_station: "",
      }
    );
    setVendorDialogOpen(true);
  };

  const handleCloseVendorDialog = () => {
    setEditingVendor(null);
    setVendorDialogOpen(false);
  };

  const handleSaveVendor = async () => {
    if (!editingVendor) return;

    const payload = {
      vendor_name: editingVendor.vendor_name,
      contact_person: editingVendor.contact_person,
      phone_number: editingVendor.phone_number,
      email: editingVendor.email,
      address: editingVendor.address,
      notes: editingVendor.notes,
      category: editingVendor.category,
      status: editingVendor.status,
      rating: editingVendor.rating,
      county: editingVendor.county,
      constituency: editingVendor.constituency,
      ward: editingVendor.ward,
      polling_station: editingVendor.polling_station,
    };

    const requiredFields: Array<keyof typeof payload> = [
      "vendor_name",
      "contact_person",
      "county",
      "constituency",
    ];
    for (const field of requiredFields) {
      if (!payload[field]) {
        setSnackbar({
          open: true,
          message: `${field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ")} is required.`,
          severity: "error",
        });
        return;
      }
    }

    try {
      const isNew = editingVendor.id === 0;
      const url = "https://skizagroundsuite.com/API/vendors.php" + (isNew ? "" : `?id=${editingVendor.id}`);
      const method = isNew ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (result.status === "success") {
        if (isNew) {
          const newVendor = { ...editingVendor, id: result.id };
          setVendors((prev) => [newVendor, ...prev]);
          setSnackbar({ open: true, message: "Vendor added successfully!", severity: "success" });
        } else {
          setVendors((prev) => prev.map((v) => (v.id === editingVendor.id ? editingVendor : v)));
          setSnackbar({ open: true, message: "Vendor updated successfully!", severity: "success" });
        }
      } else {
        setSnackbar({ open: true, message: result.message, severity: "error" });
      }
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Failed to save vendor.", severity: "error" });
    }
    handleCloseVendorDialog();
  };

  const handleDeleteVendor = async (id: number) => {
    try {
      const response = await fetch(`https://skizagroundsuite.com/API/vendors.php?id=${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();
      if (result.status === "success") {
        setVendors((prev) => prev.filter((v) => v.id !== id));
        setSnackbar({ open: true, message: "Vendor deleted successfully.", severity: "info" });
      } else {
        setSnackbar({ open: true, message: result.message, severity: "error" });
      }
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Failed to delete vendor.", severity: "error" });
    }
  };

  const handleAddBankAccount = async (vendorId: number) => {
    if (!bankAccountForm.bank_name || !bankAccountForm.account_number || !bankAccountForm.account_name) {
      setSnackbar({
        open: true,
        message: "Bank name, account number, and account name are required.",
        severity: "error",
      });
      return;
    }
    try {
      const response = await fetch("https://skizagroundsuite.com/API/add_vendor_bank_account.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendor_id: vendorId, ...bankAccountForm }),
      });
      const result = await response.json();
      if (result.status === "success") {
        setSnackbar({ open: true, message: "Bank account added successfully.", severity: "success" });
        setBankAccountForm({ bank_name: "", account_number: "", account_name: "", swift_code: "", notes: "" });
        setExpandedBankVendorId(null);
      } else {
        setSnackbar({ open: true, message: result.message, severity: "error" });
      }
    } catch (error) {
      console.error(error);
      setSnackbar({
        open: true,
        message: "Failed to add bank account. (Backend file missing?)",
        severity: "error",
      });
    }
  };

// --- Supply Item Management ---
  const handleOpenSupplyItemDialog = (item?: SupplyItem) => {
    setEditingSupplyItem(
      item ?? {
        id: 0,
        vendor_id: vendors.length > 0 ? vendors[0].id : 0,
        vendor_name: vendors.length > 0 ? vendors[0].vendor_name : "",
        item_name: "",
        quantity: 0,
        unit: unitOptions[0],
        description: "",
        cost_per_unit: 0,
        date_acquired: new Date().toISOString().split("T")[0],
        location_in_storage: "",
      }
    );
    setSupplyItemDialogOpen(true);
  };

  const handleCloseSupplyItemDialog = () => {
    setEditingSupplyItem(null);
    setSupplyItemDialogOpen(false);
  };

  const handleSaveSupplyItem = async () => {
    if (!editingSupplyItem) return;
    const requiredFields: Array<keyof SupplyItem> = [
      "vendor_id",
      "item_name",
      "quantity",
      "unit",
      "cost_per_unit",
      "date_acquired",
    ];
    for (const field of requiredFields) {
      if (typeof editingSupplyItem[field] === "string" && !(editingSupplyItem[field] as unknown as string).trim()) {
        setSnackbar({
          open: true,
          message: `Supply item ${field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ")} is required.`,
          severity: "error",
        });
        return;
      }
      if (
        typeof editingSupplyItem[field] === "number" &&
        (editingSupplyItem[field] === 0 || isNaN(editingSupplyItem[field] as number))
      ) {
        if (field === "quantity" || field === "cost_per_unit") {
          setSnackbar({
            open: true,
            message: `Supply item ${
              field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ")
            } must be a valid number greater than zero.`,
            severity: "error",
          });
          return;
        }
      }
    }

    try {
      const isNew = editingSupplyItem.id === 0;
      const url = "https://skizagroundsuite.com/API/supply_items.php" + (isNew ? "" : `?id=${editingSupplyItem.id}`);
      const method = isNew ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSupplyItem),
      });
      const result = await response.json();

      if (result.status === "success") {
        if (isNew) {
          const newSupplyItem = { ...editingSupplyItem, id: result.id || Date.now() };
          setSupplyItems((prev) => [newSupplyItem, ...prev]);
          setSnackbar({ open: true, message: "Supply item added successfully!", severity: "success" });
        } else {
          setSupplyItems((prev) => prev.map((it) => (it.id === editingSupplyItem.id ? editingSupplyItem : it)));
          setSnackbar({ open: true, message: "Supply item updated successfully!", severity: "success" });
        }
      } else {
        setSnackbar({ open: true, message: result.message, severity: "error" });
      }
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Failed to save supply item.", severity: "error" });
    }
    handleCloseSupplyItemDialog();
  };

  const handleDeleteSupplyItem = async (id: number) => {
    try {
      const response = await fetch(`https://skizagroundsuite.com/API/supply_items.php?id=${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();
      if (result.status === "success") {
        setSupplyItems((prev) => prev.filter((item) => item.id !== id));
        setSnackbar({ open: true, message: "Supply item deleted successfully.", severity: "info" });
      } else {
        setSnackbar({ open: true, message: result.message, severity: "error" });
      }
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Failed to delete supply item.", severity: "error" });
    }
  };

// --- Supply Issuance (POS) ---
  const handleOpenIssueSupplyDialog = (item?: SupplyItem) => {
    const defaultItemId = item?.id || (supplyItems.length > 0 ? supplyItems[0].id : "");
    setIssueSupplyForm({
      supply_item_id: String(defaultItemId),
      quantity_issued: "",
      issued_to_team_member: "",
      issued_for_purpose: "",
      notes: "",
      issue_county: "",
      issue_constituency: "",
      issue_ward: "",
      issue_polling_station: "",
    });
    setIssueSupplyDialogOpen(true);
  };

  const handleCloseIssueSupplyDialog = () => {
    setIssueSupplyDialogOpen(false);
    setIssueSupplyForm({
      supply_item_id: "",
      quantity_issued: "",
      issued_to_team_member: "",
      issued_for_purpose: "",
      notes: "",
      issue_county: "",
      issue_constituency: "",
      issue_ward: "",
      issue_polling_station: "",
    });
  };

  const handleIssueSupply = async () => {
    if (
      !issueSupplyForm.supply_item_id ||
      !issueSupplyForm.quantity_issued ||
      !issueSupplyForm.issued_to_team_member ||
      !issueSupplyForm.issued_for_purpose ||
      !issueSupplyForm.issue_county ||
      !issueSupplyForm.issue_constituency ||
      !issueSupplyForm.issue_ward ||
      !issueSupplyForm.issue_polling_station
    ) {
      setSnackbar({
        open: true,
        message: "All required fields for supply issuance, including location, must be filled.",
        severity: "error",
      });
      return;
    }

    const item = supplyItems.find((si) => String(si.id) === issueSupplyForm.supply_item_id);
    if (!item) {
      setSnackbar({
        open: true,
        message: "Selected supply item not found in inventory. Please select a valid item.",
        severity: "error",
      });
      return;
    }

    const quantityToIssue = parseInt(issueSupplyForm.quantity_issued, 10);
    if (isNaN(quantityToIssue) || quantityToIssue <= 0) {
      setSnackbar({ open: true, message: "Quantity to issue must be a positive number.", severity: "error" });
      return;
    }

    if (quantityToIssue > item.quantity) {
      setSnackbar({
        open: true,
        message: `Cannot issue ${quantityToIssue} ${item.unit}(s). Only ${item.quantity} ${item.unit}(s) available.`,
        severity: "error",
      });
      return;
    }

    try {
      const response = await fetch("https://skizagroundsuite.com/API/add_supply_issuance.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supply_item_id: Number(issueSupplyForm.supply_item_id),
          quantity_issued: quantityToIssue,
          issued_to_team_member: issueSupplyForm.issued_to_team_member,
          issued_for_purpose: issueSupplyForm.issued_for_purpose,
          notes: issueSupplyForm.notes,
          issue_county: issueSupplyForm.issue_county,
          issue_constituency: issueSupplyForm.issue_constituency,
          issue_ward: issueSupplyForm.issue_ward,
          issue_polling_station: issueSupplyForm.issue_polling_station,
        }),
      });
      const result = await response.json();

      if (result.status === "success") {
        const newIssuance: SupplyIssuance = {
          id: result.id || Date.now(),
          supply_item_id: Number(issueSupplyForm.supply_item_id),
          item_name: item.item_name,
          quantity_issued: quantityToIssue,
          issued_to_team_member: issueSupplyForm.issued_to_team_member,
          issued_for_purpose: issueSupplyForm.issued_for_purpose,
          issue_date: new Date().toISOString().split("T")[0],
          notes: issueSupplyForm.notes,
          issue_county: issueSupplyForm.issue_county,
          issue_constituency: issueSupplyForm.issue_constituency,
          issue_ward: issueSupplyForm.issue_ward,
          issue_polling_station: issueSupplyForm.issue_polling_station,
        };

        setSupplyIssuances((prev) => [newIssuance, ...prev]);

        // Update local stock immediately
        setSupplyItems((prev) =>
          prev.map((si) => (si.id === item.id ? { ...si, quantity: si.quantity - quantityToIssue } : si))
        );

        setSnackbar({ open: true, message: "Supply issued successfully!", severity: "success" });
        handleCloseIssueSupplyDialog();
      } else {
        setSnackbar({ open: true, message: result.message, severity: "error" });
      }
    } catch (error) {
      console.error(error);
      setSnackbar({
        open: true,
        message: "Failed to issue supply. Please check your network or API.",
        severity: "error",
      });
    }
  };
// SECTION 3 — RegisteredVendors.tsx (Part 3/3)
// --- Filters ---
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) =>
      `${v.vendor_name} ${v.category} ${v.contact_person} ${v.email} ${v.phone_number} ${v.address} ${v.county} ${v.constituency} ${v.ward} ${v.polling_station}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  }, [vendors, searchQuery]);

  const filteredSupplyItems = useMemo(() => {
    return supplyItems.filter((item) =>
      `${item.item_name} ${item.description ?? ""} ${item.vendor_name} ${item.location_in_storage ?? ""}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  }, [supplyItems, searchQuery]);

  const filteredSupplyIssuances = useMemo(() => {
    return supplyIssuances.filter((issuance) =>
      `${issuance.item_name} ${issuance.issued_to_team_member} ${issuance.issued_for_purpose} ${issuance.issue_county} ${issuance.issue_constituency} ${issuance.issue_ward} ${issuance.issue_polling_station}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  }, [supplyIssuances, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 pb-10">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">📦 Campaign Logistics & Supplies</h1>
        <div className="flex space-x-2">
          <Button variant="contained" startIcon={<Plus />} onClick={() => handleOpenSupplyItemDialog()}>
            Add Supply Item
          </Button>
          <Button variant="contained" startIcon={<Plus />} onClick={() => handleOpenVendorDialog()}>
            Add Vendor
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 4 }}>
        <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} aria-label="campaign logistics tabs">
          <Tab label="Vendors" />
          <Tab label="Supply Inventory" />
          <Tab label="Issue Supplies (POS)" />
          <Tab label="Issuance History" />
        </Tabs>
      </Box>

      {/* Vendors Tab */}
      {currentTab === 0 && (
        <>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Users className="text-blue-500" size={18} />
              <span>Total Vendors:</span>
              <span className="font-semibold text-base"><CountUp end={vendors.length} duration={1.5} /></span>
            </div>
            <TextField
              label="Search vendors..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64"
            />
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-16"><CircularProgress /></div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {filteredVendors.length > 0 ? (
                filteredVendors.map((vendor) => (
                  <motion.div
                    key={vendor.id}
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h2 className="font-semibold text-lg text-gray-800 dark:text-white">{vendor.vendor_name}</h2>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            vendor.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : vendor.status === "Suspended"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {vendor.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                        <p><strong>Category:</strong> {vendor.category}</p>
                        <p><strong>Contact:</strong> {vendor.contact_person}</p>
                        <p><strong>Email:</strong> {vendor.email}</p>
                        <p><strong>Phone:</strong> {vendor.phone_number}</p>
                        <p><strong>Address:</strong> {vendor.address}</p>
                        {vendor.county && (
                          <p>
                            <strong>Location:</strong>{" "}
                            {vendor.polling_station ? `${vendor.polling_station}, ` : ""}
                            {vendor.ward ? `${vendor.ward}, ` : ""}
                            {vendor.constituency ? `${vendor.constituency}, ` : ""}
                            {vendor.county}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <Tooltip title="Add Bank Account">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => setExpandedBankVendorId(expandedBankVendorId === vendor.id ? null : vendor.id)}
                        >
                          <Banknote size={20} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Vendor">
                        <IconButton size="small" color="info" onClick={() => handleOpenVendorDialog(vendor)}>
                          <Edit2 size={20} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Vendor">
                        <IconButton size="small" color="error" onClick={() => handleDeleteVendor(vendor.id)}>
                          <Trash2 size={20} />
                        </IconButton>
                      </Tooltip>
                    </div>

                    <Collapse in={expandedBankVendorId === vendor.id} className="mt-3">
                      <Box className="border border-gray-200 dark:border-gray-700 p-3 rounded">
                        <Typography variant="subtitle2" className="mb-2">Add Bank Account</Typography>
                        <TextField
                          label="Bank Name"
                          value={bankAccountForm.bank_name}
                          onChange={(e) => setBankAccountForm({ ...bankAccountForm, bank_name: e.target.value })}
                          fullWidth size="small" margin="dense"
                        />
                        <TextField
                          label="Account Number"
                          value={bankAccountForm.account_number}
                          onChange={(e) => setBankAccountForm({ ...bankAccountForm, account_number: e.target.value })}
                          fullWidth size="small" margin="dense"
                        />
                        <TextField
                          label="Account Name"
                          value={bankAccountForm.account_name}
                          onChange={(e) => setBankAccountForm({ ...bankAccountForm, account_name: e.target.value })}
                          fullWidth size="small" margin="dense"
                        />
                        <TextField
                          label="Swift Code (Optional)"
                          value={bankAccountForm.swift_code}
                          onChange={(e) => setBankAccountForm({ ...bankAccountForm, swift_code: e.target.value })}
                          fullWidth size="small" margin="dense"
                        />
                        <TextField
                          label="Notes (Optional)"
                          value={bankAccountForm.notes}
                          onChange={(e) => setBankAccountForm({ ...bankAccountForm, notes: e.target.value })}
                          fullWidth size="small" margin="dense" multiline rows={2}
                        />
                        <Button variant="contained" color="primary" size="small" onClick={() => handleAddBankAccount(vendor.id)} className="mt-2">
                          Save Bank Account
                        </Button>
                      </Box>
                    </Collapse>
                  </motion.div>
                ))
              ) : (
                <p className="col-span-full text-center text-gray-500 dark:text-gray-400">No vendors found.</p>
              )}
            </motion.div>
          )}
        </>
      )}

      {/* Supply Inventory Tab */}
      {currentTab === 1 && (
        <>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Package className="text-blue-500" size={18} />
              <span>Total Supply Items:</span>
              <span className="font-semibold text-base"><CountUp end={supplyItems.length} duration={1.5} /></span>
            </div>
            <TextField
              label="Search supply items..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64"
            />
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-16"><CircularProgress /></div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {filteredSupplyItems.length > 0 ? (
                filteredSupplyItems.map((item) => (
                  <motion.div
                    key={item.id}
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col justify-between"
                  >
                    <div>
                      <h2 className="font-semibold text-lg text-gray-800 dark:text-white mb-2">{item.item_name}</h2>
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                        <p><strong>Vendor:</strong> {item.vendor_name}</p>
                        <p><strong>Current Stock:</strong> {item.quantity} {item.unit}</p>
                        <p><strong>Cost/Unit:</strong> KES {item.cost_per_unit.toLocaleString()}</p>
                        <p><strong>Date Acquired:</strong> {item.date_acquired}</p>
                        {item.location_in_storage && <p><strong>Location:</strong> {item.location_in_storage}</p>}
                        {item.description && <p><strong>Description:</strong> {item.description}</p>}
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <Tooltip title="Issue Supply">
                        <IconButton size="small" color="primary" onClick={() => handleOpenIssueSupplyDialog(item)}>
                          <Send size={20} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Supply Item">
                        <IconButton size="small" color="info" onClick={() => handleOpenSupplyItemDialog(item)}>
                          <Edit2 size={20} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Supply Item">
                        <IconButton size="small" color="error" onClick={() => handleDeleteSupplyItem(item.id)}>
                          <Trash2 size={20} />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="col-span-full text-center text-gray-500 dark:text-gray-400">No supply items found.</p>
              )}
            </motion.div>
          )}
        </>
      )}

      {/* Issue Supplies (POS) */}
      {currentTab === 2 && (
        <>
          <div className="flex justify-between items-center mb-4">
            <Typography variant="h6" className="text-gray-800 dark:text-white">Issue New Supply</Typography>
            <Button variant="contained" startIcon={<Plus />} onClick={() => handleOpenIssueSupplyDialog()}>
              Start New Issuance
            </Button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <Typography variant="body1" className="text-gray-600 dark:text-gray-300">
              Click "Start New Issuance" to record a supply issue.
            </Typography>
            <Divider className="my-4" />
            <Typography variant="h6" className="text-gray-800 dark:text-white mb-3">Quick Issuance (Last 5)</Typography>
            {supplyIssuances.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {supplyIssuances.slice(0, 5).map((issuance) => (
                  <div key={issuance.id} className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-700">
                    <Typography variant="subtitle1" className="font-semibold text-blue-600 dark:text-blue-400">
                      {issuance.item_name} - {issuance.quantity_issued}{" "}
                      {supplyItems.find((i) => i.id === issuance.supply_item_id)?.unit || "units"}
                    </Typography>
                    <Typography variant="body2" className="text-gray-700 dark:text-gray-200">
                      To: {issuance.issued_to_team_member} for {issuance.issued_for_purpose}
                    </Typography>
                    <Typography variant="caption" className="text-gray-500 dark:text-gray-400">
                      {issuance.issue_date} at {issuance.issue_ward}, {issuance.issue_constituency}, {issuance.issue_county}
                    </Typography>
                  </div>
                ))}
              </div>
            ) : (
              <Typography variant="body2" className="text-gray-500 dark:text-gray-400">
                No recent issuances to display.
              </Typography>
            )}
          </div>
        </>
      )}

      {/* Issuance History */}
      {currentTab === 3 && (
        <>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Send className="text-blue-500" size={18} />
              <span>Total Issuances:</span>
              <span className="font-semibold text-base"><CountUp end={supplyIssuances.length} duration={1.5} /></span>
            </div>
            <TextField
              label="Search issuances..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64"
            />
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-16"><CircularProgress /></div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {filteredSupplyIssuances.length > 0 ? (
                filteredSupplyIssuances.map((issuance) => (
                  <motion.div
                    key={issuance.id}
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
                  >
                    <h2 className="font-semibold text-lg text-gray-800 dark:text-white mb-2">
                      {issuance.item_name} - {issuance.quantity_issued}{" "}
                      {supplyItems.find((si) => si.id === issuance.supply_item_id)?.unit}
                    </h2>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                      <p><strong>Issued To:</strong> {issuance.issued_to_team_member}</p>
                      <p><strong>Purpose:</strong> {issuance.issued_for_purpose}</p>
                      <p><strong>Date:</strong> {issuance.issue_date}</p>
                      <p>
                        <strong>Location:</strong>{" "}
                        {issuance.issue_polling_station ? `${issuance.issue_polling_station}, ` : ""}
                        {issuance.issue_ward ? `${issuance.issue_ward}, ` : ""}
                        {issuance.issue_constituency ? `${issuance.issue_constituency}, ` : ""}
                        {issuance.issue_county}
                      </p>
                      {issuance.notes && <p><strong>Notes:</strong> {issuance.notes}</p>}
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="col-span-full text-center text-gray-500 dark:text-gray-400">No supply issuances found.</p>
              )}
            </motion.div>
          )}
        </>
      )}

      {/* Vendor Dialog */}
      <Dialog open={vendorDialogOpen} onClose={handleCloseVendorDialog} fullWidth maxWidth="md">
        <DialogTitle>{editingVendor?.id === 0 ? "Add New Vendor" : "Edit Vendor"}</DialogTitle>
        <DialogContent dividers>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Vendor Name"
              value={editingVendor?.vendor_name || ""}
              onChange={(e) => setEditingVendor({ ...editingVendor!, vendor_name: e.target.value })}
              fullWidth margin="normal"
            />
            <TextField
              label="Category"
              select
              value={editingVendor?.category || categoryOptions[0]}
              onChange={(e) => setEditingVendor({ ...editingVendor!, category: e.target.value })}
              fullWidth margin="normal"
            >
              {categoryOptions.map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Contact Person"
              value={editingVendor?.contact_person || ""}
              onChange={(e) => setEditingVendor({ ...editingVendor!, contact_person: e.target.value })}
              fullWidth margin="normal"
            />
            <TextField
              label="Email"
              type="email"
              value={editingVendor?.email || ""}
              onChange={(e) => setEditingVendor({ ...editingVendor!, email: e.target.value })}
              fullWidth margin="normal"
            />
            <TextField
              label="Phone Number"
              value={editingVendor?.phone_number || ""}
              onChange={(e) => setEditingVendor({ ...editingVendor!, phone_number: e.target.value })}
              fullWidth margin="normal"
            />
            <TextField
              label="Address"
              value={editingVendor?.address || ""}
              onChange={(e) => setEditingVendor({ ...editingVendor!, address: e.target.value })}
              fullWidth margin="normal"
            />
            <TextField
              label="Status"
              select
              value={editingVendor?.status || "Active"}
              onChange={(e) => setEditingVendor({ ...editingVendor!, status: e.target.value as Vendor["status"] })}
              fullWidth margin="normal"
            >
              {statusOptions.map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Rating (1-5)"
              type="number"
              value={editingVendor?.rating ?? 0}
              onChange={(e) =>
                setEditingVendor({
                  ...editingVendor!,
                  rating: Math.max(0, Math.min(5, Number(e.target.value))),
                })
              }
              fullWidth margin="normal" inputProps={{ min: 0, max: 5 }}
            />
            <TextField
              label="Notes"
              value={editingVendor?.notes || ""}
              onChange={(e) => setEditingVendor({ ...editingVendor!, notes: e.target.value })}
              fullWidth margin="normal" multiline rows={2} className="md:col-span-2"
            />
            <Divider className="md:col-span-2 my-2" />
            <Typography variant="h6" className="md:col-span-2 mt-2">Geographical Information</Typography>

            {/* County */}
            <Autocomplete<string, false, true, true>
              options={allCounties}
              freeSolo
              clearOnEscape
              value={editingVendor?.county ?? ""} // FIX: never null when disableClearable=true
              onChange={(_, newValue) =>
                setEditingVendor((prev) => ({
                  ...prev!,
                  county: (newValue ?? "").toString(),
                  constituency: "",
                  ward: "",
                  polling_station: "",
                }))
              }
              renderInput={(params) => <TextField {...params} label="County" margin="normal" fullWidth required />}
            />

            {/* Constituency */}
            <Autocomplete<string, false, true, true>
              options={allConstituencies}
              freeSolo
              clearOnEscape
              value={editingVendor?.constituency ?? ""}
              onChange={(_, newValue) =>
                setEditingVendor((prev) => ({
                  ...prev!,
                  constituency: (newValue ?? "").toString(),
                  ward: "",
                  polling_station: "",
                }))
              }
              renderInput={(params) => <TextField {...params} label="Constituency" margin="normal" fullWidth required />}
            />

            {/* Ward */}
            <Autocomplete<string, false, true, true>
              options={allWards}
              freeSolo
              clearOnEscape
              value={editingVendor?.ward ?? ""}
              onChange={(_, newValue) =>
                setEditingVendor((prev) => ({
                  ...prev!,
                  ward: (newValue ?? "").toString(),
                  polling_station: "",
                }))
              }
              renderInput={(params) => <TextField {...params} label="Ward" margin="normal" fullWidth />}
            />

            {/* Polling Station */}
            <Autocomplete<string, false, true, true>
              options={allPollingStations}
              freeSolo
              clearOnEscape
              value={editingVendor?.polling_station ?? ""}
              onChange={(_, newValue) =>
                setEditingVendor((prev) => ({
                  ...prev!,
                  polling_station: (newValue ?? "").toString(),
                }))
              }
              renderInput={(params) => <TextField {...params} label="Polling Station" margin="normal" fullWidth />}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseVendorDialog} color="secondary">Cancel</Button>
          <Button onClick={handleSaveVendor} color="primary" variant="contained">Save Vendor</Button>
        </DialogActions>
      </Dialog>

      {/* Supply Item Dialog */}
      <Dialog open={supplyItemDialogOpen} onClose={handleCloseSupplyItemDialog} fullWidth maxWidth="md">
        <DialogTitle>{editingSupplyItem?.id === 0 ? "Add New Supply Item" : "Edit Supply Item"}</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Item Name"
            value={editingSupplyItem?.item_name || ""}
            onChange={(e) => setEditingSupplyItem({ ...editingSupplyItem!, item_name: e.target.value })}
            fullWidth margin="normal" required
          />
          <TextField
            label="Vendor"
            select
            value={editingSupplyItem?.vendor_id || (vendors.length > 0 ? vendors[0].id : "")}
            onChange={(e) => {
              const vid = Number(e.target.value);
              const selectedVendor = vendors.find((v) => v.id === vid);
              setEditingSupplyItem({
                ...editingSupplyItem!,
                vendor_id: vid,
                vendor_name: selectedVendor ? selectedVendor.vendor_name : "",
              });
            }}
            fullWidth margin="normal" required disabled={vendors.length === 0}
          >
            {vendors.map((vendor) => (
              <MenuItem key={vendor.id} value={vendor.id}>{vendor.vendor_name}</MenuItem>
            ))}
          </TextField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Quantity"
              type="number"
              value={editingSupplyItem?.quantity || 0}
              onChange={(e) => setEditingSupplyItem({ ...editingSupplyItem!, quantity: Number(e.target.value) })}
              fullWidth margin="normal" required inputProps={{ min: 0 }}
            />
            <TextField
              label="Unit"
              select
              value={editingSupplyItem?.unit || unitOptions[0]}
              onChange={(e) => setEditingSupplyItem({ ...editingSupplyItem!, unit: e.target.value })}
              fullWidth margin="normal" required
            >
              {unitOptions.map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </TextField>
          </div>

          <TextField
            label="Cost Per Unit (KES)"
            type="number"
            value={editingSupplyItem?.cost_per_unit || 0}
            onChange={(e) => setEditingSupplyItem({ ...editingSupplyItem!, cost_per_unit: Number(e.target.value) })}
            fullWidth margin="normal" required inputProps={{ min: 0 }}
          />
          <TextField
            label="Date Acquired"
            type="date"
            value={editingSupplyItem?.date_acquired || ""}
            onChange={(e) => setEditingSupplyItem({ ...editingSupplyItem!, date_acquired: e.target.value })}
            fullWidth margin="normal" InputLabelProps={{ shrink: true }} required
          />
          <TextField
            label="Location in Storage (Optional)"
            value={editingSupplyItem?.location_in_storage || ""}
            onChange={(e) => setEditingSupplyItem({ ...editingSupplyItem!, location_in_storage: e.target.value })}
            fullWidth margin="normal"
          />
          <TextField
            label="Description (Optional)"
            value={editingSupplyItem?.description || ""}
            onChange={(e) => setEditingSupplyItem({ ...editingSupplyItem!, description: e.target.value })}
            fullWidth margin="normal" multiline rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSupplyItemDialog} color="secondary">Cancel</Button>
          <Button onClick={handleSaveSupplyItem} color="primary" variant="contained">Save Supply Item</Button>
        </DialogActions>
      </Dialog>

      {/* Issue Supply Dialog */}
      <Dialog open={issueSupplyDialogOpen} onClose={handleCloseIssueSupplyDialog} fullWidth maxWidth="md">
        <DialogTitle>Issue Supply</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Select Item to Issue"
            select
            value={issueSupplyForm.supply_item_id}
            onChange={(e) => setIssueSupplyForm({ ...issueSupplyForm, supply_item_id: e.target.value })}
            fullWidth margin="normal" required disabled={supplyItems.length === 0}
          >
            {supplyItems.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.item_name} (Current Stock: {item.quantity} {item.unit})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Quantity to Issue"
            type="number"
            value={issueSupplyForm.quantity_issued}
            onChange={(e) => setIssueSupplyForm({ ...issueSupplyForm, quantity_issued: e.target.value })}
            fullWidth margin="normal" required inputProps={{ min: 1 }}
          />

          <TextField
            label="Issued To (Team Member Name)"
            value={issueSupplyForm.issued_to_team_member}
            onChange={(e) => setIssueSupplyForm({ ...issueSupplyForm, issued_to_team_member: e.target.value })}
            fullWidth margin="normal" required
          />

          <TextField
            label="Purpose of Issuance (e.g., Rally in Makueni, Office Use)"
            value={issueSupplyForm.issued_for_purpose}
            onChange={(e) => setIssueSupplyForm({ ...issueSupplyForm, issued_for_purpose: e.target.value })}
            fullWidth margin="normal" required
          />

          <TextField
            label="Notes (Optional)"
            value={issueSupplyForm.notes}
            onChange={(e) => setIssueSupplyForm({ ...issueSupplyForm, notes: e.target.value })}
            fullWidth margin="normal" multiline rows={2}
          />

          <Divider className="my-2" />
          <Typography variant="h6" className="mt-2">Issuance Location</Typography>

          {/* Issue County */}
          <Autocomplete<string, false, true, true>
            options={allCounties}
            freeSolo
            clearOnEscape
            value={issueSupplyForm.issue_county || ""} // FIX
            onChange={(_, newValue) =>
              setIssueSupplyForm((prev) => ({
                ...prev,
                issue_county: (newValue ?? "").toString(),
                issue_constituency: "",
                issue_ward: "",
                issue_polling_station: "",
              }))
            }
            renderInput={(params) => <TextField {...params} label="Issue County" margin="normal" fullWidth required />}
          />

          {/* Issue Constituency */}
          <Autocomplete<string, false, true, true>
            options={allConstituencies}
            freeSolo
            clearOnEscape
            value={issueSupplyForm.issue_constituency || ""} // FIX
            onChange={(_, newValue) =>
              setIssueSupplyForm((prev) => ({
                ...prev,
                issue_constituency: (newValue ?? "").toString(),
                issue_ward: "",
                issue_polling_station: "",
              }))
            }
            renderInput={(params) => <TextField {...params} label="Issue Constituency" margin="normal" fullWidth required />}
          />

          {/* Issue Ward */}
          <Autocomplete<string, false, true, true>
            options={allWards}
            freeSolo
            clearOnEscape
            value={issueSupplyForm.issue_ward || ""} // FIX
            onChange={(_, newValue) =>
              setIssueSupplyForm((prev) => ({
                ...prev,
                issue_ward: (newValue ?? "").toString(),
                issue_polling_station: "",
              }))
            }
            renderInput={(params) => <TextField {...params} label="Issue Ward" margin="normal" fullWidth required />}
          />

          {/* Issue Polling Station */}
          <Autocomplete<string, false, true, true>
            options={allPollingStations}
            freeSolo
            clearOnEscape
            value={issueSupplyForm.issue_polling_station || ""} // FIX
            onChange={(_, newValue) =>
              setIssueSupplyForm((prev) => ({
                ...prev,
                issue_polling_station: (newValue ?? "").toString(),
              }))
            }
            renderInput={(params) => <TextField {...params} label="Issue Polling Station" margin="normal" fullWidth required />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseIssueSupplyDialog} color="secondary">Cancel</Button>
          <Button onClick={handleIssueSupply} color="primary" variant="contained">Issue Supply</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default RegisteredVendors;
