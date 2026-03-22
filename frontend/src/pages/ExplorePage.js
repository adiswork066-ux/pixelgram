import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Compass, GitBranchPlus, MessageSquareQuote } from "lucide-react";
import PostDetailModal from "@/components/modals/PostDetailModal";
import { getIntentMeta, INTENT_OPTIONS } from "@/lib/socialFeatures";

const ExplorePage = () => {
  const { api } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [pixels, setPixels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selectedPixel, setSelectedPixel] = useState(null);
  const [activeIntent, setActiveIntent] = useState("all");

  const fetchPixels = useCallback(async () => {
    try {
      setLoading(true);
      const intentQuery =
        activeIntent !== "all" ? `&intent=${encodeURIComponent(activeIntent)}` : "";
      const response = await api().get(`/explore?page=1&page_size=18${intentQuery}`);
      setPixels(response.data);
    } catch (error) {
      console.error("Failed to fetch explore Pixels:", error);
    } finally {
      setLoading(false);
    }
  }, [activeIntent, api]);

  useEffect(() => {
    fetchPixels();
  }, [fetchPixels]);

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const response = await api().get(
          `/users/search?q=${encodeURIComponent(searchQuery)}`,
        );
        setSearchResults(response.data);
      } catch (error) {
        console.error("Failed to search users:", error);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, api]);

  const handlePixelUpdate = (postId, updates) => {
    setPixels((previous) =>
      previous.map((pixel) => (pixel.id === postId ? { ...pixel, ...updates } : pixel)),
    );
    setSelectedPixel((previous) =>
      previous?.id === postId ? { ...previous, ...updates } : previous,
    );
  };

  const handlePixelDelete = (postId) => {
    setPixels((previous) => previous.filter((pixel) => pixel.id !== postId));
    setSelectedPixel((previous) => (previous?.id === postId ? null : previous));
  };

  return (
    <div className="max-w-screen-lg mx-auto px-4 py-6" data-testid="explore-page">
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search creators..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-12 h-12 rounded-2xl bg-secondary border-none"
            data-testid="search-input"
          />
          {searching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
          )}
        </div>

        {searchQuery && searchResults.length > 0 && (
          <div className="mt-4 bg-card border border-border rounded-2xl overflow-hidden">
            {searchResults.map((user) => (
              <Link
                key={user.id}
                to={`/profile/${user.username}`}
                className="flex items-center gap-4 p-4 hover:bg-secondary transition-colors"
                data-testid={`search-result-${user.id}`}
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{user.username}</p>
                  {user.bio && (
                    <p className="text-sm text-muted-foreground truncate max-w-xs">
                      {user.bio}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {searchQuery && searchResults.length === 0 && !searching && (
          <div className="mt-4 text-center py-8 text-muted-foreground">
            No creators found
          </div>
        )}
      </div>

      {!searchQuery && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <Compass className="w-5 h-5 text-accent" />
            <h2 className="font-heading text-2xl font-semibold">Explore Pixels by intent</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5 max-w-2xl">
            Browse projects that are asking for critique, looking for collaborators, or
            sharing finished work with a visible version trail.
          </p>

          <div className="flex flex-wrap gap-2 mb-6">
            <button
              type="button"
              onClick={() => setActiveIntent("all")}
              className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                activeIntent === "all"
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
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
                      : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {intent.label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : pixels.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No Pixels match this intent yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {pixels.map((pixel) => {
                const intentMeta = getIntentMeta(pixel.intent);
                return (
                  <button
                    key={pixel.id}
                    onClick={() => setSelectedPixel(pixel)}
                    className="text-left rounded-[28px] border border-border/60 bg-card overflow-hidden shadow-sm hover:-translate-y-1 transition-transform"
                    data-testid={`explore-post-${pixel.id}`}
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
                          <h3 className="font-heading text-xl mt-3">{pixel.title}</h3>
                        </div>
                        <Badge variant="outline" className="rounded-full px-3 py-1">
                          v{pixel.latest_version_number}
                        </Badge>
                      </div>

                      <img
                        src={pixel.image}
                        alt={pixel.caption || pixel.title}
                        className="w-full aspect-[4/3] object-cover rounded-[20px]"
                      />

                      {pixel.creative_goal && (
                        <p className="text-sm text-muted-foreground leading-6 line-clamp-3">
                          {pixel.creative_goal}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <GitBranchPlus className="w-4 h-4" />
                          {pixel.versions_count} versions
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <MessageSquareQuote className="w-4 h-4" />
                          {pixel.comments_count} latest notes
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {selectedPixel && (
        <PostDetailModal
          post={selectedPixel}
          open={!!selectedPixel}
          onClose={() => setSelectedPixel(null)}
          onUpdate={handlePixelUpdate}
          onDelete={handlePixelDelete}
        />
      )}
    </div>
  );
};

export default ExplorePage;
