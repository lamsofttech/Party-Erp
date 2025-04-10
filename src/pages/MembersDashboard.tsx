import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  ChartContainer,
  BarPlot,
  ChartsYAxis,
  ChartsXAxis,
  ChartsTooltip,
  ChartsLegend
} from "@mui/x-charts";
import { 
  Users, 
  UserCheck, 
  UserCog, 
  UserX, 
  KeyRound, 
  FileSignature,
  ArrowUpRight
} from "lucide-react";

export interface MembersCountResponse {
  status: string;
  message: string;
  total_members: number;
  total_pending_members: number;
  total_pending_applicants: number;
  paid_program_contribution_members: number;
  total_withdrawn_members: number;
  total_access_requests: number;
  total_unsigned_contracts: number;
  members_by_country: {
    Kenya: number;
    Zimbabwe: number;
    Uganda: number;
    "Other Countries": number;
  };
  pending_members_by_country: {
    Kenya: number;
    Zimbabwe: number;
    Uganda: number;
    "Other Countries": number;
  };
  pending_applicants_by_country: {
    Kenya: number;
    Zimbabwe: number;
    Uganda: number;
    "Other Countries": number;
  };
  withdrawn_members_by_country: {
    Kenya: number;
    Zimbabwe: number;
    Uganda: number;
    "Other Countries": number;
  };
  access_requests_by_country: {
    Kenya: number;
    Zimbabwe: number;
    Uganda: number;
    "Other Countries": number;
  };
  unsigned_contracts_by_country: {
    Kenya: number;
    Zimbabwe: number;
    Uganda: number;
    "Other Countries": number;
  };
}

// Card type definition
interface CardProps {
  title: string;
  count: number | undefined;
  icon: React.ReactNode;
  link: string;
  color: string;
}

// Stat Card Component
const StatCard = ({ title, count, icon, link, color }: CardProps) => (
  <Link to={link} className="group">
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl relative overflow-hidden hover:translate-y-1 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</span>
          <span className="text-3xl font-bold text-gray-800 dark:text-white">{count}</span>
        </div>
        <div className={`p-3 rounded-lg bg-opacity-10 ${color.replace('border-', 'bg-')}`}>
          {icon}
        </div>
      </div>
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <ArrowUpRight size={16} className="text-gray-500" />
      </div>
    </div>
  </Link>
);

function MembersDashboard() {
  const [data, setData] = useState<MembersCountResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Chart data preparation
  const prepareChartData = () => {
    if (!data) return [];
    
    return [
      { country: "Kenya", FM: data.members_by_country.Kenya, PM: data.pending_members_by_country.Kenya, PA: data.pending_applicants_by_country.Kenya, W: data.withdrawn_members_by_country.Kenya, AR: data.access_requests_by_country.Kenya, UC: data.unsigned_contracts_by_country.Kenya },
      { country: "Zimbabwe", FM: data.members_by_country.Zimbabwe, PM: data.pending_members_by_country.Zimbabwe, PA: data.pending_applicants_by_country.Zimbabwe, W: data.withdrawn_members_by_country.Zimbabwe, AR: data.access_requests_by_country.Zimbabwe, UC: data.unsigned_contracts_by_country.Zimbabwe },
      { country: "Uganda", FM: data.members_by_country.Uganda, PM: data.pending_members_by_country.Uganda, PA: data.pending_applicants_by_country.Uganda, W: data.withdrawn_members_by_country.Uganda, AR: data.access_requests_by_country.Uganda, UC: data.unsigned_contracts_by_country.Uganda },
      { country: "Others", FM: data.members_by_country["Other Countries"], PM: data.pending_members_by_country["Other Countries"], PA: data.pending_applicants_by_country["Other Countries"], W: data.withdrawn_members_by_country["Other Countries"], AR: data.access_requests_by_country["Other Countries"], UC: data.unsigned_contracts_by_country["Other Countries"] },
    ];
  };

  // Card data
  const cardData: CardProps[] = [
    {
      title: "Full Members",
      count: data?.total_members,
      icon: <Users size={24} className="text-emerald-600" />,
      link: "/members/full-members",
      color: "border-emerald-500"
    },
    {
      title: "Pending Members",
      count: data?.total_pending_members,
      icon: <UserCheck size={24} className="text-blue-600" />,
      link: "/members/pending-members",
      color: "border-blue-500"
    },
    {
      title: "Pending Applicants",
      count: data?.total_pending_applicants,
      icon: <UserCog size={24} className="text-amber-600" />,
      link: "/members/pending-applicants",
      color: "border-amber-500"
    },
    {
      title: "Withdrawn Members",
      count: data?.total_withdrawn_members,
      icon: <UserX size={24} className="text-gray-600" />,
      link: "/members/withdrawn-members",
      color: "border-gray-500"
    },
    {
      title: "Access Requests",
      count: data?.total_access_requests,
      icon: <KeyRound size={24} className="text-violet-600" />,
      link: "/members/access-requests",
      color: "border-violet-500"
    },
    {
      title: "Unsigned Contracts",
      count: data?.total_unsigned_contracts,
      icon: <FileSignature size={24} className="text-rose-600" />,
      link: "/members/unsigned-contracts",
      color: "border-rose-500"
    }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get<MembersCountResponse>(
          "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/members/APIs/stats.php"
        );
        setData(response.data);
      } catch (err) {
        setError("Failed to fetch data. Please refresh page and contact the tech team if the issue persists.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-t-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 my-6">
        <p className="text-red-600 dark:text-red-400 text-center">{error}</p>
      </div>
    );
  }

  const chartData = prepareChartData();
  
  return (
    <main className="container mx-auto px-4 pb-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-4">
          <div className="w-1 h-8 bg-gradient-to-b from-[#1a9970] to-[#2164a6] rounded"></div>
          Members Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Overview of all member categories and their distribution by country
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Statistics Cards Section */}
        <div className="xl:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cardData.map((card, index) => (
              <StatCard
                key={index}
                title={card.title}
                count={card.count}
                icon={card.icon}
                link={card.link}
                color={card.color}
              />
            ))}
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Member Distribution</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Kenya</span>
              <span className="text-sm font-medium text-gray-800 dark:text-white">{data?.members_by_country.Kenya || 0}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-[#1a9970] to-[#2164a6] h-2 rounded-full" 
                style={{ width: `${data ? (data.members_by_country.Kenya / data.total_members) * 100 : 0}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Zimbabwe</span>
              <span className="text-sm font-medium text-gray-800 dark:text-white">{data?.members_by_country.Zimbabwe || 0}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-[#1a9970] to-[#2164a6] h-2 rounded-full" 
                style={{ width: `${data ? (data.members_by_country.Zimbabwe / data.total_members) * 100 : 0}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Uganda</span>
              <span className="text-sm font-medium text-gray-800 dark:text-white">{data?.members_by_country.Uganda || 0}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-[#1a9970] to-[#2164a6] h-2 rounded-full" 
                style={{ width: `${data ? (data.members_by_country.Uganda / data.total_members) * 100 : 0}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Other Countries</span>
              <span className="text-sm font-medium text-gray-800 dark:text-white">{data?.members_by_country["Other Countries"] || 0}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-[#1a9970] to-[#2164a6] h-2 rounded-full" 
                style={{ width: `${data ? (data.members_by_country["Other Countries"] / data.total_members) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Country Distribution by Member Type</h3>
        <div className="h-96">
          <ChartContainer
            width={1000}
            height={400}
            series={[
              {
                type: 'bar',
                data: chartData.map(item => item.FM || 0),
                label: 'Full Members',
                color: '#1a9970',
                valueFormatter: (value) => `${value} members`,
              },
              {
                type: 'bar',
                data: chartData.map(item => item.PM || 0),
                label: 'Pending Members',
                color: '#2164a6',
                valueFormatter: (value) => `${value} members`,
              },
              {
                type: 'bar',
                data: chartData.map(item => item.PA || 0),
                label: 'Pending Applicants',
                color: '#f59e0b',
                valueFormatter: (value) => `${value} applicants`,
              },
              {
                type: 'bar',
                data: chartData.map(item => item.W || 0),
                label: 'Withdrawals',
                color: '#6b7280',
                valueFormatter: (value) => `${value} members`,
              },
              {
                type: 'bar',
                data: chartData.map(item => item.AR || 0),
                label: 'Access Requests',
                color: '#8b5cf6',
                valueFormatter: (value) => `${value} requests`,
              },
              {
                type: 'bar',
                data: chartData.map(item => item.UC || 0),
                label: 'Unsigned Contracts',
                color: '#ef4444',
                valueFormatter: (value) => `${value} contracts`,
              },
            ]}
            xAxis={[
              {
                data: chartData.map(item => item.country),
                scaleType: 'band',
                id: 'x-axis-id',
              },
            ]}
          >
            <BarPlot />
            <ChartsXAxis label="Countries" position="bottom" axisId="x-axis-id" />
            <ChartsYAxis label="Number of Members" position="left" />
            <ChartsTooltip trigger="item" />
            <ChartsLegend />
          </ChartContainer>
        </div>
      </div>
    </main>
  );
}

export default MembersDashboard;