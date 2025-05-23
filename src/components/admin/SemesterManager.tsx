
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  getSemesters,
  addSemester,
  renameSemester,
  deleteSemester,
} from '@/lib/mockData'; // Will use Firestore backed functions
import type { Semester } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Loader2, CalendarDays, PlusCircle, Edit, Trash2, AlertCircle, Wifi, WifiOff, HelpCircle } from 'lucide-react';
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
import { Alert, AlertTitle as UIAlertTitle, AlertDescription as UIAlertDescription } from '../ui/alert';
import { Badge } from '@/components/ui/badge';

const semesterSchema = z.object({
  semesterName: z.string().min(3, "Semester name must be at least 3 characters long (e.g., 'Fall 2024')."),
});
type SemesterFormData = z.infer<typeof semesterSchema>;

type FirestoreStatus = 'initial' | 'checking' | 'connected' | 'error' | 'misconfigured';

export function SemesterManager() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [isLoading, setIsLoading] = useState(true); // For the main list loading
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submissions
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [semesterToEdit, setSemesterToEdit] = useState<Semester | null>(null);
  const [firestoreStatus, setFirestoreStatus] = useState<FirestoreStatus>('initial');
  const [totalSemestersLoaded, setTotalSemestersLoaded] = useState(0);
  const [componentReady, setComponentReady] = useState(false);

  const { toast } = useToast();
  const form = useForm<SemesterFormData>({
    resolver: zodResolver(semesterSchema),
  });

  useEffect(() => {
    setComponentReady(true);
  }, []);

  useEffect(() => {
    if (componentReady) {
      loadSemesters();
    }
  }, [componentReady]);

  async function loadSemesters() {
    setIsLoading(true);
    setFirestoreStatus('checking');
    setSemesters([]); 
    setTotalSemestersLoaded(0); 

    try {
      const isMisconfigured = process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "YOUR_API_KEY_HERE" ||
                             (typeof window !== "undefined" &&
                              (window as any).firebase?.app?.options?.apiKey === "YOUR_API_KEY_HERE");

      if (isMisconfigured) {
        setFirestoreStatus('misconfigured');
        toast({ title: "Firebase Misconfigured", description: "Please update firebaseConfig.ts with your project credentials.", variant: "destructive", duration: 10000 });
        setIsLoading(false);
        return;
      }
      
      const fetchedSemesters = await getSemesters();
      setSemesters(fetchedSemesters);
      setTotalSemestersLoaded(fetchedSemesters.length);
      setFirestoreStatus('connected');
    } catch (error: any) {
      console.error("Error loading semesters from Firestore:", error);
      if (error.message === "FirebaseMisconfigured") {
         setFirestoreStatus('misconfigured');
         toast({ title: "Firebase Misconfigured", description: "Please update firebaseConfig.ts with your project credentials.", variant: "destructive", duration: 10000 });
      } else {
        setFirestoreStatus('error');
        toast({ title: "Error loading semesters", description: "Could not fetch semesters from Firestore. Check console for details.", variant: "destructive" });
      }
    }
    setIsLoading(false);
  }

  const handleOpenAddModal = () => {
    form.reset({ semesterName: '' });
    setIsAddModalOpen(true);
  };

  const handleOpenRenameModal = (semester: Semester) => {
    setSemesterToEdit(semester);
    form.reset({ semesterName: semester });
    setIsRenameModalOpen(true);
  };

  const onSubmitAdd = async (data: SemesterFormData) => {
    setIsSubmitting(true);
    const success = await addSemester(data.semesterName);
    if (success) {
      toast({ title: "Semester Added", description: `"${data.semesterName}" has been added to Firestore.` });
      setIsAddModalOpen(false);
    } else {
      toast({ title: "Error Adding Semester", description: `Could not add "${data.semesterName}". It might already exist or an error occurred.`, variant: "destructive" });
    }
    if (componentReady) await loadSemesters();
    setIsSubmitting(false);
  };

  const onSubmitRename = async (data: SemesterFormData) => {
    if (!semesterToEdit) return;
    setIsSubmitting(true);
    const success = await renameSemester(semesterToEdit, data.semesterName);
    if (success) {
      toast({ title: "Semester Renamed", description: `"${semesterToEdit}" is now "${data.semesterName}" in Firestore.` });
      setIsRenameModalOpen(false);
      setSemesterToEdit(null);
    } else {
      toast({ title: "Error Renaming Semester", description: `Could not rename "${semesterToEdit}". The new name might already exist or an error occurred.`, variant: "destructive" });
    }
    if (componentReady) await loadSemesters();
    setIsSubmitting(false);
  };

  const handleDeleteSemester = async (semesterName: string) => {
    setIsSubmitting(true);
    const success = await deleteSemester(semesterName);
    if (success) {
      toast({ title: "Semester Deleted", description: `"${semesterName}" has been deleted from Firestore.` });
    } else {
      toast({ title: "Error Deleting Semester", description: `Could not delete "${semesterName}". It might be in use or an error occurred.`, variant: "destructive" });
    }
    if (componentReady) await loadSemesters();
    setIsSubmitting(false);
  };
  
  const FirestoreStatusIndicator = () => {
    switch (firestoreStatus) {
      case 'initial':
        return <Badge variant="outline" className="text-xs"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Initializing...</Badge>;
      case 'checking':
        return <Badge variant="outline" className="text-xs"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Checking Firestore...</Badge>;
      case 'connected':
        return <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-300"><Wifi className="h-3 w-3 mr-1 text-green-600" />Firestore Connected ({totalSemestersLoaded} semesters)</Badge>;
      case 'misconfigured':
        return <Badge variant="destructive" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" />Firebase Misconfigured!</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs"><WifiOff className="h-3 w-3 mr-1" />Firestore Connection Error</Badge>;
      default:
        return <Badge variant="outline" className="text-xs"><HelpCircle className="h-3 w-3 mr-1" />Unknown Status</Badge>;
    }
  };

  if (!componentReady || (isLoading && firestoreStatus === 'initial')) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <CalendarDays className="h-6 w-6 text-primary" /> Manage Semesters
              </CardTitle>
              <CardDescription>Add, rename, or delete academic semesters. Changes here update Firestore globally.</CardDescription>
            </div>
            <FirestoreStatusIndicator />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Initializing component...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" /> Manage Semesters
            </CardTitle>
            <CardDescription>Add, rename, or delete academic semesters. Changes here update Firestore globally.</CardDescription>
          </div>
          <FirestoreStatusIndicator />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex justify-end">
          <Button 
            onClick={handleOpenAddModal} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground" 
            disabled={isSubmitting || firestoreStatus !== 'connected'}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Semester
          </Button>
        </div>

        {isLoading && firestoreStatus === 'checking' ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading semesters from Firestore...</span>
          </div>
        ) : firestoreStatus === 'misconfigured' ? (
           <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <UIAlertTitle>Firebase Configuration Needed</UIAlertTitle>
            <UIAlertDescription>
              The application is using placeholder Firebase credentials. Please update <code>src/lib/firebaseConfig.ts</code> with your actual Firebase project configuration to connect to Firestore.
            </UIAlertDescription>
          </Alert>
        ) : firestoreStatus === 'error' ? (
           <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <UIAlertTitle>Firestore Connection Error</UIAlertTitle>
            <UIAlertDescription>
              Could not connect to Firestore to load semesters. Please check your Firebase setup, security rules, and internet connection. See browser console for more details.
            </UIAlertDescription>
          </Alert>
        ) : semesters.length === 0 && firestoreStatus === 'connected' ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <UIAlertTitle>No Semesters Found</UIAlertTitle>
            <UIAlertDescription>
              There are currently no semesters defined in Firestore. Click "Add New Semester" to get started.
            </UIAlertDescription>
          </Alert>
        ) : (
          <ScrollArea className="h-96">
            <ul className="space-y-3 pr-4">
              {semesters.map(semester => (
                <li key={semester} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:shadow-md transition-shadow">
                  <span className="text-foreground font-medium">{semester}</span>
                  <div className="space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleOpenRenameModal(semester)} 
                      disabled={isSubmitting || firestoreStatus !== 'connected'}
                    >
                      <Edit className="mr-1 h-3 w-3" /> Rename
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          disabled={isSubmitting || firestoreStatus !== 'connected'}
                        >
                          <Trash2 className="mr-1 h-3 w-3" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the semester "{semester}" from Firestore.
                            This action cannot be undone and may affect teacher assignments.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteSemester(semester)} 
                            className="bg-destructive hover:bg-destructive/80"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Delete Semester"}
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
          Semesters are managed in Firestore. Actions here directly modify the database.
          Ensure your <code>src/lib/firebaseConfig.ts</code> is correctly set up.
        </p>
      </CardFooter>

      <Dialog open={isAddModalOpen || isRenameModalOpen} onOpenChange={isRenameModalOpen ? setIsRenameModalOpen : setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRenameModalOpen ? 'Rename Semester' : 'Add New Semester'}</DialogTitle>
            <DialogDescription>
              {isRenameModalOpen
                ? `Enter the new name for "${semesterToEdit}". This will update it in Firestore.`
                : 'Enter the name for the new semester to add to Firestore (e.g., "Fall 2024").'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(isRenameModalOpen ? onSubmitRename : onSubmitAdd)} className="space-y-4 py-2">
            <div>
              <Label htmlFor="semesterName">Semester Name</Label>
              <Input id="semesterName" {...form.register("semesterName")} autoFocus />
              {form.formState.errors.semesterName && <p className="text-sm text-destructive mt-1">{form.formState.errors.semesterName.message}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => { setIsAddModalOpen(false); setIsRenameModalOpen(false); setSemesterToEdit(null);}}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || firestoreStatus !== 'connected'} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isRenameModalOpen ? 'Save Changes' : 'Add Semester')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

    