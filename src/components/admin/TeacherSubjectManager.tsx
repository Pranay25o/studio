
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getAllUsers, assignSubjectsToTeacher as apiAssignSubjectsToTeacher } from '@/lib/mockData';
import type { User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, BookLock, UserCog, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';

// Example: A predefined list of subjects available in the school/system
const ALL_AVAILABLE_SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "History", "Geography",
  "English Literature", "Computer Science", "Art", "Music", "Physical Education", "Advanced Physics"
].sort();


const subjectAssignmentSchema = z.object({
  userId: z.string().min(1, "User selection is required."), // Renamed from teacherId for clarity
  subjects: z.array(z.string()),
});

type SubjectAssignmentFormData = z.infer<typeof subjectAssignmentSchema>;

export function TeacherSubjectManager() {
  const { user: loggedInUser } = useAuth();
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();

  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<SubjectAssignmentFormData>({
    resolver: zodResolver(subjectAssignmentSchema),
    defaultValues: { userId: '', subjects: [] },
  });

  const watchedUserId = watch('userId');
  const watchedSubjects = watch('subjects');

  useEffect(() => {
    fetchUsersForAssignment();
  }, []);

  useEffect(() => {
    if (watchedUserId) {
      const user = assignableUsers.find(u => u.id === watchedUserId);
      setSelectedUser(user || null);
      setValue('subjects', user?.subjects || []);
    } else {
      setSelectedUser(null);
      setValue('subjects', []);
    }
  }, [watchedUserId, assignableUsers, setValue]);

  async function fetchUsersForAssignment() {
    setIsLoading(true);
    try {
      const allUsers = await getAllUsers();
      // Admins can assign subjects to teachers or themselves (other admins)
      setAssignableUsers(allUsers.filter(u => u.role === 'teacher' || u.role === 'admin'));
    } catch (error) {
      toast({ title: "Error fetching users", description: "Could not load user data.", variant: "destructive" });
    }
    setIsLoading(false);
  }

  const onSubmit = async (data: SubjectAssignmentFormData) => {
    setIsSubmitting(true);
    try {
      await apiAssignSubjectsToTeacher(data.userId, data.subjects);
      const targetUserName = selectedUser?.id === loggedInUser?.id ? "Your" : `${selectedUser?.name}'s`;
      toast({ title: "Subjects Updated", description: `${targetUserName} subjects have been updated.` });

      const updatedUsers = assignableUsers.map(u =>
        u.id === data.userId ? { ...u, subjects: data.subjects } : u
      );
      setAssignableUsers(updatedUsers);
      setSelectedUser(updatedUsers.find(u => u.id === data.userId) || null);

    } catch (error) {
      toast({ title: "Error Updating Subjects", description: "Could not update user subjects.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleSubjectChange = (subject: string, checked: boolean) => {
    const currentSubjects = watchedSubjects || [];
    let newSubjects;
    if (checked) {
      newSubjects = [...currentSubjects, subject];
    } else {
      newSubjects = currentSubjects.filter(s => s !== subject);
    }
    setValue('subjects', newSubjects.sort());
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading user data...</span></div>;
  }

  if (assignableUsers.length === 0 && !isLoading) {
    return (
        <Card className="shadow-xl w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2"><UserCog className="h-6 w-6 text-primary" /> User Subject Management</CardTitle>
                <CardDescription>Assign or modify subjects for teachers or administrators.</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Assignable Users Found</AlertTitle>
                    <AlertDescription>
                        There are no teachers or administrators in the system to manage.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" /> User Subject Management
        </CardTitle>
        <CardDescription>Select a teacher or administrator to assign or modify their academic subjects. Administrators can assign subjects to themselves.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <Controller
            name="userId"
            control={control}
            render={({ field }) => (
              <div className="space-y-1">
                <Label htmlFor="userId">Select User (Teacher or Admin)</Label>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="userId" className="w-full">
                    <SelectValue placeholder="Choose a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email}) - <span className="capitalize text-muted-foreground">{user.role}</span>
                        {user.id === loggedInUser?.id && <span className="text-accent font-semibold"> (Yourself)</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.userId && <p className="text-sm text-destructive">{errors.userId.message}</p>}
              </div>
            )}
          />

          {selectedUser && (
            <div>
              <Label className="mb-2 block font-medium">Assign Subjects for: <span className="text-accent">{selectedUser.name}</span></Label>
              <ScrollArea className="h-72 w-full rounded-md border p-4 bg-background/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {ALL_AVAILABLE_SUBJECTS.map(subject => (
                  <div key={subject} className="flex items-center space-x-2">
                    <Checkbox
                      id={`subject-${subject.replace(/\s+/g, '-')}`} // Create a valid ID
                      checked={watchedSubjects.includes(subject)}
                      onCheckedChange={(checked) => handleSubjectChange(subject, !!checked)}
                    />
                    <Label htmlFor={`subject-${subject.replace(/\s+/g, '-')}`} className="font-normal text-sm cursor-pointer">
                      {subject}
                    </Label>
                  </div>
                ))}
              </div>
              </ScrollArea>
              {errors.subjects && <p className="text-sm text-destructive mt-1">{errors.subjects.message}</p>}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting || !selectedUser} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BookLock className="mr-2 h-4 w-4" />
            )}
            Save Subject Assignments
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
