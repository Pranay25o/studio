
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  getAllUsers,
  getAllAvailableSubjects, 
  getSemesters, 
  assignSubjectsToTeacherForSemester as apiAssignSubjectsToTeacherForSemester,
} from '@/lib/mockData';
import type { User, Semester } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, BookUser, CalendarDays, Users, AlertCircle, Save, Wifi, WifiOff, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle as UIAlertTitle } from '@/components/ui/alert'; 
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { FormField, FormItem } from '@/components/ui/form';

const teacherSemesterAssignmentSchema = z.object({
  teacherId: z.string().min(1, "Teacher selection is required."),
  semester: z.string().min(1, "Semester selection is required."),
  assignedSubjects: z.array(z.string()).optional(),
});

type TeacherSemesterAssignmentFormData = z.infer<typeof teacherSemesterAssignmentSchema>;

type DataLoadingStatus = 'initial' | 'loading' | 'success' | 'error' | 'misconfigured';

export function TeacherSemesterAssignmentManager() {
  const { refreshAuthUser, user: loggedInUser } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [systemSubjects, setSystemSubjects] = useState<string[]>([]); // From mock
  const [semesters, setSemesters] = useState<Semester[]>([]); // From Firestore
  
  const [usersStatus, setUsersStatus] = useState<DataLoadingStatus>('initial');
  const [subjectsStatus, setSubjectsStatus] = useState<DataLoadingStatus>('initial'); 
  const [semestersStatus, setSemestersStatus] = useState<DataLoadingStatus>('initial');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<Semester>('');
  const [componentReady, setComponentReady] = useState(false);

  const { toast } = useToast();

  const form = useForm<TeacherSemesterAssignmentFormData>({
    resolver: zodResolver(teacherSemesterAssignmentSchema),
    defaultValues: {
      teacherId: '',
      semester: '',
      assignedSubjects: [],
    },
  });

  useEffect(() => {
    setComponentReady(true);
  }, []);

  useEffect(() => {
    if (componentReady) {
      fetchInitialData();
    }
  }, [componentReady]);

  async function fetchInitialData() {
    setUsersStatus('loading');
    setSubjectsStatus('loading'); 
    setSemestersStatus('loading');

    let isFirebaseMisconfigured = false;
    if (typeof window !== "undefined") { // Ensure window is defined (client-side)
      isFirebaseMisconfigured = process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "YOUR_API_KEY_HERE" ||
                                 ((window as any).firebase?.app?.options?.apiKey === "YOUR_API_KEY_HERE");
    }


    if (isFirebaseMisconfigured) {
      toast({ title: "Firebase Misconfigured", description: "Update firebaseConfig.ts. Semesters data (Firestore-dependent) won't load.", variant: "destructive", duration: 10000 });
      setSemestersStatus('misconfigured');
    }
    
    try {
      const fetchedUsers = await getAllUsers(); // Firestore
      setAllUsers(fetchedUsers.filter(u => u.role === 'teacher' || u.role === 'admin'));
      setUsersStatus('success');
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ title: "Error fetching users", description: "Could not load user list from Firestore.", variant: "destructive" });
      setUsersStatus('error');
    }

    try {
      const fetchedSysSubjects = getAllAvailableSubjects(); // Mock
      setSystemSubjects(fetchedSysSubjects);
      setSubjectsStatus('success');
    } catch (error) {
      console.error("Error fetching system subjects (mock):", error);
      toast({ title: "Error fetching system subjects", description: "Could not load mock subject list.", variant: "destructive" });
      setSubjectsStatus('error'); 
    }


    if (!isFirebaseMisconfigured) {
      try {
        const fetchedSemesters = await getSemesters(); // Firestore
        setSemesters(fetchedSemesters);
        setSemestersStatus('success');
      } catch (error: any) {
        console.error("Error fetching semesters:", error);
         if (error.message === "FirebaseMisconfigured") { 
          setSemestersStatus('misconfigured');
        } else {
          setSemestersStatus('error');
        }
        toast({ title: "Error fetching semesters", description: "Could not load semester list from Firestore.", variant: "destructive" });
      }
    } else {
       setSemesters([]); 
    }
  }
  
  const isLoadingInitialData = !componentReady || usersStatus === 'loading' || usersStatus === 'initial' || subjectsStatus === 'loading' || subjectsStatus === 'initial' || semestersStatus === 'loading' || semestersStatus === 'initial';
  const hasLoadingError = usersStatus === 'error' || subjectsStatus === 'error' || semestersStatus === 'error';
  const isSemestersMisconfigured = semestersStatus === 'misconfigured';

  const teachers = useMemo(() => allUsers.filter(u => u.role === 'teacher' || u.role === 'admin'), [allUsers]);

  useEffect(() => {
    const teacher = allUsers.find(u => u.id === selectedTeacherId);
    if (teacher && selectedSemester && teacher.semesterAssignments) {
      const semesterAssignment = teacher.semesterAssignments.find(sa => sa.semester === selectedSemester);
      form.setValue('assignedSubjects', semesterAssignment?.subjects || []);
    } else {
      form.setValue('assignedSubjects', []);
    }
  }, [selectedTeacherId, selectedSemester, allUsers, form]);


  const onSubmit = async (data: TeacherSemesterAssignmentFormData) => {
    setIsSubmitting(true);
    try {
      await apiAssignSubjectsToTeacherForSemester(data.teacherId, data.semester, data.assignedSubjects || []);
      toast({ title: "Assignments Updated", description: `Subject assignments for ${allUsers.find(u=>u.id === data.teacherId)?.name} in ${data.semester} have been saved.` });
      
      // Re-fetch users to get the latest assignments reflected
      if(componentReady) {
        setUsersStatus('loading');
        try {
          const fetchedUsers = await getAllUsers();
          setAllUsers(fetchedUsers.filter(u => u.role === 'teacher' || u.role === 'admin'));
          setUsersStatus('success');
        } catch (error) {
          setUsersStatus('error');
          toast({title: "Error refreshing user data", variant: "destructive"});
        }
      }


      if (loggedInUser?.id === data.teacherId) {
        await refreshAuthUser();
      }

    } catch (error) {
      toast({ title: "Error Updating Assignments", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  if (isLoadingInitialData) {
    return (
        <Card className="w-full max-w-3xl mx-auto shadow-xl">
            <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                    <BookUser className="h-6 w-6 text-primary" /> Manage Teacher Semester Assignments
                </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" /> 
                <span className="ml-2">Loading assignment data...</span>
            </CardContent>
        </Card>
    );
  }

  if (isSemestersMisconfigured && !isLoadingInitialData) { 
    return (
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2 text-destructive">
            <AlertCircle className="h-6 w-6" /> Firebase Configuration Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <UIAlertTitle>Firebase Misconfigured</UIAlertTitle>
            <AlertDescription>
              Please update <code>src/lib/firebaseConfig.ts</code> with your project credentials.
              Semesters data cannot be loaded from Firestore. System subjects (mock data) may load.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (hasLoadingError && !isLoadingInitialData) { 
     return (
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2 text-destructive">
            <AlertCircle className="h-6 w-6" /> Data Loading Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <UIAlertTitle>Failed to Load Data</UIAlertTitle>
            <AlertDescription>
              Could not load all necessary data. Please check your console for errors.
              {usersStatus === 'error' && <p className="mt-1">- Failed to load users from Firestore.</p>}
              {subjectsStatus === 'error' && <p className="mt-1">- Failed to load system subjects (mock data).</p>}
              {semestersStatus === 'error' && <p className="mt-1">- Failed to load semesters from Firestore.</p>}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <BookUser className="h-6 w-6 text-primary" /> Manage Teacher Semester Assignments
        </CardTitle>
        <CardDescription>Assign subjects to teachers for specific academic semesters. Teachers will only be able to manage marks for subjects they are assigned in a selected semester.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="teacherId"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="teacherId-select">Select Teacher/Admin</Label>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedTeacherId(value);
                      setSelectedSemester(''); 
                      form.setValue('semester', '');
                      form.setValue('assignedSubjects', []);
                    }} 
                    value={field.value}
                    disabled={usersStatus !== 'success' || teachers.length === 0}
                  >
                    <SelectTrigger id="teacherId-select" disabled={usersStatus !== 'success' || teachers.length === 0}>
                      <SelectValue placeholder={usersStatus === 'success' && teachers.length > 0 ? "Choose a teacher/admin..." : (usersStatus === 'success' ? "No teachers/admins found" : "Loading teachers...")} />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email}) - <span className="capitalize text-muted-foreground">{user.role}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.teacherId && <p className="text-sm text-destructive mt-1">{form.formState.errors.teacherId.message}</p>}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="semester"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="semester-select">Select Semester</Label>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedSemester(value);
                    }}
                    value={field.value}
                    disabled={!selectedTeacherId || semestersStatus !== 'success' || semesters.length === 0}
                  >
                    <SelectTrigger id="semester-select" disabled={!selectedTeacherId || semestersStatus !== 'success' || semesters.length === 0}>
                      <SelectValue placeholder={!selectedTeacherId ? "Select teacher first" : (semestersStatus === 'success' && semesters.length > 0 ? "Choose a semester..." : (semestersStatus === 'success' ? "No semesters defined" : (semestersStatus === 'misconfigured' ? "Semesters misconfigured" : "Loading semesters...")))} />
                    </SelectTrigger>
                    <SelectContent>
                      {semestersStatus === 'success' && semesters.length > 0 ? (
                        semesters.map(sem => (
                          <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          {semestersStatus === 'misconfigured' ? "Firebase misconfigured." : (semestersStatus === 'loading' || semestersStatus === 'initial' ? "Loading..." : "No semesters defined.")}
                          {semestersStatus !== 'loading' && semestersStatus !== 'initial' && <br/>}
                          {semestersStatus !== 'loading' && semestersStatus !== 'initial' && `Add them via "Manage Semesters".`}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                   {form.formState.errors.semester && <p className="text-sm text-destructive mt-1">{form.formState.errors.semester.message}</p>}
                </FormItem>
              )}
            />
          </div>

          {selectedTeacherId && selectedSemester && (
            <div className="pt-4 border-t">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Assign Subjects for <span className="text-accent">{allUsers.find(u=>u.id === selectedTeacherId)?.name}</span> in <span className="text-accent">{selectedSemester}</span>
              </h3>
              <Controller
                name="assignedSubjects"
                control={form.control}
                render={({ field }) => (
                  <ScrollArea className="h-60 w-full rounded-md border p-4 my-4 bg-background/50">
                    <div className="space-y-2">
                      {subjectsStatus === 'success' && systemSubjects.length > 0 ? systemSubjects.map(subject => (
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
                      )) : (subjectsStatus === 'success' ? <p className="text-sm text-muted-foreground">No system subjects available (check mockData.ts).</p> : <p className="text-sm text-muted-foreground">Loading subjects...</p>)}
                    </div>
                  </ScrollArea>
                )}
              />
              {form.formState.errors.assignedSubjects && <p className="text-sm text-destructive mt-1">{form.formState.errors.assignedSubjects.message}</p>}
            </div>
          )}
          
          {usersStatus === 'success' && teachers.length === 0 && (
             <Alert variant="default" className="mt-4">
                <Users className="h-4 w-4" />
                <UIAlertTitle>No Teachers/Admins Found</UIAlertTitle>
                <AlertDescription>
                    There are no teachers or administrators registered in Firestore to manage.
                </AlertDescription>
            </Alert>
          )}
          {semestersStatus === 'success' && semesters.length === 0 && !isSemestersMisconfigured && (
             <Alert variant="default" className="mt-4">
                <CalendarDays className="h-4 w-4" />
                <UIAlertTitle>No Semesters Found</UIAlertTitle>
                <AlertDescription>
                    There are no semesters defined in Firestore. Please add them via "Manage Semesters" in the admin panel.
                </AlertDescription>
            </Alert>
          )}
          {subjectsStatus === 'success' && systemSubjects.length === 0 && selectedTeacherId && selectedSemester && (
             <Alert variant="default" className="mt-4">
                <BookUser className="h-4 w-4" />
                <UIAlertTitle>No System Subjects Found</UIAlertTitle>
                <AlertDescription>
                    There are no system subjects defined in <code>mockData.ts</code>. Please update it if needed.
                </AlertDescription>
            </Alert>
          )}


          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting || !selectedTeacherId || !selectedSemester || subjectsStatus !== 'success' || semestersStatus !== 'success' || hasLoadingError || isSemestersMisconfigured } className="min-w-[150px]">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
              Save Assignments
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

    