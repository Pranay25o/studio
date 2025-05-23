
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  getAllUsers,
  assignSubjectsToTeacher as apiAssignSubjectsToTeacher,
  getAllAvailableSubjects,
  addSystemSubject,
  renameSystemSubject as apiRenameSystemSubject,
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

const newSubjectSchema = z.object({
  newSubjectName: z.string().min(1, "Subject name cannot be empty."),
});
type NewSubjectFormData = z.infer<typeof newSubjectSchema>;

const renameSubjectSchema = z.object({
  updatedSubjectName: z.string().min(1, "Subject name cannot be empty."),
});
type RenameSubjectFormData = z.infer<typeof renameSubjectSchema>;

const assignExistingSchema = z.object({
  subjectsToAssign: z.array(z.string()),
});
type AssignExistingFormData = z.infer<typeof assignExistingSchema>;


export function TeacherSubjectManager() {
  const { user: loggedInUser, refreshAuthUser } = useAuth(); // Added refreshAuthUser
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [systemSubjects, setSystemSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [subjectToRename, setSubjectToRename] = useState<string | null>(null);

  const { toast } = useToast();

  const newSubjectForm = useForm<NewSubjectFormData>({
    resolver: zodResolver(newSubjectSchema),
    defaultValues: { newSubjectName: '' },
  });

  const renameSubjectForm = useForm<RenameSubjectFormData>({
    resolver: zodResolver(renameSubjectSchema),
    defaultValues: { updatedSubjectName: '' },
  });

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
  }, [selectedUserId, allUsers, assignExistingForm]); // Removed assignExistingForm.setValue from deps


  async function fetchInitialData() {
    setIsLoading(true);
    try {
      const [fetchedUsers, fetchedSubjects] = await Promise.all([
        getAllUsers(),
        getAllAvailableSubjects(),
      ]);
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
  
  async function refreshSystemSubjects() {
    try {
        const fetchedSubjects = await getAllAvailableSubjects();
        setSystemSubjects(fetchedSubjects);
    } catch (error) {
        toast({ title: "Error refreshing subjects", description: "Could not update subject list.", variant: "destructive" });
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
      if (selectedUser.id === loggedInUser?.id) { // Check if logged in user's subjects changed
        await refreshAuthUser();
      }
    } catch (error) {
      toast({ title: "Error Unassigning Subject", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleOpenRenameModal = (subject: string) => {
    setSubjectToRename(subject);
    renameSubjectForm.setValue('updatedSubjectName', subject);
    setIsRenameModalOpen(true);
  };

  const onSubmitRenameSubject = async (data: RenameSubjectFormData) => {
    if (!subjectToRename) return;
    setIsSubmitting(true);
    if (systemSubjects.includes(data.updatedSubjectName) && data.updatedSubjectName !== subjectToRename) {
      renameSubjectForm.setError('updatedSubjectName', { type: 'manual', message: 'This subject name already exists.' });
      setIsSubmitting(false);
      return;
    }
    try {
      await apiRenameSystemSubject(subjectToRename, data.updatedSubjectName);
      toast({ title: "Subject Renamed Globally", description: `"${subjectToRename}" is now "${data.updatedSubjectName}" for all users.` });
      await refreshSystemSubjects();
      await refreshUserData(selectedUser?.id); 
      if (loggedInUser?.subjects?.includes(subjectToRename)) { // If logged in user was assigned the old subject name
        await refreshAuthUser();
      }
      setIsRenameModalOpen(false);
      setSubjectToRename(null);
    } catch (error) {
      toast({ title: "Error Renaming Subject", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const onSubmitCreateNewSubject = async (data: NewSubjectFormData) => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    if (systemSubjects.includes(data.newSubjectName)) {
      newSubjectForm.setError('newSubjectName', { type: 'manual', message: 'This subject already exists in the system.' });
      setIsSubmitting(false);
      return;
    }
    try {
      await addSystemSubject(data.newSubjectName); // Add to system first
      await refreshSystemSubjects(); // Refresh system subjects list
      
      const currentSubjects = selectedUser.subjects || [];
      const newAssignedSubjects = [...currentSubjects, data.newSubjectName].sort();
      await apiAssignSubjectsToTeacher(selectedUser.id, newAssignedSubjects); // Assign to user
      
      toast({ title: "Subject Created & Assigned", description: `${data.newSubjectName} created and assigned to ${selectedUser.name}.` });
      await refreshUserData(selectedUser.id);
      if (selectedUser.id === loggedInUser?.id) {
        await refreshAuthUser();
      }
      setIsCreateModalOpen(false);
      newSubjectForm.reset();
    } catch (error) {
      toast({ title: "Error Creating Subject", variant: "destructive" });
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
  
  const assignableSystemSubjects = systemSubjects.filter(s => !selectedUser?.subjects?.includes(s));


  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <UserCog className="h-6 w-6 text-primary" /> User Subject Assignment
        </CardTitle>
        <CardDescription>Assign academic subjects to teachers or administrators. You can also create new subjects or rename existing ones globally from here.</CardDescription>
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
                          <Button variant="outline" size="sm" onClick={() => handleOpenRenameModal(subject)} disabled={isSubmitting} className="text-xs">
                            <Edit className="mr-1 h-3 w-3" /> Rename (Global)
                          </Button>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <Button onClick={() => setIsAssignModalOpen(true)} variant="outline" className="w-full">
                    <BookLock className="mr-2 h-4 w-4" /> Assign Existing Subjects
                </Button>
                <Button onClick={() => setIsCreateModalOpen(true)} variant="outline" className="w-full">
                    <BookPlus className="mr-2 h-4 w-4" /> Create New Subject & Assign
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

      {/* Create New Subject Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Subject & Assign</DialogTitle>
            <DialogDescription>Enter the name for the new subject. It will be added to the system and assigned to {selectedUser?.name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={newSubjectForm.handleSubmit(onSubmitCreateNewSubject)} className="space-y-4">
            <div>
              <Label htmlFor="newSubjectName">New Subject Name</Label>
              <Input id="newSubjectName" {...newSubjectForm.register("newSubjectName")} />
              {newSubjectForm.formState.errors.newSubjectName && <p className="text-sm text-destructive mt-1">{newSubjectForm.formState.errors.newSubjectName.message}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create & Assign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Subject Modal */}
      <Dialog open={isRenameModalOpen} onOpenChange={setIsRenameModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Subject (Global)</DialogTitle>
            <DialogDescription>Renaming "{subjectToRename}" to a new name will update it system-wide for all users and marks.</DialogDescription>
          </DialogHeader>
          <form onSubmit={renameSubjectForm.handleSubmit(onSubmitRenameSubject)} className="space-y-4">
            <div>
              <Label htmlFor="updatedSubjectName">New Subject Name</Label>
              <Input id="updatedSubjectName" {...renameSubjectForm.register("updatedSubjectName")} />
              {renameSubjectForm.formState.errors.updatedSubjectName && <p className="text-sm text-destructive mt-1">{renameSubjectForm.formState.errors.updatedSubjectName.message}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Rename Globally"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                                                checked={field.value.includes(subject)}
                                                onCheckedChange={(checked) => {
                                                    const current = field.value;
                                                    if (checked) {
                                                        field.onChange([...current, subject]);
                                                    } else {
                                                        field.onChange(current.filter(s => s !== subject));
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={`assign-${subject.replace(/\s+/g, '-')}`} className="font-normal text-sm cursor-pointer">
                                                {subject}
                                            </Label>
                                        </div>
                                    )) : <p className="text-sm text-muted-foreground">No system subjects available or all are assigned to this user.</p>}
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
