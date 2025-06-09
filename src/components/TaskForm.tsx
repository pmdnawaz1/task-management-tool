import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '~/utils/api';
import { Calendar, User, Tag, AlertCircle, Paperclip } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTheme } from '~/contexts/ThemeContext';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  deadline: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  tags: z.string().optional(),
  assignedToId: z.string().min(1, 'Assignee is required'),
  dod: z.string().optional(),
  attachments: z.array(z.instanceof(File)).optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  onSuccess?: () => void;
  initialData?: Partial<TaskFormData>;
  taskId?: string;
}

export default function TaskForm({ onSuccess, initialData, taskId }: TaskFormProps) {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const { data: users } = api.users.getAll.useQuery();
  const createTask = api.tasks.create.useMutation();
  const updateTask = api.tasks.update.useMutation();
  const utils = api.useUtils();
  
  const isAdmin = session?.user?.role === 'ADMIN';
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: initialData,
  });


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    setIsUploading(true);
    
    try {
      // Upload attachments first
      const uploadedAttachments = [];
      
      for (const file of attachments) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('File upload failed');
        }
        
        const uploadResult = await response.json() as {
          fileName: string;
          fileUrl: string;
          fileSize: number;
          mimeType: string;
        };
        uploadedAttachments.push({
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.fileUrl,
          fileSize: uploadResult.fileSize,
          mimeType: uploadResult.mimeType,
        });
      }

      const taskData = {
        ...data,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        attachments: uploadedAttachments,
      };

      let newTaskId;
      if (taskId) {
        const updatedTask = await updateTask.mutateAsync({ id: taskId, ...taskData });
        newTaskId = updatedTask.id;
      } else {
        const newTask = await createTask.mutateAsync(taskData);
        newTaskId = newTask.id;
      }

      // Invalidate queries to refresh the task list
      await utils.tasks.getAll.invalidate();
      await utils.tasks.getById.invalidate({ id: newTaskId });
      
      reset();
      setAttachments([]);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6 rounded-lg shadow-md" style={{ backgroundColor: theme.bg.secondary, border: `1px solid ${theme.border}` }}>
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
          Title *
        </label>
        <input
          {...register('title')}
          type="text"
          id="title"
          className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2"
          style={{ 
            backgroundColor: theme.bg.tertiary,
            color: theme.text.primary,
            border: `1px solid ${theme.border}`
          }}
          placeholder="Enter task title"
        />
        {errors.title && (
          <p className="mt-1 text-sm" style={{ color: theme.accent.primary }}>{errors.title.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
          Description
        </label>
        <textarea
          {...register('description')}
          id="description"
          rows={3}
          className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 resize-none"
          style={{ 
            backgroundColor: theme.bg.tertiary,
            color: theme.text.primary,
            border: `1px solid ${theme.border}`
          }}
          placeholder="Enter task description"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="deadline" className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
            <Calendar className="inline w-4 h-4 mr-1" />
            Deadline
          </label>
          <input
            {...register('deadline')}
            type="datetime-local"
            id="deadline"
            className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2"
            style={{ 
              backgroundColor: theme.bg.tertiary,
              color: theme.text.primary,
              border: `1px solid ${theme.border}`
            }}
          />
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
            <AlertCircle className="inline w-4 h-4 mr-1" />
            Priority
          </label>
          <select
            {...register('priority')}
            id="priority"
            className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2"
            style={{ 
              backgroundColor: theme.bg.tertiary,
              color: theme.text.primary,
              border: `1px solid ${theme.border}`
            }}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="assignedTo" className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
          <User className="inline w-4 h-4 mr-1" />
          Assigned To *
        </label>
        <select
          {...register('assignedToId')}
          id="assignedTo"
          className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2"
          style={{ 
            backgroundColor: theme.bg.tertiary,
            color: theme.text.primary,
            border: `1px solid ${theme.border}`
          }}
        >
          <option value="">Select assignee</option>
          {users?.map(user => (
            <option key={user.id} value={user.id}>
              {user.name ?? user.email} ({user.email})
            </option>
          ))}
        </select>
        {errors.assignedToId && (
          <p className="mt-1 text-sm" style={{ color: theme.accent.primary }}>{errors.assignedToId.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
          <Tag className="inline w-4 h-4 mr-1" />
          Tags
        </label>
        <input
          {...register('tags')}
          type="text"
          id="tags"
          className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2"
          style={{ 
            backgroundColor: theme.bg.tertiary,
            color: theme.text.primary,
            border: `1px solid ${theme.border}`
          }}
          placeholder="Enter tags separated by commas"
        />
      </div>

      <div>
        <label htmlFor="dod" className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
          Definition of Done
        </label>
        <textarea
          {...register('dod')}
          id="dod"
          rows={3}
          className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 resize-none"
          style={{ 
            backgroundColor: theme.bg.tertiary,
            color: theme.text.primary,
            border: `1px solid ${theme.border}`
          }}
          placeholder="Define what 'done' means for this task"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
          <Paperclip className="inline w-4 h-4 mr-1" />
          Attachments
        </label>
        <div className="space-y-2">
          <label className="flex items-center px-4 py-2 rounded-md cursor-pointer hover:opacity-90" style={{ backgroundColor: theme.bg.tertiary, border: `1px solid ${theme.border}` }}>
            <Paperclip className="w-4 h-4 mr-2" style={{ color: theme.text.secondary }} />
            <span style={{ color: theme.text.primary }}>Choose Files</span>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt,.md,.xlsx"
            />
          </label>
          
          {attachments.length > 0 && (
            <div className="mt-2">
              <p className="text-sm mb-2" style={{ color: theme.text.secondary }}>
                Selected Files ({attachments.length}):
              </p>
              <div className="space-y-1">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: theme.bg.quaternary }}>
                    <span className="text-sm" style={{ color: theme.text.primary }}>
                      {file.name} ({Math.round(file.size / 1024)}KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                      className="text-sm hover:opacity-80"
                      style={{ color: theme.accent.primary }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>


      {isAdmin && taskId && (
        <div>
          <label htmlFor="status" className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>
            Status
          </label>
          <select
            {...register('status')}
            id="status"
            className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2"
            style={{ 
              backgroundColor: theme.bg.tertiary,
              color: theme.text.primary,
              border: `1px solid ${theme.border}`
            }}
          >
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REVIEW">Review</option>
            <option value="DONE">Done</option>
          </select>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 rounded-md hover:opacity-90"
          style={{ 
            backgroundColor: theme.bg.tertiary,
            color: theme.text.primary
          }}
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            backgroundColor: theme.accent.primary,
            color: theme.text.onAccent
          }}
        >
          {isUploading ? 'Uploading...' : isSubmitting ? 'Saving...' : taskId ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  );
}
