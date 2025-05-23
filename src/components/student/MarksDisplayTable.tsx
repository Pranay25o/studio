
"use client";

import type { Mark, AssessmentType } from '@/types';
import { ASSESSMENT_MAX_SCORES } from '@/types';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, BarChart3, TrendingUp, TrendingDown, Percent } from 'lucide-react';

interface MarksDisplayTableProps {
  marks: Mark[];
  studentName: string;
  prn: string;
}

interface SubjectPerformance {
  subject: string;
  totalObtained: number;
  totalMax: number;
  percentage: number;
  components: Mark[];
}

// A more nuanced grading system could be defined here
// For example:
// const getOverallGrade = (percentage: number): string => {
// if (percentage >= 90) return "A+ (Distinction)";
// if (percentage >= 80) return "A (Excellent)";
// if (percentage >= 70) return "B+ (Very Good)";
// if (percentage >= 60) return "B (Good)";
// if (percentage >= 50) return "C (Satisfactory)";
// if (percentage >= 40) return "D (Pass)";
// return "F (Fail)";
// };


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

  const subjectWisePerformance: SubjectPerformance[] = marks.reduce((acc, mark) => {
    let subjectEntry = acc.find(item => item.subject === mark.subject);
    if (!subjectEntry) {
      subjectEntry = { subject: mark.subject, totalObtained: 0, totalMax: 0, percentage: 0, components: [] };
      acc.push(subjectEntry);
    }
    subjectEntry.components.push(mark);
    subjectEntry.totalObtained += mark.score;
    // Assuming all components of a subject should ideally be present for full max marks
    // For this calculation, we sum max scores of available components. A more robust system might expect all components.
    subjectEntry.totalMax += mark.maxScore; 
    return acc;
  }, [] as SubjectPerformance[]);

  subjectWisePerformance.forEach(subj => {
    // Calculate total possible max score for a subject if all components were present
    const fullMaxScoreForSubject = Object.values(ASSESSMENT_MAX_SCORES).reduce((sum, val) => sum + val, 0);
    // Use the sum of maxScores of *entered* components for percentage if not all are present,
    // or use fullMaxScoreForSubject if you want to penalize for missing components.
    // For now, using entered components' max scores sum.
    subj.percentage = subj.totalMax > 0 ? (subj.totalObtained / subj.totalMax) * 100 : 0;
    // If you want percentage based on full possible marks (100 per subject)
    // subj.percentage = fullMaxScoreForSubject > 0 ? (subj.totalObtained / fullMaxScoreForSubject) * 100 : 0;
  });

  const overallAveragePercentage = subjectWisePerformance.length > 0
    ? subjectWisePerformance.reduce((sum, subj) => sum + subj.percentage, 0) / subjectWisePerformance.length
    : 0;
  
  const highestSubjectPercentage = subjectWisePerformance.length > 0
    ? Math.max(...subjectWisePerformance.map(s => s.percentage))
    : 0;
  const highestPerformingSubject = subjectWisePerformance.find(s => s.percentage === highestSubjectPercentage)?.subject || 'N/A';


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
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Award className="text-accent"/>Overall Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-secondary/50 rounded-lg shadow">
                    <p className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp/>Total Subjects Attempted</p>
                    <p className="text-2xl font-bold text-primary">{subjectWisePerformance.length}</p>
                </div>
                <div className="p-4 bg-secondary/50 rounded-lg shadow">
                    <p className="text-sm text-muted-foreground flex items-center gap-1"><Percent/>Average Subject Performance</p>
                    <p className="text-2xl font-bold text-accent">{overallAveragePercentage.toFixed(2)}%</p>
                </div>
                 <div className="p-4 bg-secondary/50 rounded-lg shadow">
                    <p className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp/>Best Subject Performance</p>
                    <p className="text-2xl font-bold text-green-600">
                        {highestSubjectPercentage.toFixed(2)}%
                        <span className="text-xs block text-muted-foreground"> (in {highestPerformingSubject})</span>
                    </p>
                </div>
            </div>
        </div>
        
        <h3 className="text-xl font-semibold p-6 pb-2 text-foreground">Detailed Marks by Component</h3>
        <Table>
          <TableCaption className="py-4 text-sm text-muted-foreground">
            A summary of your academic performance components.
          </TableCaption>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[200px] font-semibold text-foreground">Subject</TableHead>
              <TableHead className="font-semibold text-foreground">Assessment Type</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Score</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Max Score</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Percentage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {marks.sort((a,b) => a.subject.localeCompare(b.subject) || a.assessmentType.localeCompare(b.assessmentType)).map((mark) => (
              <TableRow key={mark.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{mark.subject}</TableCell>
                <TableCell><Badge variant="outline">{mark.assessmentType}</Badge></TableCell>
                <TableCell className="text-right">{mark.score}</TableCell>
                <TableCell className="text-right">{mark.maxScore}</TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  {mark.maxScore > 0 ? ((mark.score / mark.maxScore) * 100).toFixed(2) : 'N/A'}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
