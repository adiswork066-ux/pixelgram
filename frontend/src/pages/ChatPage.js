import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const ChatPage = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, api } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [participant, setParticipant] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const fetchMessages = useCallback(async () => {
        try {
            setLoading(true);
            const [messagesRes, userRes] = await Promise.all([
                api().get(`/messages/${userId}`),
                api().get(`/users/${userId}`)
            ]);
            setMessages(messagesRes.data);
            setParticipant(userRes.data);
        } catch (error) {
            console.error('Failed to fetch messages:', error);
            toast.error('Failed to load conversation');
        } finally {
            setLoading(false);
        }
    }, [api, userId]);

    useEffect(() => {
        fetchMessages();
        
        // Poll for new messages
        const interval = setInterval(async () => {
            try {
                const response = await api().get(`/messages/${userId}`);
                setMessages(response.data);
            } catch (error) {
                console.error('Failed to fetch messages:', error);
            }
        }, 5000);
        
        return () => clearInterval(interval);
    }, [fetchMessages, api, userId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        const messageText = newMessage;
        setNewMessage('');

        try {
            const response = await api().post(`/messages/${userId}`, { text: messageText });
            setMessages(prev => [...prev, response.data]);
        } catch (error) {
            toast.error('Failed to send message');
            setNewMessage(messageText);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen" data-testid="chat-page">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 border-b border-border/50 bg-background">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => navigate('/messages')}
                    className="rounded-xl"
                    data-testid="back-btn"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>

                <Link to={`/profile/${participant?.username}`} className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                        <AvatarImage src={participant?.avatar} />
                        <AvatarFallback>{participant?.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{participant?.username}</p>
                    </div>
                </Link>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
                {messages.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-muted-foreground">
                            No messages yet. Start the conversation!
                        </p>
                    </div>
                ) : (
                    messages.map((message) => {
                        const isOwn = message.sender_id === currentUser?.id;
                        return (
                            <div
                                key={message.id}
                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                                data-testid={`message-${message.id}`}
                            >
                                <div className={`flex items-end gap-2 max-w-[75%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                                    {!isOwn && (
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={message.sender_avatar} />
                                            <AvatarFallback className="text-xs">{message.sender_username?.[0]?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={`rounded-2xl px-4 py-2 ${
                                        isOwn 
                                            ? 'bg-accent text-white rounded-br-sm' 
                                            : 'bg-secondary rounded-bl-sm'
                                    }`}>
                                        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                                        <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border/50 bg-background">
                <form onSubmit={handleSend} className="flex items-center gap-3">
                    <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 h-12 rounded-xl bg-secondary border-none"
                        disabled={sending}
                        data-testid="message-input"
                    />
                    <Button 
                        type="submit" 
                        disabled={!newMessage.trim() || sending}
                        className="h-12 w-12 rounded-xl bg-accent hover:bg-accent/90"
                        data-testid="send-message-btn"
                    >
                        {sending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default ChatPage;
