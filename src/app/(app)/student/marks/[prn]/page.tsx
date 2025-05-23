// src/app/(app)/student/marks/[prn]/page.tsx
import { getStudentByPrn } from '@/lib/mockData';
import { MarksDisplayTable } from '@/components/student/MarksDisplayTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface StudentMarksPageProps {
  params: {
    prn: string;
  };
}

export default async function StudentMarksPage({ params }: StudentMarksPageProps) {
  const prn = params.prn.toUpperCase(); // Normalize PRN
  const student = await getStudentByPrn(prn);

  if (!student) {
    return (
      <div className="container mx-auto py-8">
        <Card className="w-full max-w-2xl mx-auto shadow-lg">
          <CardHeader className="items-center">
            <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
            <CardTitle className="text-2xl text-destructive">Student Not Found</CardTitle>
            <CardDescription>
              No student record found for PRN: <span className="font-semibold">{prn}</span>.
              Please check the PRN and try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild variant="outline">
              <Link href="/student/dashboard">Enter PRN Again</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <MarksDisplayTable marks={student.marks} studentName={student.name} prn={student.id} />
    </div>
  );
}
