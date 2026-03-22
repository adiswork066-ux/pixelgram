import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Grid3X3,
  Settings,
  Camera,
  MessageCircle,
  GitBranchPlus,
  Lightbulb,
  Users,
} from "lucide-react";
import { useCloudinaryUpload } from "@/hooks/useCloudinaryUpload";
import PostDetailModal from "@/components/modals/PostDetailModal";
import { getIntentMeta, getPixelProfile } from "@/lib/socialFeatures";

const ProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, api, updateUser } = useAuth();
  const { uploadImage, uploading } = useCloudinaryUpload();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ bio: "", avatar: null });
  const [saving, setSaving] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = currentUser?.username === username;
  const pixelProfile = useMemo(() => getPixelProfile(posts), [posts]);
  const dominantIntent = getIntentMeta(pixelProfile.dominantIntent);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const profileRes = await api().get(`/users/username/${username}`);
      setProfile(profileRes.data);
      setEditForm({ bio: profileRes.data.bio || "", avatar: null });

      const userPostsRes = await api().get(`/users/${profileRes.data.id}/posts`);
      setPosts(userPostsRes.data);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast.error("User not found");
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
      setProfile((previous) => ({
        ...previous,
        is_following: response.data.following,
        followers_count:
          previous.followers_count + (response.data.following ? 1 : -1),
      }));
      toast.success(response.data.message);
    } catch (error) {
      toast.error("Failed to update follow status");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadImage(file, "avatars");
      setEditForm((previous) => ({ ...previous, avatar: url }));
    } catch (error) {
      toast.error("Failed to upload avatar");
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updateData = { bio: editForm.bio };
      if (editForm.avatar) {
        updateData.avatar = editForm.avatar;
      }

      const response = await api().put("/users/profile", updateData);
      updateUser(response.data);
      setProfile((previous) => ({ ...previous, ...response.data }));
      setShowEditModal(false);
      toast.success("Profile updated");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleStartConversation = () => {
    navigate(`/messages/${profile.id}`);
  };

  const handlePostUpdate = (postId, updates) => {
    setPosts((previous) =>
      previous.map((post) => (post.id === postId ? { ...post, ...updates } : post)),
    );
    setSelectedPost((previous) =>
      previous?.id === postId ? { ...previous, ...updates } : previous,
    );
  };

  const handlePostDelete = (postId) => {
    setPosts((previous) => previous.filter((post) => post.id !== postId));
    setSelectedPost((previous) => (previous?.id === postId ? null : previous));
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
      <div className="flex flex-col lg:flex-row gap-8 items-start mb-8 pb-8 border-b border-border/50">
        <Avatar className="w-32 h-32 md:w-40 md:h-40 ring-4 ring-border">
          <AvatarImage src={profile.avatar} className="object-cover" />
          <AvatarFallback className="text-4xl font-heading">
            {profile.username[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 w-full">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div>
              <h1 className="font-heading text-3xl font-semibold">{profile.username}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Building in public through evolving Pixels
              </p>
            </div>

            <div className="flex gap-2">
              {isOwnProfile ? (
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(true)}
                  className="rounded-2xl"
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
                    className={`rounded-2xl ${
                      profile.is_following
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-accent text-white"
                    }`}
                    data-testid="follow-btn"
                  >
                    {followLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : profile.is_following ? (
                      "Following"
                    ) : (
                      "Follow"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleStartConversation}
                    className="rounded-2xl"
                    data-testid="message-btn"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                </>
              )}
            </div>
          </div>

          {profile.bio && <p className="text-foreground max-w-2xl leading-7">{profile.bio}</p>}

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-border/60 bg-card p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Pixels</p>
              <p className="mt-2 font-heading text-3xl font-bold">{profile.posts_count}</p>
            </div>
            <div className="rounded-3xl border border-border/60 bg-card p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Versions</p>
              <p className="mt-2 font-heading text-3xl font-bold">{pixelProfile.totalVersions}</p>
            </div>
            <div className="rounded-3xl border border-border/60 bg-card p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Feedback asks
              </p>
              <p className="mt-2 font-heading text-3xl font-bold">{pixelProfile.feedbackPixels}</p>
            </div>
            <div className="rounded-3xl border border-border/60 bg-card p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Collabs open
              </p>
              <p className="mt-2 font-heading text-3xl font-bold">
                {pixelProfile.collaborationPixels}
              </p>
            </div>
          </div>

          <div className={`mt-5 rounded-3xl border p-4 ${dominantIntent.panelClass}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Creative fingerprint
                </p>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <h2 className="font-heading text-lg font-semibold">Dominant intent</h2>
                  <Badge
                    variant="outline"
                    className={`rounded-full px-3 py-1 ${dominantIntent.badgeClass}`}
                  >
                    {dominantIntent.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                  This profile is strongest in {dominantIntent.label.toLowerCase()}-driven work,
                  which gives the page a clear creative point of view.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {profile.followers_count} followers
                </span>
                <span className="inline-flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  {pixelProfile.experimentalPixels} experiments
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-center gap-2 text-muted-foreground pb-4 border-b border-border/50">
          <Grid3X3 className="w-4 h-4" />
          <span className="text-sm font-medium uppercase tracking-wider">Pixels</span>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20">
          <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-heading text-xl font-semibold mb-2">No Pixels Yet</h3>
          <p className="text-muted-foreground">
            {isOwnProfile ? "Drop your first Pixel." : "This creator has not shared a Pixel yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {posts.map((post) => {
            const intentMeta = getIntentMeta(post.intent);
            return (
              <button
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="text-left rounded-[28px] border border-border/60 bg-card overflow-hidden shadow-sm"
                data-testid={`post-grid-item-${post.id}`}
              >
                <div className={`h-1.5 bg-gradient-to-r ${intentMeta.gradientClass}`} />
                <div className="p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge
                        variant="outline"
                        className={`rounded-full px-2.5 py-0.5 ${intentMeta.badgeClass}`}
                      >
                        {intentMeta.label}
                      </Badge>
                      <h3 className="font-heading text-xl mt-3">{post.title}</h3>
                    </div>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      v{post.latest_version_number}
                    </Badge>
                  </div>

                  <img
                    src={post.image}
                    alt={post.caption || post.title}
                    className="w-full aspect-[4/3] object-cover rounded-[20px]"
                  />

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <GitBranchPlus className="w-4 h-4" />
                      {post.versions_count} versions
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      {post.comments_count} latest notes
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={editForm.avatar || profile.avatar} />
                <AvatarFallback className="text-2xl">
                  {profile.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label className="cursor-pointer">
                <span className="text-accent hover:underline text-sm font-medium">
                  {uploading ? "Uploading..." : "Change Avatar"}
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
                onChange={(event) =>
                  setEditForm((previous) => ({ ...previous, bio: event.target.value }))
                }
                placeholder="Tell people what kind of work you are building..."
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
              className="w-full rounded-2xl"
              disabled={saving}
              data-testid="save-profile-btn"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          open={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          onUpdate={handlePostUpdate}
          onDelete={handlePostDelete}
        />
      )}
    </div>
  );
};

export default ProfilePage;
