import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activityAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Send, Image as ImageIcon, UserPlus, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Activity, User } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface TeamDiscussionSectionProps {
  taskIds: string[];
  projectId?: string;
}

interface AttachedImage {
  id: string;
  file: File;
  preview: string;
  base64?: string;
}

export default function TeamDiscussionSection({ taskIds, projectId }: TeamDiscussionSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentContent, setCommentContent] = useState('');
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<User[]>([]);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch all users for tagging
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => usersAPI.list(),
  });

  // Fetch activities for all tasks
  const { data: allActivities, isLoading } = useQuery({
    queryKey: ['team-discussions', taskIds],
    queryFn: async () => {
      const allActivitiesPromises = taskIds.map((taskId) =>
        activityAPI.list({
          entity_type: 'task',
          entity_id: taskId,
          limit: 50,
        })
      );
      const results = await Promise.all(allActivitiesPromises);
      // Flatten and sort by created_at
      const flattened: Activity[] = [];
      results.forEach((result) => {
        if (result.items) {
          flattened.push(...result.items);
        }
      });
      // Sort by most recent first (newest at top)
      flattened.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return flattened;
    },
    enabled: taskIds.length > 0,
  });

  // Filter users based on search query
  const filteredUsers = allUsers.filter((u: User) => {
    if (!userSearchQuery.trim()) {
      // Show all users when picker opens without query
      return true;
    }
    const query = userSearchQuery.toLowerCase();
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const createCommentMutation = useMutation({
    mutationFn: async ({ taskId, content, images, tags }: { 
      taskId: string; 
      content: string;
      images?: AttachedImage[];
      tags?: User[];
    }) => {
      // Build content with tags
      let finalContent = content;
      if (tags && tags.length > 0) {
        const tagMentions = tags.map(t => `@${t.first_name || t.email || 'user'}`).join(' ');
        finalContent = `${tagMentions} ${finalContent}`;
      }

      // Convert images to base64 and store in metadata
      let imageData: string[] = [];
      if (images && images.length > 0) {
        imageData = await Promise.all(
          images.map(async (img) => {
            if (img.base64) {
              return img.base64;
            }
            return await fileToBase64(img.file);
          })
        );
      }

      return activityAPI.create({
        entity_type: 'task',
        entity_id: taskId,
        activity_type: 'comment',
        content: finalContent,
        metadata: {
          tagged_users: tags?.map(t => t.id) || [],
          images: imageData,
          image_count: imageData.length,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-discussions', taskIds] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setCommentContent('');
      setAttachedImages([]);
      setTaggedUsers([]);
      setShowUserPicker(false);
      setUserSearchQuery('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
  });

  const handleImageAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Please select image files only');
      return;
    }

    // Convert to base64 immediately for storage
    const newImages: AttachedImage[] = await Promise.all(
      imageFiles.map(async (file, index) => {
        const preview = URL.createObjectURL(file);
        const base64 = await fileToBase64(file);
        return {
          id: `${Date.now()}-${index}`,
          file,
          preview,
          base64,
        };
      })
    );

    setAttachedImages([...attachedImages, ...newImages]);
  };

  const removeImage = (imageId: string) => {
    const image = attachedImages.find(img => img.id === imageId);
    if (image) {
      URL.revokeObjectURL(image.preview);
    }
    setAttachedImages(attachedImages.filter(img => img.id !== imageId));
  };

  const handleTagUser = (user: User) => {
    if (!taggedUsers.find(u => u.id === user.id)) {
      setTaggedUsers([...taggedUsers, user]);
    }
    // Remove @ from content if it was just typed
    if (commentContent.endsWith('@')) {
      setCommentContent(commentContent.slice(0, -1));
    }
    setUserSearchQuery('');
    setShowUserPicker(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const removeTag = (userId: string) => {
    setTaggedUsers(taggedUsers.filter(u => u.id !== userId));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCommentContent(value);
    
    // Check for @ mentions
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's a space or newline after @ (meaning @ is complete)
      if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
        setShowUserPicker(false);
      } else {
        // Show picker and set search query
        setShowUserPicker(true);
        setUserSearchQuery(textAfterAt);
      }
    } else {
      setShowUserPicker(false);
    }
  };

  const handleSubmitComment = (e: React.FormEvent, taskId: string) => {
    e.preventDefault();
    if (commentContent.trim() || attachedImages.length > 0) {
      createCommentMutation.mutate({ 
        taskId, 
        content: commentContent.trim(),
        images: attachedImages.length > 0 ? attachedImages : undefined,
        tags: taggedUsers.length > 0 ? taggedUsers : undefined,
      });
    }
  };

  // Cleanup image previews on unmount
  useEffect(() => {
    return () => {
      attachedImages.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, []);

  const activities = allActivities || [];
  const comments = activities.filter((a: Activity) => a.action === 'commented' || a.activity_type === 'comment');

  if (taskIds.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
        No tasks available for discussion
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comment Input - At the Top */}
      <form
        onSubmit={(e) => {
          if (taskIds.length > 0) {
            handleSubmitComment(e, taskIds[0]);
          }
        }}
        className="space-y-3"
      >
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full bg-primary-500 dark:bg-primary-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {user?.first_name?.[0] || user?.email?.[0] || 'U'}
          </div>
          <div className="flex-1 relative">
            {/* Tagged Users Display */}
            {taggedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {taggedUsers.map((taggedUser) => (
                  <span
                    key={taggedUser.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-md text-xs"
                  >
                    @{taggedUser.first_name || taggedUser.email}
                    <button
                      type="button"
                      onClick={() => removeTag(taggedUser.id)}
                      className="hover:text-primary-900 dark:hover:text-primary-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={commentContent}
              onChange={handleInputChange}
              placeholder="Add a comment to the discussion... (Use @ to mention someone)"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white resize-none"
            />

            {/* User Picker Dropdown */}
            {showUserPicker && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto scrollbar-modern">
                {filteredUsers.length > 0 ? (
                  filteredUsers.slice(0, 10).map((u: User) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleTagUser(u)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary-500 dark:bg-primary-600 flex items-center justify-center text-white text-xs">
                        {u.first_name?.[0] || u.email?.[0] || 'U'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {u.first_name} {u.last_name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No users found
                  </div>
                )}
              </div>
            )}

            {/* Attached Images Preview */}
            {attachedImages.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {attachedImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img
                      src={img.preview}
                      alt={img.file.name}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-1 py-0.5 rounded-b-lg truncate">
                      {img.file.name}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2">
                {/* Image Attachment Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  title="Attach image"
                >
                  <ImageIcon className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Image</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageAttach}
                  className="hidden"
                />

                {/* Tag User Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserPicker(!showUserPicker);
                    setUserSearchQuery('');
                    if (!showUserPicker && !commentContent.endsWith('@')) {
                      setCommentContent(commentContent + '@');
                    }
                  }}
                  className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  title="Tag someone"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Tag</span>
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={(!commentContent.trim() && attachedImages.length === 0) || createCommentMutation.isPending}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4 mr-2" />
                {createCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List - Appears Below Input */}
      {isLoading ? (
        <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
          Loading discussions...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
          No discussions yet. Start the conversation!
        </div>
      ) : (
        <div className="space-y-4 max-h-[calc(100vh-500px)] overflow-y-auto scrollbar-modern pr-2">
          {comments.map((activity: Activity) => {
            // Extract tagged users from content and metadata
            const taggedMatches = activity.content?.match(/@(\w+)/g) || [];
            const taggedUserIds = activity.metadata?.tagged_users || [];
            const taggedUsersFromMetadata = allUsers.filter((u: User) => 
              taggedUserIds.includes(u.id)
            );
            
            // Remove tag mentions from content for display
            let contentWithoutTags = activity.content || '';
            if (taggedMatches.length > 0) {
              taggedMatches.forEach(tag => {
                contentWithoutTags = contentWithoutTags.replace(tag, '').trim();
              });
            }
            
            // Get images from metadata
            const images = activity.metadata?.images || [];
            
            return (
              <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <div className="w-8 h-8 rounded-full bg-primary-500 dark:bg-primary-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {activity.user_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.user_name || 'Unknown User'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  {/* Tagged Users */}
                  {(taggedMatches.length > 0 || taggedUsersFromMetadata.length > 0) && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {taggedUsersFromMetadata.length > 0 ? (
                        taggedUsersFromMetadata.map((taggedUser) => (
                          <span
                            key={taggedUser.id}
                            className="inline-flex items-center px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs"
                          >
                            @{taggedUser.first_name || taggedUser.email}
                          </span>
                        ))
                      ) : (
                        taggedMatches.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))
                      )}
                    </div>
                  )}

                  {/* Comment Content */}
                  {contentWithoutTags && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-2">
                      {contentWithoutTags}
                    </p>
                  )}

                  {/* Display Images */}
                  {images && images.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {images.map((imageBase64: string, idx: number) => (
                        <div key={idx} className="relative">
                          <img
                            src={imageBase64}
                            alt={`Attached image ${idx + 1}`}
                            className="max-w-xs max-h-64 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              // Open image in new tab for full view
                              const newWindow = window.open();
                              if (newWindow) {
                                newWindow.document.write(`<img src="${imageBase64}" style="max-width: 100%; height: auto;" />`);
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Image Count Indicator (fallback) */}
                  {(!images || images.length === 0) && activity.metadata?.image_count > 0 && (
                    <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <ImageIcon className="w-3 h-3 mr-1" />
                      {activity.metadata.image_count} image(s) attached
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
