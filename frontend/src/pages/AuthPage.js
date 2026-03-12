import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login, register } = useAuth();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                await login(formData.email, formData.password);
                toast.success('Welcome back!');
            } else {
                await register(formData.username, formData.email, formData.password);
                toast.success('Account created successfully!');
            }
        } catch (error) {
            const message = error.response?.data?.detail || 'Something went wrong';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Left side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-accent/20 via-background to-pink-500/20 items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.1),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(236,72,153,0.1),transparent_50%)]" />
                
                <div className="relative z-10 text-center p-12">
                    <div className="flex items-center justify-center mb-8">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-pink-500 flex items-center justify-center">
                            <Camera className="w-10 h-10 text-white" strokeWidth={1.5} />
                        </div>
                    </div>
                    <h1 className="font-heading text-5xl font-bold mb-4 tracking-tight">
                        <span className="bg-gradient-to-r from-accent to-pink-500 bg-clip-text text-transparent">
                            Pixelgram
                        </span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
                        Share your moments with the world. Connect with friends and discover amazing content.
                    </p>
                </div>
            </div>

            {/* Right side - Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-8">
                        <h1 className="font-heading text-4xl font-bold tracking-tight">
                            <span className="bg-gradient-to-r from-accent to-pink-500 bg-clip-text text-transparent">
                                Pixelgram
                            </span>
                        </h1>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
                        <h2 className="font-heading text-2xl font-semibold mb-2">
                            {isLogin ? 'Welcome back' : 'Create account'}
                        </h2>
                        <p className="text-muted-foreground mb-6">
                            {isLogin ? 'Sign in to continue to Pixelgram' : 'Sign up to start sharing'}
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {!isLogin && (
                                <div className="space-y-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input
                                        id="username"
                                        type="text"
                                        placeholder="johndoe"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        required={!isLogin}
                                        className="h-12"
                                        data-testid="username-input"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    className="h-12"
                                    data-testid="email-input"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        minLength={8}
                                        className="h-12 pr-12"
                                        data-testid="password-input"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                className="w-full h-12 rounded-xl bg-gradient-to-r from-accent to-pink-500 hover:opacity-90 transition-opacity font-semibold"
                                disabled={loading}
                                data-testid="auth-submit-btn"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Please wait...</span>
                                    </div>
                                ) : (
                                    isLogin ? 'Sign In' : 'Create Account'
                                )}
                            </Button>
                        </form>
                    </div>

                    <div className="text-center">
                        <p className="text-muted-foreground">
                            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-accent hover:underline font-semibold"
                                data-testid="toggle-auth-mode"
                            >
                                {isLogin ? 'Sign up' : 'Sign in'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
