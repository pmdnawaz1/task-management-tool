import { format } from 'date-fns';
import { Calendar, User, Tag, MessageCircle, Paperclip, Clock, Edit3 } from 'lucide-react';
import { useTheme } from '~/contexts/ThemeContext';
import { useSession } from 'next-auth/react';

interface TaskCardTask {
  id: string;
  title: string;
  description: string | null;
  deadline: Date | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  tags: string[];
  status: 'OPEN' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
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
    mentions: Array<{
      user: {
        id: string;
        name: string | null;
        email: string;
      };
    }>;
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

interface TaskCardProps {
  task: TaskCardTask;
  onClick?: () => void;
  onEdit?: () => void;
}


export default function TaskCard({ task, onClick, onEdit }: TaskCardProps) {
  const { theme } = useTheme();
  const { data: session } = useSession();
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'DONE';
  const canEditTask = session?.user?.role === 'ADMIN' || task.createdBy?.id === session?.user?.id;
  
  const getPriorityColor = (priority: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (priority) {
      case 'HIGH': return theme.priority.high;
      case 'MEDIUM': return theme.priority.medium;
      case 'LOW': return theme.priority.low;
      default: return theme.text.secondary;
    }
  };
  
  const getStatusColor = (status: 'OPEN' | 'IN_PROGRESS' | 'REVIEW' | 'DONE') => {
    switch (status) {
      case 'OPEN': return theme.status.open;
      case 'IN_PROGRESS': return theme.status.inProgress;
      case 'REVIEW': return theme.status.review;
      case 'DONE': return theme.status.done;
      default: return theme.text.secondary;
    }
  };

  return (
    <div 
      onClick={onClick}
      className="rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
      style={{
        backgroundColor: theme.bg.secondary,
        borderLeft: `4px solid ${theme.accent.primary}`,
        border: `1px solid ${theme.border}`,
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold line-clamp-2 flex-1" style={{ color: theme.text.primary }}>
          {task.title}
        </h3>
        <div className="flex items-center space-x-2 ml-2">
          {canEditTask && onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 rounded hover:opacity-80"
              style={{ backgroundColor: theme.bg.tertiary, color: theme.text.secondary }}
              title="Edit Task"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          <div className="flex space-x-1">
            <span 
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: getPriorityColor(task.priority),
                color: theme.text.onAccent
              }}
            >
              {task.priority}
            </span>
            <span 
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: getStatusColor(task.status),
                color: theme.text.onAccent
              }}
            >
              {task.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {task.description && (
        <p className="text-sm mb-3 line-clamp-2" style={{ color: theme.text.secondary }}>
          {task.description}
        </p>
      )}

      <div className="space-y-2 mb-3">
        <div className="flex items-center text-sm" style={{ color: theme.text.secondary }}>
          <User className="w-4 h-4 mr-1" style={{ color: theme.text.secondary }} />
          <span>Assigned to: {task.assignedTo.name ?? task.assignedTo.email}</span>
        </div>
        <div className="flex items-center text-sm" style={{ color: theme.text.secondary }}>
          <User className="w-4 h-4 mr-1" style={{ color: theme.text.secondary }} />
          <span>Created by: {task.createdBy.name ?? task.createdBy.email}</span>
        </div>
      </div>

      {task.deadline && (
        <div className="flex items-center text-sm mb-3" style={{ color: isOverdue ? theme.accent.error : theme.text.secondary }}>
          <Calendar className="w-4 h-4 mr-1" style={{ color: isOverdue ? theme.accent.error : theme.text.secondary }} />
          <span>
            {format(new Date(task.deadline), 'MMM d, yyyy HH:mm')}
            {isOverdue && <span className="ml-1 font-medium">(Overdue)</span>}
          </span>
        </div>
      )}

      {task.tags && task.tags.length > 0 && (
        <div className="flex items-center mb-3">
          <Tag className="w-4 h-4 mr-1" style={{ color: theme.text.secondary }} />
          <div className="flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 rounded-full text-xs"
                style={{ 
                  backgroundColor: theme.bg.quaternary,
                  color: theme.text.primary
                }}
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span 
                className="px-2 py-1 rounded-full text-xs"
                style={{ 
                  backgroundColor: theme.bg.quaternary,
                  color: theme.text.primary
                }}
              >
                +{task.tags.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center text-sm" style={{ color: theme.text.secondary }}>
        <div className="flex items-center space-x-4">
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center">
              <MessageCircle className="w-4 h-4 mr-1" style={{ color: theme.text.secondary }} />
              <span>{task.comments.length}</span>
            </div>
          )}
          {task.attachments && task.attachments.length > 0 && (
            <div className="flex items-center">
              <Paperclip className="w-4 h-4 mr-1" style={{ color: theme.text.secondary }} />
              <span>{task.attachments.length}</span>
            </div>
          )}
        </div>
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-1" style={{ color: theme.text.secondary }} />
          <span>{format(new Date(task.createdAt), 'MMM d')}</span>
        </div>
      </div>
    </div>
  );
}
