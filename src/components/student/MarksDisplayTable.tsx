"use client";

import type { Mark } from '@/types';
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

interface MarksDisplayTableProps {
  marks: Mark[];
  studentName: string;
  prn: string;
}

const getGradeColor = (grade?: string): string => {
  if (!grade) return "bg-gray-400";
  if (grade.startsWith('A')) return "bg-green-500";
  if (grade.startsWith('B')) return "bg-blue-500";
  if (grade.startsWith('C')) return "bg-yellow-500";
  if (grade.startsWith('D')) return "bg-orange-500";
  if (grade.startsWith('F')) return "bg-red-500";
  return "bg-muted";
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

  // Calculate overall performance (example: average percentage)
  const totalScore = marks.reduce((sum, mark) => sum + mark.score, 0);
  const totalMaxScore = marks.reduce((sum, mark) => sum + mark.maxScore, 0);
  const averagePercentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;


  return (
    <Card className="w-full shadow-xl overflow-hidden">
      <CardHeader className="bg-card-foreground/5">
        <CardTitle className="text-2xl text-primary">Marks Statement</CardTitle>
        <CardDescription>
          Academic performance for <span className="font-semibold text-foreground">{studentName}</span> (PRN: <span className="font-semibold text-foreground">{prn}</span>)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-6 border-b">
            <h3 className="text-lg font-semibold mb-2">Overall Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-secondary/50 rounded-lg shadow">
                    <p className="text-sm text-muted-foreground">Total Subjects</p>
                    <p className="text-2xl font-bold text-primary">{marks.length}</p>
                </div>
                <div className="p-4 bg-secondary/50 rounded-lg shadow">
                    <p className="text-sm text-muted-foreground">Average Score</p>
                    <p className="text-2xl font-bold text-accent">{averagePercentage.toFixed(2)}%</p>
                </div>
                 <div className="p-4 bg-secondary/50 rounded-lg shadow">
                    <p className="text-sm text-muted-foreground">Highest Score</p>
                    <p className="text-2xl font-bold text-green-600">
                        {Math.max(...marks.map(m => (m.score/m.maxScore)*100)).toFixed(2)}%
                        <span className="text-xs"> (in {marks.find(m => (m.score/m.maxScore)*100 === Math.max(...marks.map(m => (m.score/m.maxScore)*100)))?.subject})</span>
                    </p>
                </div>
            </div>
        </div>
        <Table>
          <TableCaption className="py-4 text-sm text-muted-foreground">
            A summary of your academic performance.
          </TableCaption>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[200px] font-semibold text-foreground">Subject</TableHead>
              <TableHead className="font-semibold text-foreground">Term</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Score</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Max Score</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Percentage</TableHead>
              <TableHead className="text-center font-semibold text-foreground">Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {marks.map((mark) => (
              <TableRow key={mark.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{mark.subject}</TableCell>
                <TableCell>{mark.term}</TableCell>
                <TableCell className="text-right">{mark.score}</TableCell>
                <TableCell className="text-right">{mark.maxScore}</TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  {((mark.score / mark.maxScore) * 100).toFixed(2)}%
                </TableCell>
                <TableCell className="text-center">
                  {mark.grade ? (
                     <Badge variant="default" className={`${getGradeColor(mark.grade)} text-white font-bold px-3 py-1`}>
                      {mark.grade}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
