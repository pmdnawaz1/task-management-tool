import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '~/utils/api';
import { X, Send, AtSign, Paperclip, Edit3 } from 'lucide-react';
import { sendEmail } from '~/utils/email';
import { useTheme } from '~/contexts/ThemeContext';
import TaskForm from './TaskForm';

interface TaskDetailsProps {
  taskId: string;
  onClose: () => void;
}


type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

export default function TaskDetails({ taskId, onClose }: TaskDetailsProps) {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const [newComment, setNewComment] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  const { data: task } = api.tasks.getById.useQuery({ id: taskId });
  const { data: users } = api.users.getAll.useQuery();
  const utils = api.useUtils();
  
  const updateStatus = api.tasks.updateStatus.useMutation({
    onSuccess: () => {
      void utils.tasks.getById.invalidate({ id: taskId });
      void utils.tasks.getAll.invalidate();
    },
  });
  
  const addComment = api.tasks.addComment.useMutation({
    onSuccess: () => {
      setNewComment('');
      void utils.tasks.getById.invalidate({ id: taskId });
      void utils.tasks.getAll.invalidate();
    },
  });
  
  const addAttachment = api.tasks.addAttachment.useMutation({
    onSuccess: () => {
      setAttachments([]);
      void utils.tasks.getById.invalidate({ id: taskId });
      void utils.tasks.getAll.invalidate();
    },
  });

  if (!task) return null;

  const canChangeStatus = session?.user?.role === 'ADMIN' || task.assignedTo?.id === session?.user?.id;
  const canEditTask = session?.user?.role === 'ADMIN' || task.createdBy?.id === session?.user?.id;

  const getStatusColor = (status: 'OPEN' | 'IN_PROGRESS' | 'REVIEW' | 'DONE') => {
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

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!canChangeStatus) return;
    updateStatus.mutate({ id: taskId, status: newStatus });

    // Send email notification for status change
    if (task.assignedTo.email) {
      await sendEmail({
        to: task.assignedTo.email,
        subject: `Task Status Updated: ${task.title}`,
        text: `The status of your task "${task.title}" has been updated to ${newStatus.replace('_', ' ')}.`,
        html: `
          <h2>Task Status Updated</h2>
          <p>The status of your task "<strong>${task.title}</strong>" has been updated to <strong>${newStatus.replace('_', ' ')}</strong>.</p>
          <p>You can view the task details in your dashboard.</p>
        `
      });
    }
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);

    // Handle mentions
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = value.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setMentionQuery(textAfterAt);
        setShowMentions(true);
        setMentionStartIndex(lastAtIndex);
        return;
      }
    }
    setShowMentions(false);
  };

  const handleMentionSelect = (user: { id: string; name: string }) => {
    const beforeMention = newComment.slice(0, mentionStartIndex);
    const afterMention = newComment.slice(mentionStartIndex + mentionQuery.length + 1);
    setNewComment(`${beforeMention}@${user.name} ${afterMention}`);
    setShowMentions(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const handleUploadAttachments = async () => {
    if (attachments.length === 0) return;

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

      // Add attachments to task
      addAttachment.mutate({
        taskId,
        attachments: uploadedAttachments,
      });
    } catch (error) {
      // Error uploading attachments
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    // Extract mentions
    const mentions = users?.filter(user => 
      user.name && newComment.includes(`@${user.name}`)
    ).map(user => user.id) ?? [];

    addComment.mutate({
      taskId,
      content: newComment,
      mentions,
    });

    // Send email notifications for mentions
    const mentionedUsers = users?.filter(user => 
      user.name && user.email && newComment.includes(`@${user.name}`)
    ) ?? [];

    for (const user of mentionedUsers) {
      if (user.email) {
        await sendEmail({
          to: user.email,
          subject: `You were mentioned in a task: ${task.title}`,
          text: `${session?.user?.name ?? 'Someone'} mentioned you in a comment on task "${task.title}":\n\n${newComment}`,
          html: `
            <h2>You were mentioned in a task</h2>
            <p><strong>${session?.user?.name ?? 'Someone'}</strong> mentioned you in a comment on task "<strong>${task.title}</strong>":</p>
            <blockquote>${newComment}</blockquote>
            <p>You can view the task details in your dashboard.</p>
          `
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ backgroundColor: theme.modalBackdrop }}>
      <div className="rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: theme.bg.secondary }}>
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold" style={{ color: theme.text.primary }}>{task.title}</h2>
            <p style={{ color: theme.text.secondary }} className="mt-2">{task.description}</p>
          </div>
          <div className="flex items-center space-x-2">
            {canEditTask && (
              <button
                onClick={() => setShowEditForm(true)}
                className="flex items-center px-3 py-2 rounded-lg hover:opacity-80"
                style={{ backgroundColor: theme.accent.secondary, color: theme.text.onAccent }}
                title="Edit Task"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              style={{ color: theme.text.secondary }}
              className="hover:opacity-80"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Assigned To</h3>
            <p style={{ color: theme.text.primary }}>{task.assignedTo.name ?? task.assignedTo.email}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Created By</h3>
            <p style={{ color: theme.text.primary }}>{task.createdBy.name ?? task.createdBy.email}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Priority</h3>
            <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ 
              backgroundColor: getPriorityColor(task.priority),
              color: theme.text.onAccent
            }}>
              {task.priority}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Deadline</h3>
            <p style={{ color: theme.text.primary }}>
              {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
            </p>
          </div>
          <div className="md:col-span-2">
            <h3 className="text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Status</h3>
            <div className="flex space-x-2">
              {(['OPEN', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const).map((status) => (
                <div key={status} className="relative group">
                  <button
                    onClick={() => handleStatusChange(status)}
                    disabled={!canChangeStatus}
                    className="px-2 py-1 rounded-full text-xs font-medium hover:opacity-90"
                    style={{ 
                      backgroundColor: task.status === status ? getStatusColor(status) : theme.bg.tertiary,
                      color: task.status === status ? theme.text.onAccent : theme.text.primary,
                      opacity: !canChangeStatus ? 0.5 : 1,
                      cursor: !canChangeStatus ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {status.replace('_', ' ')}
                  </button>
                  {!canChangeStatus && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10" style={{ 
                      backgroundColor: theme.bg.primary,
                      color: theme.text.primary,
                      border: `1px solid ${theme.border}`
                    }}>
                      Only admins and assignees can update task status
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t pt-6" style={{ border: `1px solid ${theme.border}` }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium" style={{ color: theme.text.primary }}>Task Attachments</h3>
            <label className="flex items-center px-4 py-2 rounded-md cursor-pointer hover:opacity-90" style={{ backgroundColor: theme.accent.primary, color: theme.text.onAccent }}>
              <Paperclip className="w-4 h-4 mr-2" />
              Add Files
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.md,.xlsx"
              />
            </label>
          </div>
          
          {attachments.length > 0 && (
            <div className="mb-4">
              <p className="text-sm mb-2" style={{ color: theme.text.secondary }}>
                Selected Files ({attachments.length}):
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center space-x-2 px-2 py-1 rounded" style={{ backgroundColor: theme.bg.quaternary }}>
                    <span className="text-sm" style={{ color: theme.text.primary }}>
                      {file.name} ({Math.round(file.size / 1024)}KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                      className="text-sm hover:opacity-80"
                      style={{ color: theme.accent.primary }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleUploadAttachments}
                disabled={isUploading}
                className="px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: theme.accent.primary, color: theme.text.onAccent }}
              >
                {isUploading ? 'Uploading...' : 'Upload Files'}
              </button>
            </div>
          )}
          
          {task.attachments && task.attachments.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {task.attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center space-x-3 p-3 rounded-lg" style={{ backgroundColor: theme.bg.tertiary }}>
                  <Paperclip className="w-5 h-5" style={{ color: theme.text.secondary }} />
                  <div className="flex-1 min-w-0">
                    <a
                      href={attachment.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block hover:opacity-80"
                      style={{ color: theme.accent.primary }}
                    >
                      <p className="font-medium truncate">{attachment.fileName}</p>
                      <p className="text-xs" style={{ color: theme.text.secondary }}>
                        {Math.round(attachment.fileSize / 1024)}KB
                      </p>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {(!task.attachments || task.attachments.length === 0) && attachments.length === 0 && (
            <p className="text-center py-8" style={{ color: theme.text.secondary }}>No attachments yet. Add files to share with your team.</p>
          )}
        </div>

        <div className="border-t pt-6" style={{ border: `1px solid ${theme.border}` }}>
          <h3 className="text-lg font-medium mb-4" style={{ color: theme.text.primary }}>Comments</h3>
          <div className="space-y-4 mb-6">
            {task.comments.map((comment) => (
              <div key={comment.id} className="rounded-lg p-4" style={{ backgroundColor: theme.bg.tertiary }}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium" style={{ color: theme.text.primary }}>{comment.author.name ?? comment.author.email}</p>
                    <p className="text-sm" style={{ color: theme.text.secondary }}>
                      {new Date(comment.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="whitespace-pre-wrap" style={{ color: theme.text.primary }}>
                  {comment.content.split(' ').map((word, i) => {
                    if (word.startsWith('@')) {
                      const mentionedUser = users?.find(u => u.name && word === `@${u.name}`);
                      if (mentionedUser) {
                        return (
                          <span key={i} style={{ color: theme.accent.primary }}>
                            {word}{' '}
                          </span>
                        );
                      }
                    }
                    return <span key={i}>{word} </span>;
                  })}
                </p>
                {comment.attachments && comment.attachments.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm mb-2" style={{ color: theme.text.secondary }}>Attachments:</div>
                    <div className="space-y-1">
                      {comment.attachments.map(attachment => (
                        <div key={attachment.id} className="flex items-center space-x-2 text-sm">
                          <Paperclip className="w-4 h-4" style={{ color: theme.text.secondary }} />
                          <a
                            href={attachment.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:opacity-80"
                            style={{ color: theme.accent.primary }}
                          >
                            {attachment.fileName}
                          </a>
                          <span style={{ color: theme.text.secondary }}>
                            ({Math.round(attachment.fileSize / 1024)}KB)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmitComment} className="relative">
            <div className="relative">
              <textarea
                value={newComment}
                onChange={handleCommentChange}
                placeholder="Add a comment... Use @ to mention someone"
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 resize-none"
                style={{ 
                  backgroundColor: theme.bg.tertiary,
                  color: theme.text.primary,
                  border: `1px solid ${theme.border}`
                }}
                rows={3}
              />
              <AtSign className="absolute right-3 top-3 w-5 h-5" style={{ color: theme.text.secondary }} />
            </div>
            {showMentions && (
              <div className="absolute bottom-full left-0 mb-2 w-full rounded-lg shadow-lg max-h-48 overflow-y-auto" style={{ 
                backgroundColor: theme.bg.secondary,
                border: `1px solid ${theme.border}`
              }}>
                {users?.filter(user => 
                  user.name?.toLowerCase().includes(mentionQuery.toLowerCase())
                ).map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleMentionSelect({ id: user.id, name: user.name ?? '' })}
                    className="w-full px-4 py-2 text-left hover:opacity-80"
                    style={{ color: theme.text.primary }}
                  >
                    {user.name ?? user.email}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={!newComment.trim() || addComment.isPending}
                className="flex items-center px-4 py-2 rounded-md hover:opacity-90"
                style={{ 
                  backgroundColor: theme.accent.primary,
                  color: theme.text.onAccent,
                  opacity: (!newComment.trim() || addComment.isPending) ? 0.5 : 1,
                  cursor: (!newComment.trim() || addComment.isPending) ? 'not-allowed' : 'pointer'
                }}
              >
                <Send className="w-4 h-4 mr-2" />
                {addComment.isPending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Edit Task Modal */}
      {showEditForm && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: theme.modalBackdrop }}>
          <div className="rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: theme.bg.secondary }}>
            <div className="sticky top-0 flex justify-between items-center p-6 pb-4 border-b" style={{ 
              backgroundColor: theme.bg.secondary,
              borderColor: theme.border 
            }}>
              <h3 className="text-xl font-semibold" style={{ color: theme.text.primary }}>Edit Task</h3>
              <button
                onClick={() => setShowEditForm(false)}
                style={{ color: theme.text.secondary }}
                className="hover:opacity-80"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <TaskForm 
                taskId={taskId}
                initialData={{
                  title: task.title,
                  description: task.description ?? '',
                  deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '',
                  priority: task.priority,
                  assignedToId: task.assignedTo.id,
                  tags: task.tags?.join(', ') ?? '',
                  dod: task.dod ?? '',
                }}
                onSuccess={() => {
                  setShowEditForm(false);
                  void utils.tasks.getById.invalidate({ id: taskId });
                  void utils.tasks.getAll.invalidate();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 