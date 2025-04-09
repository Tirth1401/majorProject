import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Wallet, ArrowUpRight, ArrowDownRight, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface Expense {
  id: string;
  group_id: string;
  title: string;
  amount: number;
  paid_by: string;
  split_type: 'equal' | 'custom';
  split_details: { member: string; amount: number }[] | null;
  group: {
    name: string;
    members: string[];
  };
  created_at: string;
  settled: boolean;
}

interface MonthlyData {
  name: string;
  amount: number;
}

interface RecentExpense {
  title: string;
  amount: number;
  groupName: string;
  date: string;
}

interface Settlement {
  name: string;
  amount: number;
  type: 'owed' | 'owing';
}

export function DashboardPage() {
  const { user, profile } = useAuthStore();
  const [groupCount, setGroupCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [youOwe, setYouOwe] = useState<number>(0);
  const [youreOwed, setYoureOwed] = useState<number>(0);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<RecentExpense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time part for comparison
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      const diffTime = Math.abs(today.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays} days ago`;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !profile) {
        setIsLoading(true);
        return;
      }
      
      const currentUserIdentifier = profile.display_name || user.id;

      setIsLoading(true);
      try {
        const { count, error: countError } = await supabase
          .from('groups')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', user.id);

        if (countError) throw countError;
        setGroupCount(count || 0);

        const { data: expenses, error: expensesError } = await supabase
          .from('expenses')
          .select(`
            *,
            group:groups (
              name,
              members
            )
          `)
          .eq('created_by', user.id)
          .order('created_at', { ascending: false });

        if (expensesError) throw expensesError;

        const recent = expenses?.slice(0, 3).map(expense => ({
          title: expense.title,
          amount: expense.amount,
          groupName: expense.group.name,
          date: formatDate(expense.created_at)
        })) || [];

        setRecentExpenses(recent);

        const memberBalances = new Map<string, number>();

        expenses?.forEach((expense: Expense) => {
          if (expense.settled) return; // Skip settled expenses

          console.log("Processing Expense:", expense.title, {
            paid_by: expense.paid_by,
            currentUser: currentUserIdentifier,
            groupMembers: expense.group.members,
            splitType: expense.split_type,
            splitDetails: expense.split_details,
          });

          const isPayer = expense.paid_by === currentUserIdentifier;
          const memberCount = expense.group.members.length;

          if (expense.split_type === 'equal') {
            const share = expense.amount / memberCount;
            
            expense.group.members.forEach(member => {
              if (member.trim() === currentUserIdentifier.trim()) {
                console.log(`  Equal Split: Skipping current user (${currentUserIdentifier})`);
                return;
              }

              const currentBalance = memberBalances.get(member.trim()) || 0;
              
              if (isPayer) {
                memberBalances.set(member.trim(), currentBalance + share);
                console.log(`  Equal Split: ${member.trim()} owes ${share} to payer (${currentUserIdentifier}). New balance for ${member.trim()}: ${currentBalance + share}`);
              } else if (expense.paid_by.trim() === member.trim()) {
                memberBalances.set(member.trim(), currentBalance - share);
                console.log(`  Equal Split: Payer (${expense.paid_by}) is owed ${share} by ${currentUserIdentifier}. New balance for ${member.trim()}: ${currentBalance - share}`);
              }
            });
          } else if (expense.split_details) {
            if (isPayer) {
              expense.split_details.forEach(split => {
                if (split.member.trim() !== currentUserIdentifier.trim()) {
                  const memberName = split.member.trim();
                  const currentBalance = memberBalances.get(memberName) || 0;
                  memberBalances.set(memberName, currentBalance + split.amount);
                  console.log(`  Custom Split (User Paid): ${memberName} owes ${split.amount} to user (${currentUserIdentifier}). New balance for ${memberName}: ${currentBalance + split.amount}`);
                } else {
                   console.log(`  Custom Split (User Paid): Skipping self (${currentUserIdentifier}) in split details`);
                }
              });
            } else {
              const payerName = expense.paid_by.trim();
              expense.split_details.forEach(split => {
                if (split.member.trim() === currentUserIdentifier.trim()) {
                  const currentBalance = memberBalances.get(payerName) || 0;
                  memberBalances.set(payerName, currentBalance - split.amount);
                  console.log(`  Custom Split (Other Paid): User (${currentUserIdentifier}) owes ${split.amount} to payer (${payerName}). New balance for ${payerName}: ${currentBalance - split.amount}`);
                }
              });
            }
          }
        });

        const settlementsArray: Settlement[] = [];
        let totalOwe = 0;
        let totalOwed = 0;

        memberBalances.forEach((amount, name) => {
          if (amount !== 0) {
            settlementsArray.push({
              name,
              amount: Math.abs(amount),
              type: amount > 0 ? 'owed' : 'owing'
            });

            if (amount > 0) {
              totalOwed += amount;
            } else {
              totalOwe += Math.abs(amount);
            }
          }
        });

        settlementsArray.sort((a, b) => b.amount - a.amount);

        setSettlements(settlementsArray);
        setYouOwe(totalOwe);
        setYoureOwed(totalOwed);

        const monthlyExpenses = new Map<string, number>();
        const monthNames = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];

        monthNames.forEach(month => {
          monthlyExpenses.set(month, 0);
        });

        expenses?.forEach((expense: Expense) => {
          const expenseDate = new Date(expense.created_at);
          const monthName = monthNames[expenseDate.getMonth()];
          const currentTotal = monthlyExpenses.get(monthName) || 0;
          monthlyExpenses.set(monthName, currentTotal + expense.amount);
        });

        const monthlyDataArray = monthNames.map(month => ({
          name: month,
          amount: monthlyExpenses.get(month) || 0
        }));

        setMonthlyData(monthlyDataArray);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, profile]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="relative space-y-6 max-w-7xl mx-auto pb-12">
      {profile?.display_name && (
        <div className="absolute top-0 right-0 mt-4 mr-4 sm:mr-0 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
          Welcome, {profile.display_name}!
        </div>
      )}
      <h1 className="text-2xl font-bold text-gray-900 px-4 sm:px-0 pt-4">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 sm:px-0">
        <Link to="/expenses" className="transition-transform hover:scale-105">
          <StatCard
            title="Total Balance"
            value={formatCurrency(youreOwed - youOwe)}
            icon={<Wallet className="text-green-600" />}
            trend={youreOwed - youOwe >= 0 ? "+" : "-"}
            trendUp={youreOwed - youOwe >= 0}
          />
        </Link>
        <Link to="/expenses" className="transition-transform hover:scale-105">
          <StatCard
            title="You Owe"
            value={formatCurrency(youOwe)}
            icon={<ArrowUpRight className="text-red-600" />}
            trend="-2.4%"
            trendUp={false}
          />
        </Link>
        <Link to="/expenses" className="transition-transform hover:scale-105">
          <StatCard
            title="You're Owed"
            value={formatCurrency(youreOwed)}
            icon={<ArrowDownRight className="text-green-600" />}
            trend="+12.3%"
            trendUp={true}
          />
        </Link>
        <Link to="/groups" className="transition-transform hover:scale-105">
          <StatCard
            title="Active Groups"
            value={isLoading ? "..." : groupCount.toString()}
            icon={<Users className="text-blue-600" />}
            trend="+1"
            trendUp={true}
          />
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-4 sm:p-6 mx-4 sm:mx-0">
        <h2 className="text-lg font-semibold mb-4">Monthly Expenses</h2>
        <div className="h-[300px] sm:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `${label} ${new Date().getFullYear()}`}
              />
              <Bar dataKey="amount" fill="#4F46E5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 sm:px-0">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activities</h2>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-4">Loading activities...</div>
            ) : recentExpenses.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No recent activities</div>
            ) : (
              recentExpenses.map((expense, index) => (
                <Link to="/expenses" key={index}>
                  <ActivityItem
                    title={expense.title}
                    amount={formatCurrency(expense.amount)}
                    group={expense.groupName}
                    date={expense.date}
                  />
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Pending Settlements</h2>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-4">Loading settlements...</div>
            ) : settlements.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No pending settlements</div>
            ) : (
              settlements.map((settlement, index) => (
                <Link to="/expenses" key={index}>
                  <SettlementItem
                    name={settlement.name}
                    amount={formatCurrency(settlement.amount)}
                    type={settlement.type}
                    currentUserDisplayName={profile?.display_name ?? undefined}
                  />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
  trendUp: boolean;
}

function StatCard({ title, value, icon, trend, trendUp }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
          <div className="ml-4">
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-xl sm:text-2xl font-semibold">{value}</p>
          </div>
        </div>
        <div className={`text-sm ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trend}
        </div>
      </div>
    </div>
  );
}

interface ActivityItemProps {
  title: string;
  amount: string;
  group: string;
  date: string;
}

function ActivityItem({ title, amount, group, date }: ActivityItemProps) {
  return (
    <div className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-gray-500">{group}</p>
      </div>
      <div className="text-right">
        <p className="font-medium">{amount}</p>
        <p className="text-sm text-gray-500">{date}</p>
      </div>
    </div>
  );
}

interface SettlementItemProps {
  name: string;
  amount: string;
  type: 'owed' | 'owing';
  currentUserDisplayName?: string;
}

function SettlementItem({ name, amount, type, currentUserDisplayName }: SettlementItemProps) {
  const isCurrentUser = name === currentUserDisplayName;
  return (
    <div className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors">
      <div className="flex items-center">
        <div className={`w-2 h-2 rounded-full ${type === 'owed' ? 'bg-green-500' : 'bg-red-500'} mr-3`} />
        <p className={`font-medium ${isCurrentUser ? 'text-green-600 font-semibold' : ''}`}>
          {name}{isCurrentUser ? ' (You)' : ''}
        </p>
      </div>
      <div className={`font-medium ${type === 'owed' ? 'text-green-600' : 'text-red-600'}`}>
        {type === 'owed' ? '+' : '-'}{amount}
      </div>
    </div>
  );
}