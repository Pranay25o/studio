
"use client";

import type { Mark, AssessmentType } from '@/types';
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
import { Award, BarChart3, TrendingUp, Percent, BookOpenCheck } from 'lucide-react';

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

  const subjectWisePerformance: SubjectPerformance[] = marks.reduce((acc, mark) => {
    let subjectEntry = acc.find(item => item.subject === mark.subject);
    if (!subjectEntry) {
      subjectEntry = { subject: mark.subject, totalObtained: 0, totalMax: 0, percentage: 0, components: [] };
      acc.push(subjectEntry);
    }
    subjectEntry.components.push(mark);
    subjectEntry.totalObtained += mark.score;
    subjectEntry.totalMax += mark.maxScore; 
    return acc;
  }, [] as SubjectPerformance[]);

  subjectWisePerformance.forEach(subj => {
    subj.percentage = subj.totalMax > 0 ? (subj.totalObtained / subj.totalMax) * 100 : 0;
  });

  // Sort subjects alphabetically for consistent display order
  subjectWisePerformance.sort((a, b) => a.subject.localeCompare(b.subject));

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
        
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <BookOpenCheck className="text-primary" />
            Detailed Marks by Subject
          </h3>
          {subjectWisePerformance.length > 0 ? (
            <div className="space-y-6">
              {subjectWisePerformance.map((subjectPerf) => (
                <Card key={subjectPerf.subject} className="bg-card shadow-md hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="pb-3 border-b bg-muted/30">
                    <CardTitle className="text-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <span className="text-primary">{subjectPerf.subject}</span>
                      <Badge variant="outline" className="text-base px-3 py-1 border-primary text-primary">
                        Total: {subjectPerf.totalObtained} / {subjectPerf.totalMax} ({subjectPerf.percentage.toFixed(2)}%)
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">Breakdown of assessment components.</CardDescription>
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
                        {subjectPerf.components
                          .sort((a,b) => ASSESSMENT_ORDER[a.assessmentType] - ASSESSMENT_ORDER[b.assessmentType])
                          .map((mark) => (
                          <TableRow key={mark.id} className="hover:bg-muted/20">
                            <TableCell><Badge variant="secondary">{mark.assessmentType}</Badge></TableCell>
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
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No detailed marks available for any subject.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

