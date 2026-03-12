import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Grid3X3, Settings, Camera, MessageCircle, Heart } from 'lucide-react';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import PostDetailModal from '@/components/modals/PostDetailModal';

const ProfilePage = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, api, updateUser } = useAuth();
    const { uploadImage, uploading } = useCloudinaryUpload();
    
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ bio: '', avatar: null });
    const [saving, setSaving] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [followLoading, setFollowLoading] = useState(false);

    const isOwnProfile = currentUser?.username === username;

    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true);
            const [profileRes, postsRes] = await Promise.all([
                api().get(`/users/username/${username}`),
                api().get(`/users/${username}/posts`).catch(() => ({ data: [] }))
            ]);
            setProfile(profileRes.data);
            setEditForm({ bio: profileRes.data.bio || '', avatar: null });
            
            // Fetch posts using user ID
            const userPostsRes = await api().get(`/users/${profileRes.data.id}/posts`);
            setPosts(userPostsRes.data);
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            toast.error('User not found');
        } finally {
            setLoading(false);
        }
    }, [api, username]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleFollow = async () => {
        if (!profile) return;
        setFollowLoading(true);
        try {
            const response = await api().post(`/users/${profile.id}/follow`);
            setProfile(prev => ({
                ...prev,
                is_following: response.data.following,
                followers_count: prev.followers_count + (response.data.following ? 1 : -1)
            }));
            toast.success(response.data.message);
        } catch (error) {
            toast.error('Failed to update follow status');
        } finally {
            setFollowLoading(false);
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const url = await uploadImage(file, 'avatars');
            setEditForm(prev => ({ ...prev, avatar: url }));
        } catch (error) {
            toast.error('Failed to upload avatar');
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const updateData = { bio: editForm.bio };
            if (editForm.avatar) {
                updateData.avatar = editForm.avatar;
            }
            
            const response = await api().put('/users/profile', updateData);
            updateUser(response.data);
            setProfile(prev => ({ ...prev, ...response.data }));
            setShowEditModal(false);
            toast.success('Profile updated!');
        } catch (error) {
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleStartConversation = () => {
        navigate(`/messages/${profile.id}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-muted-foreground">User not found</p>
            </div>
        );
    }

    return (
        <div className="max-w-screen-lg mx-auto px-4 py-6" data-testid="profile-page">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-8 pb-8 border-b border-border/50">
                <Avatar className="w-32 h-32 md:w-40 md:h-40 ring-4 ring-border">
                    <AvatarImage src={profile.avatar} className="object-cover" />
                    <AvatarFallback className="text-4xl font-heading">{profile.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                        <h1 className="font-heading text-2xl font-semibold">{profile.username}</h1>
                        <div className="flex gap-2 justify-center md:justify-start">
                            {isOwnProfile ? (
                                <Button 
                                    variant="outline" 
                                    onClick={() => setShowEditModal(true)}
                                    className="rounded-xl"
                                    data-testid="edit-profile-btn"
                                >
                                    <Settings className="w-4 h-4 mr-2" />
                                    Edit Profile
                                </Button>
                            ) : (
                                <>
                                    <Button 
                                        onClick={handleFollow}
                                        disabled={followLoading}
                                        className={`rounded-xl ${profile.is_following ? 'bg-secondary text-secondary-foreground' : 'bg-accent text-white'}`}
                                        data-testid="follow-btn"
                                    >
                                        {followLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            profile.is_following ? 'Following' : 'Follow'
                                        )}
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        onClick={handleStartConversation}
                                        className="rounded-xl"
                                        data-testid="message-btn"
                                    >
                                        <MessageCircle className="w-4 h-4 mr-2" />
                                        Message
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-8 justify-center md:justify-start mb-4">
                        <div className="text-center">
                            <span className="font-heading font-bold text-lg">{profile.posts_count}</span>
                            <span className="text-muted-foreground ml-1">posts</span>
                        </div>
                        <div className="text-center">
                            <span className="font-heading font-bold text-lg">{profile.followers_count}</span>
                            <span className="text-muted-foreground ml-1">followers</span>
                        </div>
                        <div className="text-center">
                            <span className="font-heading font-bold text-lg">{profile.following_count}</span>
                            <span className="text-muted-foreground ml-1">following</span>
                        </div>
                    </div>

                    {profile.bio && (
                        <p className="text-foreground max-w-md">{profile.bio}</p>
                    )}
                </div>
            </div>

            {/* Posts Grid */}
            <div className="mb-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground pb-4 border-b border-border/50">
                    <Grid3X3 className="w-4 h-4" />
                    <span className="text-sm font-medium uppercase tracking-wider">Posts</span>
                </div>
            </div>

            {posts.length === 0 ? (
                <div className="text-center py-20">
                    <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-heading text-xl font-semibold mb-2">No Posts Yet</h3>
                    <p className="text-muted-foreground">
                        {isOwnProfile ? 'Share your first photo!' : 'This user hasn\'t posted yet.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-1 md:gap-4">
                    {posts.map((post) => (
                        <button
                            key={post.id}
                            onClick={() => setSelectedPost(post)}
                            className="aspect-square relative group overflow-hidden rounded-lg"
                            data-testid={`post-grid-item-${post.id}`}
                        >
                            <img 
                                src={post.image} 
                                alt={post.caption || 'Post'} 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                                <div className="flex items-center gap-2 text-white">
                                    <Heart className="w-5 h-5 fill-white" />
                                    <span className="font-semibold">{post.likes_count}</span>
                                </div>
                                <div className="flex items-center gap-2 text-white">
                                    <MessageCircle className="w-5 h-5 fill-white" />
                                    <span className="font-semibold">{post.comments_count}</span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Edit Profile Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-heading">Edit Profile</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="flex flex-col items-center gap-4">
                            <Avatar className="w-24 h-24">
                                <AvatarImage src={editForm.avatar || profile.avatar} />
                                <AvatarFallback className="text-2xl">{profile.username[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <label className="cursor-pointer">
                                <span className="text-accent hover:underline text-sm font-medium">
                                    {uploading ? 'Uploading...' : 'Change Avatar'}
                                </span>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden"
                                    onChange={handleAvatarChange}
                                    disabled={uploading}
                                />
                            </label>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Bio</label>
                            <Textarea
                                value={editForm.bio}
                                onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                                placeholder="Tell us about yourself..."
                                rows={4}
                                maxLength={150}
                                data-testid="bio-input"
                            />
                            <p className="text-xs text-muted-foreground text-right">
                                {editForm.bio.length}/150
                            </p>
                        </div>

                        <Button 
                            onClick={handleSaveProfile} 
                            className="w-full rounded-xl"
                            disabled={saving}
                            data-testid="save-profile-btn"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Save Changes
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Post Detail Modal */}
            {selectedPost && (
                <PostDetailModal 
                    post={selectedPost}
                    open={!!selectedPost}
                    onClose={() => setSelectedPost(null)}
                />
            )}
        </div>
    );
};

export default ProfilePage;
