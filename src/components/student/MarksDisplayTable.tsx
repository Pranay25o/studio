
"use client";

import type { Mark, AssessmentType, Semester } from '@/types';
import { ASSESSMENT_MAX_SCORES } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, BarChart3, TrendingUp, Percent, BookOpenCheck, CalendarDays } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


interface MarksDisplayTableProps {
  marks: Mark[];
  studentName: string;
  prn: string;
}

interface SubjectPerformanceInSemester {
  subject: string;
  totalObtained: number;
  totalMax: number;
  percentage: number;
  components: Mark[];
}

interface SemesterPerformance {
  semester: Semester;
  subjects: SubjectPerformanceInSemester[];
  overallSemesterPercentage: number;
  totalSemesterObtained: number;
  totalSemesterMax: number;
}

const ASSESSMENT_ORDER: Record<AssessmentType, number> = {
  CA1: 1,
  CA2: 2,
  MidSem: 3,
  EndSem: 4,
};

export function MarksDisplayTable({ marks, studentName, prn }: MarksDisplayTableProps) {
  if (!marks || marks.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Marks for {studentName} (PRN: {prn})</CardTitle>
          <CardDescription>No marks found for this student.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Group marks by semester
  const marksBySemester: Record<Semester, Mark[]> = marks.reduce((acc, mark) => {
    if (!acc[mark.semester]) {
      acc[mark.semester] = [];
    }
    acc[mark.semester].push(mark);
    return acc;
  }, {} as Record<Semester, Mark[]>);

  const performanceBySemester: SemesterPerformance[] = Object.entries(marksBySemester)
    .map(([semester, semesterMarks]) => {
      const subjectWisePerformance: SubjectPerformanceInSemester[] = semesterMarks.reduce((acc, mark) => {
        let subjectEntry = acc.find(item => item.subject === mark.subject);
        if (!subjectEntry) {
          subjectEntry = { subject: mark.subject, totalObtained: 0, totalMax: 0, percentage: 0, components: [] };
          acc.push(subjectEntry);
        }
        subjectEntry.components.push(mark);
        subjectEntry.totalObtained += mark.score;
        subjectEntry.totalMax += mark.maxScore;
        return acc;
      }, [] as SubjectPerformanceInSemester[]);

      subjectWisePerformance.forEach(subj => {
        subj.percentage = subj.totalMax > 0 ? (subj.totalObtained / subj.totalMax) * 100 : 0;
        subj.components.sort((a,b) => ASSESSMENT_ORDER[a.assessmentType] - ASSESSMENT_ORDER[b.assessmentType]);
      });
      subjectWisePerformance.sort((a,b) => a.subject.localeCompare(b.subject));

      const totalSemesterObtained = subjectWisePerformance.reduce((sum, subj) => sum + subj.totalObtained, 0);
      const totalSemesterMax = subjectWisePerformance.reduce((sum, subj) => sum + subj.totalMax, 0);
      const overallSemesterPercentage = totalSemesterMax > 0 ? (totalSemesterObtained / totalSemesterMax) * 100 : 0;
      
      return {
        semester,
        subjects: subjectWisePerformance,
        overallSemesterPercentage,
        totalSemesterObtained,
        totalSemesterMax,
      };
    })
    .sort((a, b) => b.semester.localeCompare(a.semester)); // Sort semesters, newest first (e.g. Spring 2024 before Fall 2023)

  const overallTotalObtained = performanceBySemester.reduce((sum, sem) => sum + sem.totalSemesterObtained, 0);
  const overallTotalMax = performanceBySemester.reduce((sum, sem) => sum + sem.totalSemesterMax, 0);
  const overallAveragePercentage = overallTotalMax > 0 ? (overallTotalObtained / overallTotalMax) * 100 : 0;
  
  const totalSubjectsAttemptedAcrossAllSemesters = new Set(marks.map(m => `${m.semester}-${m.subject}`)).size;


  return (
    <Card className="w-full shadow-xl overflow-hidden">
      <CardHeader className="bg-card-foreground/5">
        <CardTitle className="text-2xl text-primary flex items-center gap-2">
          <BarChart3 /> Marks Statement
        </CardTitle>
        <CardDescription>
          Academic performance for <span className="font-semibold text-foreground">{studentName}</span> (PRN: <span className="font-semibold text-foreground">{prn}</span>)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-6 border-b">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Award className="text-accent"/>Overall Academic Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-secondary/50 rounded-lg shadow">
                    <p className="text-sm text-muted-foreground flex items-center gap-1"><BookOpenCheck />Total Subject Instances</p>
                    <p className="text-2xl font-bold text-primary">{totalSubjectsAttemptedAcrossAllSemesters}</p>
                </div>
                <div className="p-4 bg-secondary/50 rounded-lg shadow">
                    <p className="text-sm text-muted-foreground flex items-center gap-1"><Percent />Overall Average Performance</p>
                    <p className="text-2xl font-bold text-accent">{overallAveragePercentage.toFixed(2)}%</p>
                </div>
                 <div className="p-4 bg-secondary/50 rounded-lg shadow">
                    <p className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp/>Total Semesters</p>
                    <p className="text-2xl font-bold text-green-600">
                        {performanceBySemester.length}
                    </p>
                </div>
            </div>
        </div>
        
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <CalendarDays className="text-primary" />
            Performance by Semester
          </h3>
          {performanceBySemester.length > 0 ? (
            <Accordion type="multiple" defaultValue={performanceBySemester.map(s => s.semester)} className="w-full">
              {performanceBySemester.map((semPerf) => (
                <AccordionItem value={semPerf.semester} key={semPerf.semester}>
                  <AccordionTrigger className="text-xl font-medium text-primary hover:no-underline py-4 px-2 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between w-full items-center">
                        <span>{semPerf.semester}</span>
                        <Badge variant="outline" className="text-base px-3 py-1 border-accent text-accent">
                            Overall: {semPerf.totalSemesterObtained} / {semPerf.totalSemesterMax} ({semPerf.overallSemesterPercentage.toFixed(2)}%)
                        </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-4 px-2">
                    <div className="space-y-4 mt-2">
                        {semPerf.subjects.map(subjectPerf => (
                            <Card key={`${semPerf.semester}-${subjectPerf.subject}`} className="bg-card shadow-md hover:shadow-lg transition-shadow duration-300">
                                <CardHeader className="pb-3 border-b bg-muted/20">
                                    <CardTitle className="text-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                    <span className="text-foreground/90">{subjectPerf.subject}</span>
                                    <Badge variant="secondary" className="text-sm px-2.5 py-1">
                                        Sub. Total: {subjectPerf.totalObtained} / {subjectPerf.totalMax} ({subjectPerf.percentage.toFixed(2)}%)
                                    </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <Table>
                                    <TableHeader>
                                        <TableRow>
                                        <TableHead className="font-semibold text-foreground">Assessment Type</TableHead>
                                        <TableHead className="text-right font-semibold text-foreground">Score</TableHead>
                                        <TableHead className="text-right font-semibold text-foreground">Max Score</TableHead>
                                        <TableHead className="text-right font-semibold text-foreground">Percentage</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {subjectPerf.components.map((mark) => (
                                        <TableRow key={mark.id} className="hover:bg-muted/10">
                                            <TableCell><Badge variant="outline" className="border-foreground/30">{mark.assessmentType}</Badge></TableCell>
                                            <TableCell className="text-right">{mark.score}</TableCell>
                                            <TableCell className="text-right">{mark.maxScore}</TableCell>
                                            <TableCell className="text-right font-medium text-primary/90">
                                            {mark.maxScore > 0 ? ((mark.score / mark.maxScore) * 100).toFixed(2) : 'N/A'}%
                                            </TableCell>
                                        </TableRow>
                                        ))}
                                    </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        ))}
                        {semPerf.subjects.length === 0 && <p className="text-muted-foreground text-center py-2">No subjects with marks recorded for this semester.</p>}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-muted-foreground text-center py-4">No marks available for any semester.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
