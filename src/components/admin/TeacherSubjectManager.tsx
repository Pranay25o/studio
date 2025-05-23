
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  getAllUsers,
  assignSubjectsToTeacher as apiAssignSubjectsToTeacher,
  getAllAvailableSubjects, // Now synchronous, returns mock data
} from '@/lib/mockData';
import type { User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Loader2, BookLock, UserCog, AlertCircle, Trash2, Edit, PlusCircle, BookPlus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';


const assignExistingSchema = z.object({
  subjectsToAssign: z.array(z.string()),
});
type AssignExistingFormData = z.infer<typeof assignExistingSchema>;


export function TeacherSubjectManager() {
  const { user: loggedInUser, refreshAuthUser } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [systemSubjects, setSystemSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const { toast } = useToast();

  const assignExistingForm = useForm<AssignExistingFormData>({
    resolver: zodResolver(assignExistingSchema),
    defaultValues: { subjectsToAssign: [] },
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      const user = allUsers.find(u => u.id === selectedUserId);
      setSelectedUser(user || null);
      if (user) {
        assignExistingForm.setValue('subjectsToAssign', user.subjects || []);
      }
    } else {
      setSelectedUser(null);
      assignExistingForm.setValue('subjectsToAssign', []);
    }
  }, [selectedUserId, allUsers, assignExistingForm]);


  async function fetchInitialData() {
    setIsLoading(true);
    try {
      // getAllAvailableSubjects is now synchronous
      const fetchedUsers = await getAllUsers();
      const fetchedSubjects = getAllAvailableSubjects(); 
      
      setAllUsers(fetchedUsers.filter(u => u.role === 'teacher' || u.role === 'admin'));
      setSystemSubjects(fetchedSubjects);
    } catch (error) {
      toast({ title: "Error fetching data", description: "Could not load initial data.", variant: "destructive" });
    }
    setIsLoading(false);
  }

  async function refreshUserData(userIdToRefresh?: string) {
     try {
      const fetchedUsers = await getAllUsers();
      setAllUsers(fetchedUsers.filter(u => u.role === 'teacher' || u.role === 'admin'));
      if (userIdToRefresh) {
         const refreshedUser = fetchedUsers.find(u => u.id === userIdToRefresh);
         setSelectedUser(refreshedUser || null);
         if(refreshedUser) assignExistingForm.setValue('subjectsToAssign', refreshedUser.subjects || []);
      }
    } catch (error) {
      toast({ title: "Error refreshing user data", description: "Could not update user list.", variant: "destructive" });
    }
  }
  
  const handleUnassignSubject = async (subjectToUnassign: string) => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    const currentSubjects = selectedUser.subjects || [];
    const newSubjects = currentSubjects.filter(s => s !== subjectToUnassign);
    try {
      await apiAssignSubjectsToTeacher(selectedUser.id, newSubjects);
      toast({ title: "Subject Unassigned", description: `${subjectToUnassign} has been unassigned from ${selectedUser.name}.` });
      await refreshUserData(selectedUser.id);
      if (selectedUser.id === loggedInUser?.id) { 
        await refreshAuthUser();
      }
    } catch (error) {
      toast({ title: "Error Unassigning Subject", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const onSubmitAssignExistingSubjects = async (data: AssignExistingFormData) => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
        await apiAssignSubjectsToTeacher(selectedUser.id, data.subjectsToAssign.sort());
        toast({ title: "Subject Assignments Updated", description: `Assignments updated for ${selectedUser.name}.` });
        await refreshUserData(selectedUser.id);
        if (selectedUser.id === loggedInUser?.id) {
            await refreshAuthUser();
        }
        setIsAssignModalOpen(false);
    } catch (error) {
        toast({ title: "Error Updating Assignments", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading data...</span></div>;
  }
  
  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <UserCog className="h-6 w-6 text-primary" /> User Subject Assignment
        </CardTitle>
        <CardDescription>Assign general academic subjects to teachers or administrators.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="select-user">Select User (Teacher or Admin)</Label>
          <Select onValueChange={setSelectedUserId} value={selectedUserId}>
            <SelectTrigger id="select-user" className="w-full">
              <SelectValue placeholder="Choose a user..." />
            </SelectTrigger>
            <SelectContent>
              {allUsers.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.email}) - <span className="capitalize text-muted-foreground">{user.role}</span>
                  {user.id === loggedInUser?.id && <span className="text-accent font-semibold"> (Yourself)</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedUser && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold text-foreground">
              Managing Subjects for: <span className="text-accent">{selectedUser.name}</span>
            </h3>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Currently Assigned Subjects</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedUser.subjects && selectedUser.subjects.length > 0 ? (
                  <ScrollArea className="h-40">
                  <ul className="space-y-2">
                    {selectedUser.subjects.sort().map(subject => (
                      <li key={subject} className="flex items-center justify-between p-2 border rounded-md bg-secondary/30">
                        <span className="text-sm">{subject}</span>
                        <div className="space-x-2">
                          {/* Rename (Global) and Create New Subject functionality removed */}
                          <Button variant="destructive" size="sm" onClick={() => handleUnassignSubject(subject)} disabled={isSubmitting} className="text-xs">
                            <Trash2 className="mr-1 h-3 w-3" /> Unassign
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground">No subjects currently assigned.</p>
                )}
              </CardContent>
            </Card>
            
            <div className="flex justify-start pt-4">
                <Button onClick={() => setIsAssignModalOpen(true)} variant="outline" className="w-auto">
                    <BookLock className="mr-2 h-4 w-4" /> Assign Existing Subjects
                </Button>
            </div>
          </div>
        )}
        {allUsers.length === 0 && !isLoading && (
             <Alert variant="default">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Assignable Users Found</AlertTitle>
                <AlertDescription>
                    There are no teachers or administrators in the system to manage.
                </AlertDescription>
            </Alert>
        )}
      </CardContent>

      {/* Assign Existing Subjects Modal */}
        <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign Subjects to {selectedUser?.name}</DialogTitle>
                    <DialogDescription>Select subjects from the system list to assign.</DialogDescription>
                </DialogHeader>
                <form onSubmit={assignExistingForm.handleSubmit(onSubmitAssignExistingSubjects)}>
                    <Controller
                        name="subjectsToAssign"
                        control={assignExistingForm.control}
                        render={({ field }) => (
                            <ScrollArea className="h-72 w-full rounded-md border p-4 my-4 bg-background/50">
                                <div className="space-y-2">
                                    {systemSubjects.length > 0 ? systemSubjects.map(subject => (
                                        <div key={subject} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`assign-${subject.replace(/\s+/g, '-')}`}
                                                checked={(field.value || []).includes(subject)}
                                                onCheckedChange={(checked) => {
                                                    const currentVal = field.value || [];
                                                    if (checked) {
                                                        field.onChange([...currentVal, subject]);
                                                    } else {
                                                        field.onChange(currentVal.filter(s => s !== subject));
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={`assign-${subject.replace(/\s+/g, '-')}`} className="font-normal text-sm cursor-pointer">
                                                {subject}
                                            </Label>
                                        </div>
                                    )) : <p className="text-sm text-muted-foreground">No system subjects available.</p>}
                                </div>
                            </ScrollArea>
                        )}
                    />
                     {assignExistingForm.formState.errors.subjectsToAssign && <p className="text-sm text-destructive mt-1">{assignExistingForm.formState.errors.subjectsToAssign.message}</p>}
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Save Assignments"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

    </Card>
  );
}
