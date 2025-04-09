import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { Users, DollarSign, Calendar, Equal, Percent, Trash2, Edit2, X, ToggleLeft, ToggleRight, CheckCircle2 } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  members: string[];
  split_type: 'equal' | 'custom';
}

interface MemberSplit {
  member: string;
  amount: number;
}

interface Expense {
  id: string;
  group_id: string;
  title: string;
  amount: number;
  paid_by: string;
  split_type: 'equal' | 'custom';
  split_details: MemberSplit[] | null;
  created_at: string;
  group?: Group;
  settled: boolean;
}

interface EditExpenseModalProps {
  expense: Expense;
  groups: Group[];
  onClose: () => void;
  onSave: (updatedExpense: Partial<Expense>) => Promise<void>;
}

interface MemberSplitValue {
  member: string;
  value: string;
}

function EditExpenseModal({ expense, groups, onClose, onSave }: EditExpenseModalProps) {
  const { profile } = useAuthStore();
  const [title, setTitle] = useState(expense.title);
  const [amount, setAmount] = useState(expense.amount.toString());
  const amountNum = parseFloat(amount) || 0;
  const [paidBy, setPaidBy] = useState(expense.paid_by || profile?.display_name || '');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>(expense.split_type);
  const [splitMode, setSplitMode] = useState<'amount' | 'percentage'>('amount');
  const [customSplits, setCustomSplits] = useState<MemberSplitValue[]>([]);
  const [splitErrors, setSplitErrors] = useState<Record<number | 'total', string | null>>({ total: null });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initialSplits = expense.group?.members.map(member => {
      let initialValue = '';
      if (expense.split_details) {
        const detail = expense.split_details.find(s => s.member === member);
        if (detail && detail.amount > 0) {
          initialValue = detail.amount.toString();
        }
      }
      return { member, value: initialValue };
    }) || [];
    setCustomSplits(initialSplits);
    setSplitErrors({ total: null });
  }, [expense.group, expense.split_details]);

  useEffect(() => {
    if (splitType === 'equal') {
      setCustomSplits([]);
      setSplitErrors({ total: null });
      setSplitMode('amount');
    }
  }, [splitType]);

  const toggleSplitMode = () => {
    setSplitMode(prevMode => {
      const newMode = prevMode === 'amount' ? 'percentage' : 'amount';
      setCustomSplits(prevSplits => prevSplits.map(s => ({ ...s, value: '' })));
      setSplitErrors({ total: null });
      return newMode;
    });
  };

  const handleCustomSplitChange = (index: number, value: string) => {
    if (!/^[0-9]*\.?\d*$/.test(value) && value !== '') {
      return;
    }

    const newSplits = [...customSplits];
    newSplits[index].value = value;
    setCustomSplits(newSplits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSplitErrors({ total: null });

    const amountNum = parseFloat(amount) || 0;
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      setIsSubmitting(false);
      return;
    }

    if (splitType === 'custom') {
      let calculatedSplitDetails: MemberSplit[] = [];
      let currentTotal = 0;
      let validationPassed = true;
      const tempErrors: Record<number | 'total', string | null> = { total: null };

      for (let i = 0; i < customSplits.length; i++) {
        const split = customSplits[i];
        const valueNum = parseFloat(split.value) || 0;

        if (split.value === '' || valueNum < 0) {
          tempErrors[i] = 'Invalid input';
          validationPassed = false;
          continue;
        }
        
        if (splitMode === 'amount') {
          calculatedSplitDetails.push({ member: split.member, amount: valueNum });
          currentTotal += valueNum;
        } else {
          if (valueNum > 100) {
            tempErrors[i] = '> 100%';
            validationPassed = false;
          }
          const calculatedAmount = (amountNum * valueNum) / 100;
          calculatedSplitDetails.push({ member: split.member, amount: parseFloat(calculatedAmount.toFixed(2)) });
          currentTotal += valueNum;
        }
      }
      
      if (splitMode === 'amount') {
        if (Math.abs(currentTotal - amountNum) > 0.01) {
          tempErrors.total = `Splits must total ${amountNum.toFixed(2)}`;
          validationPassed = false;
        }
      } else {
        if (Math.abs(currentTotal - 100) > 0.01) {
          tempErrors.total = `Percentages must total 100%`;
          validationPassed = false;
        }
      }

      if (!validationPassed) {
        setSplitErrors(tempErrors);
        setError('Please fix the errors in custom splits.');
        setIsSubmitting(false);
        return;
      }
      
      try {
        setIsSubmitting(true);
        await onSave({
          title,
          amount: amountNum,
          paid_by: paidBy,
          split_type: splitType,
          split_details: calculatedSplitDetails
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update expense');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      try {
        setIsSubmitting(true);
        await onSave({
          title,
          amount: amountNum,
          paid_by: paidBy,
          split_type: splitType,
          split_details: null
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update expense');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Edit Expense</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2">
                Expense Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="amount" className="block text-gray-700 text-sm font-bold mb-2">
                Amount *
              </label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                step="0.01"
                min="0"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="paidBy" className="block text-gray-700 text-sm font-bold mb-2">
                Paid By *
              </label>
              <select
                id="paidBy"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
                disabled={isSubmitting}
              >
                {expense.group?.members.map(member => {
                  const isCurrentUser = member === profile?.display_name;
                  return (
                    <option key={member} value={member}>
                      {member}{isCurrentUser ? ' (You)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="splitType" className="block text-gray-700 text-sm font-bold mb-2">
                Split Type *
              </label>
              <select
                id="splitType"
                value={splitType}
                onChange={(e) => setSplitType(e.target.value as 'equal' | 'custom')}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
                disabled={isSubmitting}
              >
                <option value="equal">Equal Split</option>
                <option value="custom">Custom Split</option>
              </select>
            </div>

            {splitType === 'custom' && (
              <div className="mb-4 border border-gray-200 rounded p-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-gray-700 text-sm font-bold">
                    Custom Splits ({splitMode === 'amount' ? 'Amount' : 'Percentage'})
                  </label>
                  <button
                    type="button"
                    onClick={toggleSplitMode}
                    className="flex items-center px-2 py-1 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded"
                  >
                    {splitMode === 'amount' ? (
                      <> <ToggleLeft className="w-5 h-5 mr-1" /> Switch to % </>
                    ) : (
                      <> <ToggleRight className="w-5 h-5 mr-1" /> Switch to $ </>
                    )}
                  </button>
                </div>

                {customSplits.map((split, index) => {
                  const isCurrentUser = split.member === profile?.display_name;
                  const valueNum = parseFloat(split.value) || 0;
                  const calculatedAmountPreview = splitMode === 'percentage' && amountNum > 0 && valueNum > 0 ? (amountNum * valueNum / 100).toFixed(2) : null;
                  
                  return (
                    <div key={index} className="mb-2 relative pb-4">
                      <div className="flex items-center">
                        <span className={`w-1/3 text-gray-700 text-sm ${isCurrentUser ? 'text-green-600 font-semibold' : ''}`}>
                          {split.member}{isCurrentUser ? ' (You)' : ''}
                        </span>
                        <div className="w-2/3 flex items-center relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={split.value}
                            onChange={(e) => handleCustomSplitChange(index, e.target.value)}
                            placeholder={splitMode === 'amount' ? '0.00' : '0'}
                            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${splitErrors[index] ? 'border-red-500' : ''}`}
                            required
                            disabled={isSubmitting}
                            aria-describedby={splitErrors[index] ? `split-error-${index}` : undefined}
                          />
                          {splitMode === 'amount' && <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>}
                          {splitMode === 'percentage' && <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>}
                        </div>
                        {calculatedAmountPreview && (
                          <span className="ml-2 text-xs text-gray-500 whitespace-nowrap">(${calculatedAmountPreview})</span>
                        )}
                      </div>
                      {splitErrors[index] && (
                        <p id={`split-error-${index}`} className="absolute bottom-0 left-1/3 pl-1 text-xs text-red-600">{splitErrors[index]}</p>
                      )}
                    </div>
                  );
                })}

                {splitErrors.total && (
                  <p className="mt-2 text-sm text-red-600 text-center font-medium">{splitErrors.total}</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export function ExpensesPage() {
  const { user, profile } = useAuthStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const amountNum = parseFloat(amount) || 0;
  const [paidBy, setPaidBy] = useState(profile?.display_name || '');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [splitMode, setSplitMode] = useState<'amount' | 'percentage'>('amount');
  const [customSplits, setCustomSplits] = useState<MemberSplitValue[]>([]);
  const [splitErrors, setSplitErrors] = useState<Record<number | 'total', string | null>>({ total: null });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  useEffect(() => {
    if (profile?.display_name && !paidBy) {
      setPaidBy(profile.display_name);
    }
  }, [profile, paidBy]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('*')
          .eq('created_by', user.id);

        if (groupsError) throw groupsError;
        setGroups(groupsData || []);

        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('*')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false });

        if (expensesError) throw expensesError;

        const expensesWithGroups = (expensesData || []).map(expense => ({
          ...expense,
          group: groupsData?.find(group => group.id === expense.group_id)
        }));

        setExpenses(expensesWithGroups);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setIsLoadingExpenses(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (selectedGroup) {
      const group = groups.find(g => g.id === selectedGroup);
      if (group) {
        setCustomSplits(group.members.map(member => ({ member, value: '' })));
        setSplitErrors({ total: null });
        setSplitMode('amount');
      } else {
        setCustomSplits([]);
        setSplitErrors({ total: null });
      }
    } else {
        setCustomSplits([]);
        setSplitErrors({ total: null });
    }
  }, [selectedGroup, groups]);

  useEffect(() => {
    if (splitType === 'equal') {
       if (selectedGroup) { 
         const group = groups.find(g => g.id === selectedGroup);
         if (group) {
             setCustomSplits(group.members.map(member => ({ member, value: '' })));
         }
      }
      setSplitErrors({ total: null });
      setSplitMode('amount'); 
    } 
  }, [splitType, selectedGroup, groups]);

  const toggleSplitMode = () => {
    setSplitMode(prevMode => {
      const newMode = prevMode === 'amount' ? 'percentage' : 'amount';
      setCustomSplits(prevSplits => prevSplits.map(s => ({ ...s, value: '' })));
      setSplitErrors({ total: null });
      return newMode;
    });
  };

  const handleCustomSplitChange = (index: number, value: string) => {
    if (!/^[0-9]*\.?\d*$/.test(value) && value !== '') {
      return; 
    }
    const newSplits = [...customSplits];
    newSplits[index].value = value;
    setCustomSplits(newSplits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSplitErrors({ total: null });

    if (!user) {
      setError('You must be logged in to create an expense');
      setIsSubmitting(false);
      return;
    }

    if (!selectedGroup || !title || !amount || !paidBy) {
      setError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      setIsSubmitting(false);
      return;
    }

    let finalSplitDetails: MemberSplit[] | null = null;

    if (splitType === 'custom') {
      let calculatedSplitDetails: MemberSplit[] = [];
      let currentTotal = 0;
      let validationPassed = true;
      const tempErrors: Record<number | 'total', string | null> = { total: null };

      for (let i = 0; i < customSplits.length; i++) {
          const split = customSplits[i];
          const valueNum = parseFloat(split.value) || 0;

          if (split.value === '' || valueNum < 0) {
              tempErrors[i] = 'Invalid input';
              validationPassed = false;
              continue;
          }

          if (splitMode === 'amount') {
              calculatedSplitDetails.push({ member: split.member, amount: valueNum });
              currentTotal += valueNum;
          } else {
              if (valueNum > 100) {
                  tempErrors[i] = '> 100%';
                  validationPassed = false;
              }
              const calculatedAmount = (amountNum * valueNum) / 100;
              calculatedSplitDetails.push({ member: split.member, amount: parseFloat(calculatedAmount.toFixed(2)) });
              currentTotal += valueNum;
          }
      }

      if (splitMode === 'amount') {
          if (Math.abs(currentTotal - amountNum) > 0.01) {
              tempErrors.total = `Splits must total ${amountNum.toFixed(2)}`;
              validationPassed = false;
          }
      } else {
          if (Math.abs(currentTotal - 100) > 0.01) {
              tempErrors.total = `Percentages must total 100%`;
              validationPassed = false;
          }
      }

      if (!validationPassed) {
          setSplitErrors(tempErrors);
          setError('Please fix the errors in custom splits.');
          setIsSubmitting(false);
          return;
      }
      finalSplitDetails = calculatedSplitDetails;
    }

    setIsSubmitting(true);
    try {
      const expenseData = {
        group_id: selectedGroup,
        title,
        amount: amountNum,
        paid_by: paidBy,
        split_type: splitType,
        split_details: finalSplitDetails,
        created_by: user.id
      };

      const { error: insertError } = await supabase
        .from('expenses')
        .insert(expenseData);

      if (insertError) throw insertError;

      setSelectedGroup('');
      setTitle('');
      setAmount('');
      setPaidBy(profile?.display_name || '');
      setSplitType('equal');
      setCustomSplits([]);
      setSplitMode('amount');
      setSplitErrors({ total: null });
      setError(null);

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (expensesError) throw expensesError;
       const expensesWithGroups = (expensesData || []).map(expense => ({
        ...expense,
        group: groups.find(group => group.id === expense.group_id)
      }));
      setExpenses(expensesWithGroups);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (expensesError) throw expensesError;

      const expensesWithGroups = (expensesData || []).map(expense => ({
        ...expense,
        group: groups.find(group => group.id === expense.group_id)
      }));

      setExpenses(expensesWithGroups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete expense');
    }
  };

  const handleUpdateExpense = async (updatedExpense: Partial<Expense>) => {
    if (!editingExpense) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .update(updatedExpense)
        .eq('id', editingExpense.id);

      if (error) throw error;

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (expensesError) throw expensesError;

      const expensesWithGroups = (expensesData || []).map(expense => ({
        ...expense,
        group: groups.find(group => group.id === expense.group_id)
      }));

      setExpenses(expensesWithGroups);
      setEditingExpense(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expense');
    }
  };

  const handleSettleExpense = async (expenseId: string) => {
    try {
      const expense = expenses.find(e => e.id === expenseId);
      if (!expense) return;

      const { error } = await supabase
        .from('expenses')
        .update({ settled: !expense.settled })
        .eq('id', expenseId);

      if (error) throw error;

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (expensesError) throw expensesError;

      const expensesWithGroups = (expensesData || []).map(expense => ({
        ...expense,
        group: groups.find(group => group.id === expense.group_id)
      }));

      setExpenses(expensesWithGroups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expense status');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Add New Expense</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 max-w-2xl mb-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="group" className="block text-gray-700 text-sm font-bold mb-2">
            Group *
          </label>
          <select
            id="group"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
            disabled={isSubmitting}
          >
            <option value="">Select a group</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2">
            Expense Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="amount" className="block text-gray-700 text-sm font-bold mb-2">
            Amount *
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            step="0.01"
            min="0"
            required
            disabled={isSubmitting}
          />
        </div>

        {selectedGroup && (
          <>
            <div className="mb-4">
              <label htmlFor="paidBy" className="block text-gray-700 text-sm font-bold mb-2">
                Paid By *
              </label>
              <select
                id="paidBy"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
                disabled={isSubmitting}
              >
                <option value="">Select who paid</option>
                {groups.find(g => g.id === selectedGroup)?.members.map(member => {
                  const isCurrentUser = member === profile?.display_name;
                  return (
                    <option key={member} value={member}>
                      {member}{isCurrentUser ? ' (You)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="splitType" className="block text-gray-700 text-sm font-bold mb-2">
                Split Type *
              </label>
              <select
                id="splitType"
                value={splitType}
                onChange={(e) => setSplitType(e.target.value as 'equal' | 'custom')}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
                disabled={isSubmitting}
              >
                <option value="equal">Equal Split</option>
                <option value="custom">Custom Split</option>
              </select>
            </div>

            {splitType === 'custom' && (
              <div className="mb-4 border border-gray-200 rounded p-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-gray-700 text-sm font-bold">
                    Custom Splits ({splitMode === 'amount' ? 'Amount' : 'Percentage'})
                  </label>
                  <button
                    type="button"
                    onClick={toggleSplitMode}
                    className="flex items-center px-2 py-1 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded"
                  >
                    {splitMode === 'amount' ? (
                        <> <ToggleLeft className="w-5 h-5 mr-1" /> Switch to % </> 
                     ) : (
                        <> <ToggleRight className="w-5 h-5 mr-1" /> Switch to $ </> 
                     )}
                  </button>
                </div>

                {customSplits.map((split, index) => {
                  const isCurrentUser = split.member === profile?.display_name;
                  const valueNum = parseFloat(split.value) || 0;
                  const calculatedAmountPreview = splitMode === 'percentage' && amountNum > 0 && valueNum > 0 ? (amountNum * valueNum / 100).toFixed(2) : null;
                  
                  return (
                    <div key={index} className="mb-2 relative pb-4">
                      <div className="flex items-center">
                        <span className={`w-1/3 text-gray-700 text-sm ${isCurrentUser ? 'text-green-600 font-semibold' : ''}`}>
                          {split.member}{isCurrentUser ? ' (You)' : ''}
                        </span>
                         <div className="w-2/3 flex items-center relative">
                           <input
                              type="text"
                              inputMode="decimal"
                              value={split.value}
                              onChange={(e) => handleCustomSplitChange(index, e.target.value)}
                              placeholder={splitMode === 'amount' ? '0.00' : '0'}
                              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${splitErrors[index] ? 'border-red-500' : ''}`}
                              required
                              disabled={isSubmitting}
                              aria-describedby={splitErrors[index] ? `split-error-${index}` : undefined}
                            />
                            {splitMode === 'amount' && <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>}
                            {splitMode === 'percentage' && <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>}
                         </div>
                         {calculatedAmountPreview && (
                            <span className="ml-2 text-xs text-gray-500 whitespace-nowrap">(${calculatedAmountPreview})</span>
                         )}
                      </div>
                       {splitErrors[index] && (
                          <p id={`split-error-${index}`} className="absolute bottom-0 left-1/3 pl-1 text-xs text-red-600">{splitErrors[index]}</p>
                       )}
                    </div>
                  );
                })}
                 {splitErrors.total && (
                    <p className="mt-2 text-sm text-red-600 text-center font-medium">{splitErrors.total}</p>
                 )}
              </div>
            )}
          </>
        )}

        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 mt-4"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Expense'}
        </button>
      </form>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">Your Expenses</h2>
        
        {isLoadingExpenses ? (
          <div className="text-center py-4">Loading expenses...</div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No expenses found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className={`rounded-lg p-6 transition-all duration-200 hover:shadow-lg relative ${
                  expense.settled 
                    ? 'bg-gradient-to-br from-green-50 to-green-100 opacity-75' 
                    : expense.split_type === 'equal'
                      ? 'bg-gradient-to-br from-blue-50 to-blue-100'
                      : 'bg-gradient-to-br from-blue-50 to-blue-100'
                }`}
              >
                {expense.settled && (
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                      Settled
                    </span>
                  </div>
                )}
                <div className="absolute top-2 left-2 flex items-center gap-2">
                  <button
                    onClick={() => setEditingExpense(expense)}
                    className="p-2 rounded-lg bg-white/50 hover:bg-white/80 transition-colors"
                    title="Edit expense"
                  >
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    onClick={() => handleSettleExpense(expense.id)}
                    className={`p-2 rounded-lg bg-white/50 hover:bg-white/80 transition-colors ${expense.settled ? 'text-green-600' : 'text-gray-600'}`}
                    title={expense.settled ? "Mark as unsettled" : "Mark as settled"}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {expense.title}
                  </h3>
                  <div className={`rounded-full p-2 ${
                    expense.split_type === 'equal'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {expense.split_type === 'equal' ? (
                      <Equal className="w-4 h-4" />
                    ) : (
                      <Percent className="w-4 h-4" />
                    )}
                  </div>
                </div>

                <div className="flex items-center text-gray-600 mb-4">
                  <DollarSign className="w-4 h-4 mr-1" />
                  <span className="font-medium">${expense.amount.toFixed(2)}</span>
                  <span className="mx-2">• Paid by</span>
                  <span className={`${expense.paid_by === profile?.display_name ? 'text-green-600 font-semibold' : ''}`}>
                    {expense.paid_by}{expense.paid_by === profile?.display_name ? ' (You)' : ''}
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <Users className="w-4 h-4 mr-2" />
                  <span>{expense.group?.name || 'Unknown Group'}</span>
                </div>

                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="w-3 h-3 mr-1" />
                  <span>{format(new Date(expense.created_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          groups={groups}
          onClose={() => setEditingExpense(null)}
          onSave={handleUpdateExpense}
        />
      )}
    </div>
  );
}