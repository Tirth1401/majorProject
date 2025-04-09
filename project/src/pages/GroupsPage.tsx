import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface Group {
  id: string;
  name: string;
  members: string[];
  created_at: string;
  created_by: string;
}

export function GroupsPage() {
  const { profile } = useAuthStore();
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<string[]>(['']);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      if (user?.id) {
        fetchUserGroups(user.id);
      }
    };
    getCurrentUser();
  }, []);

  const fetchUserGroups = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroups(data || []);
    } catch (err) {
      setError('Failed to fetch groups');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const handleAddMember = () => {
    setMembers([...members, '']);
  };

  const handleMemberChange = (index: number, value: string) => {
    const newMembers = [...members];
    newMembers[index] = value;
    setMembers(newMembers);
  };

  const handleRemoveMember = (index: number) => {
    const newMembers = members.filter((_, i) => i !== index);
    setMembers(newMembers.length > 0 ? newMembers : ['']);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!userId) {
      setError('You must be logged in to create a group');
      setIsSubmitting(false);
      return;
    }

    const finalMembers = members.filter(member => member.trim() !== '');
    if (finalMembers.length === 0) {
        setError('Please add at least one member.');
        setIsSubmitting(false);
        return;
    }

    try {
      console.log('Attempting to insert group with values:', {
        name: groupName,
        members: finalMembers,
        created_by: userId
      });
      const { error: insertError } = await supabase
        .from('groups')
        .insert({
          name: groupName,
          members: finalMembers,
          created_by: userId
        });

      if (insertError) {
        console.error('Supabase insert error:', insertError.message);
        throw insertError;
      }

      setGroupName('');
      setMembers(['']);
      if (userId) {
        fetchUserGroups(userId);
      }
    } catch (err) {
      console.error('Error during group creation:', err);
      // Check if it's a Supabase error object and log the specific message
      if (err && typeof err === 'object' && 'message' in err) {
          setError(`Failed to create group: ${err.message}`);
      } else {
          setError('Failed to create group');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const { error: expensesError } = await supabase
        .from('expenses')
        .delete()
        .eq('group_id', groupId);

      if (expensesError) throw expensesError;

      const { error: groupError } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (groupError) throw groupError;

      if (userId) {
        fetchUserGroups(userId);
      }
    } catch (err) {
      setError('Failed to delete group');
    } finally {
      setGroupToDelete(null);
    }
  };

  const toggleExpandGroup = (groupId: string) => {
    setExpandedGroup(expandedGroup === groupId ? null : groupId);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Your Groups</h2>
        {isLoadingGroups ? (
          <div className="text-gray-600 text-center py-4">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="text-gray-600 text-center py-4">No groups found. Create your first group below!</div>
        ) : (
          <div className="grid gap-6">
            {groups.map((group) => (
              <div
                key={group.id}
                className="group bg-white border border-gray-200 rounded-lg shadow-sm transition-shadow duration-200 hover:shadow-md"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-semibold text-gray-800">{group.name}</h3>
                    {userId === group.created_by && (
                      <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setGroupToDelete(group.id);
                        }}
                        className="text-red-500 hover:text-red-700 transition-colors duration-200 ml-4 p-1 rounded hover:bg-red-100"
                        aria-label={`Delete group ${group.name}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 mb-4">
                    {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                  </p>

                  {userId === group.created_by && (
                      <button
                        onClick={() => toggleExpandGroup(group.id)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        aria-expanded={expandedGroup === group.id}
                      >
                        {expandedGroup === group.id ? 'Hide Details' : 'View Details'}
                      </button>
                   )}

                </div>

                {expandedGroup === group.id && userId === group.created_by && (
                  <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                     <h4 className="text-sm font-semibold text-gray-700 mb-2">Members</h4>
                     <div className="flex flex-wrap gap-2 mb-4">
                       {group.members.map((member, index) => {
                         // Check if member matches current user
                         const currentUserDisplayName = profile?.display_name ?? undefined; // Use profile display name
                         const isCurrentUser = member === currentUserDisplayName;
                         return (
                           <span
                             key={index}
                             className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${isCurrentUser ? 'bg-green-100 text-green-700 font-semibold' : 'bg-gray-200 text-gray-700'}`}
                           >
                             {member}{isCurrentUser ? ' (You)' : ''}
                           </span>
                         );
                       })}
                     </div>
                     <h4 className="text-sm font-semibold text-gray-700 mb-1">Created On</h4>
                     <p className="text-sm text-gray-600">
                        {new Date(group.created_at).toLocaleDateString()} at {new Date(group.created_at).toLocaleTimeString()}
                     </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold mb-6">Create New Group</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 max-w-2xl">
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label htmlFor="groupName" className="block text-gray-700 text-sm font-bold mb-2">
              Group Name
            </label>
            <input
              type="text"
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Group Members
            </label>
            {members.map((member, index) => {
              // Check if current input matches user
              const currentUserDisplayName = profile?.display_name ?? undefined; // Use profile display name
              const isCurrentUser = member === currentUserDisplayName && member !== ''; // Check if the input value matches
              return (
                <div key={index} className="flex items-center mb-2">
                  <input
                    type="text"
                    value={member}
                    onChange={(e) => handleMemberChange(index, e.target.value)}
                    placeholder={`Member ${index + 1} name or email`}
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2 ${isCurrentUser ? 'border-green-500' : ''}`}
                    required={index === 0 || member.trim() !== ''}
                    disabled={isSubmitting}
                  />
                  {isCurrentUser && (
                    <span className="text-xs text-green-600 font-semibold mr-2">(You)</span>
                  )}
                  {members.length > 1 && (
                     <button
                       type="button"
                       onClick={() => handleRemoveMember(index)}
                       className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-100"
                       disabled={isSubmitting}
                       aria-label={`Remove member ${index + 1}`}
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                     </button>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={handleAddMember}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={isSubmitting}
            >
              + Add Member
            </button>
          </div>

          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Group'}
          </button>
        </form>
      </div>

      {groupToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Delete Group</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this group? This will also delete all associated expenses.
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setGroupToDelete(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteGroup(groupToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}