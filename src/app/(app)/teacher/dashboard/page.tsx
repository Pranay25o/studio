import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardEdit, AlertTriangle, Users, ArrowRight, PencilLine } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

function FeatureCard({ title, description, href, icon }: FeatureCardProps) {
  return (
    <Link href={href} className="block hover:no-underline">
      <Card className="h-full transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-medium text-primary">{title}</CardTitle>
          <div className="text-accent">{icon}</div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="mt-4 flex items-center text-sm font-medium text-accent">
            Go to {title} <ArrowRight className="ml-1 h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function TeacherDashboardPage() {
  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Teacher Dashboard</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Welcome! Access your tools and manage student data efficiently.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          title="Manage Marks"
          description="Input, edit, and delete student marks. Utilize AI for mark suggestions."
          href="/teacher/manage-marks"
          icon={<ClipboardEdit className="h-8 w-8" />}
        />
        <FeatureCard
          title="Grade Anomaly Detector"
          description="Use AI to detect anomalies in student grades, such as out-of-bounds scores."
          href="/teacher/grade-anomaly"
          icon={<AlertTriangle className="h-8 w-8" />}
        />
        <FeatureCard
          title="Manage Students"
          description="View student list and manage student data, including renaming students."
          href="/teacher/manage-students"
          icon={<PencilLine className="h-8 w-8" />}
        />
      </div>
       <Card className="mt-12 bg-secondary/30">
        <CardHeader>
          <CardTitle className="text-2xl">Quick Stats</CardTitle>
          <CardDescription>A brief overview of your current data (mock).</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-background rounded-lg shadow">
            <p className="text-sm text-muted-foreground">Total Students</p>
            <p className="text-3xl font-bold text-primary">150</p>
          </div>
          <div className="p-4 bg-background rounded-lg shadow">
            <p className="text-sm text-muted-foreground">Total Marks Entered</p>
            <p className="text-3xl font-bold text-accent">789</p>
          </div>
          <div className="p-4 bg-background rounded-lg shadow">
            <p className="text-sm text-muted-foreground">Anomalies Detected (Last 7 Days)</p>
            <p className="text-3xl font-bold text-destructive">5</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
