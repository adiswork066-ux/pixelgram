import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCloudinaryUpload } from "@/hooks/useCloudinaryUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FEEDBACK_STYLE_OPTIONS,
  INTENT_OPTIONS,
  getFeedbackStyleMeta,
  getIntentMeta,
} from "@/lib/socialFeatures";
import { ImagePlus, X, Loader2, Flag, Layers3, Sparkles } from "lucide-react";

const CreatePostModal = ({ open, onClose, pixel = null, onSuccess }) => {
  const { api } = useAuth();
  const { uploadImage, uploading, progress } = useCloudinaryUpload();
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [intent, setIntent] = useState("showcase");
  const [feedbackStyle, setFeedbackStyle] = useState("beginner-friendly");
  const [creativeGoal, setCreativeGoal] = useState("");
  const [versionNote, setVersionNote] = useState("");
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef(null);

  const isVersionMode = Boolean(pixel);
  const intentMeta = getIntentMeta(isVersionMode ? pixel.intent : intent);
  const feedbackMeta = getFeedbackStyleMeta(feedbackStyle);

  useEffect(() => {
    if (!open) return;

    if (isVersionMode) {
      setTitle(pixel.title || "");
      setIntent(pixel.intent || "showcase");
      setFeedbackStyle(pixel.feedback_style || "beginner-friendly");
      setCreativeGoal(pixel.creative_goal || "");
    }
  }, [open, isVersionMode, pixel]);

  const resetForm = () => {
    setImage(null);
    setImagePreview(null);
    setTitle("");
    setCaption("");
    setIntent("showcase");
    setFeedbackStyle("beginner-friendly");
    setCreativeGoal("");
    setVersionNote("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
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
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!image) {
      toast.error("Please select an image");
      return;
    }

    if (!isVersionMode && !title.trim()) {
      toast.error("Give your Pixel a title");
      return;
    }

    setCreating(true);
    try {
      const imageUrl = await uploadImage(image, "posts");

      let response;
      if (isVersionMode) {
        response = await api().post(`/posts/${pixel.id}/versions`, {
          image: imageUrl,
          caption: caption.trim(),
          version_note: versionNote.trim(),
        });
        toast.success(`Dropped v${(pixel.latest_version_number || 1) + 1}`);
      } else {
        response = await api().post("/posts", {
          image: imageUrl,
          title: title.trim(),
          caption: caption.trim(),
          intent,
          feedback_style: intent === "feedback" ? feedbackStyle : null,
          creative_goal: creativeGoal.trim(),
          version_note: versionNote.trim(),
        });
        toast.success("Pixel dropped");
      }

      const nextPixel = response.data;
      handleClose();
      onSuccess?.(nextPixel);

      if (!onSuccess) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to submit Pixel:", error);
      toast.error(isVersionMode ? "Failed to add version" : "Failed to drop Pixel");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-center text-2xl">
            {isVersionMode ? `Add New Version to ${pixel.title}` : "Drop a Pixel"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {!isVersionMode && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Pixel title</label>
              <Input
                placeholder="What project are you sharing?"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 rounded-2xl"
                maxLength={100}
              />
            </div>
          )}

          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-3xl p-12 text-center cursor-pointer hover:border-accent transition-colors"
              data-testid="image-upload-area"
            >
              <ImagePlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">
                {isVersionMode ? "Upload the next version" : "Upload the first version"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                JPG, PNG, GIF up to 10MB
              </p>
            </div>
          ) : (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full aspect-[16/11] object-cover rounded-3xl"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute top-3 right-3 p-2 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
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

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Uploading... {Math.round(progress)}%
              </p>
            </div>
          )}

          {!isVersionMode && (
            <div className={`rounded-3xl border p-4 space-y-4 ${intentMeta.panelClass}`}>
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-accent" />
                <p className="text-sm font-semibold">Choose the Pixel intent</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {INTENT_OPTIONS.map((option) => {
                  const active = intent === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setIntent(option.value)}
                      className={`rounded-2xl border p-4 text-left transition-all ${
                        active
                          ? option.badgeClass
                          : "border-border bg-background/40 text-foreground"
                      }`}
                    >
                      <p className="font-semibold">{option.label}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              <Badge variant="outline" className={`rounded-full px-3 py-1 ${intentMeta.badgeClass}`}>
                {intentMeta.label}
              </Badge>
            </div>
          )}

          {!isVersionMode && intent === "feedback" && (
            <div className="rounded-3xl border border-sky-400/20 bg-sky-500/8 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-300" />
                <p className="text-sm font-semibold">Set the feedback tone</p>
              </div>

              <div className="grid gap-3">
                {FEEDBACK_STYLE_OPTIONS.map((option) => {
                  const active = feedbackStyle === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFeedbackStyle(option.value)}
                      className={`rounded-2xl border p-3 text-left transition-all ${
                        active
                          ? "border-sky-300/30 bg-sky-500/12 text-sky-100"
                          : "border-border bg-background/40"
                      }`}
                    >
                      <p className="font-semibold">{option.label}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              <Badge variant="outline" className="rounded-full px-3 py-1 border-sky-300/30 bg-sky-500/10 text-sky-100">
                {feedbackMeta.label}
              </Badge>
            </div>
          )}

          {!isVersionMode && (
            <div className="space-y-2">
              <label className="text-sm font-medium">What are you trying to improve or show?</label>
              <Textarea
                placeholder="Example: I want feedback on whether the landing page hierarchy feels clear."
                value={creativeGoal}
                onChange={(event) => setCreativeGoal(event.target.value)}
                rows={3}
                maxLength={320}
                className="resize-none rounded-2xl"
              />
              <p className="text-xs text-muted-foreground text-right">
                {creativeGoal.length}/320
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {isVersionMode ? "What changed in this version?" : "What should people notice first?"}
            </label>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Layers3 className="w-4 h-4 text-accent" />
                <p className="text-sm font-semibold">
                  {isVersionMode ? "Version note" : "Opening context"}
                </p>
              </div>
              <Textarea
                placeholder={
                  isVersionMode
                    ? "Example: Simplified the layout and tightened the color contrast based on earlier comments."
                    : "Example: This is v1 of my poster concept, and I want to know if the composition feels too crowded."
                }
                value={versionNote}
                onChange={(event) => setVersionNote(event.target.value)}
                rows={3}
                maxLength={600}
                className="resize-none bg-background/50"
              />
              <p className="text-xs text-muted-foreground text-right">
                {versionNote.length}/600
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {isVersionMode ? "Describe this version" : "Describe the current version"}
            </label>
            <Textarea
              placeholder="Write a short caption for this version..."
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              rows={3}
              maxLength={2200}
              className="resize-none rounded-2xl"
              data-testid="caption-input"
            />
            <p className="text-xs text-muted-foreground text-right">{caption.length}/2200</p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 rounded-2xl"
              disabled={creating || uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 rounded-2xl bg-gradient-to-r from-accent to-orange-500"
              disabled={!image || creating || uploading}
              data-testid="create-post-btn"
            >
              {creating || uploading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {uploading
                ? "Uploading..."
                : creating
                  ? isVersionMode
                    ? "Adding..."
                    : "Dropping..."
                  : isVersionMode
                    ? `Drop v${(pixel?.latest_version_number || 1) + 1}`
                    : "Drop v1"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;
