import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getEchoSuggestions, getMoodMeta } from "@/lib/socialFeatures";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const EchoWall = ({
  postId,
  mood,
  initialEchoCount = 0,
  initialTopEchoes = [],
  initialUserEcho = null,
  detailed = false,
  onUpdate,
}) => {
  const { api } = useAuth();
  const moodMeta = getMoodMeta(mood);
  const [echoCount, setEchoCount] = useState(initialEchoCount);
  const [topEchoes, setTopEchoes] = useState(initialTopEchoes);
  const [userEcho, setUserEcho] = useState(initialUserEcho);
  const [echoText, setEchoText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [echoes, setEchoes] = useState([]);
  const [loadingEchoes, setLoadingEchoes] = useState(false);

  const suggestions = getEchoSuggestions(mood);

  useEffect(() => {
    setEchoCount(initialEchoCount);
    setTopEchoes(initialTopEchoes);
    setUserEcho(initialUserEcho);
    setEchoes([]);
  }, [initialEchoCount, initialTopEchoes, initialUserEcho, postId]);

  const fetchEchoes = useCallback(async () => {
    if (!detailed) return;

    try {
      setLoadingEchoes(true);
      const response = await api().get(`/posts/${postId}/echoes`);
      setEchoes(response.data);
    } catch (error) {
      console.error("Failed to load echoes:", error);
    } finally {
      setLoadingEchoes(false);
    }
  }, [api, detailed, postId]);

  useEffect(() => {
    fetchEchoes();
  }, [fetchEchoes]);

  const applyEchoUpdate = (data, submittedText) => {
    const hadEchoBefore = Boolean(userEcho);
    setEchoCount(data.echo_count);
    setTopEchoes(data.top_echoes);
    setUserEcho(data.user_echo);
    setEchoText("");
    onUpdate?.({
      echo_count: data.echo_count,
      top_echoes: data.top_echoes,
      user_echo: data.user_echo,
    });

    if (detailed) {
      fetchEchoes();
    }

    toast.success(
      hadEchoBefore
        ? `Your echo is now "${submittedText}"`
        : `Your echo "${submittedText}" has been added`,
    );
  };

  const submitEcho = async (rawText) => {
    const text = rawText.trim();
    if (!text || submitting) return;
    if (text.split(/\s+/).length > 1) {
      toast.error("Echo must be a single word");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api().post(`/posts/${postId}/echoes`, { text });
      applyEchoUpdate(response.data, text);
    } catch (error) {
      toast.error("Failed to add echo");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border p-3 space-y-3 ${moodMeta.panelClass}`}
      data-testid={`echo-wall-${postId}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full bg-gradient-to-br ${moodMeta.gradientClass} flex items-center justify-center shadow-lg`}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">Echo Wall</p>
            <p className="text-xs text-muted-foreground">
              One word that this post leaves behind
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`${moodMeta.badgeClass} rounded-full px-3 py-1`}
        >
          {echoCount} echoes
        </Badge>
      </div>

      {topEchoes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {topEchoes.map((echo) => (
            <Badge
              key={echo}
              variant="outline"
              className="rounded-full border-white/10 bg-background/50 px-3 py-1 capitalize"
            >
              {echo}
            </Badge>
          ))}
        </div>
      )}

      {userEcho && (
        <div className="text-xs text-muted-foreground">
          Your current echo:
          <span className={`ml-2 font-semibold capitalize ${moodMeta.accentClass}`}>
            {userEcho}
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion}
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full border-white/10 bg-background/40 capitalize"
            onClick={() => submitEcho(suggestion)}
            disabled={submitting}
          >
            {suggestion}
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={echoText}
          onChange={(event) => setEchoText(event.target.value.slice(0, 20))}
          placeholder="Add your one-word echo..."
          className="h-10 rounded-xl bg-background/60 border-white/10"
          maxLength={20}
        />
        <Button
          type="button"
          onClick={() => submitEcho(echoText)}
          disabled={!echoText.trim() || submitting}
          className="rounded-xl"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Echo"}
        </Button>
      </div>

      {detailed && (
        <div className="space-y-3 pt-2 border-t border-white/10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Recent Echoes
          </p>
          {loadingEchoes ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : echoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No echoes yet. Be the first to define the vibe.
            </p>
          ) : (
            <div className="space-y-3 max-h-48 overflow-y-auto hide-scrollbar">
              {echoes.map((echo) => (
                <div key={echo.id} className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={echo.user_avatar} />
                    <AvatarFallback className="text-xs">
                      {echo.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{echo.username}</span>
                    <Badge
                      variant="outline"
                      className="rounded-full border-white/10 bg-background/50 capitalize"
                    >
                      {echo.text}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EchoWall;
