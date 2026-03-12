import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "sonner";

// Pages
import AuthPage from "@/pages/AuthPage";
import HomePage from "@/pages/HomePage";
import ProfilePage from "@/pages/ProfilePage";
import ExplorePage from "@/pages/ExplorePage";
import NotificationsPage from "@/pages/NotificationsPage";
import MessagesPage from "@/pages/MessagesPage";
import ChatPage from "@/pages/ChatPage";

// Layout
import AppLayout from "@/components/layout/AppLayout";

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
            </div>
        );
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/auth" replace />;
    }
    
    return children;
};

const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
            </div>
        );
    }
    
    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }
    
    return children;
};

function AppRoutes() {
    return (
        <Routes>
            <Route path="/auth" element={
                <PublicRoute>
                    <AuthPage />
                </PublicRoute>
            } />
            <Route path="/" element={
                <ProtectedRoute>
                    <AppLayout />
                </ProtectedRoute>
            }>
                <Route index element={<HomePage />} />
                <Route path="explore" element={<ExplorePage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="messages" element={<MessagesPage />} />
                <Route path="messages/:userId" element={<ChatPage />} />
                <Route path="profile/:username" element={<ProfilePage />} />
            </Route>
        </Routes>
    );
}

function App() {
    return (
        <div className="App dark">
            <AuthProvider>
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
                <Toaster 
                    theme="dark" 
                    position="top-center"
                    toastOptions={{
                        style: {
                            background: 'hsl(0 0% 7%)',
                            border: '1px solid hsl(0 0% 14.9%)',
                            color: 'hsl(0 0% 98%)'
                        }
                    }}
                />
            </AuthProvider>
        </div>
    );
}

export default App;
