
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getAllStudents, updateStudentName as apiUpdateStudentName } from '@/lib/mockData';
import type { Student } from '@/types';
import { Edit2, Loader2, Users, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const renameSchema = z.object({
  newName: z.string().min(2, "Name must be at least 2 characters."),
});

type RenameFormData = z.infer<typeof renameSchema>;

export function StudentManagement() {
  const [students, setStudents] = useState<Omit<Student, 'marks'>[]>([]); // Now students without marks
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Omit<Student, 'marks'> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<RenameFormData>({
    resolver: zodResolver(renameSchema),
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    setIsLoading(true);
    try {
      const fetchedStudents = await getAllStudents(); // Fetches only student profiles
      setStudents(fetchedStudents);
    } catch (error) {
      toast({ title: "Error fetching students", description: "Could not load student data.", variant: "destructive" });
    }
    setIsLoading(false);
  }

  const handleRenameStudent = (student: Omit<Student, 'marks'>) => {
    setEditingStudent(student);
    setValue('newName', student.name);
    setIsRenameDialogOpen(true);
  };

  const onRenameSubmit = async (data: RenameFormData) => {
    if (!editingStudent || !editingStudent.id) return; // editingStudent.id is PRN
    setIsSubmitting(true);
    try {
      await apiUpdateStudentName(editingStudent.id, data.newName);
      toast({ title: "Student Renamed", description: `${editingStudent.name} is now ${data.newName}.` });
      fetchStudents(); 
      setIsRenameDialogOpen(false);
    } catch (error) {
      toast({ title: "Error Renaming Student", description: "Could not rename the student.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    return students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.id && student.id.toLowerCase().includes(searchTerm.toLowerCase())) // student.id is PRN
    );
  }, [students, searchTerm]);


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading student data...</span></div>;
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Student Management</CardTitle>
        <CardDescription>View and manage student information.</CardDescription>
         <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                type="text"
                placeholder="Search by student name or PRN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-1/2 pl-10"
            />
        </div>
      </CardHeader>
      <CardContent>
        {filteredStudents.length === 0 && !searchTerm && (
             <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">No students found</h3>
                <p className="mt-1 text-sm text-muted-foreground">Student data will appear here. Ensure students are registered in Firestore.</p>
            </div>
        )}
        {filteredStudents.length === 0 && searchTerm && (
             <div className="text-center py-8">
                <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">No students found for "{searchTerm}"</h3>
                <p className="mt-1 text-sm text-muted-foreground">Try a different search term.</p>
            </div>
        )}
        {filteredStudents.length > 0 && (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">PRN</TableHead>
              <TableHead className="min-w-[180px]">Name</TableHead>
              <TableHead className="min-w-[200px]">Email</TableHead>
              <TableHead className="text-right min-w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.id}</TableCell>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.email || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => handleRenameStudent(student)} className="hover:text-accent hover:border-accent">
                    <Edit2 className="mr-2 h-3 w-3" /> Rename
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        )}
      </CardContent>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Student</DialogTitle>
            <DialogDescription>
              Change the name for {editingStudent?.name} (PRN: {editingStudent?.id}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onRenameSubmit)} className="space-y-4 py-4">
            <div>
              <Label htmlFor="newName">New Name</Label>
              <Input id="newName" {...control.register("newName")} className="mt-1" />
              {errors.newName && <p className="text-sm text-destructive mt-1">{errors.newName.message}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
