import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface PersonalExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  created_at: string;
}

interface CategorySummary {
  category: string;
  total: number;
}

interface MonthlySummary {
  month: string;
  total: number;
}

const EXPENSE_CATEGORIES = [
  'Food',
  'Travel',
  'Utilities',
  'Rent',
  'Entertainment',
  'Shopping',
  'Healthcare',
  'Education',
  'Transportation',
  'Other'
];

export function PersonalExpensesPage() {
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummary[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user]);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('personal_expenses')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);

      // Calculate total expenses
      const total = data?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
      setTotalExpenses(total);

      // Calculate category summaries
      const summaries = data?.reduce((acc: CategorySummary[], expense) => {
        const existingCategory = acc.find(item => item.category === expense.category);
        if (existingCategory) {
          existingCategory.total += expense.amount;
        } else {
          acc.push({ category: expense.category, total: expense.amount });
        }
        return acc;
      }, []) || [];

      setCategorySummaries(summaries);

      // Calculate monthly summaries
      const monthlyData = data?.reduce((acc: MonthlySummary[], expense) => {
        const date = new Date(expense.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        const existingMonth = acc.find(item => item.month === monthName);
        if (existingMonth) {
          existingMonth.total += expense.amount;
        } else {
          acc.push({ month: monthName, total: expense.amount });
        }
        return acc;
      }, []) || [];

      // Sort monthly summaries by date (newest first)
      monthlyData.sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateB.getTime() - dateA.getTime();
      });

      setMonthlySummaries(monthlyData);
    } catch (err) {
      setError('Failed to fetch expenses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!user) {
      setError('You must be logged in to add expenses');
      setIsSubmitting(false);
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      setIsSubmitting(false);
      return;
    }

    if (!category) {
      setError('Please select a category');
      setIsSubmitting(false);
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('personal_expenses')
        .insert({
          title,
          amount: amountNum,
          category,
          user_id: user.id
        });

      if (insertError) throw insertError;

      // Reset form and refresh data
      setTitle('');
      setAmount('');
      setCategory('');
      fetchExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Personal Expenses</h1>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            ${totalExpenses.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500">Total Expenses</div>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Monthly Summary</h2>
        {isLoading ? (
          <div>Loading...</div>
        ) : monthlySummaries.length === 0 ? (
          <div className="text-gray-500">No expenses recorded yet</div>
        ) : (
          <div className="grid gap-4">
            {monthlySummaries.map((summary) => (
              <div
                key={summary.month}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-md"
              >
                <span className="font-medium">{summary.month}</span>
                <span className="text-blue-600 font-semibold">
                  ${summary.total.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Expense Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Expense</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.01"
              required
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a category</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Add Expense'}
          </button>
        </form>
      </div>

      {/* Category Summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Category Summary</h2>
        {isLoading ? (
          <div>Loading...</div>
        ) : categorySummaries.length === 0 ? (
          <div className="text-gray-500">No expenses recorded yet</div>
        ) : (
          <div className="grid gap-4">
            {categorySummaries.map((summary) => (
              <div
                key={summary.category}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-md"
              >
                <span className="font-medium">{summary.category}</span>
                <span className="text-blue-600 font-semibold">
                  ${summary.total.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Expenses */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Expenses</h2>
        {isLoading ? (
          <div>Loading...</div>
        ) : expenses.length === 0 ? (
          <div className="text-gray-500">No expenses recorded yet</div>
        ) : (
          <div className="space-y-4">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-md"
              >
                <div>
                  <div className="font-medium">{expense.title}</div>
                  <div className="text-sm text-gray-500">{expense.category}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${expense.amount.toFixed(2)}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(expense.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
