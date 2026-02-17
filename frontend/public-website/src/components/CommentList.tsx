import React from 'react';
import { Comment } from './Comment';
import type { Comment as CommentType } from '../hooks/useComments';

interface CommentListProps {
  comments: CommentType[];
  onReply?: (commentId: string) => void;
}

export const CommentList: React.FC<CommentListProps> = ({ comments, onReply }) => {
  // Build comment tree
  interface CommentWithChildren extends CommentType {
    children: CommentWithChildren[];
  }
  
  const commentMap = new Map<string, CommentWithChildren>();
  const rootComments: CommentWithChildren[] = [];

  // Initialize all comments in map
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, children: [] });
  });

  // Build tree structure
  comments.forEach(comment => {
    const commentWithChildren = commentMap.get(comment.id)!;
    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.children.push(commentWithChildren);
      } else {
        rootComments.push(commentWithChildren);
      }
    } else {
      rootComments.push(commentWithChildren);
    }
  });

  const renderComment = (comment: CommentWithChildren, depth = 0) => (
    <div key={comment.id}>
      <Comment comment={comment} onReply={onReply} depth={depth} />
      {comment.children.length > 0 && (
        <div className="comment-replies">
          {comment.children.map(child => renderComment(child, depth + 1))}
        </div>
      )}
    </div>
  );

  if (comments.length === 0) {
    return (
      <div className="no-comments">
        <p>No comments yet. Be the first to comment!</p>
      </div>
    );
  }

  return (
    <div className="comment-list">
      {rootComments.map(comment => renderComment(comment))}
    </div>
  );
};
