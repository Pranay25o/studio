"use client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Info } from "lucide-react";

export default function StudentProfilePage() {
  const { user } = useAuth();

  if (!user || user.role !== 'student') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <p>Access denied or user not found.</p>
      </div>
    );
  }
  
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-lg mx-auto shadow-xl">
        <CardHeader className="text-center">
          <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-primary">
            <AvatarImage src={`https://placehold.co/150x150.png?text=${getInitials(user.name)}`} alt={user.name} data-ai-hint="avatar person" />
            <AvatarFallback className="text-3xl bg-primary text-primary-foreground">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl">{user.name}</CardTitle>
          <CardDescription>Student Profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-secondary/30 rounded-md">
            <User className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{user.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-secondary/30 rounded-md">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Email Address</p>
              <p className="font-medium">{user.email}</p>
            </div>
          </div>
          {user.prn && (
            <div className="flex items-center space-x-3 p-3 bg-secondary/30 rounded-md">
              <Info className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">PRN (Student ID)</p>
                <p className="font-medium">{user.prn}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
