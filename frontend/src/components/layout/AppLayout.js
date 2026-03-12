import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
    Home, Search, PlusSquare, Heart, MessageCircle, 
    User, LogOut, Menu, X 
} from 'lucide-react';
import CreatePostModal from '@/components/modals/CreatePostModal';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const AppLayout = () => {
    const { user, logout, api } = useAuth();
    const navigate = useNavigate();
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const [notifRes, msgRes] = await Promise.all([
                    api().get('/notifications/unread-count'),
                    api().get('/messages/unread-count/total')
                ]);
                setUnreadNotifications(notifRes.data.count);
                setUnreadMessages(msgRes.data.count);
            } catch (error) {
                console.error('Failed to fetch counts', error);
            }
        };
        
        fetchCounts();
        const interval = setInterval(fetchCounts, 30000);
        return () => clearInterval(interval);
    }, [api]);

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    const navItems = [
        { to: '/', icon: Home, label: 'Home' },
        { to: '/explore', icon: Search, label: 'Explore' },
        { action: () => setShowCreatePost(true), icon: PlusSquare, label: 'Create' },
        { to: '/notifications', icon: Heart, label: 'Notifications', badge: unreadNotifications },
        { to: '/messages', icon: MessageCircle, label: 'Messages', badge: unreadMessages },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 border-r border-border/50 flex-col p-4 bg-background z-50">
                <div className="mb-8 px-3">
                    <h1 className="font-heading text-2xl font-bold tracking-tight">
                        <span className="bg-gradient-to-r from-accent to-pink-500 bg-clip-text text-transparent">
                            Pixelgram
                        </span>
                    </h1>
                </div>

                <nav className="flex-1 space-y-1">
                    {navItems.map((item, index) => (
                        item.to ? (
                            <NavLink
                                key={index}
                                to={item.to}
                                className={({ isActive }) => `
                                    flex items-center gap-4 px-3 py-3 rounded-xl transition-all
                                    hover:bg-secondary/80 group relative
                                    ${isActive ? 'bg-secondary font-semibold' : ''}
                                `}
                                data-testid={`nav-${item.label.toLowerCase()}`}
                            >
                                <item.icon className="w-6 h-6" strokeWidth={1.5} />
                                <span>{item.label}</span>
                                {item.badge > 0 && (
                                    <span className="absolute right-3 bg-like text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </span>
                                )}
                            </NavLink>
                        ) : (
                            <button
                                key={index}
                                onClick={item.action}
                                className="flex items-center gap-4 px-3 py-3 rounded-xl transition-all hover:bg-secondary/80 w-full text-left"
                                data-testid={`nav-${item.label.toLowerCase()}`}
                            >
                                <item.icon className="w-6 h-6" strokeWidth={1.5} />
                                <span>{item.label}</span>
                            </button>
                        )
                    ))}

                    <NavLink
                        to={`/profile/${user?.username}`}
                        className={({ isActive }) => `
                            flex items-center gap-4 px-3 py-3 rounded-xl transition-all
                            hover:bg-secondary/80
                            ${isActive ? 'bg-secondary font-semibold' : ''}
                        `}
                        data-testid="nav-profile"
                    >
                        <Avatar className="w-6 h-6">
                            <AvatarImage src={user?.avatar} />
                            <AvatarFallback className="text-xs">{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span>Profile</span>
                    </NavLink>
                </nav>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-4 px-3 py-3 rounded-xl transition-all hover:bg-destructive/20 text-destructive mt-auto"
                    data-testid="logout-btn"
                >
                    <LogOut className="w-6 h-6" strokeWidth={1.5} />
                    <span>Logout</span>
                </button>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-14 border-b border-border/50 bg-background/80 backdrop-blur-xl z-50 flex items-center justify-between px-4">
                <h1 className="font-heading text-xl font-bold">
                    <span className="bg-gradient-to-r from-accent to-pink-500 bg-clip-text text-transparent">
                        Pixelgram
                    </span>
                </h1>
                <div className="flex items-center gap-2">
                    <NavLink to="/messages" className="p-2 relative" data-testid="mobile-messages">
                        <MessageCircle className="w-6 h-6" strokeWidth={1.5} />
                        {unreadMessages > 0 && (
                            <span className="absolute top-0 right-0 bg-like text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                {unreadMessages > 9 ? '9+' : unreadMessages}
                            </span>
                        )}
                    </NavLink>
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2" data-testid="mobile-menu-btn">
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 bg-background z-40 pt-14">
                    <nav className="p-4 space-y-2">
                        <NavLink
                            to={`/profile/${user?.username}`}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-4 px-4 py-4 rounded-xl bg-secondary"
                        >
                            <Avatar className="w-12 h-12">
                                <AvatarImage src={user?.avatar} />
                                <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">{user?.username}</p>
                                <p className="text-sm text-muted-foreground">View Profile</p>
                            </div>
                        </NavLink>
                        
                        <button
                            onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                            className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-destructive/20 text-destructive w-full"
                        >
                            <LogOut className="w-6 h-6" strokeWidth={1.5} />
                            <span>Logout</span>
                        </button>
                    </nav>
                </div>
            )}

            {/* Mobile Bottom Nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border/50 bg-background/80 backdrop-blur-xl z-50 flex items-center justify-around px-2">
                {navItems.map((item, index) => (
                    item.to ? (
                        <NavLink
                            key={index}
                            to={item.to}
                            className={({ isActive }) => `
                                p-3 rounded-xl transition-all relative
                                ${isActive ? 'text-accent' : 'text-muted-foreground'}
                            `}
                        >
                            <item.icon className="w-6 h-6" strokeWidth={1.5} />
                            {item.badge > 0 && (
                                <span className="absolute top-1 right-1 bg-like text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                    {item.badge > 9 ? '9+' : item.badge}
                                </span>
                            )}
                        </NavLink>
                    ) : (
                        <button
                            key={index}
                            onClick={item.action}
                            className="p-3 rounded-xl transition-all text-muted-foreground"
                        >
                            <item.icon className="w-6 h-6" strokeWidth={1.5} />
                        </button>
                    )
                ))}
                <NavLink
                    to={`/profile/${user?.username}`}
                    className={({ isActive }) => `
                        p-2 rounded-xl transition-all
                        ${isActive ? 'ring-2 ring-accent' : ''}
                    `}
                >
                    <Avatar className="w-7 h-7">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="text-xs">{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                </NavLink>
            </nav>

            {/* Main Content */}
            <main className="lg:ml-64 pt-14 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
                <Outlet />
            </main>

            {/* Create Post Modal */}
            <CreatePostModal 
                open={showCreatePost} 
                onClose={() => setShowCreatePost(false)} 
            />
        </div>
    );
};

export default AppLayout;
