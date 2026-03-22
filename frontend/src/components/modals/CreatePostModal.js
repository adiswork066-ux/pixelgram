import React, { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { getMoodMeta, MOOD_OPTIONS } from '@/lib/socialFeatures';
import { toast } from 'sonner';
import { ImagePlus, X, Loader2, Sparkles, Layers3 } from 'lucide-react';

const CreatePostModal = ({ open, onClose }) => {
    const { api } = useAuth();
    const { uploadImage, uploading, progress } = useCloudinaryUpload();
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [caption, setCaption] = useState('');
    const [mood, setMood] = useState('unfiltered');
    const [backstory, setBackstory] = useState('');
    const [creating, setCreating] = useState(false);
    const fileInputRef = useRef(null);
    const moodMeta = getMoodMeta(mood);

    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        setImage(file);
        const reader = new FileReader();
        reader.onload = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async () => {
        if (!image) {
            toast.error('Please select an image');
            return;
        }

        setCreating(true);
        try {
            // Upload image to Cloudinary
            const imageUrl = await uploadImage(image, 'posts');

            // Create post
            await api().post('/posts', {
                image: imageUrl,
                caption: caption.trim(),
                mood,
                backstory: backstory.trim(),
            });

            toast.success('Post created!');
            handleClose();
            window.location.reload(); // Refresh to show new post
        } catch (error) {
            console.error('Failed to create post:', error);
            toast.error('Failed to create post');
        } finally {
            setCreating(false);
        }
    };

    const handleClose = () => {
        setImage(null);
        setImagePreview(null);
        setCaption('');
        setMood('unfiltered');
        setBackstory('');
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-heading text-center">Create New Post</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Image Upload */}
                    {!imagePreview ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-border rounded-2xl p-12 text-center cursor-pointer hover:border-accent transition-colors"
                            data-testid="image-upload-area"
                        >
                            <ImagePlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground">Click to upload an image</p>
                            <p className="text-xs text-muted-foreground mt-2">JPG, PNG, GIF up to 10MB</p>
                        </div>
                    ) : (
                        <div className="relative">
                            <img 
                                src={imagePreview} 
                                alt="Preview" 
                                className="w-full aspect-square object-cover rounded-2xl"
                            />
                            <button
                                onClick={handleRemoveImage}
                                className="absolute top-2 right-2 p-2 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                                data-testid="remove-image-btn"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        data-testid="image-input"
                    />

                    {/* Upload Progress */}
                    {uploading && (
                        <div className="space-y-2">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-muted-foreground text-center">
                                Uploading... {Math.round(progress)}%
                            </p>
                        </div>
                    )}

                    {/* Caption */}
                    <Textarea
                        placeholder="Write a caption..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        rows={3}
                        maxLength={2200}
                        className="resize-none"
                        data-testid="caption-input"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                        {caption.length}/2200
                    </p>

                    <div className={`rounded-2xl border p-4 space-y-3 ${moodMeta.panelClass}`}>
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-accent" />
                            <p className="text-sm font-semibold">Set the post mood</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {MOOD_OPTIONS.map((option) => {
                                const optionMeta = getMoodMeta(option.value);
                                const active = mood === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setMood(option.value)}
                                        className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                                            active
                                                ? optionMeta.badgeClass
                                                : 'border-border bg-background/50 text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                        <Badge variant="outline" className={`rounded-full px-3 py-1 ${moodMeta.badgeClass}`}>
                            {moodMeta.label} mode
                        </Badge>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <Layers3 className="w-4 h-4 text-accent" />
                            <p className="text-sm font-semibold">Behind the Frame</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Add the hidden second layer of this post. Viewers can reveal it later.
                        </p>
                        <Textarea
                            placeholder="What was really happening when this photo was taken?"
                            value={backstory}
                            onChange={(e) => setBackstory(e.target.value)}
                            rows={3}
                            maxLength={320}
                            className="resize-none bg-background/50"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {backstory.length}/320
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button 
                            variant="outline" 
                            onClick={handleClose}
                            className="flex-1 rounded-xl"
                            disabled={creating || uploading}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSubmit}
                            className="flex-1 rounded-xl bg-gradient-to-r from-accent to-pink-500"
                            disabled={!image || creating || uploading}
                            data-testid="create-post-btn"
                        >
                            {creating || uploading ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            {uploading ? 'Uploading...' : creating ? 'Creating...' : 'Share'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CreatePostModal;
