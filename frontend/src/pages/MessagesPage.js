import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, MessageCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';

const MessagesPage = () => {
    const { api } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    const fetchConversations = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api().get('/conversations');
            setConversations(response.data);
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    useEffect(() => {
        const searchUsers = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            setSearching(true);
            try {
                const response = await api().get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
                setSearchResults(response.data);
            } catch (error) {
                console.error('Failed to search users:', error);
            } finally {
                setSearching(false);
            }
        };

        const debounce = setTimeout(searchUsers, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, api]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="max-w-screen-md mx-auto px-4 py-6" data-testid="messages-page">
            <h1 className="font-heading text-2xl font-semibold mb-6">Messages</h1>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search users to message..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 h-12 rounded-xl bg-secondary border-none"
                        data-testid="message-search-input"
                    />
                    {searching && (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
                    )}
                </div>

                {/* Search Results */}
                {searchQuery && searchResults.length > 0 && (
                    <div className="mt-4 bg-card border border-border rounded-xl overflow-hidden">
                        {searchResults.map((user) => (
                            <Link
                                key={user.id}
                                to={`/messages/${user.id}`}
                                className="flex items-center gap-4 p-4 hover:bg-secondary transition-colors"
                                data-testid={`user-search-result-${user.id}`}
                            >
                                <Avatar className="w-12 h-12">
                                    <AvatarImage src={user.avatar} />
                                    <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{user.username}</p>
                                    <p className="text-sm text-muted-foreground">Start a conversation</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Conversations List */}
            {!searchQuery && (
                <>
                    {conversations.length === 0 ? (
                        <div className="text-center py-20">
                            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                            <h3 className="font-heading text-xl font-semibold mb-2">No Messages Yet</h3>
                            <p className="text-muted-foreground">
                                Search for users above to start a conversation.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {conversations.map((conv) => (
                                <Link
                                    key={conv.id}
                                    to={`/messages/${conv.participant_id}`}
                                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-secondary/50 transition-colors"
                                    data-testid={`conversation-${conv.id}`}
                                >
                                    <div className="relative">
                                        <Avatar className="w-14 h-14">
                                            <AvatarImage src={conv.participant_avatar} />
                                            <AvatarFallback>{conv.participant_username[0].toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        {conv.unread_count > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                                {conv.unread_count > 9 ? '9+' : conv.unread_count}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-semibold">{conv.participant_username}</p>
                                            {conv.last_message_time && (
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: true })}
                                                </p>
                                            )}
                                        </div>
                                        {conv.last_message && (
                                            <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                                                {conv.last_message}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MessagesPage;
