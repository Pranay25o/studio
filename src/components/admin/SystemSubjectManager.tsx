
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  getAllAvailableSubjects,
  addSystemSubject,
  renameSystemSubject,
  deleteSystemSubject,
} from '@/lib/mockData'; // Will now use Firestore backed functions
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Loader2, BookOpen, PlusCircle, Edit, Trash2, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertTitle } from '../ui/alert';


const subjectSchema = z.object({
  subjectName: z.string().min(1, "Subject name cannot be empty."),
});
type SubjectFormData = z.infer<typeof subjectSchema>;

export function SystemSubjectManager() {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<string | null>(null);

  const { toast } = useToast();

  const form = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
  });

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    setIsLoading(true);
    try {
      const fetchedSubjects = await getAllAvailableSubjects();
      setSubjects(fetchedSubjects);
    } catch (error) {
      toast({ title: "Error loading subjects", description: "Could not fetch the list of system subjects.", variant: "destructive" });
    }
    setIsLoading(false);
  }

  const handleOpenAddModal = () => {
    form.reset({ subjectName: '' });
    setIsAddModalOpen(true);
  };

  const handleOpenRenameModal = (subject: string) => {
    setSubjectToEdit(subject);
    form.reset({ subjectName: subject });
    setIsRenameModalOpen(true);
  };

  const onSubmitAdd = async (data: SubjectFormData) => {
    setIsSubmitting(true);
    const success = await addSystemSubject(data.subjectName);
    if (success) {
      toast({ title: "Subject Added", description: `"${data.subjectName}" has been added to the system.` });
      await loadSubjects();
      setIsAddModalOpen(false);
    } else {
      toast({ title: "Error Adding Subject", description: `Could not add "${data.subjectName}". It might already exist.`, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const onSubmitRename = async (data: SubjectFormData) => {
    if (!subjectToEdit) return;
    setIsSubmitting(true);
    const success = await renameSystemSubject(subjectToEdit, data.subjectName);
    if (success) {
      toast({ title: "Subject Renamed", description: `"${subjectToEdit}" is now "${data.subjectName}".` });
      await loadSubjects();
      setIsRenameModalOpen(false);
      setSubjectToEdit(null);
    } else {
      toast({ title: "Error Renaming Subject", description: `Could not rename "${subjectToEdit}". The new name might already exist or an error occurred.`, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleDeleteSubject = async (subjectName: string) => {
    setIsSubmitting(true);
    const success = await deleteSystemSubject(subjectName);
    if (success) {
      toast({ title: "Subject Deleted", description: `"${subjectName}" has been deleted from the system.` });
      await loadSubjects();
    } else {
      toast({ title: "Error Deleting Subject", description: `Could not delete "${subjectName}".`, variant: "destructive" });
    }
    setIsSubmitting(false);
  };


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" /> Manage System Subjects
        </CardTitle>
        <CardDescription>Add, rename, or delete academic subjects available across the entire system. Changes here will reflect globally.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex justify-end">
          <Button onClick={handleOpenAddModal} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Subject
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading subjects...</span>
          </div>
        ) : subjects.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No System Subjects Found</AlertTitle>
            <CardDescription>
              There are currently no subjects defined in the system. Click "Add New Subject" to get started.
            </CardDescription>
          </Alert>
        ) : (
          <ScrollArea className="h-96">
            <ul className="space-y-3 pr-4">
              {subjects.map(subject => (
                <li key={subject} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:shadow-md transition-shadow">
                  <span className="text-foreground font-medium">{subject}</span>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenRenameModal(subject)} disabled={isSubmitting}>
                      <Edit className="mr-1 h-3 w-3" /> Rename
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isSubmitting}>
                          <Trash2 className="mr-1 h-3 w-3" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the subject "{subject}" from the system. 
                            This action cannot be undone. Associated marks and assignments might be affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteSubject(subject)} className="bg-destructive hover:bg-destructive/80" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Delete Subject"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Note: Renaming or deleting subjects can affect existing teacher assignments and student marks records.
          The system will attempt to update related mock data, but ensure data integrity with real backends.
        </p>
      </CardFooter>

      {/* Add/Rename Subject Modal */}
      <Dialog open={isAddModalOpen || isRenameModalOpen} onOpenChange={isRenameModalOpen ? setIsRenameModalOpen : setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRenameModalOpen ? 'Rename Subject' : 'Add New Subject'}</DialogTitle>
            <DialogDescription>
              {isRenameModalOpen 
                ? `Enter the new name for "${subjectToEdit}". This change will be reflected globally.` 
                : 'Enter the name for the new subject to add to the system.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(isRenameModalOpen ? onSubmitRename : onSubmitAdd)} className="space-y-4 py-2">
            <div>
              <Label htmlFor="subjectName">Subject Name</Label>
              <Input id="subjectName" {...form.register("subjectName")} autoFocus />
              {form.formState.errors.subjectName && <p className="text-sm text-destructive mt-1">{form.formState.errors.subjectName.message}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => { setIsAddModalOpen(false); setIsRenameModalOpen(false); setSubjectToEdit(null);}}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isRenameModalOpen ? 'Save Changes' : 'Add Subject')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
