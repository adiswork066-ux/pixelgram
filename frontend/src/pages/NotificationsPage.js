import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Heart, MessageCircle, UserPlus, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const NotificationsPage = () => {
    const { api } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api().get('/notifications');
            setNotifications(response.data);
            
            // Mark as read
            await api().put('/notifications/read');
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'like':
                return <Heart className="w-5 h-5 text-like fill-like" />;
            case 'comment':
                return <MessageCircle className="w-5 h-5 text-accent" />;
            case 'follow':
                return <UserPlus className="w-5 h-5 text-green-500" />;
            case 'echo':
                return <Sparkles className="w-5 h-5 text-amber-400" />;
            default:
                return null;
        }
    };

    const getNotificationText = (type) => {
        switch (type) {
            case 'like':
                return 'appreciated your Pixel';
            case 'comment':
                return 'left feedback on your Pixel';
            case 'follow':
                return 'started following you';
            case 'echo':
                return 'reacted to your Pixel';
            default:
                return '';
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
        <div className="max-w-screen-md mx-auto px-4 py-6" data-testid="notifications-page">
            <h1 className="font-heading text-2xl font-semibold mb-6">Notifications</h1>

            {notifications.length === 0 ? (
                <div className="text-center py-20">
                    <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-heading text-xl font-semibold mb-2">No Notifications</h3>
                    <p className="text-muted-foreground">
                        When someone interacts with you, you'll see it here.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                                !notification.is_read ? 'bg-accent/10' : 'hover:bg-secondary/50'
                            }`}
                            data-testid={`notification-${notification.id}`}
                        >
                            <Link to={`/profile/${notification.sender_username}`}>
                                <Avatar className="w-12 h-12">
                                    <AvatarImage src={notification.sender_avatar} />
                                    <AvatarFallback>{notification.sender_username[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </Link>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm">
                                    <Link 
                                        to={`/profile/${notification.sender_username}`}
                                        className="font-semibold hover:underline"
                                    >
                                        {notification.sender_username}
                                    </Link>
                                    {' '}
                                    <span className="text-muted-foreground">
                                        {getNotificationText(notification.notification_type)}
                                    </span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {getNotificationIcon(notification.notification_type)}
                                {notification.post_image && (
                                    <img 
                                        src={notification.post_image} 
                                        alt="Post" 
                                        className="w-12 h-12 object-cover rounded-lg"
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
