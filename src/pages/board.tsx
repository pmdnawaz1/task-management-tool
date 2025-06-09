import { useState, useEffect } from 'react';
import type { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { useSession } from 'next-auth/react';
import { authOptions } from '~/server/auth';
import { api } from '~/utils/api';
import { ArrowLeft, Plus } from 'lucide-react';
import { useRouter } from 'next/router';
import TaskDetails from '~/components/TaskDetails';
import TaskForm from '~/components/TaskForm';
import { Header } from '~/components/Header';
import { useTheme } from '~/contexts/ThemeContext';

interface Task {
  id: string;
  title: string;
  description: string | null;
  deadline: Date | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  tags: string[];
  assignedTo: {
    id: string;
    name: string | null;
    email: string;
  };
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  comments: Array<{
    id: string;
    content: string;
    createdAt: Date;
    author: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
  attachments: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
  createdAt: Date;
}

const statusColumns = {
  OPEN: { title: 'Open', color: 'theme.status.open' },
  IN_PROGRESS: { title: 'In Progress', color: 'theme.status.inProgress' },
  REVIEW: { title: 'Review', color: 'theme.status.review' },
  DONE: { title: 'Done', color: 'theme.status.done' },
} as const;

export default function Board() {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const router = useRouter();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTaskDetails, setShowTaskDetails] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const { data: tasks, refetch: refetchTasks } = api.tasks.getAll.useQuery();
  const utils = api.useUtils();
  
  const updateStatus = api.tasks.updateStatus.useMutation({
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await utils.tasks.getAll.cancel();
      
      // Snapshot the previous value
      const previousTasks = utils.tasks.getAll.getData();
      
      // Optimistically update the cache
      if (previousTasks) {
        const updatedTasks = previousTasks.map(task => 
          task.id === variables.id 
            ? { ...task, status: variables.status }
            : task
        );
        utils.tasks.getAll.setData(undefined, updatedTasks);
      }
      
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousTasks) {
        utils.tasks.getAll.setData(undefined, context.previousTasks);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      void utils.tasks.getAll.invalidate();
    },
  });

  const getStatusColor = (status: keyof typeof statusColumns) => {
    switch (status) {
      case 'OPEN': return theme.status.open;
      case 'IN_PROGRESS': return theme.status.inProgress;
      case 'REVIEW': return theme.status.review;
      case 'DONE': return theme.status.done;
      default: return theme.text.secondary;
    }
  };

  const getPriorityColor = (priority: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (priority) {
      case 'HIGH': return theme.priority.high;
      case 'MEDIUM': return theme.priority.medium;
      case 'LOW': return theme.priority.low;
      default: return theme.text.secondary;
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: keyof typeof statusColumns) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: keyof typeof statusColumns) => {
    e.preventDefault();
    if (draggedTask) {
      const task = tasks?.find(t => t.id === draggedTask);
      if (task && task.status !== newStatus) {
        const canChangeStatus = session?.user?.role === 'ADMIN' || task.assignedTo?.id === session?.user?.id;
        if (canChangeStatus) {
          updateStatus.mutate({ id: draggedTask, status: newStatus });
        }
      }
      setDraggedTask(null);
      setDragOverColumn(null);
    }
  };

  const tasksByStatus = tasks?.reduce((acc, task) => {
    if (!acc[task.status]) {
      acc[task.status] = [];
    }
    acc[task.status].push(task);
    return acc;
  }, {} as Record<keyof typeof statusColumns, Task[]>) ?? {};

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg.primary }}>
      <Header />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center px-3 py-2 rounded-lg hover:opacity-80"
              style={{ backgroundColor: theme.bg.secondary, color: theme.text.primary }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold" style={{ color: theme.text.primary }}>
              Kanban Board
            </h1>
          </div>
          <button
            onClick={() => setShowTaskForm(true)}
            className="flex items-center px-4 py-2 rounded-md hover:opacity-90"
            style={{ backgroundColor: theme.accent.primary, color: theme.text.onAccent }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </button>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(Object.keys(statusColumns) as Array<keyof typeof statusColumns>).map((status) => (
            <div
              key={status}
              className={`rounded-lg shadow-sm transition-all duration-200 ${dragOverColumn === status ? 'ring-2 ring-blue-400 bg-opacity-90' : ''}`}
              style={{ 
                backgroundColor: dragOverColumn === status 
                  ? `${theme.accent.primary}15` 
                  : theme.bg.secondary 
              }}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Column Header */}
              <div className="p-4 border-b" style={{ borderColor: theme.border }}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold" style={{ color: theme.text.primary }}>
                    {statusColumns[status].title}
                  </h3>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getStatusColor(status) }}
                  />
                </div>
                <p className="text-sm mt-1" style={{ color: theme.text.secondary }}>
                  {tasksByStatus[status]?.length ?? 0} tasks
                </p>
              </div>

              {/* Tasks */}
              <div className="p-4 space-y-3 min-h-[500px]">
                {tasksByStatus[status]?.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => setShowTaskDetails(task.id)}
                    className={`rounded-lg p-3 cursor-pointer hover:shadow-md transition-all duration-200 ${
                      draggedTask === task.id ? 'opacity-50 transform scale-95' : ''
                    }`}
                    style={{
                      backgroundColor: theme.bg.tertiary,
                      border: `1px solid ${theme.border}`,
                      borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
                    }}
                  >
                    {/* Task Header */}
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-sm line-clamp-2 flex-1" style={{ color: theme.text.primary }}>
                        {task.title}
                      </h4>
                      <span
                        className="px-2 py-1 rounded text-xs font-medium ml-2"
                        style={{
                          backgroundColor: getPriorityColor(task.priority),
                          color: theme.text.onAccent
                        }}
                      >
                        {task.priority}
                      </span>
                    </div>

                    {/* Task Description */}
                    {task.description && (
                      <p className="text-xs mb-2 line-clamp-2" style={{ color: theme.text.secondary }}>
                        {task.description}
                      </p>
                    )}

                    {/* Task Meta */}
                    <div className="flex justify-between items-center text-xs" style={{ color: theme.text.secondary }}>
                      <span>{task.assignedTo.name ?? task.assignedTo.email}</span>
                      <div className="flex items-center space-x-2">
                        {task.comments && task.comments.length > 0 && (
                          <span>{task.comments.length} 💬</span>
                        )}
                        {task.attachments && task.attachments.length > 0 && (
                          <span>{task.attachments.length} 📎</span>
                        )}
                      </div>
                    </div>

                    {/* Deadline */}
                    {task.deadline && (
                      <div className="mt-2 text-xs" style={{ 
                        color: new Date(task.deadline) < new Date() && task.status !== 'DONE' 
                          ? theme.accent.error 
                          : theme.text.secondary 
                      }}>
                        Due: {new Date(task.deadline).toLocaleDateString()}
                      </div>
                    )}

                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {task.tags.slice(0, 2).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 rounded text-xs"
                            style={{
                              backgroundColor: theme.bg.quaternary,
                              color: theme.text.primary
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                        {task.tags.length > 2 && (
                          <span
                            className="px-2 py-1 rounded text-xs"
                            style={{
                              backgroundColor: theme.bg.quaternary,
                              color: theme.text.primary
                            }}
                          >
                            +{task.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showTaskForm && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ backgroundColor: theme.modalBackdrop }}>
          <div className="rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: theme.bg.secondary }}>
            <div className="sticky top-0 flex justify-between items-center p-6 pb-4 border-b" style={{ 
              backgroundColor: theme.bg.secondary,
              borderColor: theme.border 
            }}>
              <h2 className="text-xl font-semibold" style={{ color: theme.text.primary }}>Create New Task</h2>
              <button
                onClick={() => setShowTaskForm(false)}
                style={{ color: theme.text.secondary }}
                className="hover:opacity-80 hover:cursor-pointer text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <TaskForm onSuccess={() => {
                setShowTaskForm(false);
                void utils.tasks.getAll.invalidate();
              }} />
            </div>
          </div>
        </div>
      )}

      {showTaskDetails && (
        <TaskDetails
          taskId={showTaskDetails}
          onClose={() => {
            setShowTaskDetails(null);
            void utils.tasks.getAll.invalidate();
          }}
        />
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