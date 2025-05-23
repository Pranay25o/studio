
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/common/Logo';
import { UserNav } from '@/components/common/UserNav';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  BookMarked,
  ClipboardEdit,
  AlertTriangle,
  Users,
  Settings,
  LogOut,
  GraduationCap,
  PencilLine,
  ShieldCheck,
  Users2,
  BookLock
} from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading application...</p>
      </div>
    );
  }

  const commonMenuItems = (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname.includes("/profile")}
          tooltip="Profile"
        >
          <Link href={user.role === 'teacher' ? "/teacher/profile" : user.role === 'student' ? "/student/profile" : "/admin/profile"}>
            <Users />
            <span>Profile</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === "/settings"}
          tooltip="Settings"
        >
          <Link href="/settings">
            <Settings />
            <span>Settings</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  );

  const studentMenuItems = (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === "/student/dashboard"}
          tooltip="Dashboard"
        >
          <Link href="/student/dashboard">
            <LayoutDashboard />
            <span>Dashboard</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
       <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname.startsWith("/student/marks")}
          tooltip="My Marks"
        >
          <Link href={`/student/marks/${user.prn || 'enter-prn'}`}>
            <GraduationCap />
            <span>My Marks</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  );

  const teacherMenuItems = (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === "/teacher/dashboard"}
          tooltip="Dashboard"
        >
          <Link href="/teacher/dashboard">
            <LayoutDashboard />
            <span>Teacher Dashboard</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === "/teacher/manage-marks"}
          tooltip="Manage Marks"
        >
          <Link href="/teacher/manage-marks">
            <ClipboardEdit />
            <span>Manage Marks</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === "/teacher/grade-anomaly"}
          tooltip="Grade Anomaly"
        >
          <Link href="/teacher/grade-anomaly">
            <AlertTriangle />
            <span>Grade Anomaly Detector</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === "/teacher/manage-students"}
          tooltip="Manage Students"
        >
          <Link href="/teacher/manage-students">
            <PencilLine />
            <span>Manage Students</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  );
  
  const adminMenuItems = (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === "/admin/dashboard"}
          tooltip="Admin Dashboard"
        >
          <Link href="/admin/dashboard">
            <ShieldCheck /> <span>Admin Dashboard</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname.startsWith("/admin/manage-users")}
          tooltip="Manage Users"
        >
          <Link href="/admin/manage-users">
            <Users2 /> <span>Manage Users</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname.startsWith("/admin/manage-teacher-subjects")}
          tooltip="Teacher Subjects"
        >
          <Link href="/admin/manage-teacher-subjects">
            <BookLock /> <span>Teacher Subjects</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  );

  let menuItems;
  let portalTitle = "CampusMarks";
  if (user.role === 'student') {
    menuItems = studentMenuItems;
    portalTitle = "Student Portal";
  } else if (user.role === 'teacher') {
    menuItems = teacherMenuItems;
    portalTitle = "Teacher Portal";
  } else if (user.role === 'admin') {
    menuItems = adminMenuItems;
    portalTitle = "Admin Panel";
  }


  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="p-4">
          <Logo className="text-sidebar-foreground group-data-[collapsible=icon]:hidden" />
          <Logo iconSize={24} className="text-sidebar-foreground hidden group-data-[collapsible=icon]:flex justify-center" />
        </SidebarHeader>
        <SidebarContent>
          <ScrollArea className="h-full">
            <SidebarMenu className="px-2">
              {menuItems}
              <SidebarSeparator className="my-2" />
              {commonMenuItems}
            </SidebarMenu>
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={logout} className="text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive-foreground" tooltip="Logout">
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-xl font-semibold text-foreground">
              {portalTitle}
            </h1>
          </div>
          <UserNav />
        </header>
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
        <footer className="border-t p-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} CampusMarks. All rights reserved.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
