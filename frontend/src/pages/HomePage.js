import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import PostCard from "@/components/post/PostCard";
import PostDetailModal from "@/components/modals/PostDetailModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, GitBranchPlus, MessageSquareQuote, Compass } from "lucide-react";
import { INTENT_OPTIONS, getIntentMeta } from "@/lib/socialFeatures";

const PAGE_SIZE = 6;

const HomePage = () => {
  const { api } = useAuth();
  const [pixels, setPixels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedPixel, setSelectedPixel] = useState(null);
  const [activeIntent, setActiveIntent] = useState("all");

  const fetchPixels = useCallback(
    async (pageNumber = 1, nextIntent = activeIntent) => {
      try {
        if (pageNumber === 1) setLoading(true);
        else setLoadingMore(true);

        const intentQuery =
          nextIntent !== "all" ? `&intent=${encodeURIComponent(nextIntent)}` : "";
        const response = await api().get(
          `/posts?page=${pageNumber}&page_size=${PAGE_SIZE}${intentQuery}`,
        );

        if (pageNumber === 1) {
          setPixels(response.data);
        } else {
          setPixels((previous) => [...previous, ...response.data]);
        }

        setHasMore(response.data.length === PAGE_SIZE);
      } catch (error) {
        console.error("Failed to fetch Pixels:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeIntent, api],
  );

  useEffect(() => {
    setPage(1);
    fetchPixels(1, activeIntent);
  }, [activeIntent, fetchPixels]);

  const handlePostUpdate = (postId, updates) => {
    setPixels((previous) =>
      previous.map((pixel) => (pixel.id === postId ? { ...pixel, ...updates } : pixel)),
    );
    setSelectedPixel((previous) =>
      previous?.id === postId ? { ...previous, ...updates } : previous,
    );
  };

  const handlePostDelete = (postId) => {
    setPixels((previous) => previous.filter((pixel) => pixel.id !== postId));
    setSelectedPixel((previous) => (previous?.id === postId ? null : previous));
  };

  const loadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchPixels(nextPage, activeIntent);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-screen-lg mx-auto px-4 py-6" data-testid="home-page">
      <div className="space-y-6">
        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_32%),linear-gradient(135deg,rgba(17,24,39,0.95),rgba(36,52,71,0.86))] p-6 md:p-8 text-white shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <Badge variant="outline" className="rounded-full border-white/15 bg-white/10 px-3 py-1 text-white/90">
                PixelGram
              </Badge>
              <div className="space-y-2">
                <h1 className="font-heading text-3xl md:text-4xl leading-tight">
                  A social app for creative progress, not passive posting
                </h1>
                <p className="text-sm md:text-base leading-7 text-white/70">
                  Every upload becomes a Pixel with versions, version-specific feedback,
                  and a visible record of how the work gets better over time.
                </p>
              </div>
            </div>

            <div className="grid gap-3 text-sm md:max-w-sm">
              <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                <div className="flex items-center gap-2 font-semibold">
                  <GitBranchPlus className="w-4 h-4 text-amber-300" />
                  Evolution timeline
                </div>
                <p className="mt-1 text-white/[0.68]">
                  A Pixel is a project, not a single upload. Add v2, v3, and keep the trail.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                <div className="flex items-center gap-2 font-semibold">
                  <MessageSquareQuote className="w-4 h-4 text-sky-300" />
                  Version feedback
                </div>
                <p className="mt-1 text-white/[0.68]">
                  Comments are attached to the exact version they are reacting to.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                <div className="flex items-center gap-2 font-semibold">
                  <Compass className="w-4 h-4 text-emerald-300" />
                  Intent-led behavior
                </div>
                <p className="mt-1 text-white/[0.68]">
                  Showcase, Feedback, Collaborate, and Experiment all change how the UI responds.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Feed
              </p>
              <h2 className="font-heading text-2xl">Latest active Pixels</h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              The feed shows the newest version of each Pixel, so you see progress instead of
              clutter.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveIntent("all")}
              className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                activeIntent === "all"
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-border bg-background/45 text-muted-foreground hover:text-foreground"
              }`}
            >
              All intents
            </button>
            {INTENT_OPTIONS.map((intent) => {
              const meta = getIntentMeta(intent.value);
              const active = activeIntent === intent.value;
              return (
                <button
                  key={intent.value}
                  type="button"
                  onClick={() => setActiveIntent(intent.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                    active
                      ? meta.badgeClass
                      : "border-border bg-background/45 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {intent.label}
                </button>
              );
            })}
          </div>
        </section>

        {pixels.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="font-heading text-xl font-semibold mb-2">No Pixels yet</h3>
            <p className="text-muted-foreground">
              Try another intent filter or drop the first Pixel from the create menu.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {pixels.map((pixel) => (
              <PostCard
                key={pixel.id}
                post={pixel}
                onUpdate={handlePostUpdate}
                onDelete={handlePostDelete}
                onOpen={setSelectedPixel}
              />
            ))}
          </div>
        )}

        {hasMore && pixels.length > 0 && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-2xl"
            >
              {loadingMore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Load more Pixels
            </Button>
          </div>
        )}
      </div>

      {selectedPixel && (
        <PostDetailModal
          post={selectedPixel}
          open={!!selectedPixel}
          onClose={() => setSelectedPixel(null)}
          onUpdate={handlePostUpdate}
          onDelete={handlePostDelete}
        />
      )}
    </div>
  );
};

export default HomePage;
