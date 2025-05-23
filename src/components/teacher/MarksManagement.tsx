
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
import { getAllStudents, addMark as apiAddMark, updateMark as apiUpdateMark, deleteMark as apiDeleteMark, getAllAvailableSubjects } from '@/lib/mockData';
import type { Mark, Student, MarksSuggestionInput, User, AssessmentType } from '@/types';
import { ASSESSMENT_MAX_SCORES } from '@/types';
import { generateMarksSuggestions } from '@/ai/flows/generate-marks-suggestions';
import { PlusCircle, Edit2, Trash2, Lightbulb, Loader2, Search, GraduationCap, AlertCircle } from 'lucide-react';
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

const markSchema = z.object({
  studentId: z.string().min(1, "Student PRN is required."),
  subject: z.string().min(1, "Subject is required."),
  assessmentType: z.enum(assessmentTypes, { required_error: "Assessment type is required." }),
  score: z.coerce.number().min(0, "Score must be non-negative."),
  maxScore: z.coerce.number().min(1, "Max score must be at least 1."), // Will be validated against assessment type
}).refine(data => {
  if (data.assessmentType) {
    return data.maxScore === ASSESSMENT_MAX_SCORES[data.assessmentType];
  }
  return true;
}, {
  message: "Max score does not match the selected assessment type.",
  path: ["maxScore"],
}).refine(data => data.score <= data.maxScore, {
  message: "Score cannot exceed max score.",
  path: ["score"],
});

type MarkFormData = z.infer<typeof markSchema>;

export function MarksManagement() {
  const { user } = useAuth(); 
  const [students, setStudents] = useState<Student[]>([]);
  const [allMarks, setAllMarks] = useState<(Mark & {studentName?: string})[]>([]);
  const [systemSubjects, setSystemSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMark, setEditingMark] = useState<Mark | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const userManagedSubjects = useMemo(() => user?.subjects || [], [user]);
  const canManageAnySubject = userManagedSubjects.length > 0;

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<MarkFormData>({
    resolver: zodResolver(markSchema),
    defaultValues: { 
      studentId: '', 
      subject: '', 
      assessmentType: assessmentTypes[0], 
      score: 0, 
      maxScore: ASSESSMENT_MAX_SCORES[assessmentTypes[0]],
    },
  });

  const currentStudentId = watch('studentId');
  const currentSubject = watch('subject');
  const currentAssessmentType = watch('assessmentType');

  useEffect(() => {
    fetchInitialData();
  }, []);
  
  async function fetchInitialData() {
    setIsLoading(true);
    try {
      const [fetchedStudents, fetchedSubjects, allStudentMarks] = await Promise.all([
        getAllStudents(),
        getAllAvailableSubjects(),
        getAllStudents().then(stds => stds.reduce((acc, student) => acc.concat(student.marks.map(m => ({...m, studentName: student.name}))), [] as (Mark & {studentName?: string})[]))
      ]);
      setStudents(fetchedStudents);
      setSystemSubjects(fetchedSubjects);
      setAllMarks(allStudentMarks);

      if (!editingMark && canManageAnySubject && userManagedSubjects[0]) {
        setValue('subject', userManagedSubjects[0]);
      }
      setValue('assessmentType', assessmentTypes[0]);
      setValue('maxScore', ASSESSMENT_MAX_SCORES[assessmentTypes[0]]);

    } catch (error) {
      toast({ title: "Error fetching data", description: "Could not load initial data for marks management.", variant: "destructive" });
    }
    setIsLoading(false);
  }

  useEffect(() => {
    if (currentAssessmentType) {
      setValue('maxScore', ASSESSMENT_MAX_SCORES[currentAssessmentType]);
    }
  }, [currentAssessmentType, setValue]);


  useEffect(() => {
    // Set default subject and assessment type if user has subjects and form is opened for adding new mark
    if (isDialogOpen && !editingMark) {
      if (canManageAnySubject && userManagedSubjects[0]) {
        setValue('subject', userManagedSubjects[0]);
      }
      const defaultAssessmentType = assessmentTypes[0];
      setValue('assessmentType', defaultAssessmentType);
      setValue('maxScore', ASSESSMENT_MAX_SCORES[defaultAssessmentType]);
      setValue('score', 0); // Reset score
    }
  }, [isDialogOpen, editingMark, canManageAnySubject, userManagedSubjects, setValue]);

  const isUserAuthorizedForSubject = (subject: string) => {
    return userManagedSubjects.includes(subject);
  };

  const handleAddMark = () => {
    if (!canManageAnySubject) {
      toast({ title: "Unauthorized", description: "You are not assigned to manage any subjects.", variant: "destructive" });
      return;
    }
    setEditingMark(null);
    const defaultAT = assessmentTypes[0];
    reset({ 
      studentId: '', 
      subject: userManagedSubjects[0] || '', 
      assessmentType: defaultAT, 
      score: 0, 
      maxScore: ASSESSMENT_MAX_SCORES[defaultAT],
    });
    setIsDialogOpen(true);
  };

  const handleEditMark = (mark: Mark) => {
    if (!isUserAuthorizedForSubject(mark.subject)) {
        toast({ title: "Unauthorized", description: `You are not authorized to manage marks for ${mark.subject}.`, variant: "destructive" });
        return;
    }
    setEditingMark(mark);
    reset({
      studentId: mark.studentId,
      subject: mark.subject,
      assessmentType: mark.assessmentType,
      score: mark.score,
      maxScore: mark.maxScore,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteMark = async (mark: Mark) => {
    if (!isUserAuthorizedForSubject(mark.subject)) {
        toast({ title: "Unauthorized", description: `You are not authorized to manage marks for ${mark.subject}.`, variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
      await apiDeleteMark(mark.id);
      toast({ title: "Mark Deleted", description: "The mark has been successfully deleted." });
      fetchInitialData(); 
    } catch (error) {
      toast({ title: "Error Deleting Mark", description: "Could not delete the mark.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const onSubmit = async (data: MarkFormData) => {
    if (!isUserAuthorizedForSubject(data.subject)) {
        toast({ title: "Unauthorized", description: `You are not authorized to manage marks for ${data.subject}.`, variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
      if (editingMark) {
        await apiUpdateMark({ ...editingMark, ...data });
        toast({ title: "Mark Updated", description: "The mark has been successfully updated." });
      } else {
        // Check if a mark for this student, subject, and assessment type already exists
        const existingEntry = allMarks.find(m => m.studentId === data.studentId && m.subject === data.subject && m.assessmentType === data.assessmentType);
        if (existingEntry) {
            toast({ title: "Duplicate Entry", description: `A mark for ${data.assessmentType} in ${data.subject} for this student already exists. Please edit the existing entry.`, variant: "destructive", duration: 5000 });
            setIsSubmitting(false);
            return;
        }
        await apiAddMark(data);
        toast({ title: "Mark Added", description: "The mark has been successfully added." });
      }
      fetchInitialData(); 
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: "Error Saving Mark", description: "Could not save the mark.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleSuggestMarks = async () => {
    if (!currentStudentId || !currentSubject || !currentAssessmentType) {
      toast({ title: "Missing Information", description: "Please select student, subject, and assessment type.", variant: "destructive" });
      return;
    }
    if (!isUserAuthorizedForSubject(currentSubject)) {
        toast({ title: "Unauthorized", description: `You are not authorized to suggest marks for ${currentSubject}.`, variant: "destructive" });
        return;
    }
    const student = students.find(s => s.id === currentStudentId);
    if (!student) {
        toast({ title: "Student not found", description: "Selected student PRN is invalid.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
      const input: MarksSuggestionInput = { 
        prn: student.id, 
        name: student.name, 
        subject: currentSubject, 
        assessmentType: currentAssessmentType,
        maxMarks: ASSESSMENT_MAX_SCORES[currentAssessmentType] 
      };
      const suggestion = await generateMarksSuggestions(input);
      setValue('score', suggestion.suggestedMarks);
      toast({ title: "AI Suggestion", description: `${suggestion.reason} Suggested Marks for ${currentAssessmentType}: ${suggestion.suggestedMarks}` });
    } catch (error) {
      toast({ title: "AI Suggestion Failed", description: "Could not get AI mark suggestion.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const filteredMarks = useMemo(() => {
    let marksToFilter = allMarks;
    if (!searchTerm) return marksToFilter;
    return marksToFilter.filter(mark =>
      mark.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mark.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mark.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mark.assessmentType.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allMarks, searchTerm]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading marks data...</span></div>;
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-2xl">Marks Management</CardTitle>
            <CardDescription>Add, edit, or delete student marks for CA1, CA2, MidSem, and EndSem components.</CardDescription>
          </div>
          <Button onClick={handleAddMark} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!canManageAnySubject}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Mark
          </Button>
        </div>
        {(user?.role === 'teacher' || user?.role === 'admin') && !canManageAnySubject && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Subjects Assigned</AlertTitle>
            <AlertDescription>
              You are not currently assigned to manage marks for any subjects. {user?.role === 'admin' && "As an admin, you can assign subjects to yourself via 'User Subject Management'."}
            </AlertDescription>
          </Alert>
        )}
        <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                type="text"
                placeholder="Search by student name, PRN, subject, or assessment type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10"
            />
        </div>
      </CardHeader>
      <CardContent>
        {filteredMarks.length === 0 && !searchTerm && (
             <div className="text-center py-8">
                <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">No marks found</h3>
                <p className="mt-1 text-sm text-muted-foreground">Get started by adding a new mark for your assigned subjects.</p>
            </div>
        )}
        {filteredMarks.length === 0 && searchTerm && (
             <div className="text-center py-8">
                <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">No marks found for "{searchTerm}"</h3>
                <p className="mt-1 text-sm text-muted-foreground">Try a different search term.</p>
            </div>
        )}
        {filteredMarks.length > 0 && (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student PRN</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Assessment</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Max Score</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMarks.map((mark) => {
              const canEditOrDelete = isUserAuthorizedForSubject(mark.subject);
              return (
              <TableRow key={mark.id}>
                <TableCell>{mark.studentId}</TableCell>
                <TableCell>{mark.studentName || students.find(s => s.id === mark.studentId)?.name || 'N/A'}</TableCell>
                <TableCell>{mark.subject}</TableCell>
                <TableCell><Badge variant="secondary">{mark.assessmentType}</Badge></TableCell>
                <TableCell className="text-right">{mark.score}</TableCell>
                <TableCell className="text-right">{mark.maxScore}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="icon" onClick={() => handleEditMark(mark)} className="hover:text-accent hover:border-accent" disabled={!canEditOrDelete || isSubmitting}>
                    <Edit2 className="h-4 w-4" />
                    <span className="sr-only">Edit Mark</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon" className="hover:text-destructive hover:border-destructive" disabled={!canEditOrDelete || isSubmitting}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete Mark</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the {mark.assessmentType} mark for {mark.subject} for student {mark.studentName || mark.studentId}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteMark(mark)} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>
                          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
        </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMark ? `Edit Mark for ${editingMark.assessmentType}` : 'Add New Mark Component'}</DialogTitle>
            <DialogDescription>
              {editingMark ? 'Update the details for this mark component.' : 'Enter the details for the new mark component.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="studentId"
                control={control}
                render={({ field }) => (
                  <div className="space-y-1">
                    <Label htmlFor="studentId">Student PRN</Label>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!editingMark}>
                      <SelectTrigger id="studentId" className="w-full">
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
                    {errors.studentId && <p className="text-sm text-destructive">{errors.studentId.message}</p>}
                  </div>
                )}
              />
              <Controller
                name="subject"
                control={control}
                render={({ field }) => (
                  <div className="space-y-1">
                    <Label htmlFor="subject">Subject</Label>
                    {canManageAnySubject ? (
                      <Select onValueChange={field.onChange} value={field.value} disabled={!!editingMark && !isUserAuthorizedForSubject(editingMark.subject)}>
                        <SelectTrigger id="subject" className="w-full">
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
                      <Input id="subject" placeholder="No subjects assigned" {...field} disabled />
                    )}
                    {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
                  </div>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                    name="assessmentType"
                    control={control}
                    render={({ field }) => (
                    <div className="space-y-1">
                        <Label htmlFor="assessmentType">Assessment Type</Label>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!!editingMark}>
                        <SelectTrigger id="assessmentType">
                            <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                            {assessmentTypes.map(type => (
                            <SelectItem key={type} value={type}>
                                {type} (Max: {ASSESSMENT_MAX_SCORES[type]})
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        {errors.assessmentType && <p className="text-sm text-destructive">{errors.assessmentType.message}</p>}
                    </div>
                    )}
                />
                 <div className="space-y-1">
                    <Label htmlFor="maxScore">Max Score</Label>
                    <Controller
                    name="maxScore"
                    control={control}
                    render={({ field }) => <Input id="maxScore" type="number" {...field} readOnly className="bg-muted/50" />}
                    />
                    {errors.maxScore && <p className="text-sm text-destructive">{errors.maxScore.message}</p>}
                </div>
            </div>
           
            <div className="space-y-1">
              <Label htmlFor="score">Score Obtained</Label>
              <Controller
                name="score"
                control={control}
                render={({ field }) => <Input id="score" type="number" placeholder="e.g., 8" {...field} />}
              />
                {errors.score && <p className="text-sm text-destructive">{errors.score.message}</p>}
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleSuggestMarks} 
              className="w-full" 
              disabled={isSubmitting || !currentStudentId || !currentSubject || !currentAssessmentType || !canManageAnySubject || !isUserAuthorizedForSubject(currentSubject)}
            >
              {isSubmitting && watch('score') === undefined ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Lightbulb className="mr-2 h-4 w-4" />}
              Suggest Score (AI)
            </Button>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={isSubmitting || !canManageAnySubject || (currentSubject && !isUserAuthorizedForSubject(currentSubject))} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (editingMark ? 'Save Changes' : 'Add Mark')}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
