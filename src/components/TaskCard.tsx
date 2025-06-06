import { format } from 'date-fns';
import { Calendar, User, Tag, MessageCircle, Paperclip, Clock } from 'lucide-react';

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
}

const priorityColors = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-red-100 text-red-800',
};

const statusColors = {
  OPEN: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  REVIEW: 'bg-purple-100 text-purple-800',
  DONE: 'bg-green-100 text-green-800',
};

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'DONE';

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-blue-500"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
          {task.title}
        </h3>
        <div className="flex space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
            {task.priority}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[task.status]}`}>
            {task.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {task.description && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center text-sm text-gray-500 mb-3">
        <User className="w-4 h-4 mr-1" />
        <span>{task.assignedTo.name || task.assignedTo.email}</span>
      </div>

      {task.deadline && (
        <div className={`flex items-center text-sm mb-3 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
          <Calendar className="w-4 h-4 mr-1" />
          <span>
            {format(new Date(task.deadline), 'MMM d, yyyy HH:mm')}
            {isOverdue && <span className="ml-1 font-medium">(Overdue)</span>}
          </span>
        </div>
      )}

      {task.tags.length > 0 && (
        <div className="flex items-center mb-3">
          <Tag className="w-4 h-4 mr-1 text-gray-400" />
          <div className="flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                +{task.tags.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          {task.comments.length > 0 && (
            <div className="flex items-center">
              <MessageCircle className="w-4 h-4 mr-1" />
              <span>{task.comments.length}</span>
            </div>
          )}
          {task.attachments.length > 0 && (
            <div className="flex items-center">
              <Paperclip className="w-4 h-4 mr-1" />
              <span>{task.attachments.length}</span>
            </div>
          )}
        </div>
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-1" />
          <span>{format(new Date(task.createdAt), 'MMM d')}</span>
        </div>
      </div>
    </div>
  );
}
