"use client"

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';

// --- TYPE DEFINITIONS (No changes to logic) ---
export interface AppUser {
  id: string;
  name: string;
  password?: string;
  role: "user" | "admin";
  pages: string[];
}

// --- SVG ICONS (As per target UI) ---
const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const LockIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);


import { fetchUsersFromSupabase } from "@/lib/api/auth";

// --- LoginPage Component (Logic untouched, UI updated) ---
const LoginPage: React.FC<{ onLogin: (user: AppUser) => void }> = ({ onLogin }) => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      setError("");
      try {
        const fetchedUsers = await fetchUsersFromSupabase();
        setUsers(fetchedUsers);
      } catch (err: any) {
        setError(err.message || "An unknown error occurred while fetching user data.");
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedUserId = userId.trim();
    const trimmedPassword = password.trim();
    if (!trimmedUserId || !trimmedPassword) {
      setError("Please enter both Username and Password");
      return;
    }
    const foundUser = users.find(
      (user) => user.id === trimmedUserId && user.password === trimmedPassword
    );
    if (foundUser) {
      onLogin(foundUser);
    } else {
      setError("Invalid Username or Password");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f5f3ff] flex flex-col items-center justify-center p-3 sm:p-6 pb-20">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-6 duration-1000">
        <Card className="bg-white border-[#ede9fe] shadow-xl shadow-violet-500/5 rounded-2xl overflow-hidden">
          <CardHeader className="text-center pt-8 sm:pt-10 pb-4 sm:pb-6 px-6">
            <div className="flex justify-center mb-4 sm:mb-5">
              <img src="/H3-logo.svg" alt="H3 Logo" className="h-12 sm:h-14 w-auto" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
              Pete App
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-6 sm:px-10 sm:pb-10 sm:pt-2">
            {isLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="userId" className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <UserIcon className="text-violet-500 w-3 h-3 shrink-0" />
                    Username
                  </Label>
                  <Input
                    id="userId"
                    type="text"
                    placeholder="Enter your username"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="h-11 sm:h-12 rounded-xl bg-white border-slate-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-500/5 transition-all text-sm sm:text-base"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <LockIcon className="text-violet-500 w-3 h-3 shrink-0" />
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 sm:h-12 rounded-xl bg-white border-slate-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-500/5 transition-all text-sm sm:text-base"
                    required
                  />
                </div>
                {error && <p className="text-xs sm:text-sm text-red-500 text-center font-medium">{error}</p>}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:opacity-90 transition-all duration-300 text-white font-bold py-3 text-base sm:text-lg h-12 sm:h-13 rounded-xl shadow-lg shadow-violet-500/20 active:scale-[0.98]"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Login"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
