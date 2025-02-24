import axios from "axios";

const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/members/APIs/get_withdrawn_members.php"; 
const UPDATE_API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/members/APIs/update_withdrawal_status.php"; 

export interface Withdrawal {
  member_no: string;
  fullnames: string;
  email: string;
  package: string;
  date_requested: string;
  status: string;
  country: string;
  date_enrolled: string;
  converted: number;
  total_payments: number;
  total_expenditures: number;
  exchange_rate: number | null;
  rate_text: string;
  refund_amount: number;
}

// Function to get withdrawals
export const getWithdrawals = async (): Promise<Withdrawal[]> => {
  try {
    const response = await axios.get(API_URL);
    console.log(response.data.withdrawals);
    return response.data.withdrawals;
  } catch (error) {
    console.error("Error fetching withdrawals:", error);
    return [];
  }
};

// Function to update withdrawal status
export const updateWithdrawalStatus = async (memberNo: string, status: string) => {
  try {
    const response = await axios.post(UPDATE_API_URL, {
      member_no: memberNo,
      status: status,
    });

    return response.data;
  } catch (error) {
    console.error("Error updating withdrawal status:", error);
    return { error: "Failed to update status" };
  }
};
