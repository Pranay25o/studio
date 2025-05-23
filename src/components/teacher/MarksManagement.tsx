
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getAllStudents, addMark as apiAddMark, updateMark as apiUpdateMark, deleteMark as apiDeleteMark, getAllAvailableSubjects } from '@/lib/mockData'; // getAllAvailableSubjects is now async
import type { Mark, Student, User, AssessmentType } from '@/types';
import { ASSESSMENT_MAX_SCORES } from '@/types';
import { PlusCircle, Edit2, Loader2, Search, GraduationCap, AlertCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
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
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const assessmentTypes = Object.keys(ASSESSMENT_MAX_SCORES) as AssessmentType[];

// Schema for the new dialog form managing all components
const studentSubjectMarksSchema = z.object({
  studentId: z.string().min(1, "Student PRN is required."),
  subject: z.string().min(1, "Subject is required."),
  scores: z.object({
    CA1: z.coerce.number().min(0, "Score must be non-negative.").max(ASSESSMENT_MAX_SCORES.CA1, `Max ${ASSESSMENT_MAX_SCORES.CA1}`).optional().nullable(),
    CA2: z.coerce.number().min(0, "Score must be non-negative.").max(ASSESSMENT_MAX_SCORES.CA2, `Max ${ASSESSMENT_MAX_SCORES.CA2}`).optional().nullable(),
    MidSem: z.coerce.number().min(0, "Score must be non-negative.").max(ASSESSMENT_MAX_SCORES.MidSem, `Max ${ASSESSMENT_MAX_SCORES.MidSem}`).optional().nullable(),
    EndSem: z.coerce.number().min(0, "Score must be non-negative.").max(ASSESSMENT_MAX_SCORES.EndSem, `Max ${ASSESSMENT_MAX_SCORES.EndSem}`).optional().nullable(),
  }),
});
type StudentSubjectMarksFormData = z.infer<typeof studentSubjectMarksSchema>;

interface AggregatedMarkEntry {
  studentId: string;
  studentName: string;
  subject: string;
  marks: Partial<Record<AssessmentType, Mark>>; 
}


export function MarksManagement() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [allMarks, setAllMarks] = useState<(Mark & { studentName?: string })[]>([]);
  const [_systemSubjects, setSystemSubjects] = useState<string[]>([]); // Renamed to avoid conflict, not directly used
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingAggregatedMark, setEditingAggregatedMark] = useState<AggregatedMarkEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const userManagedSubjects = useMemo(() => {
    if (user?.role === 'admin' && user.subjects && user.subjects.length > 0) {
        return user.subjects; // Admins use their general subjects if assigned
    }
    // For teachers, this might later be scoped by semester
    return user?.subjects || [];
  }, [user]);

  const canManageAnySubject = userManagedSubjects.length > 0;

  const form = useForm<StudentSubjectMarksFormData>({
    resolver: zodResolver(studentSubjectMarksSchema),
    defaultValues: {
      studentId: '',
      subject: '',
      scores: { CA1: null, CA2: null, MidSem: null, EndSem: null },
    },
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setIsLoading(true);
    try {
      // getAllAvailableSubjects is now async, but not directly used here after refactor, 
      // userManagedSubjects provides the list for the dropdown.
      const [fetchedStudents, allStudentMarks] = await Promise.all([
        getAllStudents(),
        getAllStudents().then(stds => stds.reduce((acc, student) => acc.concat(student.marks.map(m => ({ ...m, studentName: student.name }))), [] as (Mark & { studentName?: string })[]))
      ]);
      setStudents(fetchedStudents);
      setAllMarks(allStudentMarks);
      setIsLoading(false);
    } catch (error) {
      toast({ title: "Error fetching data", description: "Could not load initial data.", variant: "destructive" });
      setIsLoading(false);
    }
  }

  const aggregatedStudentSubjectMarks = useMemo(() => {
    const grouped: Record<string, AggregatedMarkEntry> = {};
    allMarks.forEach(mark => {
      const key = `${mark.studentId}-${mark.subject}`;
      if (!grouped[key]) {
        const student = students.find(s => s.id === mark.studentId);
        grouped[key] = {
          studentId: mark.studentId,
          studentName: student?.name || mark.studentName || 'N/A',
          subject: mark.subject,
          marks: {},
        };
      }
      grouped[key].marks[mark.assessmentType] = mark;
    });
    return Object.values(grouped);
  }, [allMarks, students]);

  const filteredAggregatedMarks = useMemo(() => {
    if (!searchTerm) return aggregatedStudentSubjectMarks;
    return aggregatedStudentSubjectMarks.filter(aggMark =>
      aggMark.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aggMark.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aggMark.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [aggregatedStudentSubjectMarks, searchTerm]);

  const isUserAuthorizedForSubject = (subject: string) => {
    return userManagedSubjects.includes(subject);
  };

  const handleOpenSheet = (aggMark: AggregatedMarkEntry | null = null) => {
    if (!canManageAnySubject && !aggMark) {
      toast({ title: "Unauthorized", description: "You are not assigned to manage any subjects.", variant: "destructive" });
      return;
    }
    setEditingAggregatedMark(aggMark);
    if (aggMark) {
      if (!isUserAuthorizedForSubject(aggMark.subject)) {
         toast({ title: "Unauthorized", description: `You are not authorized to manage marks for ${aggMark.subject}.`, variant: "destructive" });
         return;
      }
      form.reset({
        studentId: aggMark.studentId,
        subject: aggMark.subject,
        scores: {
          CA1: aggMark.marks.CA1?.score ?? null,
          CA2: aggMark.marks.CA2?.score ?? null,
          MidSem: aggMark.marks.MidSem?.score ?? null,
          EndSem: aggMark.marks.EndSem?.score ?? null,
        }
      });
    } else {
      form.reset({
        studentId: '',
        subject: userManagedSubjects[0] || '',
        scores: { CA1: null, CA2: null, MidSem: null, EndSem: null },
      });
    }
    setIsSheetOpen(true);
  };

  const onSubmit = async (data: StudentSubjectMarksFormData) => {
     if (!isUserAuthorizedForSubject(data.subject)) {
        toast({ title: "Unauthorized", description: `You are not authorized to manage marks for ${data.subject}.`, variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
      const student = students.find(s => s.id === data.studentId);
      if (!student) {
        toast({ title: "Student not found", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      for (const type of assessmentTypes) {
        const score = data.scores[type];
        const existingMark = editingAggregatedMark?.marks[type];

        if (score !== null && score !== undefined) { 
          const markPayload = {
            studentId: data.studentId,
            subject: data.subject,
            assessmentType: type,
            score: score,
            maxScore: ASSESSMENT_MAX_SCORES[type],
          };
          if (existingMark) {
            if (existingMark.score !== score) {
              await apiUpdateMark({ ...existingMark, ...markPayload });
            }
          } else {
            await apiAddMark(markPayload);
          }
        } else if (existingMark) { 
          await apiDeleteMark(existingMark.id);
        }
      }

      toast({ title: "Marks Saved", description: `Marks for ${student.name} in ${data.subject} have been updated.` });
      await fetchInitialData();
      setIsSheetOpen(false);
    } catch (error) {
      console.error("Error saving marks:", error);
      toast({ title: "Error Saving Marks", description: "Could not save the marks.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };
  
  const handleDeleteAllMarksForEntry = async (entry: AggregatedMarkEntry) => {
    if (!isUserAuthorizedForSubject(entry.subject)) {
      toast({ title: "Unauthorized", description: `You are not authorized to delete marks for ${entry.subject}.`, variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      for (const type of assessmentTypes) {
        const mark = entry.marks[type];
        if (mark) {
          await apiDeleteMark(mark.id);
        }
      }
      toast({ title: "Marks Deleted", description: `All marks for ${entry.studentName} in ${entry.subject} have been deleted.` });
      await fetchInitialData();
    } catch (error) {
      toast({ title: "Error Deleting Marks", variant: "destructive" });
    }
    setIsSubmitting(false);
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading marks data...</span></div>;
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-2xl">Consolidated Marks Management</CardTitle>
            <CardDescription>View, add, or edit all assessment components for a student in a specific subject.</CardDescription>
          </div>
          <Button onClick={() => handleOpenSheet(null)} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!canManageAnySubject}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add/Edit Student Marks
          </Button>
        </div>
        {(user?.role === 'teacher' || user?.role === 'admin') && !canManageAnySubject && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Subjects Assigned</AlertTitle>
            <AlertDescription>
              You are not currently assigned to manage marks for any subjects. {user?.role === 'admin' && "As an admin, you can assign subjects to yourself via 'User Subject Assignment'."}
            </AlertDescription>
          </Alert>
        )}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by student name, PRN, or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredAggregatedMarks.length === 0 && (
          <div className="text-center py-8">
            {searchTerm ? <Search className="mx-auto h-12 w-12 text-muted-foreground" /> : <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />}
            <h3 className="mt-2 text-sm font-medium text-foreground">
              {searchTerm ? `No marks found for "${searchTerm}"` : "No marks found"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchTerm ? "Try a different search term." : "Get started by adding marks for a student."}
            </p>
          </div>
        )}
        {filteredAggregatedMarks.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student PRN</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Subject</TableHead>
                  {assessmentTypes.map(type => <TableHead key={type} className="text-right">{type} ({ASSESSMENT_MAX_SCORES[type]})</TableHead>)}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAggregatedMarks.map((aggMark) => {
                  const canEditOrDelete = isUserAuthorizedForSubject(aggMark.subject);
                  return (
                    <TableRow key={`${aggMark.studentId}-${aggMark.subject}`}>
                      <TableCell>{aggMark.studentId}</TableCell>
                      <TableCell>{aggMark.studentName}</TableCell>
                      <TableCell>{aggMark.subject}</TableCell>
                      {assessmentTypes.map(type => (
                        <TableCell key={type} className="text-right">
                          {aggMark.marks[type]?.score ?? '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenSheet(aggMark)} className="hover:text-accent hover:border-accent" disabled={!canEditOrDelete || isSubmitting}>
                          <Edit2 className="mr-1 h-3 w-3" /> Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="text-xs" disabled={!canEditOrDelete || isSubmitting}>
                              <Trash2 className="mr-1 h-3 w-3" /> Delete All
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete all marks for {aggMark.studentName} in {aggMark.subject}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteAllMarksForEntry(aggMark)} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Delete All Marks"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAggregatedMark ? `Edit Marks for ${editingAggregatedMark.studentName} - ${editingAggregatedMark.subject}` : 'Add New Student Marks'}</DialogTitle>
            <DialogDescription>
              Enter or update scores for all assessment components. Leave blank to not record/delete a component.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            {!editingAggregatedMark && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="studentId-dialog">Student PRN</Label>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!!editingAggregatedMark}>
                        <SelectTrigger id="studentId-dialog">
                          <SelectValue placeholder="Select Student" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map(student => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name} ({student.id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.studentId && <p className="text-sm text-destructive mt-1">{form.formState.errors.studentId.message}</p>}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="subject-dialog">Subject</Label>
                      {canManageAnySubject ? (
                        <Select onValueChange={field.onChange} value={field.value} disabled={!!editingAggregatedMark && !isUserAuthorizedForSubject(editingAggregatedMark.subject)}>
                          <SelectTrigger id="subject-dialog">
                            <SelectValue placeholder="Select Subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {userManagedSubjects.map(subject => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input id="subject-dialog" placeholder="No subjects assigned" value={field.value} onChange={field.onChange} disabled />
                      )}
                      {form.formState.errors.subject && <p className="text-sm text-destructive mt-1">{form.formState.errors.subject.message}</p>}
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                {assessmentTypes.map((type) => (
                    <FormField
                        control={form.control}
                        name={`scores.${type}`}
                        key={type}
                        render={({ field: { onChange, onBlur, value, name } }) => (
                            <FormItem>
                                <Label htmlFor={name} className="text-sm">{type} (Max: {ASSESSMENT_MAX_SCORES[type]})</Label>
                                <Input
                                    id={name}
                                    type="number"
                                    placeholder={`Score / ${ASSESSMENT_MAX_SCORES[type]}`}
                                    value={value === null || value === undefined ? '' : String(value)}
                                    onChange={(e) => {
                                        const numValue = e.target.value === '' ? null : Number(e.target.value);
                                        onChange(numValue);
                                    }}
                                    onBlur={onBlur}
                                    min="0"
                                    max={ASSESSMENT_MAX_SCORES[type]}
                                />
                                {form.formState.errors.scores?.[type] && <p className="text-sm text-destructive mt-1">{form.formState.errors.scores[type]?.message}</p>}
                            </FormItem>
                        )}
                    />
                ))}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmitting || !form.watch('subject') || (form.watch('subject') && !isUserAuthorizedForSubject(form.watch('subject')))}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save All Marks'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

import { FormField, FormItem } from '@/components/ui/form';
