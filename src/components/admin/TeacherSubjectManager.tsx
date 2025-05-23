
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getAllTeachers, assignSubjectsToTeacher as apiAssignSubjectsToTeacher } from '@/lib/mockData';
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

// Example: A predefined list of subjects available in the school/system
const ALL_AVAILABLE_SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "History", "Geography", 
  "English Literature", "Computer Science", "Art", "Music", "Physical Education", "Advanced Physics"
].sort();


const subjectAssignmentSchema = z.object({
  teacherId: z.string().min(1, "Teacher selection is required."),
  subjects: z.array(z.string()), 
});

type SubjectAssignmentFormData = z.infer<typeof subjectAssignmentSchema>;

export function TeacherSubjectManager() {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);
  const { toast } = useToast();

  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<SubjectAssignmentFormData>({
    resolver: zodResolver(subjectAssignmentSchema),
    defaultValues: { teacherId: '', subjects: [] },
  });

  const watchedTeacherId = watch('teacherId');
  const watchedSubjects = watch('subjects');

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (watchedTeacherId) {
      const teacher = teachers.find(t => t.id === watchedTeacherId);
      setSelectedTeacher(teacher || null);
      setValue('subjects', teacher?.subjects || []);
    } else {
      setSelectedTeacher(null);
      setValue('subjects', []);
    }
  }, [watchedTeacherId, teachers, setValue]);

  async function fetchTeachers() {
    setIsLoading(true);
    try {
      const fetchedTeachers = await getAllTeachers();
      setTeachers(fetchedTeachers);
    } catch (error) {
      toast({ title: "Error fetching teachers", description: "Could not load teacher data.", variant: "destructive" });
    }
    setIsLoading(false);
  }

  const onSubmit = async (data: SubjectAssignmentFormData) => {
    setIsSubmitting(true);
    try {
      await apiAssignSubjectsToTeacher(data.teacherId, data.subjects);
      toast({ title: "Subjects Updated", description: `Subjects for ${selectedTeacher?.name} have been updated.` });
      // Refresh teacher list to show updated subjects by re-fetching
      // or by updating the local state if preferred for performance
      const updatedTeachers = teachers.map(t => 
        t.id === data.teacherId ? { ...t, subjects: data.subjects } : t
      );
      setTeachers(updatedTeachers);
      setSelectedTeacher(updatedTeachers.find(t => t.id === data.teacherId) || null);

    } catch (error) {
      toast({ title: "Error Updating Subjects", description: "Could not update teacher subjects.", variant: "destructive" });
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
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading teacher data...</span></div>;
  }
  
  if (teachers.length === 0 && !isLoading) {
    return (
        <Card className="shadow-xl w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2"><UserCog className="h-6 w-6 text-primary" /> Teacher Subject Management</CardTitle>
                <CardDescription>Assign or modify subjects for teachers.</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Teachers Found</AlertTitle>
                    <AlertDescription>
                        There are no teachers in the system to manage. Ensure teachers are added via mock data or a user creation process.
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
            <UserCog className="h-6 w-6 text-primary" /> Teacher Subject Management
        </CardTitle>
        <CardDescription>Select a teacher to assign or modify their academic subjects.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <Controller
            name="teacherId"
            control={control}
            render={({ field }) => (
              <div className="space-y-1">
                <Label htmlFor="teacherId">Select Teacher</Label>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="teacherId" className="w-full">
                    <SelectValue placeholder="Choose a teacher..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name} ({teacher.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.teacherId && <p className="text-sm text-destructive">{errors.teacherId.message}</p>}
              </div>
            )}
          />

          {selectedTeacher && (
            <div>
              <Label className="mb-2 block font-medium">Assign Subjects for: <span className="text-accent">{selectedTeacher.name}</span></Label>
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
          <Button type="submit" disabled={isSubmitting || !selectedTeacher} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
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
