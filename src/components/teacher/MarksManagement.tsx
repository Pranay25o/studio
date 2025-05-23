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
import { getAllStudents, addMark as apiAddMark, updateMark as apiUpdateMark, deleteMark as apiDeleteMark } from '@/lib/mockData';
import type { Mark, Student, User, AssessmentType, Semester } from '@/types';
import { ASSESSMENT_MAX_SCORES } from '@/types';
import { PlusCircle, Edit2, Loader2, Search, GraduationCap, AlertCircle, Trash2, CalendarFold } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
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
import { Alert, AlertTitle as UIAlertTitle, AlertDescription as UIAlertDescription } from '@/components/ui/alert'; // Renamed imports
import { FormField, FormItem } from '@/components/ui/form'; // Explicit import

const assessmentTypes = Object.keys(ASSESSMENT_MAX_SCORES) as AssessmentType[];

const studentSubjectMarksSchema = z.object({
  studentId: z.string().min(1, "Student PRN is required."),
  subject: z.string().min(1, "Subject is required."),
  semester: z.string().min(1, "Semester is required."), // Added semester to schema
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
  semester: Semester; // Added semester
  marks: Partial<Record<AssessmentType, Mark>>; 
}


export function MarksManagement() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [allMarks, setAllMarks] = useState<(Mark & { studentName?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingAggregatedMark, setEditingAggregatedMark] = useState<AggregatedMarkEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorkingSemester, setSelectedWorkingSemester] = useState<Semester | null>(null);
  const { toast } = useToast();

  const form = useForm<StudentSubjectMarksFormData>({
    resolver: zodResolver(studentSubjectMarksSchema),
    defaultValues: {
      studentId: '',
      subject: '',
      semester: '',
      scores: { CA1: null, CA2: null, MidSem: null, EndSem: null },
    },
  });

  useEffect(() => {
    fetchInitialData();
  }, []);
  
  useEffect(() => {
    // Reset form when selectedWorkingSemester changes
    form.reset({
        studentId: '',
        subject: '',
        semester: selectedWorkingSemester || '',
        scores: { CA1: null, CA2: null, MidSem: null, EndSem: null },
    });
  }, [selectedWorkingSemester, form]);


  async function fetchInitialData() {
    setIsLoading(true);
    try {
      const [fetchedStudents, allStudentMarksFromMock] = await Promise.all([
        getAllStudents(),
        getAllStudents().then(stds => stds.reduce((acc, student) => acc.concat(student.marks.map(m => ({ ...m, studentName: student.name }))), [] as (Mark & { studentName?: string })[]))
      ]);
      setStudents(fetchedStudents);
      setAllMarks(allStudentMarksFromMock);
      
      // Set default working semester if available
      if (user?.semesterAssignments && user.semesterAssignments.length > 0) {
        const sortedSemesters = [...user.semesterAssignments].sort((a, b) => b.semester.localeCompare(a.semester)); // Sort descending to get latest
        setSelectedWorkingSemester(sortedSemesters[0].semester);
        form.setValue('semester', sortedSemesters[0].semester);
      }

    } catch (error) {
      toast({ title: "Error fetching data", description: "Could not load initial data.", variant: "destructive" });
    }
    setIsLoading(false);
  }

  const teacherSemesters = useMemo(() => {
    return user?.semesterAssignments?.map(sa => sa.semester).sort((a,b) => b.localeCompare(a)) || []; // Desc sort for dropdown
  }, [user]);

  const subjectsForSelectedSemester = useMemo(() => {
    if (!selectedWorkingSemester || !user?.semesterAssignments) return [];
    const assignment = user.semesterAssignments.find(sa => sa.semester === selectedWorkingSemester);
    return assignment?.subjects || [];
  }, [selectedWorkingSemester, user]);

  const aggregatedStudentSubjectMarks = useMemo(() => {
    const grouped: Record<string, AggregatedMarkEntry> = {};
    // Filter marks by selectedWorkingSemester before aggregation
    const marksToProcess = selectedWorkingSemester 
        ? allMarks.filter(mark => mark.semester === selectedWorkingSemester) 
        : allMarks; // Or show all if no semester selected, though UI flow aims to always have one

    marksToProcess.forEach(mark => {
      const key = `${mark.studentId}-${mark.subject}-${mark.semester}`; // Include semester in key
      if (!grouped[key]) {
        const student = students.find(s => s.id === mark.studentId);
        grouped[key] = {
          studentId: mark.studentId,
          studentName: student?.name || mark.studentName || 'N/A',
          subject: mark.subject,
          semester: mark.semester, // Store semester
          marks: {},
        };
      }
      grouped[key].marks[mark.assessmentType] = mark;
    });
    return Object.values(grouped);
  }, [allMarks, students, selectedWorkingSemester]);

  const filteredAggregatedMarks = useMemo(() => {
    if (!searchTerm) return aggregatedStudentSubjectMarks;
    return aggregatedStudentSubjectMarks.filter(aggMark =>
      aggMark.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aggMark.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aggMark.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aggMark.semester.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [aggregatedStudentSubjectMarks, searchTerm]);
  
  const isUserAuthorizedForSubjectInSemester = (subject: string, semester: string) => {
    if (!user?.semesterAssignments) return false;
    const semesterAssignment = user.semesterAssignments.find(sa => sa.semester === semester);
    return semesterAssignment?.subjects.includes(subject) || false;
  };


  const handleOpenSheet = (aggMark: AggregatedMarkEntry | null = null) => {
    if (!selectedWorkingSemester) {
        toast({ title: "Select Semester", description: "Please select a working semester first.", variant: "default" });
        return;
    }
    if (subjectsForSelectedSemester.length === 0) {
      toast({ title: "No Subjects Assigned", description: `You have no subjects assigned for ${selectedWorkingSemester}.`, variant: "destructive" });
      return;
    }

    setEditingAggregatedMark(aggMark);
    if (aggMark) {
      if (!isUserAuthorizedForSubjectInSemester(aggMark.subject, aggMark.semester)) {
         toast({ title: "Unauthorized", description: `You are not authorized to manage marks for ${aggMark.subject} in ${aggMark.semester}.`, variant: "destructive" });
         return;
      }
      form.reset({
        studentId: aggMark.studentId,
        subject: aggMark.subject,
        semester: aggMark.semester, // Set semester from aggMark
        scores: {
          CA1: aggMark.marks.CA1?.score ?? null,
          CA2: aggMark.marks.CA2?.score ?? null,
          MidSem: aggMark.marks.MidSem?.score ?? null,
          EndSem: aggMark.marks.EndSem?.score ?? null,
        }
      });
    } else { // Adding new entry
      form.reset({
        studentId: '',
        subject: subjectsForSelectedSemester[0] || '', // Default to first subject in selected semester
        semester: selectedWorkingSemester, // Set current working semester
        scores: { CA1: null, CA2: null, MidSem: null, EndSem: null },
      });
    }
    setIsSheetOpen(true);
  };

  const onSubmit = async (data: StudentSubjectMarksFormData) => {
     if (!isUserAuthorizedForSubjectInSemester(data.subject, data.semester)) { // data.semester comes from form
        toast({ title: "Unauthorized", description: `You are not authorized to manage marks for ${data.subject} in ${data.semester}.`, variant: "destructive" });
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
        // Use editingAggregatedMark if available, otherwise it's a new entry for this component
        const existingMark = editingAggregatedMark?.marks[type] 
            ? editingAggregatedMark.marks[type]
            // If adding new, check allMarks for an existing component mark for this student-subject-semester-type
            : allMarks.find(m => m.studentId === data.studentId && m.subject === data.subject && m.semester === data.semester && m.assessmentType === type);


        if (score !== null && score !== undefined) { 
          const markPayload = {
            studentId: data.studentId,
            subject: data.subject,
            assessmentType: type,
            score: score,
            maxScore: ASSESSMENT_MAX_SCORES[type],
            semester: data.semester, // Ensure semester from form is used
          };
          if (existingMark) {
            if (existingMark.score !== score || existingMark.semester !== data.semester) { // also check if semester changed (should not if UI is correct)
              await apiUpdateMark({ ...existingMark, ...markPayload });
            }
          } else {
            await apiAddMark(markPayload);
          }
        } else if (existingMark) { 
          await apiDeleteMark(existingMark.id);
        }
      }

      toast({ title: "Marks Saved", description: `Marks for ${student.name} in ${data.subject} (${data.semester}) have been updated.` });
      await fetchInitialData(); // Refetch all data to update table
      // Ensure selectedWorkingSemester remains, or re-evaluate if necessary
      if (selectedWorkingSemester && !teacherSemesters.includes(selectedWorkingSemester)) {
          setSelectedWorkingSemester(teacherSemesters[0] || null); // Fallback if current semester gone
      }
      setIsSheetOpen(false);
    } catch (error) {
      console.error("Error saving marks:", error);
      toast({ title: "Error Saving Marks", description: "Could not save the marks.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };
  
  const handleDeleteAllMarksForEntry = async (entry: AggregatedMarkEntry) => {
    if (!isUserAuthorizedForSubjectInSemester(entry.subject, entry.semester)) {
      toast({ title: "Unauthorized", description: `You are not authorized to delete marks for ${entry.subject} in ${entry.semester}.`, variant: "destructive" });
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
      toast({ title: "Marks Deleted", description: `All marks for ${entry.studentName} in ${entry.subject} (${entry.semester}) have been deleted.` });
      await fetchInitialData();
       if (selectedWorkingSemester && !teacherSemesters.includes(selectedWorkingSemester)) {
          setSelectedWorkingSemester(teacherSemesters[0] || null);
      }
    } catch (error) {
      toast({ title: "Error Deleting Marks", variant: "destructive" });
    }
    setIsSubmitting(false);
  };


  if (isLoading && !selectedWorkingSemester) { // Adjusted loading condition
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading initial data...</span></div>;
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-2xl">Consolidated Marks Management</CardTitle>
            <CardDescription>View, add, or edit all assessment components for a student in a specific subject and semester.</CardDescription>
          </div>
          <Button 
            onClick={() => handleOpenSheet(null)} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground" 
            disabled={!selectedWorkingSemester || subjectsForSelectedSemester.length === 0}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add/Edit Student Marks
          </Button>
        </div>

        <div className="mt-4">
          <Label htmlFor="working-semester-select">Select Working Semester</Label>
          <Select
            value={selectedWorkingSemester || ""}
            onValueChange={(value) => {
              setSelectedWorkingSemester(value);
              // form.setValue('semester', value); // Set semester in form as well
            }}
            disabled={teacherSemesters.length === 0}
          >
            <SelectTrigger id="working-semester-select" className="w-full md:w-1/2 lg:w-1/3 mt-1">
              <SelectValue placeholder={teacherSemesters.length > 0 ? "Choose a semester..." : "No semesters assigned"} />
            </SelectTrigger>
            <SelectContent>
              {teacherSemesters.map(sem => (
                <SelectItem key={sem} value={sem}>{sem}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(user?.role === 'teacher' || user?.role === 'admin') && teacherSemesters.length === 0 && !isLoading && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <UIAlertTitle>No Semesters Assigned</UIAlertTitle>
            <UIAlertDescription>
              You are not assigned to any semesters. Please contact an administrator.
            </UIAlertDescription>
          </Alert>
        )}
         {selectedWorkingSemester && subjectsForSelectedSemester.length === 0 && !isLoading && (
          <Alert variant="default" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <UIAlertTitle>No Subjects for this Semester</UIAlertTitle>
            <UIAlertDescription>
              You are not assigned any subjects for {selectedWorkingSemester}. Marks management for this semester is disabled.
            </UIAlertDescription>
          </Alert>
        )}

        {selectedWorkingSemester && subjectsForSelectedSemester.length > 0 && (
            <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                type="text"
                placeholder={`Search marks in ${selectedWorkingSemester}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10"
            />
            </div>
        )}
      </CardHeader>
      <CardContent>
        {!selectedWorkingSemester && teacherSemesters.length > 0 && (
            <div className="text-center py-8 text-muted-foreground">
                <CalendarFold className="mx-auto h-12 w-12" />
                <p className="mt-2">Please select a working semester to manage marks.</p>
            </div>
        )}
        {isLoading && selectedWorkingSemester && ( // Show loader only if semester is selected and still loading marks
            <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading marks for {selectedWorkingSemester}...</span></div>
        )}

        {selectedWorkingSemester && subjectsForSelectedSemester.length > 0 && !isLoading && filteredAggregatedMarks.length === 0 && (
          <div className="text-center py-8">
            {searchTerm ? <Search className="mx-auto h-12 w-12 text-muted-foreground" /> : <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />}
            <h3 className="mt-2 text-sm font-medium text-foreground">
              {searchTerm ? `No marks found for "${searchTerm}" in ${selectedWorkingSemester}` : `No marks found for ${selectedWorkingSemester}`}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchTerm ? "Try a different search term." : `Get started by adding marks for a student in ${selectedWorkingSemester}.`}
            </p>
          </div>
        )}
        {selectedWorkingSemester && subjectsForSelectedSemester.length > 0 && !isLoading && filteredAggregatedMarks.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student PRN</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Subject</TableHead>
                  {/* Semester column can be removed if all data is for selectedWorkingSemester */}
                  {/* <TableHead>Semester</TableHead> */}
                  {assessmentTypes.map(type => <TableHead key={type} className="text-right">{type} ({ASSESSMENT_MAX_SCORES[type]})</TableHead>)}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAggregatedMarks.map((aggMark) => {
                  const canEditOrDelete = isUserAuthorizedForSubjectInSemester(aggMark.subject, aggMark.semester);
                  return (
                    <TableRow key={`${aggMark.studentId}-${aggMark.subject}-${aggMark.semester}`}>
                      <TableCell>{aggMark.studentId}</TableCell>
                      <TableCell>{aggMark.studentName}</TableCell>
                      <TableCell>{aggMark.subject}</TableCell>
                      {/* <TableCell>{aggMark.semester}</TableCell> */}
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
                                This action cannot be undone. This will permanently delete all marks for {aggMark.studentName} in {aggMark.subject} for {aggMark.semester}.
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
            <DialogTitle>{editingAggregatedMark ? `Edit Marks for ${editingAggregatedMark.studentName} - ${editingAggregatedMark.subject} (${editingAggregatedMark.semester})` : `Add New Student Marks for ${selectedWorkingSemester}`}</DialogTitle>
            <DialogDescription>
              Enter or update scores for all assessment components. Leave blank to not record/delete a component.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
             {/* Semester is now part of the form and set by selectedWorkingSemester */}
             <input type="hidden" {...form.register("semester")} />

            {!editingAggregatedMark && ( // Only show student/subject selection when adding new
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
                      {subjectsForSelectedSemester.length > 0 ? (
                        <Select onValueChange={field.onChange} value={field.value} disabled={!!editingAggregatedMark}>
                          <SelectTrigger id="subject-dialog">
                            <SelectValue placeholder="Select Subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjectsForSelectedSemester.map(subject => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input id="subject-dialog" placeholder="No subjects for this semester" value={field.value} onChange={field.onChange} disabled />
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
                disabled={isSubmitting || !form.watch('subject') || (form.watch('subject') && !isUserAuthorizedForSubjectInSemester(form.watch('subject'), form.watch('semester')))}
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