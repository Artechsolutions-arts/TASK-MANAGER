import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activityAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Activity } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface ActivitySectionProps {
  entityType: 'task' | 'project' | 'story' | 'epic';
  entityId: string;
}

type ActivityTab = 'all' | 'comment' | 'history' | 'work_log';

export default function ActivitySection({ entityType, entityId }: ActivitySectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActivityTab>('all');
  const [commentContent, setCommentContent] = useState('');
  const [showCommentEditor, setShowCommentEditor] = useState(false);

  // Map tab to activity type
  const activityTypeMap: Record<ActivityTab, 'comment' | 'history' | 'work_log' | undefined> = {
    all: undefined,
    comment: 'comment',
    history: 'history',
    work_log: 'work_log',
  };

  const { data: activitiesData, isLoading } = useQuery({
    queryKey: ['activities', entityType, entityId, activeTab],
    queryFn: () => activityAPI.list({
      entity_type: entityType,
      entity_id: entityId,
      activity_type: activityTypeMap[activeTab],
      limit: 100,
    }),
  });

  const createCommentMutation = useMutation({
    mutationFn: (content: string) => activityAPI.create({
      entity_type: entityType,
      entity_id: entityId,
      activity_type: 'comment',
      content,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', entityType, entityId] });
      setCommentContent('');
      setShowCommentEditor(false);
    },
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentContent.trim()) {
      createCommentMutation.mutate(commentContent);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserAvatarColor = (name: string) => {
    const colors = [
      'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  const activities = activitiesData?.items || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Activity</h2>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-1">
          {(['all', 'comment', 'history', 'work_log'] as ActivityTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab
                  ? 'bg-blue-500 text-white border-b-2 border-blue-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab === 'all' ? 'All' : tab === 'comment' ? 'Comments' : tab === 'history' ? 'History' : 'Work log'}
            </button>
          ))}
        </div>
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
        </button>
      </div>

      {/* Comment Editor */}
      {activeTab === 'all' || activeTab === 'comment' ? (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          {!showCommentEditor ? (
            <button
              onClick={() => setShowCommentEditor(true)}
              className="flex items-center space-x-3 w-full text-left p-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
            >
              <div className={`w-8 h-8 rounded-full ${getUserAvatarColor(user?.first_name || 'U')} flex items-center justify-center text-white text-sm font-semibold`}>
                {getUserInitials(`${user?.first_name || ''} ${user?.last_name || ''}`)}
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                Add a comment...
              </span>
            </button>
          ) : (
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-full ${getUserAvatarColor(user?.first_name || 'U')} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
                  {getUserInitials(`${user?.first_name || ''} ${user?.last_name || ''}`)}
                </div>
                <div className="flex-1">
                  <textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="Type a comment..."
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <div className="flex justify-end space-x-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCommentEditor(false);
                        setCommentContent('');
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!commentContent.trim() || createCommentMutation.isPending}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {createCommentMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      ) : null}

      {/* Activity List */}
      <div className="px-6 py-4 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading activities...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">No activities yet</div>
        ) : (
          <div className="space-y-6">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-full ${getUserAvatarColor(activity.user_name)} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
                  {getUserInitials(activity.user_name)}
                </div>
                <div className="flex-1 min-w-0">
                  {activity.activity_type === 'comment' && (
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white">{activity.user_name}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{formatTimeAgo(activity.created_at)}</span>
                      </div>
                      {activity.content && (
                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {activity.content}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {activity.activity_type === 'history' && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">{activity.user_name}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{activity.action}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{formatTimeAgo(activity.created_at)}</span>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3 mt-2">
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">
                          History
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="text-gray-500 dark:text-gray-400">{activity.old_value || 'None'}</span>
                          {' → '}
                          <span className="font-medium">{activity.new_value || 'None'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activity.activity_type === 'work_log' && (
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white">{activity.user_name}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">logged {activity.hours}h</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{formatTimeAgo(activity.created_at)}</span>
                      </div>
                      {activity.content && (
                        <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {activity.content}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
