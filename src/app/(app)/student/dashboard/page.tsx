"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function StudentDashboardPage() {
  const [prn, setPrn] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.prn) {
      // If PRN is available from auth, redirect to marks page directly
      router.push(`/student/marks/${user.prn}`);
    }
  }, [user, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prn.trim()) {
      setError('PRN cannot be empty.');
      return;
    }
    setError('');
    router.push(`/student/marks/${prn.trim().toUpperCase()}`);
  };

  // If PRN is already in user, this page content might not be shown due to redirect.
  // This form is a fallback or for cases where PRN isn't tied to login initially.
  if (user?.prn) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">Loading Your Marks</CardTitle>
                    <CardDescription>
                        You are being redirected to your marks page.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground">Please wait...</p>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl text-center text-primary">View Your Marks</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Enter your PRN (Permanent Registration Number) to access your academic performance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="prn" className="text-foreground/80">PRN Number</Label>
              <Input
                id="prn"
                type="text"
                value={prn}
                onChange={(e) => setPrn(e.target.value)}
                placeholder="e.g., PRN001"
                className="text-base"
                aria-describedby="prn-error"
              />
            </div>
            {error && (
              <Alert variant="destructive" id="prn-error">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              View Marks <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
