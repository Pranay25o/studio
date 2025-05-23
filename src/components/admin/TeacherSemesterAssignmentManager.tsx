
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Loader2, BookUser, CalendarDays, Users, AlertCircle, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';

const teacherSemesterAssignmentSchema = z.object({
  teacherId: z.string().min(1, "Teacher selection is required."),
  semester: z.string().min(1, "Semester selection is required."),
  assignedSubjects: z.array(z.string()).optional(),
});

type TeacherSemesterAssignmentFormData = z.infer<typeof teacherSemesterAssignmentSchema>;

export function TeacherSemesterAssignmentManager() {
  const { refreshAuthUser, user: loggedInUser } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [systemSubjects, setSystemSubjects] = useState<string[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<Semester>('');

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
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setIsLoading(true);
    try {
      const [fetchedUsers, fetchedSysSubjects, fetchedSemesters] = await Promise.all([
        getAllUsers(),
        getAllAvailableSubjects(),
        getSemesters(),
      ]);
      setAllUsers(fetchedUsers.filter(u => u.role === 'teacher' || u.role === 'admin')); // Admins can also be teachers
      setSystemSubjects(fetchedSysSubjects);
      setSemesters(fetchedSemesters);
    } catch (error) {
      toast({ title: "Error fetching data", description: "Could not load initial selection data.", variant: "destructive" });
    }
    setIsLoading(false);
  }
  
  const teachers = useMemo(() => allUsers.filter(u => u.role === 'teacher' || u.role === 'admin'), [allUsers]);

  useEffect(() => {
    // When selectedTeacherId or selectedSemester changes, update the form's assignedSubjects
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
      
      // Refresh all user data to reflect changes
      const fetchedUsers = await getAllUsers();
      setAllUsers(fetchedUsers.filter(u => u.role === 'teacher' || u.role === 'admin'));

      // If the logged-in user's assignments were changed, refresh their auth context
      if (loggedInUser?.id === data.teacherId) {
        await refreshAuthUser();
      }

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
                    }} 
                    value={field.value}
                  >
                    <SelectTrigger id="teacherId-select">
                      <SelectValue placeholder="Choose a teacher/admin..." />
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
                    disabled={!selectedTeacherId}
                  >
                    <SelectTrigger id="semester-select" disabled={!selectedTeacherId}>
                      <SelectValue placeholder={selectedTeacherId ? "Choose a semester..." : "Select teacher first..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters.map(sem => (
                        <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                      ))}
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
                      )) : <p className="text-sm text-muted-foreground">No system subjects available. Add them via "Manage System Subjects".</p>}
                    </div>
                  </ScrollArea>
                )}
              />
              {form.formState.errors.assignedSubjects && <p className="text-sm text-destructive mt-1">{form.formState.errors.assignedSubjects.message}</p>}
            </div>
          )}
          
          {teachers.length === 0 && !isLoading && (
             <Alert variant="default" className="mt-4">
                <Users className="h-4 w-4" />
                <AlertTitle>No Teachers/Admins Found</AlertTitle>
                <AlertDescription>
                    There are no teachers or administrators in the system to manage.
                </AlertDescription>
            </Alert>
          )}
          {semesters.length === 0 && !isLoading && (
             <Alert variant="default" className="mt-4">
                <CalendarDays className="h-4 w-4" />
                <AlertTitle>No Semesters Found</AlertTitle>
                <AlertDescription>
                    There are no semesters defined in the system.
                </AlertDescription>
            </Alert>
          )}


          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting || !selectedTeacherId || !selectedSemester} className="min-w-[120px]">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
              Save Assignments
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Helper to import FormField and FormItem if not directly available.
// These are typically part of '@/components/ui/form'
import { FormField, FormItem } from '@/components/ui/form';

