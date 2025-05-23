
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users2, BookLock, ArrowRight, Activity, CalendarClock, CalendarPlus } from 'lucide-react'; // Removed BookOpen

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

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          System administration, user management, and overall oversight.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          title="Manage Users"
          description="View all users (students, teachers, admins) and their details."
          href="/admin/manage-users"
          icon={<Users2 className="h-8 w-8" />}
        />
        <FeatureCard
          title="User Subject Assignment"
          description="Assign general academic subjects for users (teachers/admins)."
          href="/admin/manage-teacher-subjects"
          icon={<BookLock className="h-8 w-8" />}
        />
        <FeatureCard
          title="Manage Semesters"
          description="Add, rename, or delete academic semesters in the system."
          href="/admin/manage-semesters"
          icon={<CalendarPlus className="h-8 w-8" />}
        />
        <FeatureCard
          title="Teacher Semester Assignments"
          description="Assign subjects to teachers for specific academic semesters."
          href="/admin/manage-teacher-semester-assignments"
          icon={<CalendarClock className="h-8 w-8" />}
        />
      </div>

       <Card className="mt-12 bg-secondary/30">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary"/>
            System Overview (Mock Data)
          </CardTitle>
          <CardDescription>A brief summary of key metrics in the CampusMarks system.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-background rounded-lg shadow">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-3xl font-bold text-primary">15</p> {/* Placeholder - update with dynamic data later */}
          </div>
          <div className="p-4 bg-background rounded-lg shadow">
            <p className="text-sm text-muted-foreground">Active Teachers</p>
            <p className="text-3xl font-bold text-accent">2</p> {/* Placeholder */}
          </div>
          <div className="p-4 bg-background rounded-lg shadow">
            <p className="text-sm text-muted-foreground">Enrolled Students</p>
            <p className="text-3xl font-bold text-green-600">12</p> {/* Placeholder */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
