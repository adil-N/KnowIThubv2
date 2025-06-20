// controllers/commentController.js
const Comment = require('../models/Comment');
const Article = require('../models/Article');
const ApiResponse = require('../utils/apiResponse');

const commentController = {
    // Get comments for an article
 // controllers/commentController.js
// Update the getComments method
getComments: async (req, res) => {
    try {
        const article = await Article.findById(req.params.articleId)
            .populate({
                path: 'comments',
                populate: [
                    {
                        path: 'author',
                        select: 'email firstName lastName'
                    },
                    {
                        path: 'likes'
                    }
                ]
            });

        if (!article) {
            return ApiResponse.notFound(res, 'Article not found');
        }

        // Check if article is hidden and user has permission
        if (article.hidden && 
            (!req.user.role || (req.user.role !== 'admin' && req.user.role !== 'super'))) {
            return ApiResponse.forbidden(res, 'Access to this article is restricted');
        }

        // Transform comments to include like status for current user
        const commentsWithLikeStatus = article.comments.map(comment => {
            const commentObj = comment.toObject();
            commentObj.isLiked = comment.likes.some(like => 
                like._id.toString() === req.user._id.toString()
            );
            commentObj.likeCount = comment.likes.length;
            return commentObj;
        });
       // Add these logs
       console.log('Current User:', req.user);
       console.log('Comments Data:', commentsWithLikeStatus);

        return ApiResponse.success(res, 'Comments retrieved successfully', commentsWithLikeStatus);
    } catch (error) {
        console.error('Error fetching comments:', error);
        return ApiResponse.serverError(res, 'Error fetching comments');
    }
},

// Update the likeComment method
likeComment: async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);
        
        if (!comment) {
            return ApiResponse.notFound(res, 'Comment not found');
        }

        const userId = req.user._id;
        const isLiked = comment.likes.includes(userId);

        if (isLiked) {
            // Unlike if already liked
            comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
        } else {
            // Like if not already liked
            comment.likes.push(userId);
        }

        await comment.save();
        
        return ApiResponse.success(res, `Comment ${isLiked ? 'unliked' : 'liked'} successfully`, {
            likeCount: comment.likes.length,
            isLiked: !isLiked
        });
    } catch (error) {
        console.error('Error toggling comment like:', error);
        return ApiResponse.serverError(res, 'Error toggling comment like');
    }
},
    // Add comment to an article
    addComment: async (req, res) => {
        try {
            const { content } = req.body;
            const article = await Article.findById(req.params.articleId);
            
            if (!article) {
                return ApiResponse.notFound(res, 'Article not found');
            }

            // Check if article is hidden and user has permission
            if (article.hidden && 
                (!req.user.role || (req.user.role !== 'admin' && req.user.role !== 'super'))) {
                return ApiResponse.forbidden(res, 'Cannot comment on restricted articles');
            }

            const comment = new Comment({
                content,
                author: req.user._id,
                article: article._id
            });

            await comment.save();
            
            article.comments.push(comment._id);
            await article.save();

            await comment.populate('author', 'email firstName lastName');

            return ApiResponse.success(res, 'Comment added successfully', comment, 201);
        } catch (error) {
            console.error('Error adding comment:', error);
            return ApiResponse.serverError(res, 'Error adding comment');
        }
    },

    // Update comment
    updateComment: async (req, res) => {
        try {
            const { articleId, commentId } = req.params;
            const { content } = req.body;
            
            const comment = await Comment.findOne({
                _id: commentId,
                article: articleId
            });
    
            if (!comment) {
                return ApiResponse.notFound(res, 'Comment not found');
            }
    
            // Check if user is authorized to update the comment
            const isAuthor = comment.author.toString() === req.user._id.toString();
            const isAdmin = ['admin', 'super'].includes(req.user.role);
    
            if (!isAuthor && !isAdmin) {
                return ApiResponse.forbidden(res, 'Not authorized to update this comment');
            }
    
            comment.content = content;
            comment.edited = true;
            comment.updatedAt = Date.now();
            await comment.save();
    
            await comment.populate('author', 'email firstName lastName');
    
            return ApiResponse.success(res, 'Comment updated successfully', comment);
        } catch (error) {
            console.error('Error updating comment:', error);
            return ApiResponse.serverError(res, 'Error updating comment');
        }
    },
    
    // Delete comment
    deleteComment: async (req, res) => {
        try {
            const { articleId, commentId } = req.params;
            
            const comment = await Comment.findOne({
                _id: commentId,
                article: articleId
            }).populate('article', 'author');
    
            if (!comment) {
                return ApiResponse.notFound(res, 'Comment not found');
            }
    
            // Check if user is authorized to delete the comment
            const isAuthor = comment.author.toString() === req.user._id.toString();
            const isArticleAuthor = comment.article.author.toString() === req.user._id.toString();
            const isAdminOrSuper = ['admin', 'super'].includes(req.user.role);
    
            if (!isAuthor && !isArticleAuthor && !isAdminOrSuper) {
                return ApiResponse.forbidden(res, 'Not authorized to delete this comment');
            }
    
            // Remove comment from article
            await Article.findByIdAndUpdate(articleId, {
                $pull: { comments: commentId }
            });
    
            // Delete the comment
            await Comment.findByIdAndDelete(commentId);
    
            return ApiResponse.success(res, 'Comment deleted successfully');
        } catch (error) {
            console.error('Error deleting comment:', error);
            return ApiResponse.serverError(res, 'Error deleting comment');
        }
    },

// // Unlike a comment
// unlikeComment: async (req, res) => {
//     try {
//         const comment = await Comment.findById(req.params.commentId);
        
//         if (!comment) {
//             return ApiResponse.notFound(res, 'Comment not found');
//         }

//         const likeCount = await comment.unlike(req.user._id);
        
//         return ApiResponse.success(res, 'Comment unliked successfully', {
//             likeCount,
//             liked: false
//         });
//     } catch (error) {
//         console.error('Error unliking comment:', error);
//         return ApiResponse.serverError(res, 'Error unliking comment');
//     }
// },

};

module.exports = commentController;