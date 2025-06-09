import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { useSession } from 'next-auth/react';
import { authOptions } from '~/server/auth';
import { api } from '~/utils/api';
import { Plus, UserPlus, Search, Filter } from 'lucide-react';
import TaskForm from '~/components/TaskForm';
import TaskDetails from '~/components/TaskDetails';
import TaskCard from '~/components/TaskCard';
import { Header } from '~/components/Header';
import { useTheme } from '~/contexts/ThemeContext';

export default function Dashboard() {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showTaskDetails, setShowTaskDetails] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState('');

  const { data: tasks, refetch: refetchTasks } = api.tasks.getAll.useQuery();
  const { data: users } = api.users.getAll.useQuery();
  const inviteUser = api.auth.inviteUser.useMutation({
    onSuccess: () => {
      setShowInviteForm(false);
      setInviteEmail('');
      setInviteName('');
      setInviteError('');
    },
    onError: (error) => {
      setInviteError(error.message);
    },
  });

  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    inviteUser.mutate({
      email: inviteEmail,
      name: inviteName,
    });
  };


  const filteredTasks = tasks?.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || task.status === statusFilter;
    const matchesPriority = !priorityFilter || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg.primary }}>
      <Header />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => setShowTaskForm(true)}
            className="flex items-center px-4 py-2 rounded-md hover:opacity-90"
            style={{ backgroundColor: theme.accent.primary, color: theme.text.onAccent }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </button>
          {session?.user?.role === 'ADMIN' && (
            <button
              onClick={() => setShowInviteForm(true)}
              className="flex items-center px-4 py-2 rounded-md hover:opacity-90"
              style={{ backgroundColor: theme.accent.secondary, color: theme.text.onAccent }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite User
            </button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: theme.text.secondary }} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2"
              style={{ 
                backgroundColor: theme.bg.secondary,
                color: theme.text.primary,
                border: `1px solid ${theme.border}`
              }}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2 gap-1">
              <Filter className="w-5 h-5" style={{ color: theme.text.secondary }} />
              <div className="relative">
                <select
                  value={statusFilter ?? ''}
                  onChange={(e) => setStatusFilter(e.target.value || null)}
                  className="pl-3 pr-8 py-2 rounded-lg focus:outline-none focus:ring-2 appearance-none"
                  style={{ 
                    backgroundColor: theme.bg.secondary,
                    color: theme.text.primary,
                    border: `1px solid ${theme.border}`
                  }}
                >
                  <option value="">All Status</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="REVIEW">Review</option>
                  <option value="DONE">Done</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-4 h-4" style={{ color: theme.text.secondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5" style={{ color: theme.text.secondary }} />
              <div className="relative">
                <select
                  value={priorityFilter ?? ''}
                  onChange={(e) => setPriorityFilter(e.target.value || null)}
                  className="pl-3 pr-8 py-2 rounded-lg focus:outline-none focus:ring-2 appearance-none"
                  style={{ 
                    backgroundColor: theme.bg.secondary,
                    color: theme.text.primary,
                    border: `1px solid ${theme.border}`
                  }}
                >
                  <option value="">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-4 h-4" style={{ color: theme.text.secondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-lg shadow-sm p-6" style={{ backgroundColor: theme.bg.secondary }}>
            <div className="text-2xl font-bold" style={{ color: theme.accent.primary }}>
              {tasks?.length ?? 0}
            </div>
            <div style={{ color: theme.text.secondary }}>Total Tasks</div>
          </div>
          <div className="rounded-lg shadow-sm p-6" style={{ backgroundColor: theme.bg.secondary }}>
            <div className="text-2xl font-bold" style={{ color: theme.accent.secondary }}>
              {tasks?.filter(t => t.status === 'DONE').length ?? 0}
            </div>
            <div style={{ color: theme.text.secondary }}>Completed</div>
          </div>
          <div className="rounded-lg shadow-sm p-6" style={{ backgroundColor: theme.bg.secondary }}>
            <div className="text-2xl font-bold" style={{ color: theme.accent.primary }}>
              {users?.length ?? 0}
            </div>
            <div style={{ color: theme.text.secondary }}>Team Members</div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="rounded-lg shadow-sm" style={{ backgroundColor: theme.bg.secondary }}>
          <div className="px-6 py-4 border-b" style={{ border: `1px solid ${theme.border}` }}>
            <h2 className="text-lg font-semibold" style={{ color: theme.text.primary }}>Tasks</h2>
          </div>
          <div className="p-6">
            {filteredTasks && filteredTasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => setShowTaskDetails(task.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p style={{ color: theme.text.secondary }}>No tasks found. Create your first task to get started!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showTaskForm && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ backgroundColor: theme.modalBackdrop }}>
          <div className="rounded-lg p-6 w-full max-w-2xl" style={{ backgroundColor: theme.bg.secondary }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold" style={{ color: theme.text.primary }}>Create New Task</h2>
              <button
                onClick={() => setShowTaskForm(false)}
                style={{ color: theme.text.secondary }}
                className="hover:opacity-80 hover:cursor-pointer text-2xl"
              >
                ×
              </button>
            </div>
            <TaskForm onSuccess={() => {
              setShowTaskForm(false);
              void refetchTasks();
            }} />
          </div>
        </div>
      )}

      {showTaskDetails && (
        <TaskDetails
          taskId={showTaskDetails}
          onClose={() => {
            setShowTaskDetails(null);
            void refetchTasks();
          }}
        />
      )}

      {showInviteForm && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ backgroundColor: theme.modalBackdrop }}>
          <div className="rounded-lg p-6 w-full max-w-md" style={{ backgroundColor: theme.bg.secondary }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold" style={{ color: theme.text.primary }}>Invite New User</h2>
              <button
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteError('');
                }}
                style={{ color: theme.text.secondary }}
                className="hover:opacity-80"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                  Name
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: theme.bg.tertiary,
                    color: theme.text.primary,
                    border: `1px solid ${theme.border}`
                  }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
                  Email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: theme.bg.tertiary,
                    color: theme.text.primary,
                    border: `1px solid ${theme.border}`
                  }}
                  required
                />
              </div>
              {inviteError && (
                <div className="text-sm" style={{ color: theme.accent.primary }}>
                  {inviteError}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md hover:opacity-90"
                  style={{ backgroundColor: theme.accent.primary, color: theme.text.onAccent }}
                  disabled={inviteUser.isPending}
                >
                  {inviteUser.isPending ? 'Inviting...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
    },
  };
};
