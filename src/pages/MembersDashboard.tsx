// src/pages/MembersDashboard.tsx
import { Link } from "react-router-dom";
import {
  Users,
  UserCheck,
  UserCog,
  UserX,
  KeyRound,
  FileSignature,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { RequirePermission } from "../components/RequirePermission";

// 🔒 Permission required to view this page
const REQUIRED_PERMISSION = "members.dashboard.view";

type TooltipPayloadItem = {
  name?: string | number;
  value?: string | number;
  color?: string;
  fill?: string;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
};

/**
 * ---- Custom Tooltip (Jubilee theme) ----
 * Works across Recharts versions without relying on TooltipProps typings.
 */
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-[#7C1C24] border border-[#FFD700]/70 p-4 rounded-xl shadow-xl">
      <p className="text-lg font-semibold text-[#FFD700] mb-2">
        {String(label ?? "")}
      </p>

      {payload.map((entry, index) => {
        const name = String(entry?.name ?? "");
        const value = String(entry?.value ?? "");
        const color = entry?.color || entry?.fill || "#FFE4E6";

        return (
          <p
            key={`item-${index}`}
            className="text-sm text-rose-50 flex justify-between"
          >
            <span className="font-medium mr-2" style={{ color }}>
              {name}:
            </span>
            <span className="font-bold">{value}</span>
          </p>
        );
      })}
    </div>
  );
};

export default function MembersDashboard() {
  const data = {
    total_members: 3200,
    total_pending_members: 450,
    total_pending_applicants: 180,
    total_withdrawn_members: 95,
    total_access_requests: 140,
    total_unsigned_contracts: 65,
  };

  const chartData = [
    {
      county: "Nairobi",
      "Full Members": 1500,
      "Pending Members": 200,
      "New Applicants": 80,
      Withdrawals: 40,
    },
    {
      county: "Mombasa",
      "Full Members": 800,
      "Pending Members": 120,
      "New Applicants": 50,
      Withdrawals: 25,
    },
    {
      county: "Kisumu",
      "Full Members": 600,
      "Pending Members": 80,
      "New Applicants": 30,
      Withdrawals: 20,
    },
    {
      county: "Nakuru",
      "Full Members": 300,
      "Pending Members": 50,
      "New Applicants": 20,
      Withdrawals: 10,
    },
    {
      county: "Eldoret",
      "Full Members": 250,
      "Pending Members": 40,
      "New Applicants": 15,
      Withdrawals: 5,
    },
    {
      county: "Kakamega",
      "Full Members": 200,
      "Pending Members": 30,
      "New Applicants": 10,
      Withdrawals: 8,
    },
  ];

  const cardData = [
    {
      title: "Approved Members",
      count: data.total_members,
      icon: <Users size={32} className="text-[#F5333F]" />,
      link: "/members/full-members",
      bg: "bg-white",
      border: "border-[#F5333F]/40",
      accent: "text-[#F5333F]",
      description: "Overall active Jubilee Party members.",
    },
    {
      title: "Pending Approvals",
      count: data.total_pending_members,
      icon: <UserCheck size={32} className="text-[#B91C1C]" />,
      link: "/members/pending-members",
      bg: "bg-white",
      border: "border-rose-300/70",
      accent: "text-[#B91C1C]",
      description: "Members awaiting verification and onboarding.",
    },
    {
      title: "New Applicants",
      count: data.total_pending_applicants,
      icon: <UserCog size={32} className="text-[#F97316]" />,
      link: "/members/new-members",
      bg: "bg-white",
      border: "border-amber-300/70",
      accent: "text-[#C05621]",
      description: "Fresh applications coming into the party.",
    },
    {
      title: "Member Withdrawals",
      count: data.total_withdrawn_members,
      icon: <UserX size={32} className="text-[#DC2626]" />,
      link: "/members/withdrawn-members",
      bg: "bg-white",
      border: "border-red-300/80",
      accent: "text-[#DC2626]",
      description: "Records of members who have exited.",
    },
    {
      title: "Access Requests",
      count: data.total_access_requests,
      icon: <KeyRound size={32} className="text-[#FACC15]" />,
      link: "/members/access-requests",
      bg: "bg-white",
      border: "border-yellow-300/80",
      accent: "text-[#CA8A04]",
      description: "Pending requests for system access and roles.",
    },
    {
      title: "Unsigned Contracts",
      count: data.total_unsigned_contracts,
      icon: <FileSignature size={32} className="text-[#DB2777]" />,
      link: "/members/approved-members",
      bg: "bg-white",
      border: "border-pink-300/80",
      accent: "text-[#BE185D]",
      description: "Members whose contracts are pending signature.",
    },
  ];

  return (
    <RequirePermission permission={REQUIRED_PERMISSION}>
      <div className="min-h-screen bg-[#F5333F] text-white p-4 sm:p-6 font-sans antialiased">
        <div className="container mx-auto max-w-6xl space-y-10 sm:space-y-12">
          {/* Header */}
          <header className="text-center pt-6 sm:pt-8 pb-2 sm:pb-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
              Jubilee Party Membership Dashboard
            </h1>
            <p className="text-sm sm:text-base text-red-50/90 mt-3 max-w-2xl mx-auto">
              A real-time overview of Jubilee Party membership, applications and
              grassroots operations across the country.
            </p>
          </header>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
            {cardData.map((card, idx) => (
              <Link
                key={idx}
                to={card.link}
                className={`relative p-5 sm:p-6 rounded-2xl ${card.bg} ${card.border} text-gray-900 shadow-lg 
              hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 group`}
              >
                <div className="absolute inset-0 rounded-2xl opacity-10 pointer-events-none bg-gradient-to-br from-[#F5333F] via-transparent to-[#FBBF24]" />
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="flex justify-between items-start mb-3 sm:mb-4">
                    <div>
                      <h2
                        className={`text-base sm:text-lg font-semibold mb-1 ${card.accent}`}
                      >
                        {card.title}
                      </h2>
                      <p className="text-3xl sm:text-4xl font-extrabold leading-none text-gray-900">
                        {card.count}
                      </p>
                    </div>
                    <div className="p-3 sm:p-4 rounded-full bg-red-50 shadow-inner border border-red-100">
                      {card.icon}
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 flex items-center">
                    {card.description}
                    <ArrowUpRight
                      size={16}
                      className="ml-2 text-[#F5333F] opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Chart */}
          <section className="bg-white/95 rounded-3xl shadow-xl p-5 sm:p-7 border border-red-100">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4 text-[#B91C1C] text-center">
              Membership Distribution by County
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 text-center mb-6 sm:mb-8 max-w-2xl mx-auto">
              Track full members, pending approvals, new applicants and
              withdrawals across key Jubilee strongholds.
            </p>

            <div className="h-[360px] sm:h-[420px] lg:h-[480px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                  barCategoryGap="18%"
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="county"
                    tick={{ fill: "#4B5563", fontSize: 12 }}
                    axisLine={{ stroke: "#D1D5DB" }}
                    tickLine={{ stroke: "#D1D5DB" }}
                  />
                  <YAxis
                    tick={{ fill: "#4B5563", fontSize: 12 }}
                    axisLine={{ stroke: "#D1D5DB" }}
                    tickLine={{ stroke: "#D1D5DB" }}
                    domain={[0, "auto"]}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(245, 51, 63, 0.06)" }}
                    // Cast avoids Recharts typing differences between versions
                    content={(props) => (
                      <CustomTooltip {...(props as unknown as CustomTooltipProps)} />
                    )}
                  />
                  <Legend
                    wrapperStyle={{ color: "#374151", paddingTop: 12 }}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-gray-700 text-xs sm:text-sm">
                        {value}
                      </span>
                    )}
                  />
                  <Bar
                    dataKey="Full Members"
                    fill="#F5333F"
                    radius={[6, 6, 0, 0]}
                    animationDuration={800}
                  />
                  <Bar
                    dataKey="Pending Members"
                    fill="#F97316"
                    radius={[6, 6, 0, 0]}
                    animationDuration={800}
                  />
                  <Bar
                    dataKey="New Applicants"
                    fill="#FACC15"
                    radius={[6, 6, 0, 0]}
                    animationDuration={800}
                  />
                  <Bar
                    dataKey="Withdrawals"
                    fill="#B91C1C"
                    radius={[6, 6, 0, 0]}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Quick Actions + Activity */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pb-6">
            <div className="bg-white/95 rounded-3xl shadow-xl p-6 sm:p-7 border border-red-100">
              <h3 className="text-xl sm:text-2xl font-bold mb-4 text-[#B91C1C]">
                Quick Actions
              </h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    to="/members/add-new"
                    className="flex items-center text-gray-700 hover:text-[#F5333F] transition-colors"
                  >
                    <Users size={20} className="mr-3 text-[#F5333F]" /> Register
                    New Member
                  </Link>
                </li>
                <li>
                  <Link
                    to="/reports"
                    className="flex items-center text-gray-700 hover:text-[#F5333F] transition-colors"
                  >
                    <FileSignature size={20} className="mr-3 text-[#B91C1C]" />{" "}
                    Generate Membership Reports
                  </Link>
                </li>
                <li>
                  <Link
                    to="/settings/members"
                    className="flex items-center text-gray-700 hover:text-[#F5333F] transition-colors"
                  >
                    <UserCog size={20} className="mr-3 text-[#C05621]" /> Manage
                    Member Settings
                  </Link>
                </li>
              </ul>
            </div>

            <div className="bg-white/95 rounded-3xl shadow-xl p-6 sm:p-7 border border-red-100">
              <h3 className="text-xl sm:text-2xl font-bold mb-4 text-[#B91C1C]">
                Recent Activity
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-gray-700">
                <li>
                  <span className="font-semibold text-gray-900">John Doe</span>{" "}
                  submitted a new application (Nairobi)
                  <span className="text-xs text-gray-500 ml-2">5 mins ago</span>
                </li>
                <li>
                  <span className="font-semibold text-gray-900">Jane Smith</span>
                  ’s membership approved (Mombasa)
                  <span className="text-xs text-gray-500 ml-2">1 hour ago</span>
                </li>
                <li>
                  <span className="font-semibold text-gray-900">
                    System Alert:
                  </span>{" "}
                  3 new access requests
                  <span className="text-xs text-gray-500 ml-2">Yesterday</span>
                </li>
                <li>
                  <span className="font-semibold text-gray-900">Admin</span>{" "}
                  updated membership policy
                  <span className="text-xs text-gray-500 ml-2">2 days ago</span>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </RequirePermission>
  );
}
