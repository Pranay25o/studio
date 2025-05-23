
"use client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react"; // Added

export default function AdminProfilePage() {
  const { user: authUser } = useAuth(); // Renamed to avoid conflict with local state
  const [pageUser, setPageUser] = useState<typeof authUser | null>(null); // Local state for user
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (authUser) {
      setPageUser(authUser);
    }
  }, [authUser]);

  if (!isClient || !pageUser) { // Wait for client-side mount and pageUser data
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (pageUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <p>Access denied. You do not have permission to view this page.</p>
      </div>
    );
  }
  
  const getInitials = (name: string | undefined) => {
    if (!name) return 'AD'; // Default initials if name is not available
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-lg mx-auto shadow-xl">
        <CardHeader className="text-center">
          <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-destructive">
            <AvatarImage src={`https://placehold.co/150x150.png?text=${getInitials(pageUser.name)}`} alt={pageUser.name || 'Admin User'} data-ai-hint="avatar person shield" />
            <AvatarFallback className="text-3xl bg-destructive text-destructive-foreground">{getInitials(pageUser.name)}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl">{pageUser.name || 'Administrator'}</CardTitle>
          <CardDescription>Administrator Profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-secondary/30 rounded-md">
            <User className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{pageUser.name || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-secondary/30 rounded-md">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Email Address</p>
              <p className="font-medium">{pageUser.email || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-secondary/30 rounded-md">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-medium capitalize text-destructive">{pageUser.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

