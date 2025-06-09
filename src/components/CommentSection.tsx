import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { api } from '~/utils/api';
import { Send, Trash2, AtSign, Paperclip } from 'lucide-react';
import { useTheme } from '~/contexts/ThemeContext';

interface Comment {
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
  attachments?: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
}

interface CommentSectionProps {
  taskId: string;
  comments: Comment[];
}

export default function CommentSection({ taskId, comments }: CommentSectionProps) {
  const { theme } = useTheme();
  const [showMentions, setShowMentions] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const { data: users } = api.users.getAll.useQuery();
  const createComment = api.comments.create.useMutation();
  const deleteComment = api.comments.delete.useMutation();
  
  const { register, handleSubmit, reset, watch, setValue } = useForm<{
    content: string;
  }>();

  const commentContent = watch('content') ?? '';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const onSubmit = async (data: { content: string }) => {
    const mentions = extractMentions(data.content);
    const mentionedUserIds = mentions
      .map(mention => users?.find(u => u.name?.toLowerCase() === mention.toLowerCase())?.id)
      .filter((id): id is string => Boolean(id));

    try {
      setIsUploading(true);
      
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

      await createComment.mutateAsync({
        taskId,
        content: data.content,
        mentions: mentionedUserIds,
        attachments: uploadedAttachments,
      });

      reset();
      setAttachments([]);
    } catch (error) {
      console.error('Error creating comment:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const extractMentions = (content: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      if (match[1]) {
        mentions.push(match[1]);
      }
    }
    return mentions;
  };

  const insertMention = (userName: string) => {
    const currentContent = commentContent ?? '';
    const newContent = currentContent + `@${userName} `;
    setValue('content', newContent);
    setShowMentions(false);
  };

  const handleDelete = async (commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await deleteComment.mutateAsync({ id: commentId });
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }
  };

  return (
    <div style={{ backgroundColor: theme.bg.secondary }} className="rounded-lg shadow-md p-6">
      <h3 style={{ color: theme.text.primary }} className="text-lg font-semibold mb-4">Comments ({comments.length})</h3>
      
      {/* Comment Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="mb-6">
        <div className="relative">
          <textarea
            {...register('content', { required: true })}
            rows={3}
            style={{ 
              backgroundColor: theme.bg.primary,
              color: theme.text.primary,
              border: `1px solid ${theme.border}`,
            }}
            className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2"
            placeholder="Write a comment... Use @username to mention someone"
          />
          <div className="absolute top-2 right-2 flex space-x-2">
            <button
              type="button"
              onClick={() => setShowMentions(!showMentions)}
              style={{ color: theme.text.secondary }}
              className="p-1 hover:opacity-80"
            >
              <AtSign className="w-4 h-4" />
            </button>
            <label style={{ color: theme.text.secondary }} className="p-1 hover:opacity-80 cursor-pointer">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <Paperclip className="w-4 h-4" />
            </label>
          </div>
          
          {showMentions && (
            <div style={{ 
              backgroundColor: theme.bg.secondary,
              border: `1px solid ${theme.border}`
            }} className="absolute right-0 top-12 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
              {users?.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => insertMention(user.name ?? user.email)}
                  style={{ 
                    color: theme.text.primary,
                    backgroundColor: 'transparent'
                  }}
                  className="block w-full text-left px-3 py-2 hover:opacity-80 text-sm"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.bg.tertiary || theme.bg.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {user.name ?? user.email} ({user.email})
                </button>
              ))}
            </div>
          )}
        </div>
        
        {attachments.length > 0 && (
          <div className="mt-2">
            <p style={{ color: theme.text.secondary }} className="text-sm">
              Attachments: {attachments.map(f => f.name).join(', ')}
            </p>
          </div>
        )}
        
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={!commentContent.trim() || isUploading}
            style={{ 
              backgroundColor: theme.accent.primary,
              color: theme.text.onAccent || '#ffffff'
            }}
            className="flex items-center px-4 py-2 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Post Comment'}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map(comment => (
          <div key={comment.id} style={{ 
            border: `1px solid ${theme.border}`,
            backgroundColor: theme.bg.primary
          }} className="rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center space-x-2">
                <span style={{ color: theme.text.primary }} className="font-medium">
                  {comment.author.name ?? comment.author.email}
                </span>
                <span style={{ color: theme.text.secondary }} className="text-sm">
                  {format(new Date(comment.createdAt), 'MMM d, yyyy HH:mm')}
                </span>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleDelete(comment.id)}
                  style={{ color: theme.text.secondary }}
                  className="p-1 hover:opacity-80"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = theme.accent.error || '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = theme.text.secondary;
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div style={{ color: theme.text.primary }} className="whitespace-pre-wrap">
              {comment.content}
            </div>
            
            {comment.mentions.length > 0 && (
              <div className="mt-2 flex items-center space-x-2">
                <AtSign style={{ color: theme.text.secondary }} className="w-4 h-4" />
                <span style={{ color: theme.text.secondary }} className="text-sm">
                  Mentioned: {comment.mentions.map(m => m.user.name ?? m.user.email).join(', ')}
                </span>
              </div>
            )}
            
            {comment.attachments && comment.attachments.length > 0 && (
              <div className="mt-2">
                <div style={{ color: theme.text.secondary }} className="text-sm mb-1">Attachments:</div>
                <div className="space-y-1">
                  {comment.attachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center space-x-2 text-sm">
                      <Paperclip style={{ color: theme.text.secondary }} className="w-4 h-4" />
                      <a
                        href={attachment.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: theme.accent.primary }}
                        className="hover:opacity-80 underline"
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
        
        {comments.length === 0 && (
          <p style={{ color: theme.text.secondary }} className="text-center py-8">No comments yet. Be the first to comment!</p>
        )}
      </div>
    </div>
  );
}
