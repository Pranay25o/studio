
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
import { Loader2, BookOpen, PlusCircle, Edit, Trash2, AlertCircle, Wifi, WifiOff, HelpCircle } from 'lucide-react';
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
import { Alert, AlertTitle as UIAlertTitle } from '../ui/alert'; // Renamed AlertTitle to avoid conflict
import { Badge } from '@/components/ui/badge';


const subjectSchema = z.object({
  subjectName: z.string().min(1, "Subject name cannot be empty."),
});
type SubjectFormData = z.infer<typeof subjectSchema>;

type FirestoreStatus = 'checking' | 'connected' | 'error' | 'misconfigured';

export function SystemSubjectManager() {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<string | null>(null);
  const [firestoreStatus, setFirestoreStatus] = useState<FirestoreStatus>('checking');
  const [totalSubjectsLoaded, setTotalSubjectsLoaded] = useState(0);


  const { toast } = useToast();

  const form = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
  });

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    setIsLoading(true);
    setFirestoreStatus('checking');
    try {
      const fetchedSubjects = await getAllAvailableSubjects();
      // Crude check for placeholder config values
      if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "YOUR_API_KEY_HERE" || 
          (typeof window !== "undefined" && 
           (window as any).firebase?.app?.options?.apiKey === "YOUR_API_KEY_HERE")) {
            setFirestoreStatus('misconfigured');
            setSubjects([]);
            setTotalSubjectsLoaded(0);
            toast({ title: "Firebase Misconfigured", description: "Please update firebaseConfig.ts with your project credentials.", variant: "destructive", duration: 10000 });
      } else {
        setSubjects(fetchedSubjects);
        setTotalSubjectsLoaded(fetchedSubjects.length);
        setFirestoreStatus('connected');
      }
    } catch (error) {
      console.error("Error loading subjects from Firestore:", error);
      toast({ title: "Error loading subjects", description: "Could not fetch subjects from Firestore. Check console for details.", variant: "destructive" });
      setSubjects([]);
      setTotalSubjectsLoaded(0);
      setFirestoreStatus('error');
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
      toast({ title: "Subject Added", description: `"${data.subjectName}" has been added to Firestore.` });
      setIsAddModalOpen(false);
    } else {
      toast({ title: "Error Adding Subject", description: `Could not add "${data.subjectName}". It might already exist or an error occurred.`, variant: "destructive" });
    }
    await loadSubjects(); 
    setIsSubmitting(false);
  };

  const onSubmitRename = async (data: SubjectFormData) => {
    if (!subjectToEdit) return;
    setIsSubmitting(true);
    const success = await renameSystemSubject(subjectToEdit, data.subjectName);
    if (success) {
      toast({ title: "Subject Renamed", description: `"${subjectToEdit}" is now "${data.subjectName}" in Firestore.` });
      setIsRenameModalOpen(false);
      setSubjectToEdit(null);
    } else {
      toast({ title: "Error Renaming Subject", description: `Could not rename "${subjectToEdit}". The new name might already exist or an error occurred.`, variant: "destructive" });
    }
    await loadSubjects(); 
    setIsSubmitting(false);
  };

  const handleDeleteSubject = async (subjectName: string) => {
    const success = await deleteSystemSubject(subjectName);
    if (success) {
      toast({ title: "Subject Deleted", description: `"${subjectName}" has been deleted from Firestore.` });
    } else {
      toast({ title: "Error Deleting Subject", description: `Could not delete "${subjectName}". It might be in use or an error occurred.`, variant: "destructive" });
    }
    await loadSubjects(); 
  };

  const FirestoreStatusIndicator = () => {
    switch (firestoreStatus) {
      case 'checking':
        return <Badge variant="outline" className="text-xs"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Checking Firestore...</Badge>;
      case 'connected':
        return <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-300"><Wifi className="h-3 w-3 mr-1 text-green-600" />Firestore Connected ({totalSubjectsLoaded} subjects)</Badge>;
      case 'misconfigured':
        return <Badge variant="destructive" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" />Firebase Misconfigured!</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs"><WifiOff className="h-3 w-3 mr-1" />Firestore Connection Error</Badge>;
      default:
        return <Badge variant="outline" className="text-xs"><HelpCircle className="h-3 w-3 mr-1" />Unknown Status</Badge>;
    }
  };


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" /> Manage System Subjects
            </CardTitle>
            <CardDescription>Add, rename, or delete academic subjects. Changes here update Firestore globally.</CardDescription>
          </div>
          <FirestoreStatusIndicator />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex justify-end">
          <Button onClick={handleOpenAddModal} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting || firestoreStatus === 'misconfigured' || firestoreStatus === 'error'}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Subject
          </Button>
        </div>

        {isLoading && firestoreStatus === 'checking' ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading subjects from Firestore...</span>
          </div>
        ) : firestoreStatus === 'misconfigured' ? (
           <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <UIAlertTitle>Firebase Configuration Needed</UIAlertTitle>
            <CardDescription>
              The application is using placeholder Firebase credentials. Please update <code>src/lib/firebaseConfig.ts</code> with your actual Firebase project configuration to connect to Firestore.
            </CardDescription>
          </Alert>
        ) : firestoreStatus === 'error' ? (
           <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <UIAlertTitle>Firestore Connection Error</UIAlertTitle>
            <CardDescription>
              Could not connect to Firestore to load subjects. Please check your Firebase setup, security rules, and internet connection. See browser console for more details.
            </CardDescription>
          </Alert>
        ) : subjects.length === 0 && firestoreStatus === 'connected' ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <UIAlertTitle>No System Subjects Found</UIAlertTitle>
            <CardDescription>
              There are currently no subjects defined in Firestore. Click "Add New Subject" to get started.
            </CardDescription>
          </Alert>
        ) : (
          <ScrollArea className="h-96">
            <ul className="space-y-3 pr-4">
              {subjects.map(subject => (
                <li key={subject} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:shadow-md transition-shadow">
                  <span className="text-foreground font-medium">{subject}</span>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenRenameModal(subject)} disabled={isSubmitting || firestoreStatus !== 'connected'}>
                      <Edit className="mr-1 h-3 w-3" /> Rename
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isSubmitting || firestoreStatus !== 'connected'}>
                          <Trash2 className="mr-1 h-3 w-3" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the subject "{subject}" from Firestore.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteSubject(subject)} className="bg-destructive hover:bg-destructive/80">
                            Delete Subject
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
          System subjects are managed in Firestore. Actions here directly modify the database.
          Ensure your <code>src/lib/firebaseConfig.ts</code> is correctly set up.
        </p>
      </CardFooter>

      <Dialog open={isAddModalOpen || isRenameModalOpen} onOpenChange={isRenameModalOpen ? setIsRenameModalOpen : setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRenameModalOpen ? 'Rename Subject' : 'Add New Subject'}</DialogTitle>
            <DialogDescription>
              {isRenameModalOpen
                ? `Enter the new name for "${subjectToEdit}". This will update it in Firestore.`
                : 'Enter the name for the new subject to add to Firestore.'}
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
              <Button type="submit" disabled={isSubmitting || firestoreStatus !== 'connected'} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isRenameModalOpen ? 'Save Changes' : 'Add Subject')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
